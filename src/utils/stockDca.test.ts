import { describe, it, expect } from 'vitest'
import { simulateStockDCA, lotsAffordable, parseStockEvents, LOT_SIZE, type StockEvent } from './stockDca'
import { dcaMWRR } from './dca'
import type { PricePoint } from '../types'

const ZERO = { buyFeeRate: 0, sellFeeRate: 0, sellTaxRate: 0, spreadRate: 0, dividendTaxRate: 0 }
const ONCE = { initialAmount: 0, cashflowAmount: 0, cashflowFreq: 'monthly' as const }

function days(startISO: string, prices: number[]): PricePoint[] {
  const d = new Date(startISO + 'T00:00:00Z')
  return prices.map((price, i) => ({
    date: new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10),
    price,
  }))
}

describe('lotsAffordable', () => {
  it('rounds down to whole lots of 100', () => {
    expect(lotsAffordable(1_000_000, 33_000, 0)).toBe(0) // 30 shares -> no lot
    expect(lotsAffordable(3_400_000, 33_000, 0)).toBe(100)
    expect(lotsAffordable(6_700_000, 33_000, 0)).toBe(200)
  })

  it('reserves room for the brokerage fee', () => {
    // exactly 100 shares cost 5,007,500 with a 0.15% fee, so 5,000,000 is one lot short
    expect(lotsAffordable(5_000_000, 50_000, 0.0015)).toBe(0)
    expect(lotsAffordable(5_100_000, 50_000, 0.0015)).toBe(100)
    expect(LOT_SIZE).toBe(100)
  })
})

describe('simulateStockDCA: lots and cash', () => {
  it('buys in lots and keeps the odd cash in the account', () => {
    const r = simulateStockDCA(days('2024-01-01', [33_000, 33_000]), { ...ONCE, initialAmount: 3_500_000 }, { costs: ZERO })
    expect(r.finalShares).toBe(100)
    expect(r.finalCash).toBeCloseTo(3_500_000 - 3_300_000, 6)
    expect(r.finalValue).toBeCloseTo(3_500_000, 6)
  })

  it('carries leftover cash into the next contribution instead of losing it', () => {
    // 1,000,000 per month at 33,000: a lot (3.3M) is only affordable from the 4th deposit
    const p = days('2024-01-01', Array(130).fill(33_000))
    const r = simulateStockDCA(p, { initialAmount: 0, cashflowAmount: 1_000_000, cashflowFreq: 'monthly' }, { costs: ZERO })
    const firstBuy = r.ledger.find(e => e.type === 'buy')!
    expect(firstBuy.qty).toBe(100)
    expect(firstBuy.date > '2024-03-01').toBe(true)
    expect(r.finalShares % 100).toBe(0)
    expect(r.finalValue).toBeCloseTo(r.totalInvested, 6) // flat price, no costs
  })

  it('idle cash drags the time-weighted return (it is part of the account)', () => {
    // 2,000,000 buys nothing; price then rises 10% but the account holds only cash
    const r = simulateStockDCA(days('2024-01-01', [33_000, 36_300]), { ...ONCE, initialAmount: 2_000_000 }, { costs: ZERO })
    expect(r.finalShares).toBe(0)
    expect(r.cumulative[1]!.value).toBeCloseTo(0, 12)
  })
})

describe('simulateStockDCA: costs hit TWRR immediately', () => {
  it('a 0.15% buy fee shows up on day 0, net below gross', () => {
    const r = simulateStockDCA(days('2024-01-01', [50_000, 50_000]), { ...ONCE, initialAmount: 5_100_000 }, {
      costs: { ...ZERO, buyFeeRate: 0.0015 },
    })
    expect(r.finalShares).toBe(100)
    expect(r.costBreakdown.brokerage).toBeCloseTo(7_500, 6)
    expect(r.totalCosts).toBeCloseTo(7_500, 6)
    expect(r.cumulative[0]!.value).toBeCloseTo(-7_500 / 5_100_000, 10)
    expect(r.cumulativeGross[0]!.value).toBeCloseTo(0, 12)
    expect(r.finalValue).toBeCloseTo(5_100_000 - 7_500, 6)
  })

  it('a bid-ask spread is charged when buying: bought at the ask, valued at the close', () => {
    const r = simulateStockDCA(days('2024-01-01', [50_000, 50_000]), { ...ONCE, initialAmount: 5_100_000 }, {
      costs: { ...ZERO, spreadRate: 0.002 }, // 0.2% total, 0.1% each side
    })
    expect(r.costBreakdown.spread).toBeCloseTo(100 * 50_000 * 0.001, 6)
    expect(r.cumulative[0]!.value).toBeLessThan(0)
    expect(r.cumulativeGross[0]!.value).toBeCloseTo(0, 12)
    const buy = r.ledger.find(e => e.type === 'buy')!
    expect(buy.price).toBeCloseTo(50_050, 6)
  })

  it('selling at the end charges sell fee and 0.1% tax, and the final value is cash', () => {
    const r = simulateStockDCA(days('2024-01-01', [50_000, 50_000, 50_000]), { ...ONCE, initialAmount: 5_100_000 }, {
      costs: { ...ZERO, sellFeeRate: 0.0015, sellTaxRate: 0.001 },
      liquidateAtEnd: true,
    })
    expect(r.finalShares).toBe(0)
    const sell = r.ledger.find(e => e.type === 'sell')!
    expect(sell.fee).toBeCloseTo(100 * 50_000 * 0.0015, 6)
    expect(sell.tax).toBeCloseTo(100 * 50_000 * 0.001, 6)
    expect(r.costBreakdown.sellTax).toBeCloseTo(5_000, 6)
    expect(r.finalValue).toBeCloseTo(5_100_000 - 7_500 - 5_000, 6)
    // the cost lands on the last day, not before
    expect(r.cumulative[1]!.value).toBeCloseTo(0, 12)
    expect(r.cumulative[2]!.value).toBeLessThan(0)
  })

  it('without any cost model the TWRR of a lump sum equals the price return', () => {
    const r = simulateStockDCA(days('2024-01-01', [50_000, 55_000, 49_500]), { ...ONCE, initialAmount: 5_000_000 }, { costs: ZERO })
    expect(r.cumulative[2]!.value).toBeCloseTo(49_500 / 50_000 - 1, 12)
    expect(r.cumulativeGross[2]!.value).toBeCloseTo(r.cumulative[2]!.value, 12)
  })
})

describe('simulateStockDCA: corporate actions', () => {
  it('stock dividend adds shares and is return-neutral when the price adjusts', () => {
    // 10% stock dividend: 100 -> 110 shares, price 50,000 -> 45,454.545…
    const ev: StockEvent[] = [{ kind: 'stock', exDate: '2024-01-02', ratio: 0.1 }]
    const r = simulateStockDCA(days('2024-01-01', [50_000, 50_000 / 1.1]), { ...ONCE, initialAmount: 5_000_000 }, { costs: ZERO, events: ev })
    expect(r.finalShares).toBe(110)
    expect(r.bonusShares).toBe(10)
    expect(r.cumulative[1]!.value).toBeCloseTo(0, 9)
  })

  it('stock dividend fractions are dropped (odd lots)', () => {
    const ev: StockEvent[] = [{ kind: 'stock', exDate: '2024-01-02', ratio: 0.155 }]
    const r = simulateStockDCA(days('2024-01-01', [50_000, 43_000]), { ...ONCE, initialAmount: 5_000_000 }, { costs: ZERO, events: ev })
    expect(r.finalShares).toBe(100 + 15)
  })

  it('cash dividend: price drop is offset by the entitlement, tax is the only loss', () => {
    // 1,000 VND/share on 100 shares = 100,000 gross; ex-date price falls by 1,000
    const ev: StockEvent[] = [{ kind: 'cash', exDate: '2024-01-02', payDate: '2024-01-04', perShare: 1_000 }]
    const p = days('2024-01-01', [50_000, 49_000, 49_000, 49_000])
    const r = simulateStockDCA(p, { ...ONCE, initialAmount: 5_000_000 }, { costs: { ...ZERO, dividendTaxRate: 0.05 }, events: ev })
    expect(r.cashDividendsNet).toBeCloseTo(95_000, 6)
    expect(r.costBreakdown.dividendTax).toBeCloseTo(5_000, 6)
    // gross TWRR ignores the tax: the price drop is exactly made up by the dividend
    expect(r.cumulativeGross[3]!.value).toBeCloseTo(0, 9)
    // net TWRR loses exactly the tax on the pay date (5,000 of 5,000,000)
    expect(r.cumulative[1]!.value).toBeCloseTo(0, 9) // still no tax on ex-date
    expect(r.cumulative[3]!.value).toBeCloseTo(-5_000 / 5_000_000, 9)
    expect(r.finalValue).toBeCloseTo(5_000_000 - 100 * 1_000 + 95_000, 6)
    // the dividend cash is reused for the next lot purchase, not lost
    expect(r.finalCash).toBeCloseTo(95_000, 6)
  })

  it('rights issue: exercising buys new shares at the issue price, ignoring leaves holdings untouched', () => {
    const ev: StockEvent[] = [{ kind: 'rights', exDate: '2024-01-02', ratio: 0.2, price: 20_000 }]
    const p = days('2024-01-01', [50_000, 50_000])
    const base = { ...ONCE, initialAmount: 5_000_000 }

    const ignored = simulateStockDCA(p, base, { costs: ZERO, events: ev, exerciseRights: false })
    expect(ignored.finalShares).toBe(100)
    expect(ignored.rightsShares).toBe(0)

    const exercised = simulateStockDCA(p, base, { costs: ZERO, events: ev, exerciseRights: true })
    expect(exercised.rightsShares).toBe(20)
    expect(exercised.finalShares).toBe(120)
    // 20 new shares cost 400,000: the investor tops it up (an external deposit, not a loss)
    expect(exercised.totalInvested).toBeCloseTo(5_400_000, 6)
    expect(exercised.cashflows.filter(c => c.amount < 0)).toHaveLength(2)
    // buying 20 shares at 20,000 that trade at 50,000 is a real gain of 600,000
    expect(exercised.finalValue).toBeCloseTo(120 * 50_000, 6)
    expect(exercised.cumulative[1]!.value).toBeCloseTo(600_000 / 5_400_000, 9)
    // that gain is return, not a "negative fee": gross equals net with no costs
    expect(exercised.cumulativeGross[1]!.value).toBeCloseTo(exercised.cumulative[1]!.value, 12)
    expect(exercised.totalCosts).toBe(0)
  })

  it('rights exercise uses spare cash before asking the investor for more', () => {
    const ev: StockEvent[] = [{ kind: 'rights', exDate: '2024-01-02', ratio: 0.2, price: 20_000 }]
    const r = simulateStockDCA(days('2024-01-01', [50_000, 50_000]), { ...ONCE, initialAmount: 5_500_000 }, {
      costs: ZERO, events: ev, exerciseRights: true,
    })
    // 100 shares + 500,000 idle cash pays the 400,000 subscription with no top-up
    expect(r.totalInvested).toBeCloseTo(5_500_000, 6)
    expect(r.finalShares).toBe(120)
    expect(r.finalCash).toBeCloseTo(100_000, 6)
  })

  it('events before the first purchase do nothing', () => {
    const ev: StockEvent[] = [{ kind: 'cash', exDate: '2023-12-01', perShare: 5_000 }]
    const r = simulateStockDCA(days('2024-01-01', [50_000, 50_000]), { ...ONCE, initialAmount: 5_000_000 }, { costs: ZERO, events: ev })
    expect(r.cashDividendsNet).toBe(0)
  })
})

describe('simulateStockDCA: withdrawals and MWRR', () => {
  it('a withdrawal is an external flow: it neither creates nor destroys return', () => {
    const p = days('2024-01-01', [50_000, 50_000, 50_000])
    const r = simulateStockDCA(p, { ...ONCE, initialAmount: 10_000_000 }, {
      costs: ZERO,
      withdrawals: [{ date: p[1]!.date, amount: 2_500_000 }],
    })
    expect(r.totalWithdrawn).toBeCloseTo(2_500_000, 6)
    expect(r.cumulative[2]!.value).toBeCloseTo(0, 12)
    expect(r.cashflows.some(c => c.amount === 2_500_000)).toBe(true)
  })

  it('sells shares to fund a withdrawal and pays the costs of that sale', () => {
    const p = days('2024-01-01', [50_000, 50_000])
    const r = simulateStockDCA(p, { ...ONCE, initialAmount: 5_100_000 }, {
      costs: { ...ZERO, sellFeeRate: 0.0015, sellTaxRate: 0.001 },
      withdrawals: [{ date: p[1]!.date, amount: 2_000_000 }],
    })
    const sell = r.ledger.find(e => e.type === 'sell')!
    expect(sell.qty).toBeLessThan(0)
    expect(r.totalWithdrawn).toBeCloseTo(2_000_000, 6)
    expect(r.costBreakdown.sellTax).toBeGreaterThan(0)
    expect(r.cumulative[1]!.value).toBeLessThan(0)
    expect(r.cumulativeGross[1]!.value).toBeCloseTo(0, 12)
  })

  it('MWRR uses the deposits as outflows and the final value as the inflow', () => {
    const p = days('2022-01-01', Array.from({ length: 800 }, (_, i) => 50_000 + i * 20))
    const r = simulateStockDCA(p, { initialAmount: 5_000_000, cashflowAmount: 2_000_000, cashflowFreq: 'monthly' }, { costs: ZERO })
    expect(r.cashflows[r.cashflows.length - 1]!.amount).toBeCloseTo(r.finalValue, 6)
    expect(dcaMWRR(r.cashflows)).not.toBeNull()
  })

  it('accounting identity: final value = deposits - withdrawals + price gains + dividends - costs', () => {
    const p = days('2024-01-01', Array.from({ length: 200 }, (_, i) => 50_000 + Math.sin(i / 5) * 3_000))
    const ev: StockEvent[] = [{ kind: 'cash', exDate: '2024-03-01', payDate: '2024-03-10', perShare: 800 }]
    const r = simulateStockDCA(p, { initialAmount: 8_000_000, cashflowAmount: 3_000_000, cashflowFreq: 'monthly' }, {
      events: ev,
    })
    // holdings + cash always reconcile with the ledger
    const last = r.ledger[r.ledger.length - 1]!
    expect(last.sharesAfter).toBe(r.finalShares)
    expect(last.cashAfter).toBeCloseTo(r.finalCash, 6)
    const lastPrice = p[p.length - 1]!.price
    expect(r.finalValue).toBeCloseTo(r.finalShares * lastPrice + r.finalCash, 6)
  })
})

describe('simulateStockDCA: edge cases', () => {
  it('returns an empty result without prices', () => {
    const r = simulateStockDCA([], { ...ONCE, initialAmount: 1_000_000 })
    expect(r.values).toEqual([])
    expect(r.finalValue).toBe(0)
  })

  it('works with no initial amount and no contribution', () => {
    const r = simulateStockDCA(days('2024-01-01', [50_000, 51_000]), ONCE, { costs: ZERO })
    expect(r.finalValue).toBe(0)
    expect(r.cumulative[1]!.value).toBe(0)
  })
})

describe('parseStockEvents', () => {
  it('parses the three event kinds, comments and blank lines', () => {
    const r = parseStockEvents(`
      # cổ tức
      cash 2024-06-20 2024-07-05 1000
      cash 2024-12-10 500        # nhận cùng ngày ex
      stock 2024-08-10 10%
      rights 2024-09-01 0.2 20000
    `)
    expect(r.errors).toEqual([])
    expect(r.events).toEqual([
      { kind: 'cash', exDate: '2024-06-20', payDate: '2024-07-05', perShare: 1000 },
      { kind: 'stock', exDate: '2024-08-10', ratio: 0.1 },
      { kind: 'rights', exDate: '2024-09-01', ratio: 0.2, price: 20000 },
      { kind: 'cash', exDate: '2024-12-10', perShare: 500 },
    ])
  })

  it('reports each bad line by number and keeps the good ones', () => {
    const r = parseStockEvents([
      'cash 2024-06-20 1000',
      'cash 2024-13-40 1000',
      'stock 2024-08-10 0',
      'rights 2024-09-01 0.2',
      'dividend 2024-09-01 5',
      'cash 2024-06-20 2024-06-10 1000',
    ].join('\n'))
    expect(r.events).toHaveLength(1)
    expect(r.errors.map(e => [e.line, e.message])).toEqual([
      [2, 'exDate'], [3, 'ratio'], [4, 'price'], [5, 'kind'], [6, 'payBeforeEx'],
    ])
  })

  it('accepts thousands separators in the amount', () => {
    const r = parseStockEvents('cash 2024-06-20 1,500')
    expect(r.events[0]).toMatchObject({ perShare: 1500 })
  })
})
