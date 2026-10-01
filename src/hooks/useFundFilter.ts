import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { FundMeta } from '../types'
import { loadLS, saveLS } from '../utils/localStorage'
import {
  DEFAULT_FUND_FILTER, applyFundFilter, isFilterActive, sanitizeFilter, type FundFilter,
} from '../utils/fundFilter'
import { useWatchlist } from './useWatchlist'

const STORAGE_KEY = 'fund_filter_v1'

/**
 * Bộ lọc quỹ dùng CHUNG cho mọi ô chọn quỹ ở mọi tab: đặt "chỉ trái phiếu" ở
 * So Sánh thì DCA, Overlap, Phân Tích Quỹ... cũng chỉ liệt kê trái phiếu. Store
 * nằm ngoài React (cùng kiểu useWatchlist) và đồng bộ qua các tab trình duyệt.
 */
let filter: FundFilter = sanitizeFilter(loadLS<unknown>(STORAGE_KEY, null))
const listeners = new Set<() => void>()

function setFilter(next: FundFilter) {
  filter = next
  saveLS(STORAGE_KEY, next)
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY && e.key !== null) return
    filter = sanitizeFilter(loadLS<unknown>(STORAGE_KEY, null))
    for (const l of listeners) l()
  })
}

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useFundFilter() {
  const current = useSyncExternalStore(subscribe, () => filter)
  const { ids: watchedIds } = useWatchlist()

  const toggleType = useCallback((type: FundMeta['type']) => {
    const has = filter.types.includes(type)
    setFilter({ ...filter, types: has ? filter.types.filter(t => t !== type) : [...filter.types, type] })
  }, [])
  const setHouse = useCallback((house: string | null) => setFilter({ ...filter, house }), [])
  const setWatchOnly = useCallback((watchOnly: boolean) => setFilter({ ...filter, watchOnly }), [])
  const reset = useCallback(() => setFilter(DEFAULT_FUND_FILTER), [])

  return { filter: current, active: isFilterActive(current), watchedIds, toggleType, setHouse, setWatchOnly, reset }
}

/**
 * Danh sách quỹ đã lọc theo bộ lọc chung. `keepIds` là các quỹ đang được chọn:
 * luôn giữ lại để ô chọn không trống khi bộ lọc loại chúng.
 */
export function useFilteredFunds(funds: FundMeta[], keepIds: readonly string[] = []): FundMeta[] {
  const { filter: f, watchedIds } = useFundFilter()
  const keepKey = keepIds.join('|')
  return useMemo(
    () => applyFundFilter(funds, f, watchedIds, keepIds),
    // keepKey đại diện cho nội dung keepIds (mảng mới mỗi render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [funds, f, watchedIds, keepKey],
  )
}
