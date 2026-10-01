import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { FundMeta } from '../types'
import { loadLS, saveLS } from '../utils/localStorage'
import {
  DEFAULT_FUND_FILTER, isFilterActive, sanitizeFilter, splitByFilter,
  type FilterContext, type FilterSplit, type FundFilter,
} from '../utils/fundFilter'
import { useWatchlist } from './useWatchlist'
import { useFundFees } from './useFundFees'

const STORAGE_KEY = 'fund_filter_v2'
const OPEN_KEY = 'fund_filter_open'

/**
 * Bộ lọc quỹ dùng CHUNG cho mọi ô chọn quỹ ở mọi tab: đặt "chỉ trái phiếu" ở
 * So Sánh thì DCA, Overlap, Phân Tích Quỹ... cũng chỉ liệt kê trái phiếu. Store
 * nằm ngoài React (cùng kiểu useWatchlist) và đồng bộ qua các tab trình duyệt.
 */
let filter: FundFilter = sanitizeFilter(loadLS<unknown>(STORAGE_KEY, null))
let open: boolean = loadLS<unknown>(OPEN_KEY, false) === true
const listeners = new Set<() => void>()
const notify = () => { for (const l of listeners) l() }

function setFilter(next: FundFilter) {
  filter = next
  saveLS(STORAGE_KEY, next)
  notify()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY && e.key !== OPEN_KEY && e.key !== null) return
    filter = sanitizeFilter(loadLS<unknown>(STORAGE_KEY, null))
    open = loadLS<unknown>(OPEN_KEY, false) === true
    notify()
  })
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Ngữ cảnh lọc: danh sách theo dõi + phí quản lý (từ fund_fees.json). */
function useFilterContext(): FilterContext {
  const { ids: watchedIds } = useWatchlist()
  const { fees } = useFundFees()
  const managementFee = useMemo(() => new Map([...fees].map(([code, v]) => [code, v.management])), [fees])
  return useMemo(() => ({ watchedIds, managementFee }), [watchedIds, managementFee])
}

export function useFundFilter() {
  const current = useSyncExternalStore(subscribe, () => filter)
  const isOpen = useSyncExternalStore(subscribe, () => open)
  const ctx = useFilterContext()

  const toggleType = useCallback((type: FundMeta['type']) => {
    const has = filter.types.includes(type)
    setFilter({ ...filter, types: has ? filter.types.filter(t => t !== type) : [...filter.types, type] })
  }, [])
  const patch = useCallback((p: Partial<FundFilter>) => setFilter({ ...filter, ...p }), [])
  const reset = useCallback(() => setFilter(DEFAULT_FUND_FILTER), [])
  const setOpen = useCallback((v: boolean) => { open = v; saveLS(OPEN_KEY, v); notify() }, [])

  return { filter: current, active: isFilterActive(current), ctx, isOpen, setOpen, toggleType, patch, reset }
}

/**
 * Tách danh sách quỹ theo bộ lọc chung. `keepIds` là các quỹ đang được chọn:
 * chúng luôn nằm trong `visible` để ô chọn không trống, nhưng nếu bị bộ lọc
 * loại thì xuất hiện ở `outside` để giao diện đánh dấu riêng.
 */
export function useFundFilterSplit(funds: FundMeta[], keepIds: readonly string[] = []): FilterSplit {
  const { filter: f, ctx } = useFundFilter()
  const keepKey = keepIds.join('|')
  return useMemo(
    () => splitByFilter(funds, f, ctx, keepIds),
    // keepKey đại diện cho nội dung keepIds (mảng mới mỗi render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [funds, f, ctx, keepKey],
  )
}

/** Danh sách quỹ để dựng option: khớp bộ lọc cộng các quỹ đang chọn. */
export function useFilteredFunds(funds: FundMeta[], keepIds: readonly string[] = []): FundMeta[] {
  return useFundFilterSplit(funds, keepIds).visible
}
