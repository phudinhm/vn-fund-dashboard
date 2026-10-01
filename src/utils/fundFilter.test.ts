import { describe, it, expect } from 'vitest'
import {
  DEFAULT_FUND_FILTER, activeFilterCount, applyFundFilter, availableHouses, availableTypes,
  facetCounts, isFilterActive, sanitizeFilter, splitByFilter, type FundFilter, type FilterContext,
} from './fundFilter'
import type { FundMeta } from '../types'

const f = (id: string, type: FundMeta['type'], start = '2015-01-01'): FundMeta =>
  ({ id, name_vi: id, name_en: id, type, start_date: start, csv_file: `${id}.csv` })
const FUNDS = [
  f('DCDS', 'mutual_fund', '2004-05-20'), f('DCBF', 'bond', '2013-01-01'), f('VCBFTBF', 'balanced', '2020-01-01'),
  f('E1VFVN30', 'etf', '2014-10-01'), f('GOLD_X', 'gold', '2010-01-01'), f('DCIP', 'bond', '2024-06-01'),
]
const CTX: FilterContext = {
  watchedIds: ['VCBFTBF', 'DCBF'],
  today: '2026-10-01',
  managementFee: new Map([['DCDS', 1.95], ['DCBF', 1.2], ['VCBFTBF', 0.8], ['DCIP', 2.5]]),
}
const flt = (p: Partial<FundFilter>): FundFilter => ({ ...DEFAULT_FUND_FILTER, ...p })
const ids = (l: FundMeta[]) => l.map(x => x.id)

describe('applyFundFilter', () => {
  it('returns the same list when no filter is active', () => {
    expect(applyFundFilter(FUNDS, DEFAULT_FUND_FILTER, CTX)).toBe(FUNDS)
    expect(isFilterActive(DEFAULT_FUND_FILTER)).toBe(false)
  })

  it('filters by asset type (any of the chosen types)', () => {
    expect(ids(applyFundFilter(FUNDS, flt({ types: ['bond', 'etf'] }), CTX))).toEqual(['DCBF', 'E1VFVN30', 'DCIP'])
  })

  it('filters by fund house and drops assets without one', () => {
    expect(ids(applyFundFilter(FUNDS, flt({ house: 'Dragon Capital' }), CTX))).toEqual(['DCDS', 'DCBF', 'E1VFVN30', 'DCIP'])
  })

  it('combines type and house', () => {
    expect(ids(applyFundFilter(FUNDS, flt({ types: ['bond'], house: 'Dragon Capital' }), CTX))).toEqual(['DCBF', 'DCIP'])
  })

  it('watchOnly keeps only watched funds', () => {
    expect(ids(applyFundFilter(FUNDS, flt({ watchOnly: true }), CTX))).toEqual(['DCBF', 'VCBFTBF'])
  })

  it('minYears keeps funds with at least that much history', () => {
    expect(ids(applyFundFilter(FUNDS, flt({ minYears: 10 }), CTX))).toEqual(['DCDS', 'DCBF', 'E1VFVN30', 'GOLD_X'])
    expect(ids(applyFundFilter(FUNDS, flt({ minYears: 5 }), CTX))).not.toContain('DCIP')
  })

  it('maxFee keeps funds at or under the cap and drops those with no fee figure', () => {
    expect(ids(applyFundFilter(FUNDS, flt({ maxFee: 1.5 }), CTX))).toEqual(['DCBF', 'VCBFTBF'])
  })

  it('combines every criterion', () => {
    const r = applyFundFilter(FUNDS, flt({ types: ['bond'], house: 'Dragon Capital', minYears: 10, maxFee: 2, watchOnly: true }), CTX)
    expect(ids(r)).toEqual(['DCBF'])
  })
})

describe('splitByFilter', () => {
  it('keeps selected funds visible but reports them as outside the filter', () => {
    const s = splitByFilter(FUNDS, flt({ types: ['bond'] }), CTX, ['DCDS'])
    expect(ids(s.matched)).toEqual(['DCBF', 'DCIP'])
    expect(ids(s.outside)).toEqual(['DCDS'])
    expect(ids(s.visible)).toEqual(['DCDS', 'DCBF', 'DCIP'])
  })

  it('has no outside funds when the selection already matches', () => {
    const s = splitByFilter(FUNDS, flt({ types: ['bond'] }), CTX, ['DCBF'])
    expect(s.outside).toEqual([])
    expect(s.visible).toBe(s.matched)
  })
})

describe('facetCounts', () => {
  it('counts each type under the OTHER active filters', () => {
    const c = facetCounts(FUNDS, flt({ house: 'Dragon Capital' }), CTX)
    expect(c.types.get('bond')).toBe(2)
    expect(c.types.get('etf')).toBe(1)
    expect(c.types.get('balanced')).toBeUndefined()
  })

  it('does not apply the type filter to the type counts themselves', () => {
    const c = facetCounts(FUNDS, flt({ types: ['bond'] }), CTX)
    expect(c.types.get('etf')).toBe(1) // still shown so it can be added to the selection
  })

  it('counts houses under the other filters and watched funds', () => {
    const c = facetCounts(FUNDS, flt({ types: ['bond'] }), CTX)
    expect(c.houses.get('Dragon Capital')).toBe(2)
    expect(c.watched).toBe(1) // only DCBF is a watched bond
  })
})

describe('availability, counting and sanitising', () => {
  it('lists present types in dropdown order and houses sorted', () => {
    expect(availableTypes(FUNDS)).toEqual(['mutual_fund', 'etf', 'balanced', 'bond', 'gold'])
    expect(availableHouses(FUNDS)).toEqual([...availableHouses(FUNDS)].sort())
  })

  it('counts active criteria', () => {
    expect(activeFilterCount(DEFAULT_FUND_FILTER)).toBe(0)
    expect(activeFilterCount(flt({ types: ['bond', 'etf'], house: 'X', watchOnly: true, minYears: 5, maxFee: 1 }))).toBe(6)
  })

  it('sanitizes stored junk', () => {
    expect(sanitizeFilter(null)).toEqual(DEFAULT_FUND_FILTER)
    expect(sanitizeFilter({ types: ['bond', 'nope', 5], house: 7, watchOnly: 'yes', minYears: 4, maxFee: 'x' })).toEqual(flt({ types: ['bond'] }))
    expect(sanitizeFilter({ types: ['etf'], house: 'VCBF', watchOnly: true, minYears: 5, maxFee: 1.5 }))
      .toEqual({ types: ['etf'], house: 'VCBF', watchOnly: true, minYears: 5, maxFee: 1.5 })
  })
})
