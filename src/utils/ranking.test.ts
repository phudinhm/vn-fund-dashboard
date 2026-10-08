import { describe, it, expect } from 'vitest'
import {
  buildMixedRows, computePeriodStat, periodStartDate, rankEntries, referenceEnd,
  MIN_PERIODS_FOR_SCORE, type PeriodStat,
} from './ranking'
import type { PricePoint } from '../types'

/** Chuỗi ngày thường (bỏ T7/CN) từ `start` tới `end`, giá do f(i) quyết định. */
function series(start: string, end: string, f: (i: number) => number): PricePoint[] {
  const out: PricePoint[] = []
  const d = new Date(start + 'T00:00:00Z')
  const stop = new Date(end + 'T00:00:00Z')
  let i = 0
  while (d <= stop) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) out.push({ date: d.toISOString().slice(0, 10), price: f(i++) })
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

const REF = '2026-09-30'

describe('periodStartDate', () => {
  it('counts back from the reference date', () => {
    expect(periodStartDate('1m', REF)).toBe('2026-08-30')
    expect(periodStartDate('3m', REF)).toBe('2026-06-30')
    expect(periodStartDate('1y', REF)).toBe('2025-09-30')
    expect(periodStartDate('5y', REF)).toBe('2021-09-30')
    expect(periodStartDate('ytd', REF)).toBe('2025-12-31')
    expect(periodStartDate('all', REF)).toBeNull()
  })
})

describe('computePeriodStat', () => {
  const flatUp = series('2019-01-01', REF, i => 100 * Math.pow(1.0002, i))

  it('measures return, drawdown and volatility over the window', () => {
    const s = computePeriodStat(flatUp, '1y', REF)!
    expect(s.startDate <= '2025-09-30').toBe(true)
    expect(s.ret).toBeGreaterThan(0)
    expect(s.maxDrawdown).toBe(0) // monotonic series
    expect(s.volatility).toBeCloseTo(0, 6)
    expect(s.annualized).not.toBeNull()
  })

  it('annualizes a nominal one-year period even when the data lags the reference by a couple of days', () => {
    const lagged = series('2019-01-01', '2026-09-28', i => 100 * Math.pow(1.0002, i))
    const s = computePeriodStat(lagged, '1y', REF)!
    expect(s.annualized).not.toBeNull()
  })

  it('leaves %/yr blank under one year', () => {
    expect(computePeriodStat(flatUp, '6m', REF)!.annualized).toBeNull()
  })

  it('finds the true max drawdown inside the window only', () => {
    const p = series('2024-01-01', REF, i => (i === 300 ? 50 : 100))
    const all = computePeriodStat(p, '5y', REF)
    expect(all).toBeNull() // history does not cover 5 years
    const s = computePeriodStat(p, 'all', REF)!
    expect(s.maxDrawdown).toBeCloseTo(-0.5, 12)
    // a window after the dip does not see it
    const recent = computePeriodStat(p, '3m', REF)!
    expect(recent.maxDrawdown).toBe(0)
  })

  it('excludes a fund whose history does not cover the period', () => {
    const young = series('2026-03-01', REF, () => 100)
    expect(computePeriodStat(young, '1y', REF)).toBeNull()
    expect(computePeriodStat(young, '3m', REF)).not.toBeNull()
  })

  it('tolerates a series starting a few days after the window start', () => {
    const p = series('2025-10-02', REF, i => 100 + i) // window start 2025-09-30, series starts 2 days later
    expect(computePeriodStat(p, '1y', REF)).not.toBeNull()
  })

  it('excludes a stale fund', () => {
    const stale = series('2020-01-01', '2026-08-01', () => 100)
    expect(computePeriodStat(stale, '1y', REF)).toBeNull()
  })

  it('uses last year-end as the YTD base', () => {
    const p = series('2025-01-01', REF, i => 100 + i)
    const s = computePeriodStat(p, 'ytd', REF)!
    expect(s.startDate).toBe('2025-12-31')
  })

  it('computes the risk-adjusted ratio as return per unit of period-scaled volatility', () => {
    const p = series('2024-01-01', REF, i => 100 + i * 0.1 + (i % 2 === 0 ? 1 : -1))
    const s = computePeriodStat(p, '1y', REF)!
    expect(s.riskAdjusted).not.toBeNull()
    expect(Math.sign(s.riskAdjusted!)).toBe(Math.sign(s.ret))
  })

  it('computes sortino, calmar, up-days and the current drawdown', () => {
    const p = series('2024-01-01', REF, i => 100 + i * 0.1 + (i % 2 === 0 ? 1 : -1))
    const s = computePeriodStat(p, '1y', REF)!
    expect(s.sortino).not.toBeNull()
    expect(s.sortino!).toBeGreaterThan(0)
    expect(s.upDays!).toBeGreaterThan(0.4)
    expect(s.upDays!).toBeLessThan(0.6)
    expect(s.calmar).toBeCloseTo(s.annualized! / Math.abs(s.maxDrawdown), 10)
    expect(s.currentDrawdown).toBeLessThanOrEqual(0)
  })

  it('has no sortino without down days, no calmar under a year, and sits at peak on a rising series', () => {
    const up = series('2025-01-01', REF, i => 100 + i)
    const s = computePeriodStat(up, '3m', REF)!
    expect(s.sortino).toBeNull()
    expect(s.calmar).toBeNull()
    expect(s.upDays).toBe(1)
    expect(s.currentDrawdown).toBe(0)
  })
})

describe('rankEntries', () => {
  const stat = (ret: number, dd = -0.1, ra: number | null = 1): PeriodStat => ({
    startDate: 'a', endDate: 'b', ret, annualized: null, maxDrawdown: dd, volatility: 0.1, riskAdjusted: ra,
    sortino: ra, calmar: null, upDays: 0.5, currentDrawdown: 0,
  })

  it('ranks by return descending with ties sharing a rank', () => {
    const r = rankEntries([
      { id: 'A', stat: stat(0.1) }, { id: 'B', stat: stat(0.3) }, { id: 'C', stat: stat(0.1) }, { id: 'D', stat: null },
    ], 'return')
    expect(r.map(x => [x.id, x.rank])).toEqual([['B', 1], ['A', 2], ['C', 2]])
  })

  it('ranks drawdown so that the shallowest is best', () => {
    const r = rankEntries([{ id: 'A', stat: stat(0, -0.3) }, { id: 'B', stat: stat(0, -0.05) }], 'drawdown')
    expect(r[0]!.id).toBe('B')
  })

  it('drops funds without a risk-adjusted figure', () => {
    const r = rankEntries([{ id: 'A', stat: stat(0.1, -0.1, null) }, { id: 'B', stat: stat(0.1, -0.1, 2) }], 'riskAdjusted')
    expect(r.map(x => x.id)).toEqual(['B'])
  })
})

describe('buildMixedRows', () => {
  const funds = [
    { id: 'UP', type: 'bond' as const, prices: series('2019-01-01', REF, i => 100 * Math.pow(1.0003, i)) },
    { id: 'MID', type: 'mutual_fund' as const, prices: series('2019-01-01', REF, i => 100 * Math.pow(1.0001, i)) },
    { id: 'DOWN', type: 'etf' as const, prices: series('2019-01-01', REF, i => 100 * Math.pow(0.9999, i)) },
    { id: 'NEW', type: 'mutual_fund' as const, prices: series('2026-07-01', REF, i => 100 * Math.pow(1.01, i)) },
  ]
  const periods = ['1m', '3m', '6m', '1y', '3y'] as const

  it('ranks all funds together per period and scores them', () => {
    const rows = buildMixedRows(funds, [...periods], 'return', REF)
    const by = Object.fromEntries(rows.map(r => [r.id, r]))
    expect(by.UP!.ranks['1y']).toBe(1)
    expect(by.DOWN!.ranks['1y']).toBe(3)
    expect(by.UP!.totals['1y']).toBe(3) // NEW has no 1y history
    expect(by.UP!.score).toBeGreaterThan(by.MID!.score!)
    expect(by.MID!.score).toBeGreaterThan(by.DOWN!.score!)
  })

  it('does not give a young fund a composite score from too few periods', () => {
    const rows = buildMixedRows(funds, [...periods], 'return', REF)
    const neu = rows.find(r => r.id === 'NEW')!
    expect(neu.periodsRanked).toBeLessThan(MIN_PERIODS_FOR_SCORE)
    expect(neu.score).toBeNull()
    expect(neu.ranks['1m']).toBe(1) // but it ranks first where it has data
  })

  it('percentile scores are comparable across periods with different fund counts', () => {
    const rows = buildMixedRows(funds, ['1y', '3y', '1m'], 'return', REF)
    const up = rows.find(r => r.id === 'UP')!
    expect(up.score).toBeGreaterThan(60)
  })
})

describe('referenceEnd', () => {
  it('is the latest date across series', () => {
    expect(referenceEnd([series('2020-01-01', '2026-09-28', () => 1), series('2020-01-01', '2026-09-30', () => 1)])).toBe('2026-09-30')
    expect(referenceEnd([])).toBeNull()
  })
})
