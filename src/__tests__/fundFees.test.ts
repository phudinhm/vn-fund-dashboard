import { describe, it, expect } from 'vitest'
// @ts-expect-error — script thuần JS, không có khai báo kiểu
import { extractFees } from '../../scripts/fundFees.mjs'

const op = (code: string) => ({ code })
const row = (type: string, from: number, to: number | null, fee: number, scheme = 'NORMAL') => ({
  type, beginVolume: from, endVolume: to, fee,
  beginRelationalOperator: op('>='), endRelationalOperator: op('<'),
  isUnitByDay: false, productProgram: { scheme: { code: scheme } },
})

describe('extractFees', () => {
  it('splits buy tiers (by amount) and sell tiers (by months), drops TRANSFER', () => {
    const f = extractFees('SSISCA', {
      managementFee: 1.75,
      performanceFee: null,
      productFeeList: [
        row('BUY', 0, 100_000_000, 0), row('BUY', 100_000_000, null, 0),
        row('SELL', 0, 6, 2.5), row('SELL', 6, 12, 2), row('SELL', 12, 24, 1.5), row('SELL', 24, null, 0),
        row('TRANSFER', 0, 6, 2.5),
      ],
      productFeeSipList: [row('BUY', 0, 100_000_000, 0, 'SIP'), row('SELL', 0, 6, 2.5, 'SIP')],
    })
    expect(f.management).toBe(1.75)
    expect(f.performance).toBeNull()
    expect(f.buy).toHaveLength(2)
    expect(f.sell).toEqual([
      { from: 0, to: 6, rate: 2.5 }, { from: 6, to: 12, rate: 2 },
      { from: 12, to: 24, rate: 1.5 }, { from: 24, to: null, rate: 0 },
    ])
    expect(f.sipBuy).toEqual([{ from: 0, to: 100_000_000, rate: 0 }])
  })

  it('removes duplicated tiers that fmarket repeats per program', () => {
    const f = extractFees('X', { productFeeList: [row('SELL', 0, 6, 1), row('SELL', 0, 6, 1), row('SELL', 6, null, 0)] })
    expect(f.sell).toHaveLength(2)
  })

  it('falls back to the first program when there is no NORMAL one', () => {
    const f = extractFees('Y', { productFeeList: [row('SELL', 0, 12, 1, 'OTHER')] })
    expect(f.sell).toEqual([{ from: 0, to: 12, rate: 1 }])
  })

  it('tolerates a missing fee list', () => {
    const f = extractFees('Z', {})
    expect(f.buy).toEqual([])
    expect(f.sell).toEqual([])
    expect(f.management).toBeNull()
  })
})
