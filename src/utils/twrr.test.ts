import { describe, it, expect } from 'vitest'
import { TwrrChain, annualizeGrowth, isAnnualizable, yearsBetween } from './twrr'
import { simulateDCA, dcaCagr, dcaMWRR, investorCagr } from './dca'
import type { PricePoint } from '../types'

function series(startISO: string, days: number, f: (i: number) => number): PricePoint[] {
  const out: PricePoint[] = []
  const d = new Date(startISO + 'T00:00:00Z')
  for (let i = 0; i < days; i++) {
    out.push({ date: new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10), price: f(i) })
  }
  return out
}

describe('TwrrChain', () => {
  it('without costs equals the compounded market return, deposits do not count as gains', () => {
    const c = new TwrrChain()
    c.start('2024-01-01', 1000, 1000)
    // Day 1: +10% market, then deposit 1000 (no cost): value 1100 -> 2100
    c.step({ date: '2024-01-02', prevEnd: 1000, v0: 1100, flow: 1000, v1: 2100 })
    // Day 2: -5% market, no flow
    c.step({ date: '2024-01-03', prevEnd: 2100, v0: 1995, flow: 0, v1: 1995 })
    const r = c.result()
    expect(r.cumulative[2]!.value).toBeCloseTo(1.1 * 0.95 - 1, 12)
    expect(r.cumulativeGross[2]!.value).toBeCloseTo(1.1 * 0.95 - 1, 12)
    expect(r.totalCosts).toBe(0)
  })

  it('a withdrawal is removed from the return, not booked as a loss', () => {
    const c = new TwrrChain()
    c.start('2024-01-01', 1000, 1000)
    // +20% then withdraw 600 from 1200
    c.step({ date: '2024-01-02', prevEnd: 1000, v0: 1200, flow: -600, v1: 600 })
    expect(c.result().cumulative[1]!.value).toBeCloseTo(0.2, 12)
  })

  it('charges the day-0 cost immediately: 0.15% fee on the first deposit is -0.15%', () => {
    const c = new TwrrChain()
    c.start('2024-01-01', 1_000_000, 998_500)
    const r = c.result()
    expect(r.cumulative[0]!.value).toBeCloseTo(-0.0015, 12)
    expect(r.cumulativeGross[0]!.value).toBe(0)
    expect(r.totalCosts).toBeCloseTo(1500, 6)
  })

  it('costs on a later deposit are measured on the capital in play (holdings + deposit)', () => {
    const c = new TwrrChain()
    c.start('2024-01-01', 1000, 1000)
    // no market move, deposit 1000 with a 20 fee: v1 = 1980 of base 2000 -> -1%
    c.step({ date: '2024-01-02', prevEnd: 1000, v0: 1000, flow: 1000, v1: 1980 })
    const r = c.result()
    expect(r.cumulative[1]!.value).toBeCloseTo(-0.01, 12)
    expect(r.cumulativeGross[1]!.value).toBe(0)
    expect(r.returns[0]!.value).toBeCloseTo(-0.01, 12)
    expect(r.totalCosts).toBeCloseTo(20, 9)
  })

  it('the gap between gross and net grows with every cost, i.e. fees erode over time', () => {
    const c = new TwrrChain()
    c.start('2024-01-01', 1000, 1000)
    let prev = 1000
    for (let i = 1; i <= 12; i++) {
      // flat market, 100 deposit each period with 1% fee
      const v0 = prev
      const v1 = v0 + 100 - 1
      c.step({ date: `2024-${String(i + 1).padStart(2, '0')}-01`, prevEnd: prev, v0, flow: 100, v1 })
      prev = v1
    }
    const { cumulative, cumulativeGross } = c.result()
    expect(cumulativeGross[12]!.value).toBe(0)
    expect(cumulative[12]!.value).toBeLessThan(cumulative[6]!.value)
    expect(cumulative[12]!.value).toBeLessThan(0)
  })
})

describe('annualization rule', () => {
  it('does not annualize a period shorter than one year', () => {
    expect(isAnnualizable('2024-01-01', '2024-06-30')).toBe(false)
    expect(annualizeGrowth(1.1, '2024-01-01', '2024-06-30')).toBeNull()
  })

  it('annualizes from exactly one calendar year, with a one-day tolerance', () => {
    expect(isAnnualizable('2024-01-01', '2025-01-01')).toBe(true) // 366 days
    expect(isAnnualizable('2023-01-01', '2024-01-01')).toBe(true) // 365 days
    expect(annualizeGrowth(1.1, '2023-01-01', '2024-01-01')).toBeCloseTo(0.1, 3)
  })

  it('annualizes correctly over multiple years', () => {
    expect(yearsBetween('2020-01-01', '2022-01-01')).toBeCloseTo(2, 2)
    expect(annualizeGrowth(1.21, '2020-01-01', '2022-01-01')).toBeCloseTo(0.1, 2)
  })

  it('rejects non-positive growth', () => {
    expect(annualizeGrowth(0, '2020-01-01', '2023-01-01')).toBeNull()
  })

  it('DCA CAGR / investor CAGR / MWRR are all blank under one year and filled after', () => {
    const short = simulateDCA(
      new Map([['A', series('2024-01-01', 200, i => 100 + i * 0.1)]]),
      [{ fundId: 'A', weight: 100 }],
      { initialAmount: 1000, cashflowAmount: 100, cashflowFreq: 'monthly' },
      'yearly',
    )
    expect(dcaCagr(short.cumulative)).toBeNull()
    expect(investorCagr(short.cumulative, short.totalInvested, short.finalValue)).toBeNull()
    expect(dcaMWRR(short.cashflows)).toBeNull()

    const long = simulateDCA(
      new Map([['A', series('2022-01-01', 900, i => 100 + i * 0.1)]]),
      [{ fundId: 'A', weight: 100 }],
      { initialAmount: 1000, cashflowAmount: 100, cashflowFreq: 'monthly' },
      'yearly',
    )
    expect(dcaCagr(long.cumulative)).not.toBeNull()
    expect(investorCagr(long.cumulative, long.totalInvested, long.finalValue)).not.toBeNull()
    expect(dcaMWRR(long.cashflows)).not.toBeNull()
  })
})

describe('simulateDCA with a purchase fee', () => {
  const prices = new Map([['A', series('2023-01-01', 500, () => 100)]]) // flat market
  const slots = [{ fundId: 'A', weight: 100 }]
  const params = { initialAmount: 1000, cashflowAmount: 100, cashflowFreq: 'monthly' as const }

  it('is identical to before when the fee is zero', () => {
    const a = simulateDCA(prices, slots, params, 'yearly')
    const b = simulateDCA(prices, slots, params, 'yearly', { buyFeeRate: 0 })
    expect(b.cumulative).toEqual(a.cumulative)
    expect(a.totalCosts).toBeCloseTo(0, 6)
  })

  it('a flat market with a 1% fee shows a small loss after fees and exactly zero before fees', () => {
    const r = simulateDCA(prices, slots, params, 'yearly', { buyFeeRate: 0.01 })
    const net = r.cumulative[r.cumulative.length - 1]!.value
    const gross = r.cumulativeGross[r.cumulativeGross.length - 1]!.value
    expect(gross).toBeCloseTo(0, 10)
    // TWRR trừ phí của MỖI lần nạp trên vốn đang vận hành hôm đó: lần đầu −1%,
    // các lần sau nhỏ dần khi vốn lớn lên, nên tổng nằm giữa −1% và −3%.
    expect(net).toBeLessThan(-0.01)
    expect(net).toBeGreaterThan(-0.03)
    // the money paid in fees equals invested - final value on a flat market
    expect(r.totalCosts).toBeCloseTo(r.totalInvested - r.finalValue, 6)
    expect(r.totalInvested - r.finalValue).toBeCloseTo(r.totalInvested * 0.01, 6)
  })

  it('the fee lowers the final value and MWRR', () => {
    const p = new Map([['A', series('2021-01-01', 1200, i => 100 + i * 0.05)]])
    const free = simulateDCA(p, slots, params, 'yearly')
    const paid = simulateDCA(p, slots, params, 'yearly', { buyFeeRate: 0.01 })
    expect(paid.finalValue).toBeLessThan(free.finalValue)
    expect(dcaMWRR(paid.cashflows)!).toBeLessThan(dcaMWRR(free.cashflows)!)
  })
})
