import { useEffect, useState } from 'react'
import type { PricePoint } from '../types'
import { parseCSV } from '../utils/csvParser'
import type { StockEvent } from '../utils/stockDca'

/** Một mã trong danh sách chọn của tab DCA cổ phiếu (public/data/stocks/index.json). */
export interface StockMeta {
  ticker: string
  /** Tên hiển thị (không dịch: tên doanh nghiệp). */
  name: string
  /**
   * Giá trong <ticker>.csv là giá đóng cửa THẬT ('raw') hay đã điều chỉnh cổ tức
   * và chia tách ('adjusted'). Quyết định có áp sự kiện doanh nghiệp lên sổ tài
   * khoản hay không: áp sự kiện lên giá đã điều chỉnh là tính mỗi sự kiện hai lần.
   */
  basis: 'raw' | 'adjusted'
  first?: string
  last?: string
}

interface StockIndexState {
  stocks: StockMeta[]
  loading: boolean
  error: string | null
}

export function useStockIndex(): StockIndexState {
  const [state, setState] = useState<StockIndexState>({ stocks: [], loading: true, error: null })
  useEffect(() => {
    let cancelled = false
    fetch('/data/stocks/index.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<StockMeta[]>
      })
      .then(stocks => { if (!cancelled) setState({ stocks, loading: false, error: null }) })
      .catch((e: unknown) => {
        if (!cancelled) setState({ stocks: [], loading: false, error: e instanceof Error ? e.message : String(e) })
      })
    return () => { cancelled = true }
  }, [])
  return state
}

interface StockSeriesState {
  prices: PricePoint[] | null
  events: StockEvent[]
  loading: boolean
  error: string | null
}

/** Giá + sự kiện của một mã. Sự kiện nằm ở <ticker>.events.json (có thể không có). */
export function useStockSeries(ticker: string | null): StockSeriesState {
  const [state, setState] = useState<StockSeriesState & { key: string | null }>({
    key: null, prices: null, events: [], loading: false, error: null,
  })

  useEffect(() => {
    if (!ticker) return
    let cancelled = false
    ;(async () => {
      try {
        const resp = await fetch(`/data/stocks/${ticker}.csv`)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const prices = parseCSV(await resp.text()).points
        let events: StockEvent[] = []
        try {
          const er = await fetch(`/data/stocks/${ticker}.events.json`)
          if (er.ok) events = (await er.json()) as StockEvent[]
        } catch { /* không có file sự kiện: coi như không có sự kiện */ }
        if (!cancelled) setState({ key: ticker, prices, events, loading: false, error: null })
      } catch (e) {
        if (!cancelled) {
          setState({ key: ticker, prices: null, events: [], loading: false, error: e instanceof Error ? e.message : String(e) })
        }
      }
    })()
    return () => { cancelled = true }
  }, [ticker])

  if (!ticker) return { prices: null, events: [], loading: false, error: null }
  if (state.key !== ticker) return { prices: null, events: [], loading: true, error: null }
  return { prices: state.prices, events: state.events, loading: state.loading, error: state.error }
}
