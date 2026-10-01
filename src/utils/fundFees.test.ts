import { describe, it, expect } from 'vitest'
import { buyFeePct, sellFeePct, netOnHand, holdingMonths, describeSellTiers, type FeeTier } from './fundFees'

const SELL: FeeTier[] = [
  { from: 0, to: 6, rate: 2.5 }, { from: 6, to: 12, rate: 2 },
  { from: 12, to: 24, rate: 1.5 }, { from: 24, to: null, rate: 0 },
]
const BUY: FeeTier[] = [{ from: 0, to: 100_000_000, rate: 0.5 }, { from: 100_000_000, to: null, rate: 0.3 }]

describe('fee tiers', () => {
  it('picks the sell tier by months held, boundaries belong to the upper tier', () => {
    expect(sellFeePct(SELL, 3)).toBe(2.5)
    expect(sellFeePct(SELL, 6)).toBe(2)
    expect(sellFeePct(SELL, 23.9)).toBe(1.5)
    expect(sellFeePct(SELL, 24)).toBe(0)
    expect(sellFeePct(SELL, 120)).toBe(0)
  })

  it('picks the buy tier by amount', () => {
    expect(buyFeePct(BUY, 50_000_000)).toBe(0.5)
    expect(buyFeePct(BUY, 100_000_000)).toBe(0.3)
  })

  it('returns null without a schedule', () => {
    expect(buyFeePct([], 1)).toBeNull()
    expect(sellFeePct([], 1)).toBeNull()
  })

  it('treats a first tier that starts above zero as covering the range below it', () => {
    expect(sellFeePct([{ from: 1, to: 12, rate: 1 }, { from: 12, to: null, rate: 0 }], 0)).toBe(1)
  })
})

describe('netOnHand', () => {
  it('applies buy fee to the money in and sell fee to the money out', () => {
    // +50% gross, 0.5% in, 1% out: 0.995 × 1.5 × 0.99 = 1.4776...
    const r = netOnHand({ gross: 0.5, buyPct: 0.5, sellPct: 1, startDate: '2020-01-01', endDate: '2022-01-01' })
    expect(r.net).toBeCloseTo(0.995 * 1.5 * 0.99 - 1, 12)
    expect(r.drag).toBeCloseTo(0.5 - r.net, 12)
  })

  it('is identical to gross when there are no fees', () => {
    const r = netOnHand({ gross: 0.2, buyPct: 0, sellPct: 0, startDate: '2020-01-01', endDate: '2022-01-01' })
    expect(r.net).toBeCloseTo(0.2, 12)
    expect(r.netAnnualized).toBeCloseTo(r.grossAnnualized!, 12)
  })

  it('leaves annualised figures blank under one year', () => {
    const r = netOnHand({ gross: 0.05, buyPct: 0, sellPct: 2.5, startDate: '2024-01-01', endDate: '2024-04-01' })
    expect(r.grossAnnualized).toBeNull()
    expect(r.netAnnualized).toBeNull()
    expect(r.net).toBeLessThan(0.05)
  })

  it('a short hold can turn a small gain into a loss because the exit fee is highest', () => {
    const r = netOnHand({ gross: 0.01, buyPct: 0, sellPct: 2.5, startDate: '2024-01-01', endDate: '2024-03-01' })
    expect(r.net).toBeLessThan(0)
  })
})

describe('helpers', () => {
  it('measures holding months', () => {
    expect(holdingMonths('2020-01-01', '2021-01-01')).toBeCloseTo(12, 0)
  })
  it('describes a schedule', () => {
    expect(describeSellTiers(SELL, 'th', n => String(n))).toBe('<6th 2.5% · 6-12th 2% · 12-24th 1.5% · ≥24th 0%')
  })
})
