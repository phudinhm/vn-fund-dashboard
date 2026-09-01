import { useCallback, useSyncExternalStore } from 'react'
import { loadLS, saveLS } from '../utils/localStorage'

const STORAGE_KEY = 'watchlist_v1'

/**
 * Store nằm ngoài React, chia sẻ giữa mọi component gọi useWatchlist() cùng
 * lúc (vd nút sao trong FundSelector và danh sách trong tab Theo Dõi) — đổi ở
 * đâu cũng phản ánh ngay ở chỗ khác, không cần prop drilling.
 */
let ids: string[] = loadLS<string[]>(STORAGE_KEY, [])
const listeners = new Set<() => void>()

function setIds(next: string[]) {
  ids = next
  saveLS(STORAGE_KEY, next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): string[] {
  return ids
}

export interface UseWatchlistResult {
  /** Id quỹ đang theo dõi, theo thứ tự thêm vào. */
  ids: string[]
  isWatched: (fundId: string) => boolean
  add: (fundId: string) => void
  remove: (fundId: string) => void
  toggle: (fundId: string) => void
}

export function useWatchlist(): UseWatchlistResult {
  const current = useSyncExternalStore(subscribe, getSnapshot)

  const isWatched = useCallback((fundId: string) => current.includes(fundId), [current])

  const add = useCallback((fundId: string) => {
    if (ids.includes(fundId)) return
    setIds([...ids, fundId])
  }, [])

  const remove = useCallback((fundId: string) => {
    if (!ids.includes(fundId)) return
    setIds(ids.filter(id => id !== fundId))
  }, [])

  const toggle = useCallback((fundId: string) => {
    if (ids.includes(fundId)) setIds(ids.filter(id => id !== fundId))
    else setIds([...ids, fundId])
  }, [])

  return { ids: current, isWatched, add, remove, toggle }
}
