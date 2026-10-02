import type { PricePoint, ReturnPoint } from '../types'
import { TwrrChain } from './twrr'
import { dcaMWRR, dcaCagr } from './dca'

/**
 * Danh mục cá nhân dựng từ các báo cáo tài sản và lệnh nhập tay.
 *
 * Mỗi báo cáo là một ẢNH CHỤP số dư (số CCQ + giá mua bình quân). Lệnh được SUY
 * RA từ chênh lệch giữa hai ảnh chụp liên tiếp:
 *   - tăng CCQ  → lệnh MUA, giá suy từ giá vốn bình quân mới:
 *                   giá = (CCQ mới × giá vốn mới − CCQ cũ × giá vốn cũ) ÷ CCQ tăng
 *   - giảm CCQ  → lệnh BÁN tại NAV của ảnh chụp mới (bán không đổi giá vốn bình quân)
 * Ngày thật của lệnh nằm đâu đó giữa hai ảnh chụp mà báo cáo không cho biết, nên
 * mặc định đặt ở ngày ảnh chụp mới và người dùng chỉnh được. Ảnh chụp đầu tiên
 * cho ra lệnh "số dư đầu kỳ" (không biết ngày mua) cũng đặt ở ngày báo cáo.
 */

export interface SnapshotHolding {
  fund: string
  units: number
  avgPrice: number
  nav: number
}

export interface Snapshot {
  date: string
  holdings: SnapshotHolding[]
}

export type OrderSource = 'opening' | 'inferred' | 'manual'

export interface Order {
  /** Khoá ổn định: với lệnh suy ra là `<ngày ảnh chụp>|<quỹ>`, với lệnh nhập tay là id riêng. */
  id: string
  date: string
  fund: string
  side: 'buy' | 'sell'
  units: number
  price: number
  source: OrderSource
}

export interface PortfolioState {
  snapshots: Snapshot[]
  manualOrders: Order[]
  /** Ngày người dùng chỉnh cho lệnh suy ra (theo id lệnh). */
  dateOverrides: Record<string, string>
  /** Lệnh suy ra mà người dùng đã xoá (theo id lệnh). */
  ignored: string[]
}

export const EMPTY_STATE: PortfolioState = { snapshots: [], manualOrders: [], dateOverrides: {}, ignored: [] }

const UNIT_EPS = 1e-6

/** Thêm hoặc thay ảnh chụp cùng ngày; giữ thứ tự theo ngày. */
export function upsertSnapshot(state: PortfolioState, snap: Snapshot): PortfolioState {
  const snapshots = [...state.snapshots.filter(s => s.date !== snap.date), snap].sort((a, b) => a.date.localeCompare(b.date))
  return { ...state, snapshots }
}

export function removeSnapshot(state: PortfolioState, date: string): PortfolioState {
  const prefix = `${date}|`
  return {
    ...state,
    snapshots: state.snapshots.filter(s => s.date !== date),
    dateOverrides: Object.fromEntries(Object.entries(state.dateOverrides).filter(([k]) => !k.startsWith(prefix))),
    ignored: state.ignored.filter(k => !k.startsWith(prefix)),
  }
}

/** Lệnh suy ra từ dãy ảnh chụp (chưa áp chỉnh sửa của người dùng). */
export function deriveOrders(snapshots: Snapshot[]): Order[] {
  const out: Order[] = []
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date))
  sorted.forEach((snap, i) => {
    const prev = i > 0 ? new Map(sorted[i - 1]!.holdings.map(h => [h.fund, h])) : null
    const cur = new Map(snap.holdings.map(h => [h.fund, h]))
    const funds = new Set([...cur.keys(), ...(prev ? prev.keys() : [])])
    for (const fund of [...funds].sort()) {
      const now = cur.get(fund)
      const before = prev?.get(fund)
      const id = `${snap.date}|${fund}`
      if (!prev) {
        if (now) out.push({ id, date: snap.date, fund, side: 'buy', units: now.units, price: now.avgPrice, source: 'opening' })
        continue
      }
      const u1 = now?.units ?? 0
      const u0 = before?.units ?? 0
      const delta = u1 - u0
      if (Math.abs(delta) <= UNIT_EPS * Math.max(1, u0)) continue
      if (delta > 0 && now) {
        let price = before ? (u1 * now.avgPrice - u0 * before.avgPrice) / delta : now.avgPrice
        // Làm tròn số liệu trong báo cáo có thể cho giá vô lý khi lệnh rất nhỏ: rơi về NAV.
        if (!(price > 0) || price > now.nav * 3 || price < now.nav / 3) price = now.nav
        out.push({ id, date: snap.date, fund, side: 'buy', units: delta, price, source: 'inferred' })
      } else if (delta < 0) {
        const price = now?.nav ?? before?.nav ?? 0
        if (price > 0) out.push({ id, date: snap.date, fund, side: 'sell', units: -delta, price, source: 'inferred' })
      }
    }
  })
  return out
}

/** Toàn bộ lệnh đang hiệu lực: suy ra (đã áp ngày chỉnh, bỏ lệnh đã xoá) cộng lệnh nhập tay, theo ngày. */
export function effectiveOrders(state: PortfolioState): Order[] {
  const ignored = new Set(state.ignored)
  const derived = deriveOrders(state.snapshots)
    .filter(o => !ignored.has(o.id))
    .map(o => ({ ...o, date: state.dateOverrides[o.id] ?? o.date }))
  return [...derived, ...state.manualOrders].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export interface Position {
  fund: string
  units: number
  /** Giá vốn bình quân (phương pháp bình quân gia quyền). */
  avgCost: number
  costBasis: number
  realized: number
}

/** Vị thế cuối cùng từ chuỗi lệnh, theo giá vốn bình quân. Bán quá số đang giữ bị cắt về 0. */
export function positionsFromOrders(orders: Order[]): Map<string, Position> {
  const pos = new Map<string, Position>()
  for (const o of orders) {
    const p = pos.get(o.fund) ?? { fund: o.fund, units: 0, avgCost: 0, costBasis: 0, realized: 0 }
    if (o.side === 'buy') {
      p.costBasis += o.units * o.price
      p.units += o.units
      p.avgCost = p.units > 0 ? p.costBasis / p.units : 0
    } else {
      const sold = Math.min(o.units, p.units)
      p.realized += sold * (o.price - p.avgCost)
      p.units -= sold
      p.costBasis = p.units * p.avgCost
    }
    pos.set(o.fund, p)
  }
  return pos
}

/** Lệnh bán lớn hơn số CCQ đang giữ tại thời điểm đó (theo thứ tự ngày): phần vượt bị bỏ qua khi tính, nên cần báo. */
export function findOversells(orders: Order[]): { order: Order; held: number }[] {
  const held = new Map<string, number>()
  const out: { order: Order; held: number }[] = []
  for (const o of [...orders].sort((a, b) => a.date.localeCompare(b.date) || (a.side === 'buy' ? -1 : 1))) {
    const h = held.get(o.fund) ?? 0
    if (o.side === 'buy') held.set(o.fund, h + o.units)
    else {
      if (o.units > h + 1e-6) out.push({ order: o, held: h })
      held.set(o.fund, Math.max(0, h - o.units))
    }
  }
  return out
}

/** Độ lệch giữa giá lệnh và NAV cùng ngày (thập phân), null nếu không có NAV để so. */
export function priceDeviation(order: Order, series: PricePoint[] | undefined): number | null {
  if (!series || series.length === 0) return null
  let nav: number | null = null
  for (const p of series) {
    if (p.date > order.date) break
    nav = p.price
  }
  if (nav === null) return null
  return order.price / nav - 1
}

export interface Mismatch { fund: string; fromOrders: number; fromReport: number }

/** So số CCQ từ lệnh với ảnh chụp mới nhất: lệch nghĩa là còn thiếu lệnh hoặc lệnh nhập tay sai. */
export function reconcile(state: PortfolioState): Mismatch[] {
  const latest = state.snapshots[state.snapshots.length - 1]
  if (!latest) return []
  const pos = positionsFromOrders(effectiveOrders(state))
  const funds = new Set([...latest.holdings.map(h => h.fund), ...pos.keys()])
  const out: Mismatch[] = []
  for (const fund of funds) {
    const fromReport = latest.holdings.find(h => h.fund === fund)?.units ?? 0
    const fromOrders = pos.get(fund)?.units ?? 0
    if (Math.abs(fromReport - fromOrders) > 1e-4 * Math.max(1, fromReport)) out.push({ fund, fromOrders, fromReport })
  }
  return out
}

// ─── Hiệu suất ───────────────────────────────────────────────────────────────

export interface PerformanceResult {
  startDate: string
  endDate: string
  values: { date: string; value: number }[]
  invested: { date: string; value: number }[]
  /** TWRR tích lũy trên NAV (tiền nạp/rút tách khỏi lợi nhuận). */
  cumulative: ReturnPoint[]
  /** Dòng tiền thật cho MWRR: mua âm, bán dương, cuối kỳ dương bằng giá trị danh mục. */
  cashflows: { date: string; amount: number }[]
  /** Số tiền ròng đã bỏ vào (mua − bán, theo giá khớp). */
  netInvested: number
  finalValue: number
  /** Lãi/lỗ tuyệt đối: giá trị hiện tại − vốn ròng. */
  gain: number
  gainPct: number | null
  twrrCumulative: number
  twrrAnnualized: number | null
  mwrr: number | null
  positions: PositionView[]
  /** Quỹ có lệnh nhưng không có chuỗi NAV: định giá bằng NAV trong báo cáo (nếu có) hoặc giá lệnh cuối. */
  fallbackFunds: string[]
}

export interface PositionView extends Position {
  nav: number
  value: number
  unrealizedGain: number
  unrealizedPct: number | null
  weight: number
}

function lastAtOrBefore(series: PricePoint[], date: string, from: number): { idx: number; price: number | null } {
  let i = from
  while (i + 1 < series.length && series[i + 1]!.date <= date) i++
  return series[i] && series[i]!.date <= date ? { idx: i, price: series[i]!.price } : { idx: from, price: null }
}

/**
 * Hiệu suất danh mục từ chuỗi lệnh và NAV từng quỹ.
 *
 * TWRR dùng đúng TwrrChain của các tab DCA: lệnh là dòng tiền ngoài, tách khỏi lợi
 * nhuận, và dòng tiền tính theo NAV ngày khớp (đo hiệu suất của NAV, không lẫn chênh
 * lệch giữa giá lệnh và NAV). MWRR và lãi/lỗ tuyệt đối dùng GIÁ KHỚP thật của lệnh.
 * Chưa có phí giao dịch: báo cáo tài sản không nêu phí của từng lệnh.
 */
export function computePerformance(
  orders: Order[],
  priceByFund: Map<string, PricePoint[]>,
  fallbackNav: Map<string, number>,
  endDateHint?: string,
): PerformanceResult | null {
  if (orders.length === 0) return null
  const sortedOrders = [...orders].sort((a, b) => a.date.localeCompare(b.date))
  const funds = [...new Set(sortedOrders.map(o => o.fund))]

  // Chuỗi giá từng quỹ; thiếu thì dựng chuỗi 1 điểm từ NAV dự phòng.
  const series = new Map<string, PricePoint[]>()
  const fallbackFunds: string[] = []
  for (const f of funds) {
    const s = priceByFund.get(f)
    if (s && s.length > 0) series.set(f, s)
    else {
      fallbackFunds.push(f)
      const last = [...sortedOrders].reverse().find(o => o.fund === f)!
      series.set(f, [{ date: last.date, price: fallbackNav.get(f) ?? last.price }])
    }
  }

  const startDate = sortedOrders[0]!.date
  const lastSeriesDate = [...series.values()].reduce((m, s) => (s[s.length - 1]!.date > m ? s[s.length - 1]!.date : m), startDate)
  const endDate = [lastSeriesDate, endDateHint ?? '', sortedOrders[sortedOrders.length - 1]!.date].reduce((a, b) => (b > a ? b : a))

  // Lưới ngày: mọi ngày có giá của các quỹ trong khoảng, cộng ngày lệnh và ngày cuối.
  const dateSet = new Set<string>([startDate, endDate])
  for (const s of series.values()) for (const p of s) if (p.date >= startDate && p.date <= endDate) dateSet.add(p.date)
  for (const o of sortedOrders) dateSet.add(o.date)
  const dates = [...dateSet].sort()

  const cursor = new Map<string, number>(funds.map(f => [f, 0]))
  const navOn = (fund: string, date: string): number => {
    const s = series.get(fund)!
    const { idx, price } = lastAtOrBefore(s, date, cursor.get(fund)!)
    cursor.set(fund, idx)
    // Trước điểm giá đầu tiên (hoặc sau điểm cuối): dùng điểm gần nhất thay vì 0.
    return price ?? (date < s[0]!.date ? s[0]!.price : s[s.length - 1]!.price)
  }

  const units = new Map<string, number>(funds.map(f => [f, 0]))
  const chain = new TwrrChain()
  const values: { date: string; value: number }[] = []
  const invested: { date: string; value: number }[] = []
  const cashflows: { date: string; amount: number }[] = []
  let netInvested = 0
  let prevEnd = 0
  let oi = 0

  dates.forEach((date, di) => {
    let v0 = 0
    for (const f of funds) v0 += units.get(f)! * navOn(f, date)
    let flow = 0
    let cash = 0
    while (oi < sortedOrders.length && sortedOrders[oi]!.date <= date) {
      const o = sortedOrders[oi++]!
      const nav = navOn(o.fund, date)
      const sign = o.side === 'buy' ? 1 : -1
      const held = units.get(o.fund)!
      const qty = o.side === 'sell' ? Math.min(o.units, held) : o.units
      units.set(o.fund, held + sign * qty)
      flow += sign * qty * nav
      cash += sign * qty * o.price
    }
    let v1 = 0
    for (const f of funds) v1 += units.get(f)! * navOn(f, date)
    netInvested += cash
    if (cash !== 0) cashflows.push({ date, amount: -cash })
    if (di === 0) chain.start(date, flow, v1, 0)
    else chain.step({ date, prevEnd, v0, flow, v1, costs: 0 })
    values.push({ date, value: v1 })
    invested.push({ date, value: netInvested })
    prevEnd = v1
  })

  const finalValue = values[values.length - 1]!.value
  const series2 = chain.result()
  const cumulative = series2.cumulative
  const twrrCumulative = cumulative[cumulative.length - 1]?.value ?? 0
  cashflows.push({ date: endDate, amount: finalValue })

  const pos = positionsFromOrders(sortedOrders)
  const totalValue = finalValue || 1
  const positions: PositionView[] = [...pos.values()]
    .filter(p => p.units > UNIT_EPS)
    .map(p => {
      const nav = navOn(p.fund, endDate)
      const value = p.units * nav
      return {
        ...p, nav, value,
        unrealizedGain: value - p.costBasis,
        unrealizedPct: p.costBasis > 0 ? value / p.costBasis - 1 : null,
        weight: value / totalValue,
      }
    })
    .sort((a, b) => b.value - a.value)

  return {
    startDate, endDate, values, invested, cumulative, cashflows,
    netInvested, finalValue,
    gain: finalValue - netInvested,
    gainPct: netInvested > 0 ? finalValue / netInvested - 1 : null,
    twrrCumulative,
    twrrAnnualized: dcaCagr(cumulative),
    mwrr: dcaMWRR(cashflows),
    positions,
    fallbackFunds,
  }
}

// ─── Lưu trữ ─────────────────────────────────────────────────────────────────

const ISO = /^\d{4}-\d{2}-\d{2}$/
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Đọc trạng thái đã lưu / nhập từ file sao lưu: bỏ mọi phần tử không hợp lệ thay vì tin dữ liệu ngoài. */
export function sanitizeState(raw: unknown): PortfolioState {
  if (!raw || typeof raw !== 'object') return EMPTY_STATE
  const r = raw as Record<string, unknown>
  const snapshots: Snapshot[] = []
  for (const s of Array.isArray(r.snapshots) ? r.snapshots : []) {
    if (!s || typeof s !== 'object' || typeof (s as Snapshot).date !== 'string' || !ISO.test((s as Snapshot).date)) continue
    const holdings: SnapshotHolding[] = []
    for (const h of Array.isArray((s as Snapshot).holdings) ? (s as Snapshot).holdings : []) {
      if (h && typeof h.fund === 'string' && isNum(h.units) && isNum(h.avgPrice) && isNum(h.nav) && h.units > 0 && h.avgPrice > 0 && h.nav > 0) {
        holdings.push({ fund: h.fund.toUpperCase().slice(0, 15), units: h.units, avgPrice: h.avgPrice, nav: h.nav })
      }
    }
    snapshots.push({ date: (s as Snapshot).date, holdings })
  }
  snapshots.sort((a, b) => a.date.localeCompare(b.date))
  const manualOrders: Order[] = []
  for (const o of Array.isArray(r.manualOrders) ? r.manualOrders : []) {
    if (o && typeof o.id === 'string' && typeof o.fund === 'string' && typeof o.date === 'string' && ISO.test(o.date)
      && (o.side === 'buy' || o.side === 'sell') && isNum(o.units) && o.units > 0 && isNum(o.price) && o.price > 0) {
      manualOrders.push({ id: o.id.slice(0, 60), date: o.date, fund: o.fund.toUpperCase().slice(0, 15), side: o.side, units: o.units, price: o.price, source: 'manual' })
    }
  }
  const dateOverrides: Record<string, string> = {}
  if (r.dateOverrides && typeof r.dateOverrides === 'object') {
    for (const [k, v] of Object.entries(r.dateOverrides as Record<string, unknown>)) {
      if (typeof v === 'string' && ISO.test(v)) dateOverrides[k] = v
    }
  }
  const ignored = Array.isArray(r.ignored) ? r.ignored.filter((x): x is string => typeof x === 'string') : []
  return { snapshots, manualOrders, dateOverrides, ignored }
}
