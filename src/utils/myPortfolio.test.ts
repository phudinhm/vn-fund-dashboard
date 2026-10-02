import { describe, it, expect } from 'vitest'
import {
  findOversells, priceDeviation, computeOrderLots,
  EMPTY_STATE, computePerformance, deriveOrders, effectiveOrders, positionsFromOrders, reconcile,
  removeSnapshot, sanitizeState, upsertSnapshot, type Order, type PortfolioState, type Snapshot,
} from './myPortfolio'
import type { PricePoint } from '../types'

const snap = (date: string, ...h: [string, number, number, number][]): Snapshot => ({
  date, holdings: h.map(([fund, units, avgPrice, nav]) => ({ fund, units, avgPrice, nav })),
})
const stateOf = (...s: Snapshot[]): PortfolioState => s.reduce(upsertSnapshot, EMPTY_STATE)

function days(start: string, n: number, f: (i: number) => number): PricePoint[] {
  const d = new Date(start + 'T00:00:00Z')
  return Array.from({ length: n }, (_, i) => ({ date: new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10), price: f(i) }))
}

describe('deriveOrders', () => {
  it('turns the first snapshot into opening buys at the average cost', () => {
    const o = deriveOrders([snap('2026-10-02', ['DCBF', 653.4, 30608.22, 30608.22], ['BVFED', 168.21, 29724, 29724])])
    expect(o.map(x => [x.fund, x.side, x.source, x.units, x.price])).toEqual([
      ['BVFED', 'buy', 'opening', 168.21, 29724], ['DCBF', 'buy', 'opening', 653.4, 30608.22],
    ])
  })

  it('infers a buy and its price from the change in average cost', () => {
    // 100 @ 10,000 then 200 @ 11,000 average → bought 100 more at 12,000
    const o = deriveOrders([snap('2026-01-01', ['A', 100, 10000, 10000]), snap('2026-02-01', ['A', 200, 11000, 12000])])
    const buy = o.find(x => x.source === 'inferred')!
    expect(buy.side).toBe('buy')
    expect(buy.units).toBeCloseTo(100, 9)
    expect(buy.price).toBeCloseTo(12000, 6)
    expect(buy.date).toBe('2026-02-01')
  })

  it('infers a sell at the latest NAV and leaves the average cost alone', () => {
    const o = deriveOrders([snap('2026-01-01', ['A', 100, 10000, 10000]), snap('2026-02-01', ['A', 60, 10000, 13000])])
    const sell = o.find(x => x.source === 'inferred')!
    expect(sell).toMatchObject({ side: 'sell', units: expect.closeTo(40, 9), price: 13000 })
  })

  it('treats a fund that disappears as a full sale and a new fund as a fresh buy', () => {
    const o = deriveOrders([snap('2026-01-01', ['A', 10, 100, 100]), snap('2026-02-01', ['B', 5, 200, 210])])
    const inferred = o.filter(x => x.source === 'inferred')
    expect(inferred.find(x => x.fund === 'A')).toMatchObject({ side: 'sell', units: 10 })
    expect(inferred.find(x => x.fund === 'B')).toMatchObject({ side: 'buy', units: 5, price: 200 })
  })

  it('creates no order when units are unchanged', () => {
    const o = deriveOrders([snap('2026-01-01', ['A', 10, 100, 100]), snap('2026-02-01', ['A', 10, 100, 120])])
    expect(o.filter(x => x.source === 'inferred')).toEqual([])
  })

  it('falls back to NAV when the implied price is absurd', () => {
    const o = deriveOrders([snap('2026-01-01', ['A', 100, 10000, 10000]), snap('2026-02-01', ['A', 100.0001, 99999, 10100])])
    const buy = o.find(x => x.source === 'inferred')
    if (buy) expect(buy.price).toBe(10100)
  })
})

describe('effective orders', () => {
  const base = stateOf(snap('2026-01-01', ['A', 100, 10000, 10000]), snap('2026-02-01', ['A', 150, 10500, 11000]))

  it('applies date overrides and ignores removed orders', () => {
    const moved = { ...base, dateOverrides: { '2026-02-01|A': '2026-01-20' } }
    expect(effectiveOrders(moved).map(o => o.date)).toEqual(['2026-01-01', '2026-01-20'])
    const dropped = { ...base, ignored: ['2026-02-01|A'] }
    expect(effectiveOrders(dropped)).toHaveLength(1)
  })

  it('merges manual orders by date', () => {
    const manual: Order = { id: 'm1', date: '2026-01-10', fund: 'A', side: 'sell', units: 10, price: 10200, source: 'manual' }
    const s = { ...base, manualOrders: [manual] }
    expect(effectiveOrders(s).map(o => o.id)).toEqual(['2026-01-01|A', 'm1', '2026-02-01|A'])
  })

  it('re-uploading the same date replaces the snapshot, and deleting one cleans its edits', () => {
    const again = upsertSnapshot(base, snap('2026-02-01', ['A', 120, 10200, 11000]))
    expect(again.snapshots).toHaveLength(2)
    expect(deriveOrders(again.snapshots).find(o => o.source === 'inferred')!.units).toBeCloseTo(20, 9)
    const withEdit = { ...base, dateOverrides: { '2026-02-01|A': '2026-01-20' }, ignored: ['2026-02-01|A'] }
    const cleaned = removeSnapshot(withEdit, '2026-02-01')
    expect(cleaned.dateOverrides).toEqual({})
    expect(cleaned.ignored).toEqual([])
  })
})

describe('positions and reconcile', () => {
  it('uses weighted-average cost and books realised gains on sells', () => {
    const orders: Order[] = [
      { id: '1', date: '2026-01-01', fund: 'A', side: 'buy', units: 100, price: 10000, source: 'manual' },
      { id: '2', date: '2026-01-02', fund: 'A', side: 'buy', units: 100, price: 12000, source: 'manual' },
      { id: '3', date: '2026-01-03', fund: 'A', side: 'sell', units: 50, price: 13000, source: 'manual' },
    ]
    const p = positionsFromOrders(orders).get('A')!
    expect(p.units).toBe(150)
    expect(p.avgCost).toBe(11000)
    expect(p.realized).toBe(50 * (13000 - 11000))
  })

  it('flags a mismatch between orders and the latest report', () => {
    const s = stateOf(snap('2026-01-01', ['A', 100, 10000, 10000]))
    expect(reconcile(s)).toEqual([])
    const bad = { ...s, manualOrders: [{ id: 'm', date: '2026-01-02', fund: 'A', side: 'sell' as const, units: 30, price: 10000, source: 'manual' as const }] }
    expect(reconcile(bad)).toEqual([{ fund: 'A', fromOrders: 70, fromReport: 100 }])
  })
})

describe('computePerformance', () => {
  const flat = new Map([['A', days('2026-01-01', 10, () => 10000)]])

  it('a single buy on a flat NAV has no gain and zero TWRR', () => {
    const r = computePerformance([{ id: '1', date: '2026-01-01', fund: 'A', side: 'buy', units: 100, price: 10000, source: 'manual' }], flat, new Map())!
    expect(r.gain).toBeCloseTo(0, 6)
    expect(r.twrrCumulative).toBeCloseTo(0, 12)
    expect(r.finalValue).toBeCloseTo(1_000_000, 6)
    expect(r.positions[0]!.weight).toBeCloseTo(1, 12)
  })

  it('measures NAV return as TWRR and money gain from the actual prices paid', () => {
    const rising = new Map([['A', days('2026-01-01', 11, i => 10000 + i * 100)]]) // +10% over the window
    const r = computePerformance([{ id: '1', date: '2026-01-01', fund: 'A', side: 'buy', units: 100, price: 10000, source: 'manual' }], rising, new Map())!
    expect(r.twrrCumulative).toBeCloseTo(0.10, 9)
    expect(r.gain).toBeCloseTo(100_000, 6)
    expect(r.gainPct).toBeCloseTo(0.10, 9)
  })

  it('a later deposit is an external flow: it does not change TWRR', () => {
    const rising = new Map([['A', days('2026-01-01', 11, i => 10000 + i * 100)]])
    const orders: Order[] = [
      { id: '1', date: '2026-01-01', fund: 'A', side: 'buy', units: 100, price: 10000, source: 'manual' },
      { id: '2', date: '2026-01-06', fund: 'A', side: 'buy', units: 1000, price: 10500, source: 'manual' },
    ]
    const solo = computePerformance([orders[0]!], rising, new Map())!
    const both = computePerformance(orders, rising, new Map())!
    expect(both.twrrCumulative).toBeCloseTo(solo.twrrCumulative, 9)
    expect(both.netInvested).toBeCloseTo(100 * 10000 + 1000 * 10500, 6)
  })

  it('leaves %/yr and MWRR blank under a year and fills them after', () => {
    const o: Order[] = [{ id: '1', date: '2026-01-01', fund: 'A', side: 'buy', units: 100, price: 10000, source: 'manual' }]
    const short = computePerformance(o, flat, new Map())!
    expect(short.twrrAnnualized).toBeNull()
    expect(short.mwrr).toBeNull()
    const long = new Map([['A', days('2024-01-01', 800, i => 10000 * Math.pow(1.0003, i))]])
    const r = computePerformance([{ ...o[0]!, date: '2024-01-01' }], long, new Map())!
    expect(r.twrrAnnualized).not.toBeNull()
    expect(r.mwrr).not.toBeNull()
    expect(r.mwrr!).toBeCloseTo(r.twrrAnnualized!, 2) // một lệnh duy nhất: MWRR = TWRR
  })

  it('values a fund without a price series at the report NAV and says so', () => {
    const r = computePerformance(
      [{ id: '1', date: '2026-01-01', fund: 'ZZZ', side: 'buy', units: 10, price: 100, source: 'manual' }],
      new Map(), new Map([['ZZZ', 120]]),
    )!
    expect(r.fallbackFunds).toEqual(['ZZZ'])
    expect(r.finalValue).toBeCloseTo(1200, 9)
  })

  it('a full sale leaves no position and books the realised gain in the cash flows', () => {
    const rising = new Map([['A', days('2026-01-01', 11, i => 10000 + i * 100)]])
    const r = computePerformance([
      { id: '1', date: '2026-01-01', fund: 'A', side: 'buy', units: 100, price: 10000, source: 'manual' },
      { id: '2', date: '2026-01-11', fund: 'A', side: 'sell', units: 100, price: 11000, source: 'manual' },
    ], rising, new Map())!
    expect(r.positions).toEqual([])
    expect(r.gain).toBeCloseTo(100_000, 6)
    expect(r.finalValue).toBeCloseTo(0, 6)
  })

  it('returns null with no orders', () => {
    expect(computePerformance([], flat, new Map())).toBeNull()
  })
})

describe('sanitizeState', () => {
  it('drops invalid snapshots, orders and overrides', () => {
    const s = sanitizeState({
      snapshots: [{ date: 'bad', holdings: [] }, { date: '2026-01-01', holdings: [{ fund: 'a', units: 1, avgPrice: 2, nav: 3 }, { fund: 'x', units: -1, avgPrice: 2, nav: 3 }] }],
      manualOrders: [{ id: 'a', fund: 'b', date: '2026-01-02', side: 'buy', units: 1, price: 2 }, { id: 'c', fund: 'b', date: 'x', side: 'buy', units: 1, price: 2 }],
      dateOverrides: { k: '2026-01-03', j: 'nope' },
      ignored: ['x', 5],
    })
    expect(s.snapshots).toEqual([{ date: '2026-01-01', holdings: [{ fund: 'A', units: 1, avgPrice: 2, nav: 3 }] }])
    expect(s.manualOrders).toHaveLength(1)
    expect(s.dateOverrides).toEqual({ k: '2026-01-03' })
    expect(s.ignored).toEqual(['x'])
    expect(sanitizeState('junk')).toEqual(EMPTY_STATE)
  })
})

describe('findOversells', () => {
  const o = (id: string, date: string, side: 'buy' | 'sell', units: number): Order => ({ id, date, fund: 'A', side, units, price: 1, source: 'manual' })

  it('flags a sale larger than what was held on that date', () => {
    const r = findOversells([o('1', '2026-01-01', 'buy', 100), o('2', '2026-01-05', 'sell', 150)])
    expect(r.map(x => [x.order.id, x.held])).toEqual([['2', 100]])
  })

  it('flags a sale dated before the purchase', () => {
    expect(findOversells([o('1', '2026-01-10', 'buy', 100), o('2', '2026-01-05', 'sell', 10)])).toHaveLength(1)
  })

  it('accepts a normal sequence', () => {
    expect(findOversells([o('1', '2026-01-01', 'buy', 100), o('2', '2026-01-05', 'sell', 100)])).toEqual([])
  })
})

describe('priceDeviation', () => {
  const series = days('2026-01-01', 5, i => 100 + i * 10)
  const ord: Order = { id: 'x', date: '2026-01-03', fund: 'A', side: 'buy', units: 1, price: 132, source: 'manual' }

  it('compares the order price with the NAV on or before its date', () => {
    expect(priceDeviation(ord, series)).toBeCloseTo(132 / 120 - 1, 12)
  })
  it('is null without a series or before the first price', () => {
    expect(priceDeviation(ord, undefined)).toBeNull()
    expect(priceDeviation({ ...ord, date: '2025-01-01' }, series)).toBeNull()
  })
})

describe('computeOrderLots (FIFO)', () => {
  const o = (id: string, date: string, side: 'buy' | 'sell', units: number, price: number): Order =>
    ({ id, date, fund: 'F', side, units, price, source: 'manual' })

  it('gives unrealised gain per buy lot at current NAV', () => {
    const lots = computeOrderLots([o('a', '2025-01-01', 'buy', 100, 10_000), o('b', '2025-06-01', 'buy', 50, 12_000)], () => 15_000)
    expect(lots.get('a')).toEqual({ remaining: 100, gain: 500_000, pct: 0.5 })
    expect(lots.get('b')!.gain).toBe(150_000)
    expect(lots.get('b')!.pct).toBeCloseTo(0.25)
  })

  it('sells the oldest lot first and reports realised gain on the sell', () => {
    const lots = computeOrderLots([
      o('a', '2025-01-01', 'buy', 100, 10_000), o('b', '2025-02-01', 'buy', 100, 20_000), o('s', '2025-03-01', 'sell', 150, 30_000),
    ], () => 25_000)
    // 100 @10k + 50 @20k bán ở 30k: lãi 2.000.000 + 500.000 trên vốn 2.000.000
    expect(lots.get('s')!.gain).toBe(100 * 20_000 + 50 * 10_000)
    expect(lots.get('s')!.pct).toBeCloseTo(2_500_000 / 2_000_000)
    expect(lots.get('a')).toEqual({ remaining: 0, gain: 0, pct: null })
    expect(lots.get('b')!.remaining).toBe(50)
    expect(lots.get('b')!.gain).toBe(50 * 5_000)
  })

  it('leaves unrealised gain empty without a NAV', () => {
    const lots = computeOrderLots([o('a', '2025-01-01', 'buy', 10, 10_000)], () => undefined)
    expect(lots.get('a')).toEqual({ remaining: 10, gain: 0, pct: null })
  })
})
