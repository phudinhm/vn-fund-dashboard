import type { PricePoint } from '../types'
import type { DCASlot } from './dca'
import type { TranslationKey } from '../i18n'
import {
  DRAWDOWN_BANDS,
  MIN_DRAWDOWN_EPISODES,
  MIN_INDEPENDENT_WINDOWS,
  alignedSpanMonths,
  bandIndexOf,
  computeRollingScenarios,
  countIndependentWindows,
  drawdownFromRunningPeak,
  independentEpisodeStarts,
  type LSvsDCAScenario,
} from './lsVsDca'
import { alignFundsToCommonGridDaily } from './weeklyResample'
import { savingsAssetId } from './savingsAsset'
import { percentileSorted } from './stats'

/**
 * Tab Tư vấn: "có X đồng thì mua danh mục nào, và nên xuống tiền thế nào".
 *
 * Đây KHÔNG dự báo giá. Mọi kết luận đến từ đúng bộ mô phỏng lịch sử của tab
 * LS vs DCA (computeRollingScenarios), chạy trên danh mục ứng viên rồi xếp
 * hạng theo một công thức lộ rõ. Người dùng đổi khẩu vị rủi ro hay kỳ hạn thì
 * đáp án đổi, và luôn kèm cỡ mẫu thật (số quãng độc lập) để biết chỗ nào chưa
 * đủ dữ liệu — cùng tinh thần trung thực với các khối khác trong app.
 */

export type RiskProfile = 'conservative' | 'balanced' | 'aggressive'

export const RISK_PROFILES: RiskProfile[] = ['conservative', 'balanced', 'aggressive']

export function isRiskProfile(value: unknown): value is RiskProfile {
  return value === 'conservative' || value === 'balanced' || value === 'aggressive'
}

export const HORIZON_YEARS_OPTIONS = [1, 3, 5, 10]
export const STAGING_MONTHS_OPTIONS = [3, 6, 12]

/** Lãi suất tiết kiệm giả định cho phần tiền chưa xuống trong lúc chia đợt. */
export const ADVISOR_CASH_RATE = 0.05

interface RiskParams {
  /**
   * Mức sụt giảm lịch sử tối đa (từ đỉnh xuống đáy) chấp nhận được. Danh mục
   * từng sụt sâu hơn bị loại khỏi nhóm được đề xuất.
   */
  maxDrawdown: number
  /**
   * Trọng số của kịch bản xấu (P10) trong điểm số, phần còn lại là kịch bản
   * điển hình (trung vị). Càng sợ rủi ro càng nặng về P10.
   */
  tailWeight: number
}

export const RISK_PARAMS: Record<RiskProfile, RiskParams> = {
  conservative: { maxDrawdown: 0.15, tailWeight: 0.7 },
  balanced: { maxDrawdown: 0.35, tailWeight: 0.5 },
  aggressive: { maxDrawdown: 0.65, tailWeight: 0.3 },
}

export interface AdvisorCandidate {
  id: string
  nameKey: TranslationKey
  slots: DCASlot[]
}

/**
 * Danh mục ứng viên: một dải từ tiết kiệm tới cổ phiếu thuần, dựng từ quỹ có
 * lịch sử dài và thanh khoản tốt. Cố ý ít và dễ hiểu — người dùng cần một câu
 * trả lời đọc được, không phải bảng xếp hạng 80 quỹ.
 */
export const ADVISOR_CANDIDATES: AdvisorCandidate[] = [
  { id: 'savings', nameKey: 'adv.cand.savings', slots: [{ fundId: savingsAssetId(6), weight: 100 }] },
  { id: 'bond', nameKey: 'adv.cand.bond', slots: [{ fundId: 'DCBF', weight: 100 }] },
  { id: 'balancedFund', nameKey: 'adv.cand.balancedFund', slots: [{ fundId: 'VCBFTBF', weight: 100 }] },
  { id: 'mix3070', nameKey: 'adv.cand.mix3070', slots: [{ fundId: 'DCDS', weight: 30 }, { fundId: 'DCBF', weight: 70 }] },
  { id: 'mix5050', nameKey: 'adv.cand.mix5050', slots: [{ fundId: 'DCDS', weight: 50 }, { fundId: 'DCBF', weight: 50 }] },
  { id: 'mix7030', nameKey: 'adv.cand.mix7030', slots: [{ fundId: 'DCDS', weight: 70 }, { fundId: 'DCBF', weight: 30 }] },
  { id: 'equity', nameKey: 'adv.cand.equity', slots: [{ fundId: 'DCDS', weight: 100 }] },
  { id: 'etf', nameKey: 'adv.cand.etf', slots: [{ fundId: 'E1VFVN30', weight: 100 }] },
  { id: 'equityEtf', nameKey: 'adv.cand.equityEtf', slots: [{ fundId: 'DCDS', weight: 50 }, { fundId: 'E1VFVN30', weight: 50 }] },
]

/** Mọi mã quỹ cần tải để chạy tư vấn. */
export function advisorFundIds(candidates: AdvisorCandidate[] = ADVISOR_CANDIDATES): string[] {
  return [...new Set(candidates.flatMap(c => c.slots.map(s => s.fundId)))]
}

export type SampleQuality = 'insufficient' | 'thin' | 'ok'

/** Cỡ mẫu theo số quãng độc lập, cùng ngưỡng với heatmap ở tab LS vs DCA. */
export function sampleQuality(independentWindows: number): SampleQuality {
  if (independentWindows < MIN_INDEPENDENT_WINDOWS) return 'insufficient'
  if (independentWindows < 5) return 'thin'
  return 'ok'
}

export interface PortfolioEvaluation {
  candidate: AdvisorCandidate
  scenarios: number
  independentWindows: number
  quality: SampleQuality
  /** Lợi suất năm hoá của kịch bản điển hình / xấu (P10) khi nắm giữ đúng kỳ hạn. */
  medianAnnualized: number
  p10Annualized: number
  /** Tỷ lệ kịch bản nắm giữ xong vẫn thấp hơn vốn ban đầu. */
  lossRate: number
  /** Sụt giảm lịch sử lớn nhất, số dương (0.3 = từng giảm 30%). */
  maxDrawdown: number
  /** Đang cách đỉnh bao nhiêu, số âm hoặc 0. */
  currentDrawdown: number
  eligible: boolean
  score: number
}

export interface DeployOption {
  /** Phần vốn xuống ngay, 1 = toàn bộ một lần, 0 = chia đều hoàn toàn. */
  lumpFraction: number
  medianGrowth: number
  p10Growth: number
  lossRate: number
  score: number
}

export interface DeployAdvice {
  options: DeployOption[]
  best: DeployOption
  /** 'similar': chỉ xét các lần vào lệnh cùng trạng thái giảm từ đỉnh như hôm nay. */
  basis: 'similar' | 'all'
  basisScenarios: number
  basisEpisodes: number
  currentDrawdown: number
  currentBandKey: TranslationKey | null
  /** Tỷ lệ kịch bản xuống một lần thắng chia đợt trong nhóm dữ liệu đang dùng. */
  lsWinRate: number
  stagingMonths: number
}

export type AdviceStatus = 'ok' | 'insufficient-data'

export interface Advice {
  status: AdviceStatus
  /** Đã xếp hạng, danh mục đủ điều kiện trước, điểm cao trước. */
  evaluations: PortfolioEvaluation[]
  best: PortfolioEvaluation | null
  deploy: DeployAdvice | null
  commonStart: string | null
  commonEnd: string | null
}

export interface AdvisorInput {
  prices: Map<string, PricePoint[]>
  horizonYears: number
  risk: RiskProfile
  stagingMonths: number
  candidates?: AdvisorCandidate[]
}

/** Lấy thưa một ngày bắt đầu mỗi 5 ngày (~hàng tuần), xem startStride ở computeRollingScenarios. */
const START_STRIDE = 5

/** Kết quả mô phỏng của một danh mục — chưa phụ thuộc khẩu vị rủi ro. */
interface SimulatedCandidate {
  candidate: AdvisorCandidate
  scenarios: LSvsDCAScenario[]
  path: PricePoint[]
  independentWindows: number
  medianAnnualized: number
  p10Annualized: number
  lossRate: number
  maxDrawdown: number
  currentDrawdown: number
}

/**
 * Phần nặng của tư vấn: chạy mô phỏng cho mọi danh mục. Không phụ thuộc khẩu vị
 * rủi ro và số tiền, nên giao diện chỉ chạy lại khi đổi kỳ nắm giữ hoặc số tháng
 * chia đợt; đổi khẩu vị chỉ xếp hạng lại (adviseFromSimulation), tức thì.
 */
export interface AdvisorSimulation {
  candidates: SimulatedCandidate[]
  horizonYears: number
  stagingMonths: number
  commonStart: string
  commonEnd: string
}

/** Các mức chia: xuống ngay bao nhiêu phần trăm, phần còn lại chia đợt. */
export const LUMP_FRACTIONS = [1, 0.75, 0.5, 0.25, 0]

/** Hai điểm số chênh nhau dưới mức này coi như hoà, chọn phương án gọn hơn. */
const SCORE_TIE = 0.002

function annualize(growth: number, years: number): number {
  return growth > 0 ? Math.pow(growth, 1 / years) - 1 : -1
}

function blend(score: { median: number; p10: number }, tailWeight: number): number {
  return (1 - tailWeight) * score.median + tailWeight * score.p10
}

/**
 * Cắt mọi chuỗi về cùng ngày bắt đầu (ngày muộn nhất trong các quỹ cần dùng).
 * Bắt buộc để các danh mục so được với nhau: DCDS có dữ liệu từ 2004, nếu để
 * nguyên thì nó gánh cả khủng hoảng 2008 còn ETF thì không, và bảng xếp hạng
 * thành so hai thời kỳ khác nhau chứ không phải hai danh mục.
 */
export function trimToCommonStart(
  prices: Map<string, PricePoint[]>,
  ids: string[],
): Map<string, PricePoint[]> {
  let start = ''
  for (const id of ids) {
    const series = prices.get(id)
    if (!series || series.length === 0) return new Map()
    const first = series[0]!.date
    if (first > start) start = first
  }
  const out = new Map<string, PricePoint[]>()
  for (const id of ids) {
    out.set(id, prices.get(id)!.filter(p => p.date >= start))
  }
  return out
}

/** Đường giá mua rồi giữ của danh mục (không tái cân bằng), gốc 1, trên các ngày chung. */
function buyAndHoldPath(
  aligned: Map<string, PricePoint[]>,
  slots: DCASlot[],
): PricePoint[] {
  const valid = slots.filter(s => s.fundId && s.weight > 0)
  const totalWeight = valid.reduce((a, s) => a + s.weight, 0)
  if (valid.length === 0 || totalWeight <= 0) return []

  const maps = valid.map(s => {
    const m = new Map<string, number>()
    for (const p of aligned.get(s.fundId) ?? []) m.set(p.date, p.price)
    return m
  })
  const first = aligned.get(valid[0]!.fundId) ?? []
  const path: PricePoint[] = []
  const base: number[] = []
  for (const p of first) {
    const dayPrices = maps.map(m => m.get(p.date))
    if (dayPrices.some(v => v === undefined || v <= 0)) continue
    if (base.length === 0) dayPrices.forEach(v => base.push(v!))
    let value = 0
    for (let j = 0; j < valid.length; j++) {
      value += (valid[j]!.weight / totalWeight) * (dayPrices[j]! / base[j]!)
    }
    path.push({ date: p.date, price: value })
  }
  return path
}

function maxDrawdownOf(path: PricePoint[]): number {
  let worst = 0
  for (const { drawdown } of drawdownFromRunningPeak(path).values()) {
    if (drawdown < worst) worst = drawdown
  }
  return -worst
}

function simulateCandidate(
  aligned: Map<string, PricePoint[]>,
  candidate: AdvisorCandidate,
  horizonYears: number,
  stagingMonths: number,
): SimulatedCandidate | null {
  const holdingMonths = horizonYears * 12
  const scenarios = computeRollingScenarios(
    aligned, candidate.slots, 1, stagingMonths, 'monthly',
    'savings', ADVISOR_CASH_RATE, null, holdingMonths, START_STRIDE,
  )
  if (scenarios.length === 0) return null

  const path = buyAndHoldPath(aligned, candidate.slots)
  if (path.length === 0) return null

  const ls = scenarios.map(s => s.lsGrowth).sort((a, b) => a - b)
  const lastPoint = path[path.length - 1]!
  return {
    candidate,
    scenarios,
    path,
    independentWindows: countIndependentWindows(
      alignedSpanMonths(aligned, candidate.slots), holdingMonths,
    ),
    medianAnnualized: annualize(percentileSorted(ls, 0.5), horizonYears),
    p10Annualized: annualize(percentileSorted(ls, 0.1), horizonYears),
    lossRate: ls.filter(g => g < 1).length / ls.length,
    maxDrawdown: maxDrawdownOf(path),
    currentDrawdown: drawdownFromRunningPeak(path).get(lastPoint.date)?.drawdown ?? 0,
  }
}

/**
 * Chọn cách xuống tiền cho danh mục đã chọn.
 *
 * Xuống f phần ngay và chia đều phần còn lại thì kết quả là pha trộn tuyến tính
 * giữa "xuống hết một lần" và "chia đợt hoàn toàn" (cùng ngày bắt đầu, cùng kỳ
 * nắm giữ, tiền chờ hưởng cùng lãi tiết kiệm), nên không cần mô phỏng thêm.
 */
export function chooseDeployment(
  scenarios: LSvsDCAScenario[],
  path: PricePoint[],
  input: Pick<AdvisorInput, 'horizonYears' | 'risk' | 'stagingMonths'>,
): DeployAdvice {
  const holdingMonths = input.horizonYears * 12
  const ddMap = drawdownFromRunningPeak(path)
  const last = path[path.length - 1]!
  const currentDrawdown = ddMap.get(last.date)?.drawdown ?? 0
  const currentBand = bandIndexOf(currentDrawdown)

  // Các lần vào lệnh trong quá khứ có cùng trạng thái giảm-từ-đỉnh như hôm nay.
  const similar = currentBand < 0
    ? []
    : scenarios.filter(s => {
        const info = ddMap.get(s.startDate)
        return info !== undefined && bandIndexOf(info.drawdown) === currentBand
      })
  const similarEpisodes = independentEpisodeStarts(similar.map(s => s.startDate), holdingMonths).length
  const useSimilar = similarEpisodes >= MIN_DRAWDOWN_EPISODES
  const basis = useSimilar ? similar : scenarios
  const basisEpisodes = useSimilar
    ? similarEpisodes
    : independentEpisodeStarts(scenarios.map(s => s.startDate), holdingMonths).length

  const tailWeight = RISK_PARAMS[input.risk].tailWeight
  const options: DeployOption[] = LUMP_FRACTIONS.map(f => {
    const growth = basis.map(s => f * s.lsGrowth + (1 - f) * s.dcaGrowth).sort((a, b) => a - b)
    const median = percentileSorted(growth, 0.5)
    const p10 = percentileSorted(growth, 0.1)
    return {
      lumpFraction: f,
      medianGrowth: median,
      p10Growth: p10,
      lossRate: growth.filter(g => g < 1).length / growth.length,
      score: blend({ median, p10 }, tailWeight),
    }
  })

  // LUMP_FRACTIONS đi từ gọn nhất (một lần) tới chia đợt hoàn toàn, nên chỉ đổi
  // phương án khi phương án sau hơn hẳn — hoà thì giữ cái gọn hơn.
  let best = options[0]!
  for (const o of options) {
    if (o.score > best.score + SCORE_TIE) best = o
  }

  return {
    options,
    best,
    basis: useSimilar ? 'similar' : 'all',
    basisScenarios: basis.length,
    basisEpisodes,
    currentDrawdown,
    currentBandKey: currentBand >= 0 ? DRAWDOWN_BANDS[currentBand]!.labelKey : null,
    lsWinRate: basis.filter(s => s.diff > 0).length / basis.length,
    stagingMonths: input.stagingMonths,
  }
}

export function simulateAdvisor(
  input: Pick<AdvisorInput, 'prices' | 'horizonYears' | 'stagingMonths' | 'candidates'>,
): AdvisorSimulation | null {
  const candidates = input.candidates ?? ADVISOR_CANDIDATES
  const ids = advisorFundIds(candidates)
  const trimmed = trimToCommonStart(input.prices, ids)
  if (trimmed.size === 0) return null
  const aligned = alignFundsToCommonGridDaily(trimmed)

  const simulated = candidates
    .map(c => simulateCandidate(aligned, c, input.horizonYears, input.stagingMonths))
    .filter((e): e is SimulatedCandidate => e !== null)
  if (simulated.length === 0) return null

  const dates = aligned.get(ids[0]!) ?? []
  if (dates.length === 0) return null
  return {
    candidates: simulated,
    horizonYears: input.horizonYears,
    stagingMonths: input.stagingMonths,
    commonStart: dates[0]!.date,
    commonEnd: dates[dates.length - 1]!.date,
  }
}

/** Xếp hạng theo khẩu vị rủi ro và chọn cách xuống tiền. Rẻ, chạy lại thoải mái. */
export function adviseFromSimulation(sim: AdvisorSimulation | null, risk: RiskProfile): Advice {
  const empty: Advice = {
    status: 'insufficient-data', evaluations: [], best: null, deploy: null,
    commonStart: null, commonEnd: null,
  }
  if (!sim) return empty

  const params = RISK_PARAMS[risk]
  const rows = sim.candidates.map(c => ({
    sim: c,
    evaluation: {
      candidate: c.candidate,
      scenarios: c.scenarios.length,
      independentWindows: c.independentWindows,
      quality: sampleQuality(c.independentWindows),
      medianAnnualized: c.medianAnnualized,
      p10Annualized: c.p10Annualized,
      lossRate: c.lossRate,
      maxDrawdown: c.maxDrawdown,
      currentDrawdown: c.currentDrawdown,
      eligible: c.maxDrawdown <= params.maxDrawdown,
      score: blend({ median: c.medianAnnualized, p10: c.p10Annualized }, params.tailWeight),
    } satisfies PortfolioEvaluation,
  }))

  const ranked = rows.sort((a, b) => {
    if (a.evaluation.eligible !== b.evaluation.eligible) return a.evaluation.eligible ? -1 : 1
    return b.evaluation.score - a.evaluation.score
  })
  const evaluations = ranked.map(r => r.evaluation)
  const top = ranked[0]!
  // Không danh mục nào đủ điều kiện rủi ro (không thể xảy ra khi có tiết kiệm
  // trong danh sách, nhưng đừng đề xuất bừa nếu người gọi bỏ nó đi).
  if (!top.evaluation.eligible) return { ...empty, evaluations }

  return {
    status: 'ok',
    evaluations,
    best: top.evaluation,
    deploy: chooseDeployment(top.sim.scenarios, top.sim.path, {
      horizonYears: sim.horizonYears, risk, stagingMonths: sim.stagingMonths,
    }),
    commonStart: sim.commonStart,
    commonEnd: sim.commonEnd,
  }
}

/** Đường tắt: mô phỏng rồi tư vấn một lần. */
export function buildAdvice(input: AdvisorInput): Advice {
  return adviseFromSimulation(simulateAdvisor(input), input.risk)
}
