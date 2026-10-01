import { describe, it, expect } from 'vitest'
import { applyFundFilter, availableHouses, availableTypes, isFilterActive, sanitizeFilter, DEFAULT_FUND_FILTER } from './fundFilter'
import type { FundMeta } from '../types'

const f = (id: string, type: FundMeta['type']): FundMeta => ({ id, name_vi: id, name_en: id, type, start_date: '2020-01-01', csv_file: `${id}.csv` })
const FUNDS = [f('DCDS', 'mutual_fund'), f('DCBF', 'bond'), f('VCBFTBF', 'balanced'), f('E1VFVN30', 'etf'), f('GOLD_X', 'gold')]

describe('applyFundFilter', () => {
  it('returns the same list when no filter is active', () => {
    expect(applyFundFilter(FUNDS, DEFAULT_FUND_FILTER, [])).toBe(FUNDS)
    expect(isFilterActive(DEFAULT_FUND_FILTER)).toBe(false)
  })

  it('filters by asset type (any of the chosen types)', () => {
    const r = applyFundFilter(FUNDS, { ...DEFAULT_FUND_FILTER, types: ['bond', 'etf'] }, [])
    expect(r.map(x => x.id)).toEqual(['DCBF', 'E1VFVN30'])
  })

  it('filters by fund house and excludes assets without one', () => {
    const r = applyFundFilter(FUNDS, { ...DEFAULT_FUND_FILTER, house: 'Dragon Capital' }, [])
    expect(r.map(x => x.id)).toEqual(['DCDS', 'DCBF', 'E1VFVN30'])
  })

  it('combines type and house', () => {
    const r = applyFundFilter(FUNDS, { types: ['bond'], house: 'Dragon Capital', watchOnly: false }, [])
    expect(r.map(x => x.id)).toEqual(['DCBF'])
  })

  it('watchOnly keeps only watched funds', () => {
    const r = applyFundFilter(FUNDS, { ...DEFAULT_FUND_FILTER, watchOnly: true }, ['VCBFTBF'])
    expect(r.map(x => x.id)).toEqual(['VCBFTBF'])
  })

  it('never drops funds that are already selected', () => {
    const r = applyFundFilter(FUNDS, { ...DEFAULT_FUND_FILTER, types: ['bond'] }, [], ['DCDS'])
    expect(r.map(x => x.id)).toEqual(['DCDS', 'DCBF'])
  })
})

describe('availability and sanitising', () => {
  it('lists present types in dropdown order and houses sorted', () => {
    expect(availableTypes(FUNDS)).toEqual(['mutual_fund', 'etf', 'balanced', 'bond', 'gold'])
    expect(availableHouses(FUNDS)).toEqual([...availableHouses(FUNDS)].sort())
    expect(availableHouses(FUNDS)).toContain('Dragon Capital')
  })

  it('sanitizes stored junk', () => {
    expect(sanitizeFilter(null)).toEqual(DEFAULT_FUND_FILTER)
    expect(sanitizeFilter({ types: ['bond', 'nope', 5], house: 7, watchOnly: 'yes' })).toEqual({ types: ['bond'], house: null, watchOnly: false })
    expect(sanitizeFilter({ types: ['etf'], house: 'VCBF', watchOnly: true })).toEqual({ types: ['etf'], house: 'VCBF', watchOnly: true })
  })
})
