import { useEffect, useState } from 'react'
import type { FundFees } from '../utils/fundFees'

let cache: Promise<Map<string, FundFees>> | null = null

function load(): Promise<Map<string, FundFees>> {
  cache ??= fetch('/data/fund_fees.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<FundFees[]>
    })
    .then(rows => new Map(rows.map(f => [f.code, f])))
    .catch(() => {
      cache = null // lần sau thử lại thay vì kẹt vĩnh viễn ở lỗi
      return new Map<string, FundFees>()
    })
  return cache
}

/** Biểu phí từng quỹ (public/data/fund_fees.json). Rỗng nếu chưa tải được. */
export function useFundFees(): { fees: Map<string, FundFees>; loaded: boolean } {
  const [state, setState] = useState<{ fees: Map<string, FundFees>; loaded: boolean }>({ fees: new Map(), loaded: false })
  useEffect(() => {
    let cancelled = false
    load().then(fees => { if (!cancelled) setState({ fees, loaded: true }) })
    return () => { cancelled = true }
  }, [])
  return state
}
