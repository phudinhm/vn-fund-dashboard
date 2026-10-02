import { describe, it, expect } from 'vitest'
import { parseAssetStatement, parseAssetStatementWorkbook, parseNumber, parseVnDate, ReportError } from './fmarketReport'
import type { CellValue } from './xlsReader'

/** Bảng mô phỏng báo cáo thật (đã bỏ mọi thông tin định danh), ô rải rác như file Jasper gộp ô. */
const sparse = (cells: Record<number, CellValue>): CellValue[] => {
  const row: CellValue[] = new Array(43).fill(null)
  for (const [i, v] of Object.entries(cells)) row[Number(i)] = v
  return row
}
const SAMPLE: CellValue[][] = [
  sparse({ 2: 'BÁO CÁO TÀI SẢN' }),
  sparse({ 1: 'Chủ tài khoản', 5: 'NGUYEN VAN A', 20: 'Ngày xuất báo cáo', 25: '02/10/2026' }),
  sparse({ 1: 'Số giấy tờ tùy thân', 5: '000000000000' }),
  sparse({ 1: 'CHỨNG CHỈ QUỸ' }),
  sparse({ 1: 'Sản phẩm', 6: 'Chương trình', 12: 'Số lượng (CCQ)', 18: 'Giá mua trung bình', 24: 'Giá gần nhất', 30: 'Giá trị tương ứng', 36: 'Lời/Lỗ' }),
  sparse({ 1: 'Fund', 6: 'Fund program', 12: 'Quantity (unit)', 18: 'Average buying price' }),
  sparse({ 1: 'DCBF', 6: 'Linh hoạt / Flexible', 12: '653.4', 18: '30,608.22', 24: '30,608.22', 30: '19,999,411', 36: '0 (0%)' }),
  sparse({ 1: 'BVFED', 6: 'Linh hoạt / Flexible', 12: '168.21', 18: '29,724', 24: '29,724', 30: '4,999,874', 36: '0 (0%)' }),
  sparse({ 1: 'Tổng giá trị (1)', 30: '24,999,285', 36: '0 (0%)' }),
  sparse({ 1: 'Total value' }),
  sparse({ 1: 'Ghi chú' }),
]

describe('parseNumber', () => {
  it('reads thousand-separated and decimal strings in either locale', () => {
    expect(parseNumber('30,608.22')).toBe(30608.22)
    expect(parseNumber('19,999,411')).toBe(19999411)
    expect(parseNumber('653.4')).toBe(653.4)
    expect(parseNumber('30.608,22')).toBe(30608.22)
    expect(parseNumber('1.234.567')).toBe(1234567)
    expect(parseNumber('653,4')).toBe(653.4)
    expect(parseNumber('1,234')).toBe(1234)
  })
  it('passes numbers through and rejects non-numbers', () => {
    expect(parseNumber(12.5)).toBe(12.5)
    expect(parseNumber('0 (0%)')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber(null)).toBeNull()
    expect(parseNumber('')).toBeNull()
  })
})

describe('parseVnDate', () => {
  it('converts dd/mm/yyyy and rejects impossible dates', () => {
    expect(parseVnDate('02/10/2026')).toBe('2026-10-02')
    expect(parseVnDate('2/1/2026')).toBe('2026-01-02')
    expect(parseVnDate('31/02/2026')).toBeNull()
    expect(parseVnDate('2026-10-02')).toBeNull()
  })
})

describe('parseAssetStatement', () => {
  it('reads the report date and every holding', () => {
    const s = parseAssetStatement(SAMPLE)
    expect(s.date).toBe('2026-10-02')
    expect(s.total).toBe(24999285)
    expect(s.holdings).toEqual([
      { fund: 'DCBF', program: 'Linh hoạt / Flexible', units: 653.4, avgPrice: 30608.22, nav: 30608.22, value: 19999411 },
      { fund: 'BVFED', program: 'Linh hoạt / Flexible', units: 168.21, avgPrice: 29724, nav: 29724, value: 4999874 },
    ])
  })

  it('never returns the account holder name or ID', () => {
    const json = JSON.stringify(parseAssetStatement(SAMPLE))
    expect(json).not.toContain('NGUYEN')
    expect(json).not.toContain('000000000000')
  })

  it('does not depend on which merged column a value sits in', () => {
    const shifted = SAMPLE.map(r => [null, null, ...r.slice(0, 41)])
    expect(parseAssetStatement(shifted).holdings).toHaveLength(2)
  })

  it('fails with a specific code when the structure is not recognised', () => {
    expect(() => parseAssetStatement([['a', 'b']])).toThrow(ReportError)
    expect(() => parseAssetStatement([sparse({ 1: 'Ngày xuất báo cáo', 5: '02/10/2026' })])).toThrowError('no-header')
    const noHold = SAMPLE.filter(r => !String(r[1]).match(/^(DCBF|BVFED)$/))
    expect(() => parseAssetStatement(noHold)).toThrowError('no-holdings')
  })

  it('tries every sheet of a workbook', () => {
    const s = parseAssetStatementWorkbook([{ rows: [['junk']] }, { rows: SAMPLE }])
    expect(s.holdings).toHaveLength(2)
    expect(() => parseAssetStatementWorkbook([{ rows: [['junk']] }])).toThrow(ReportError)
  })
})
