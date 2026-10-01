import type { FundMeta } from '../types'
import { fundHouse } from './fundHouse'

/**
 * Bộ lọc danh sách quỹ trong các ô chọn quỹ. Lọc chỉ thu hẹp DANH SÁCH ĐỂ CHỌN,
 * không đụng tới quỹ đã được chọn: quỹ đang dùng luôn còn trong ô chọn (xem
 * `splitByFilter`), nhưng KHÔNG được tính vào số quỹ khớp bộ lọc.
 */
export interface FundFilter {
  /** Loại tài sản được giữ. Rỗng = mọi loại. */
  types: FundMeta['type'][]
  /** Công ty quản lý quỹ (tên ngắn trong utils/fundHouse). Null = mọi công ty. */
  house: string | null
  /** Chỉ quỹ đang trong danh sách theo dõi. */
  watchOnly: boolean
  /** Lịch sử tối thiểu (năm) tính từ ngày thành lập tới nay. Null = không giới hạn. */
  minYears: number | null
  /** Phí quản lý tối đa (%/năm). Null = không giới hạn. Quỹ không có số phí bị loại khi bật. */
  maxFee: number | null
}

export const DEFAULT_FUND_FILTER: FundFilter = {
  types: [], house: null, watchOnly: false, minYears: null, maxFee: null,
}

export const MIN_YEARS_OPTIONS = [3, 5, 10] as const
export const MAX_FEE_OPTIONS = [1, 1.5, 2] as const

/** Dữ liệu ngoài bản thân quỹ mà bộ lọc cần. */
export interface FilterContext {
  watchedIds: readonly string[]
  /** Phí quản lý %/năm theo mã quỹ (null/thiếu = chưa có số). */
  managementFee?: ReadonlyMap<string, number | null>
  /** Ngày "hôm nay" (YYYY-MM-DD), tiêm vào để test ổn định. */
  today?: string
}

export function isFilterActive(f: FundFilter): boolean {
  return f.types.length > 0 || f.house !== null || f.watchOnly || f.minYears !== null || f.maxFee !== null
}

export function activeFilterCount(f: FundFilter): number {
  return f.types.length + (f.house !== null ? 1 : 0) + (f.watchOnly ? 1 : 0)
    + (f.minYears !== null ? 1 : 0) + (f.maxFee !== null ? 1 : 0)
}

function yearsSince(date: string, today: string): number {
  return (new Date(today).getTime() - new Date(date).getTime()) / (365.25 * 86400000)
}

function todayIso(ctx: FilterContext): string {
  return ctx.today ?? new Date().toISOString().slice(0, 10)
}

/** Quỹ có khớp bộ lọc không (bỏ qua một số tiêu chí nếu `skip` có tên tiêu chí đó). */
function matches(
  fund: FundMeta,
  f: FundFilter,
  ctx: FilterContext,
  watched: ReadonlySet<string>,
  skip?: 'types' | 'house',
): boolean {
  if (skip !== 'types' && f.types.length > 0 && !f.types.includes(fund.type)) return false
  if (skip !== 'house' && f.house !== null && fundHouse(fund.id) !== f.house) return false
  if (f.watchOnly && !watched.has(fund.id)) return false
  if (f.minYears !== null && yearsSince(fund.start_date, todayIso(ctx)) < f.minYears) return false
  if (f.maxFee !== null) {
    const fee = ctx.managementFee?.get(fund.id)
    if (fee === null || fee === undefined || fee > f.maxFee) return false
  }
  return true
}

/** Quỹ khớp bộ lọc. Trả đúng `funds` (cùng tham chiếu) khi chưa lọc gì. */
export function applyFundFilter(funds: FundMeta[], filter: FundFilter, ctx: FilterContext): FundMeta[] {
  if (!isFilterActive(filter)) return funds
  const watched = new Set(ctx.watchedIds)
  return funds.filter(fund => matches(fund, filter, ctx, watched))
}

export interface FilterSplit {
  /** Quỹ khớp bộ lọc. */
  matched: FundMeta[]
  /** Quỹ đang được chọn nhưng nằm NGOÀI bộ lọc: vẫn phải hiện để ô chọn không trống. */
  outside: FundMeta[]
  /** matched + outside, để dựng danh sách option. */
  visible: FundMeta[]
}

export function splitByFilter(
  funds: FundMeta[], filter: FundFilter, ctx: FilterContext, keepIds: readonly string[] = [],
): FilterSplit {
  const matched = applyFundFilter(funds, filter, ctx)
  if (keepIds.length === 0) return { matched, outside: [], visible: matched }
  const inMatched = new Set(matched.map(f => f.id))
  const keep = new Set(keepIds)
  const outside = funds.filter(f => keep.has(f.id) && !inMatched.has(f.id))
  return { matched, outside, visible: outside.length === 0 ? matched : funds.filter(f => inMatched.has(f.id) || keep.has(f.id)) }
}

export interface FacetCounts {
  types: Map<FundMeta['type'], number>
  houses: Map<string, number>
  watched: number
}

/**
 * Số quỹ cho từng lựa chọn nếu BẤM vào nó, tính theo các bộ lọc KHÁC đang bật:
 * chip "Trái phiếu" hiện số trái phiếu thuộc công ty đang chọn, không phải tổng
 * toàn cục. Chip về 0 thì không bấm được.
 */
export function facetCounts(funds: FundMeta[], filter: FundFilter, ctx: FilterContext): FacetCounts {
  const watched = new Set(ctx.watchedIds)
  const types = new Map<FundMeta['type'], number>()
  const houses = new Map<string, number>()
  let watchedCount = 0
  for (const fund of funds) {
    if (matches(fund, filter, ctx, watched, 'types')) types.set(fund.type, (types.get(fund.type) ?? 0) + 1)
    const h = fundHouse(fund.id)
    if (h && matches(fund, filter, ctx, watched, 'house')) houses.set(h, (houses.get(h) ?? 0) + 1)
    if (watched.has(fund.id) && matches(fund, { ...filter, watchOnly: false }, ctx, watched)) watchedCount++
  }
  return { types, houses, watched: watchedCount }
}

/** Công ty quỹ có mặt trong danh sách (đã sắp theo tên). */
export function availableHouses(funds: FundMeta[]): string[] {
  const set = new Set<string>()
  for (const f of funds) {
    const h = fundHouse(f.id)
    if (h) set.add(h)
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

const TYPE_ORDER: FundMeta['type'][] = ['mutual_fund', 'etf', 'index', 'balanced', 'bond', 'gold', 'crypto']

/** Loại tài sản có mặt trong danh sách, theo thứ tự cố định như dropdown. */
export function availableTypes(funds: FundMeta[]): FundMeta['type'][] {
  const present = new Set(funds.map(f => f.type))
  return TYPE_ORDER.filter(t => present.has(t))
}

/** Đọc bộ lọc đã lưu, bỏ mọi giá trị không hợp lệ thay vì tin dữ liệu cũ. */
export function sanitizeFilter(raw: unknown): FundFilter {
  if (!raw || typeof raw !== 'object') return DEFAULT_FUND_FILTER
  const r = raw as Record<string, unknown>
  const types = Array.isArray(r.types)
    ? r.types.filter((t): t is FundMeta['type'] => typeof t === 'string' && TYPE_ORDER.includes(t as FundMeta['type']))
    : []
  const years = typeof r.minYears === 'number' && (MIN_YEARS_OPTIONS as readonly number[]).includes(r.minYears) ? r.minYears : null
  const fee = typeof r.maxFee === 'number' && (MAX_FEE_OPTIONS as readonly number[]).includes(r.maxFee) ? r.maxFee : null
  return {
    types,
    house: typeof r.house === 'string' && r.house ? r.house : null,
    watchOnly: r.watchOnly === true,
    minYears: years,
    maxFee: fee,
  }
}
