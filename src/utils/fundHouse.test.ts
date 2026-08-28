import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fundHouse, fundGroupLabel, groupFundsByHouse } from './fundHouse'
import { parseFundMetadata } from './csvParser'
import type { FundMeta } from '../types'

// Đọc từ cwd (gốc repo khi chạy vitest): trong môi trường jsdom, import.meta.url
// là URL http nên new URL(...) không dùng làm đường dẫn file được.
const metadata = parseFundMetadata(
  readFileSync('public/data/fund_metadata.json', 'utf8'),
)

function meta(id: string, type: FundMeta['type'] = 'mutual_fund'): FundMeta {
  return { id, name_vi: id, type, start_date: '2020-01-01', csv_file: `${id}.csv` }
}

describe('fundHouse', () => {
  it('maps funds to their managing company', () => {
    expect(fundHouse('DCDS')).toBe('Dragon Capital')
    expect(fundHouse('VESAF')).toBe('VinaCapital')
    expect(fundHouse('VCBFBCF')).toBe('VCBF')
  })

  it('keeps renamed funds with their real manager, not their id prefix', () => {
    // DCAF nghe như Dragon Capital nhưng là quỹ của DFVN (tên cũ DFVNCAF).
    expect(fundHouse('DCAF')).toBe('DFVN')
    // VLGF tên cũ SSIVLGF, BMFF tên cũ MBBMFF.
    expect(fundHouse('VLGF')).toBe('SSIAM')
    expect(fundHouse('BMFF')).toBe('MB Capital')
  })

  it('returns null for assets with no fund manager', () => {
    expect(fundHouse('BTC')).toBeNull()
    expect(fundHouse('GOLD_SJC')).toBeNull()
  })
})

describe('fundGroupLabel', () => {
  it('falls back to the asset type when there is no fund manager', () => {
    expect(fundGroupLabel(meta('BTC', 'crypto'))).toBe('Crypto')
    expect(fundGroupLabel(meta('GOLD_SJC', 'gold'))).toBe('Vàng')
  })

  it('never leaves a fund without a group', () => {
    expect(fundGroupLabel(meta('SOMETHING_NEW', 'bond'))).toBe('Khác')
  })
})

describe('fund metadata coverage', () => {
  it('maps every real fund in fund_metadata.json to a fund house', () => {
    // Vàng và crypto không thuộc công ty quản lý quỹ nào — gom theo loại tài sản.
    const unmapped = metadata
      .filter(f => f.type !== 'gold' && f.type !== 'crypto')
      .filter(f => fundHouse(f.id) === null)
      .map(f => f.id)
    expect(unmapped).toEqual([])
  })

  it('puts no fund in the "Khác" catch-all', () => {
    const other = metadata.filter(f => fundGroupLabel(f) === 'Khác').map(f => f.id)
    expect(other).toEqual([])
  })
})

describe('groupFundsByHouse', () => {
  it('groups funds and keeps every one of them', () => {
    const groups = groupFundsByHouse(metadata)
    const total = groups.reduce((n, g) => n + g.funds.length, 0)
    expect(total).toBe(metadata.length)
    expect(new Set(groups.map(g => g.label)).size).toBe(groups.length)
  })

  it('orders bigger fund houses first', () => {
    const groups = groupFundsByHouse(metadata)
    const sizes = groups.map(g => g.funds.length)
    expect([...sizes].sort((a, b) => b - a)).toEqual(sizes)
  })
})
