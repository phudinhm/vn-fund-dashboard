import type { FundMeta } from '../types'
import { fundHouse } from './fundHouse'

/**
 * Bộ lọc danh sách quỹ trong các ô chọn quỹ. Lọc chỉ thu hẹp DANH SÁCH ĐỂ CHỌN,
 * không đụng tới quỹ đã được chọn: quỹ đang dùng luôn còn trong danh sách
 * (xem `keepIds`), nếu không ô chọn sẽ hiện trống ngay khi đổi bộ lọc.
 */
export interface FundFilter {
  /** Loại tài sản được giữ. Rỗng = mọi loại. */
  types: FundMeta['type'][]
  /** Công ty quản lý quỹ (tên ngắn trong utils/fundHouse). Null = mọi công ty. */
  house: string | null
  /** Chỉ quỹ đang trong danh sách theo dõi. */
  watchOnly: boolean
}

export const DEFAULT_FUND_FILTER: FundFilter = { types: [], house: null, watchOnly: false }

export function isFilterActive(f: FundFilter): boolean {
  return f.types.length > 0 || f.house !== null || f.watchOnly
}

export function applyFundFilter(
  funds: FundMeta[],
  filter: FundFilter,
  watchedIds: readonly string[],
  keepIds: readonly string[] = [],
): FundMeta[] {
  if (!isFilterActive(filter)) return funds
  const keep = new Set(keepIds)
  const watched = new Set(watchedIds)
  return funds.filter(f => {
    if (keep.has(f.id)) return true
    if (filter.types.length > 0 && !filter.types.includes(f.type)) return false
    if (filter.house !== null && fundHouse(f.id) !== filter.house) return false
    if (filter.watchOnly && !watched.has(f.id)) return false
    return true
  })
}

/** Công ty quỹ có mặt trong danh sách (đã sắp theo tên), để dựng ô chọn công ty. */
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
  return {
    types,
    house: typeof r.house === 'string' && r.house ? r.house : null,
    watchOnly: r.watchOnly === true,
  }
}
