import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWatchlist } from './useWatchlist'

/** Đưa store về rỗng trước mỗi test — store nằm ngoài React (module-level)
 *  nên phải tự dọn qua chính API của hook, `localStorage.clear()` không đủ
 *  vì biến `ids` trong module đã cache giá trị cũ trong bộ nhớ. */
function resetWatchlist() {
  const { result } = renderHook(() => useWatchlist())
  act(() => {
    for (const id of [...result.current.ids]) result.current.remove(id)
  })
}

describe('useWatchlist', () => {
  beforeEach(() => {
    resetWatchlist()
    localStorage.clear()
  })

  it('starts empty', () => {
    const { result } = renderHook(() => useWatchlist())
    expect(result.current.ids).toEqual([])
  })

  it('adds a fund id', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => result.current.add('DCDS'))
    expect(result.current.ids).toEqual(['DCDS'])
    expect(result.current.isWatched('DCDS')).toBe(true)
  })

  it('does not add the same id twice', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => {
      result.current.add('DCDS')
      result.current.add('DCDS')
    })
    expect(result.current.ids).toEqual(['DCDS'])
  })

  it('removes a fund id', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => result.current.add('DCDS'))
    act(() => result.current.remove('DCDS'))
    expect(result.current.ids).toEqual([])
    expect(result.current.isWatched('DCDS')).toBe(false)
  })

  it('toggle adds then removes', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => result.current.toggle('DCDS'))
    expect(result.current.isWatched('DCDS')).toBe(true)
    act(() => result.current.toggle('DCDS'))
    expect(result.current.isWatched('DCDS')).toBe(false)
  })

  it('persists ids to localStorage', () => {
    const { result } = renderHook(() => useWatchlist())
    act(() => result.current.add('E1VFVN30'))
    expect(JSON.parse(localStorage.getItem('watchlist_v1')!)).toEqual(['E1VFVN30'])
  })

  it('keeps independent hook instances in sync', () => {
    const a = renderHook(() => useWatchlist())
    const b = renderHook(() => useWatchlist())
    act(() => a.result.current.add('VESAF'))
    expect(b.result.current.ids).toEqual(['VESAF'])
    act(() => b.result.current.remove('VESAF'))
    expect(a.result.current.ids).toEqual([])
  })
})
