import type { FundMeta, PricePoint } from '../types'
import { annualizeGrowth, yearsBetween } from './twrr'

/**
 * Xếp hạng quỹ theo kỳ. Mọi số tính từ chuỗi giá đã điều chỉnh cổ tức của app
 * (cùng nguồn với tab So Sánh), nên khớp với những gì người dùng thấy ở đó.
 */

export type PeriodId = '1m' | '3m' | '6m' | 'ytd' | '1y' | '2y' | '3y' | '5y' | 'all'

/** Các kỳ hiện thành cột ở bảng mixed (không gồm 'all': "từ ngày thành lập" không so được giữa các quỹ). */
export const MIXED_PERIODS: PeriodId[] = ['1m', '3m', '6m', 'ytd', '1y', '2y', '3y', '5y']
export const ALL_PERIODS: PeriodId[] = [...MIXED_PERIODS, 'all']

export type RankMetric = 'return' | 'riskAdjusted' | 'sortino' | 'calmar' | 'drawdown'
export const RANK_METRICS: RankMetric[] = ['return', 'riskAdjusted', 'sortino', 'calmar', 'drawdown']

/** Quỹ có dữ liệu cuối cách ngày tham chiếu quá số ngày này bị coi là cũ và không được xếp hạng. */
export const STALE_DAYS = 7
/** Cho phép chuỗi bắt đầu muộn hơn mốc kỳ tối đa chừng này (cuối tuần, lễ) mà vẫn coi là đủ lịch sử. */
const START_TOLERANCE_DAYS = 5
const MIN_RETURNS_FOR_VOL = 15

export interface PeriodStat {
  startDate: string
  endDate: string
  /** Lợi nhuận cả kỳ (thập phân). */
  ret: number
  /** %/năm, null khi kỳ chưa đủ 1 năm. */
  annualized: number | null
  /** Sụt giảm tối đa trong kỳ (≤ 0). */
  maxDrawdown: number
  /** Biến động quy năm; null khi quá ít quan sát. */
  volatility: number | null
  /** Lợi nhuận trên mỗi đơn vị rủi ro: ret / (vol × √số năm của kỳ). Null khi không tính được. */
  riskAdjusted: number | null
  /** Như riskAdjusted nhưng chỉ phạt biến động đi xuống (độ lệch phía dưới 0). Null khi không có ngày giảm nào hoặc quá ít quan sát. */
  sortino: number | null
  /** %/năm chia sụt giảm tối đa. Null khi kỳ chưa đủ 1 năm hoặc không có sụt giảm. */
  calmar: number | null
  /** Tỷ lệ ngày tăng giá trong các ngày có biến động (0-1). */
  upDays: number | null
  /** Mức đang thấp hơn đỉnh của kỳ tại ngày cuối (≤ 0). 0 = đang ở đỉnh. */
  currentDrawdown: number
}

function shiftDate(iso: string, years: number, months: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCFullYear(d.getUTCFullYear() - years)
  d.setUTCMonth(d.getUTCMonth() - months)
  return d.toISOString().slice(0, 10)
}

/** Mốc bắt đầu của kỳ tính ngược từ ngày tham chiếu; null với 'all' (lấy từ điểm đầu chuỗi). */
export function periodStartDate(period: PeriodId, refEnd: string): string | null {
  switch (period) {
    case '1m': return shiftDate(refEnd, 0, 1)
    case '3m': return shiftDate(refEnd, 0, 3)
    case '6m': return shiftDate(refEnd, 0, 6)
    case '1y': return shiftDate(refEnd, 1, 0)
    case '2y': return shiftDate(refEnd, 2, 0)
    case '3y': return shiftDate(refEnd, 3, 0)
    case '5y': return shiftDate(refEnd, 5, 0)
    // Từ đầu năm: gốc là giá đóng cửa cuối năm trước.
    case 'ytd': return `${Number(refEnd.slice(0, 4)) - 1}-12-31`
    case 'all': return null
  }
}

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000
}

/** Chỉ số điểm cuối cùng có date ≤ target, -1 nếu không có. */
function lastIndexAtOrBefore(prices: PricePoint[], target: string): number {
  let lo = 0
  let hi = prices.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (prices[mid]!.date <= target) { ans = mid; lo = mid + 1 } else hi = mid - 1
  }
  return ans
}

/**
 * %/năm cho kỳ danh nghĩa từ 1 năm. Dữ liệu cuối của quỹ thường lệch 1-2 ngày
 * so với mốc chung (NAV công bố trễ), nên kỳ "1 năm" có thể ra 363 ngày. Đó
 * không phải nội suy từ vài tháng, nên nới dung sai xuống 0,98 năm; dưới đó vẫn
 * để trống như quy tắc chung của app (xem MIN_ANNUALIZE_YEARS).
 */
const MIN_YEARS_TO_ANNUALIZE = 0.98
function annualizedOver(growth: number, startDate: string, endDate: string): number | null {
  const years = yearsBetween(startDate, endDate)
  if (!(growth > 0) || years < MIN_YEARS_TO_ANNUALIZE) return annualizeGrowth(growth, startDate, endDate)
  return Math.pow(growth, 1 / years) - 1
}

/**
 * Thống kê một quỹ trong một kỳ. Null khi quỹ không đủ điều kiện được xếp hạng:
 * dữ liệu đã cũ so với ngày tham chiếu, hoặc lịch sử chưa phủ hết kỳ (quỹ mới
 * ra đời 8 tháng không được lên bảng 1 năm bằng kỳ ngắn hơn).
 */
export function computePeriodStat(prices: PricePoint[], period: PeriodId, refEnd: string): PeriodStat | null {
  if (prices.length < 2) return null
  const last = prices[prices.length - 1]!
  if (daysBetween(last.date, refEnd) > STALE_DAYS) return null

  const target = periodStartDate(period, refEnd)
  let startIdx: number
  if (target === null) {
    startIdx = 0
  } else {
    startIdx = lastIndexAtOrBefore(prices, target)
    if (startIdx === -1) {
      if (daysBetween(target, prices[0]!.date) > START_TOLERANCE_DAYS) return null
      startIdx = 0
    }
  }
  if (startIdx >= prices.length - 1) return null

  const start = prices[startIdx]!
  if (!(start.price > 0) || !(last.price > 0)) return null
  const ret = last.price / start.price - 1
  const years = yearsBetween(start.date, last.date)

  let peak = start.price
  let maxDrawdown = 0
  let currentDrawdown = 0
  const dailyReturns: number[] = []
  for (let i = startIdx + 1; i < prices.length; i++) {
    const p = prices[i]!.price
    const prev = prices[i - 1]!.price
    if (p > peak) peak = p
    maxDrawdown = Math.min(maxDrawdown, p / peak - 1)
    currentDrawdown = p / peak - 1
    if (prev > 0) dailyReturns.push(p / prev - 1)
  }

  let volatility: number | null = null
  if (dailyReturns.length >= MIN_RETURNS_FOR_VOL && years > 0) {
    const mean = dailyReturns.reduce((s, x) => s + x, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / (dailyReturns.length - 1)
    // Số quan sát mỗi năm lấy từ chính chuỗi (quỹ giao dịch ~250 ngày, crypto 365).
    volatility = Math.sqrt(variance) * Math.sqrt(dailyReturns.length / years)
  }
  let sortino: number | null = null
  let upDays: number | null = null
  if (dailyReturns.length >= MIN_RETURNS_FOR_VOL && years > 0) {
    const downside = Math.sqrt(dailyReturns.reduce((acc, x) => acc + Math.min(x, 0) ** 2, 0) / dailyReturns.length)
      * Math.sqrt(dailyReturns.length / years)
    if (downside > 0) sortino = ret / (downside * Math.sqrt(years))
    const moving = dailyReturns.filter(x => x !== 0)
    if (moving.length > 0) upDays = moving.filter(x => x > 0).length / moving.length
  }
  const annualized = annualizedOver(1 + ret, start.date, last.date)
  const calmar = annualized !== null && maxDrawdown < 0 ? annualized / Math.abs(maxDrawdown) : null
  const riskAdjusted = volatility !== null && volatility > 0 && years > 0 ? ret / (volatility * Math.sqrt(years)) : null

  return {
    startDate: start.date,
    endDate: last.date,
    ret,
    annualized,
    maxDrawdown,
    volatility,
    riskAdjusted, sortino, calmar, upDays, currentDrawdown,
  }
}

/** Ngày tham chiếu chung: ngày dữ liệu mới nhất trong tất cả các chuỗi. */
export function referenceEnd(series: Iterable<PricePoint[]>): string | null {
  let max: string | null = null
  for (const s of series) {
    const d = s[s.length - 1]?.date
    if (d && (max === null || d > max)) max = d
  }
  return max
}

export function metricValue(stat: PeriodStat, metric: RankMetric): number | null {
  switch (metric) {
    case 'return': return stat.ret
    case 'riskAdjusted': return stat.riskAdjusted
    case 'sortino': return stat.sortino
    case 'calmar': return stat.calmar
    case 'drawdown': return stat.maxDrawdown // càng gần 0 càng tốt
  }
}

export interface RankedEntry {
  id: string
  stat: PeriodStat
  value: number
  /** Hạng 1 là tốt nhất; hai quỹ bằng điểm cùng hạng. */
  rank: number
}

/** Xếp hạng (giảm dần theo giá trị chỉ số). Quỹ không có số cho chỉ số đó bị loại. */
export function rankEntries(
  entries: { id: string; stat: PeriodStat | null }[],
  metric: RankMetric,
): RankedEntry[] {
  const valid: Omit<RankedEntry, 'rank'>[] = []
  for (const e of entries) {
    if (!e.stat) continue
    const value = metricValue(e.stat, metric)
    if (value === null || !Number.isFinite(value)) continue
    valid.push({ id: e.id, stat: e.stat, value })
  }
  valid.sort((a, b) => b.value - a.value || a.id.localeCompare(b.id))
  const out: RankedEntry[] = []
  valid.forEach((v, i) => {
    const tied = i > 0 && Math.abs(v.value - valid[i - 1]!.value) < 1e-12
    out.push({ ...v, rank: tied ? out[i - 1]!.rank : i + 1 })
  })
  return out
}

export interface MixedRow {
  id: string
  type: FundMeta['type']
  stats: Partial<Record<PeriodId, PeriodStat>>
  /** Hạng theo từng kỳ trong cùng tập đang xếp (chỉ có ở kỳ quỹ đủ điều kiện). */
  ranks: Partial<Record<PeriodId, number>>
  /** Số quỹ được xếp ở từng kỳ. */
  totals: Partial<Record<PeriodId, number>>
  /** Điểm tổng hợp 0-100 (trung bình bách phân vị qua các kỳ); null nếu ít hơn `minPeriods` kỳ. */
  score: number | null
  periodsRanked: number
}

/** Số kỳ tối thiểu để có điểm tổng hợp: tránh quỹ mới ra đời có điểm cao nhờ một kỳ may mắn. */
export const MIN_PERIODS_FOR_SCORE = 3

/**
 * Bảng mixed: mọi quỹ (mọi loại tài sản) xếp chung theo từng kỳ, kèm điểm tổng
 * hợp. Điểm của một kỳ là bách phân vị: hạng 1 = 100, hạng cuối = 0, nên so
 * được giữa các kỳ có số quỹ khác nhau (5 năm ít quỹ hơn 1 tháng).
 */
export function buildMixedRows(
  funds: { id: string; type: FundMeta['type']; prices: PricePoint[] }[],
  periods: PeriodId[],
  metric: RankMetric,
  refEnd: string,
): MixedRow[] {
  const rows = new Map<string, MixedRow>(funds.map(f => [f.id, {
    id: f.id, type: f.type, stats: {}, ranks: {}, totals: {}, score: null, periodsRanked: 0,
  }]))
  const percentiles = new Map<string, number[]>()

  for (const period of periods) {
    const entries = funds.map(f => ({ id: f.id, stat: computePeriodStat(f.prices, period, refEnd) }))
    for (const e of entries) if (e.stat) rows.get(e.id)!.stats[period] = e.stat
    const ranked = rankEntries(entries, metric)
    for (const r of ranked) {
      const row = rows.get(r.id)!
      row.ranks[period] = r.rank
      row.totals[period] = ranked.length
      const pct = ranked.length > 1 ? 100 * (1 - (r.rank - 1) / (ranked.length - 1)) : 100
      if (!percentiles.has(r.id)) percentiles.set(r.id, [])
      percentiles.get(r.id)!.push(pct)
    }
  }

  for (const [id, pcts] of percentiles) {
    const row = rows.get(id)!
    row.periodsRanked = pcts.length
    row.score = pcts.length >= MIN_PERIODS_FOR_SCORE ? pcts.reduce((s, x) => s + x, 0) / pcts.length : null
  }
  return [...rows.values()]
}
