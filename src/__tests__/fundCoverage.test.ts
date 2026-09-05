import { describe, it, expect } from 'vitest'
// @ts-expect-error — script thuần JS, không có khai báo kiểu
import { diffCoverage, toMetadataEntry, serializeMetadata, normalizeCode, canonicalCode } from '../../scripts/fundCoverage.mjs'

const meta = [
  { id: 'DCDS', name_vi: 'DCDS - ...', type: 'mutual_fund', start_date: '2004-05-20', csv_file: 'DCDS.csv' },
  { id: 'TCBF', name_vi: 'TCBF - ...', type: 'bond', start_date: '2015-01-01', csv_file: 'TCBF.csv' },
  { id: 'E1VFVN30', name_vi: 'ETF', type: 'etf', start_date: '2014-10-06', csv_file: 'E1VFVN30.csv' },
]

const row = (shortName: string, type: string, name = 'Quỹ X') => ({
  shortName, name, dataFundAssetType: { name: type }, owner: { name: 'Công ty Y' },
})

describe('diffCoverage', () => {
  it('báo quỹ fmarket có mà dashboard chưa có, kèm loại đã ánh xạ', () => {
    const { missing } = diffCoverage([row('DCDS', 'Quỹ cổ phiếu'), row('VEOF', 'Quỹ cổ phiếu')], meta)

    expect(missing).toHaveLength(1)
    expect(missing[0]).toMatchObject({ code: 'VEOF', type: 'mutual_fund', issuer: 'Công ty Y' })
  })

  it('ánh xạ đúng ba loại quỹ mở', () => {
    const { missing } = diffCoverage(
      [row('A', 'Quỹ cổ phiếu'), row('B', 'Quỹ trái phiếu'), row('C', 'Quỹ cân bằng')], [])

    expect(missing.map((f: { type: string }) => f.type)).toEqual(['mutual_fund', 'bond', 'balanced'])
  })

  it('không đoán loại lạ mà tách sang unknown', () => {
    const { missing, unknown } = diffCoverage([row('Z', 'Quỹ bất động sản')], [])

    expect(missing).toEqual([])
    expect(unknown[0]).toMatchObject({ code: 'Z', assetType: 'Quỹ bất động sản' })
  })

  it('liệt kê mã dashboard có mà fmarket không trả về', () => {
    const { extra } = diffCoverage([row('DCDS', 'Quỹ cổ phiếu')], meta)

    expect(extra.map((f: { code: string }) => f.code).sort()).toEqual(['E1VFVN30', 'TCBF'])
  })

  it('so mã không phân biệt hoa thường và khoảng trắng', () => {
    const { missing } = diffCoverage([{ ...row('  dcds ', 'Quỹ cổ phiếu') }], meta)

    expect(missing).toEqual([])
  })

  // Lỗi thật đã lọt ra ở lần chạy CI đầu tiên: fmarket trả "VCBF-FIF" còn
  // metadata ghi "VCBFFIF", nên sáu quỹ VCBF/SSI bị thêm trùng.
  it('coi mã có gạch nối và mã liền là một quỹ', () => {
    const meta2 = [{ id: 'VCBFFIF', name_vi: '', type: 'bond', start_date: '', csv_file: 'VCBFFIF.csv' }]
    const { missing } = diffCoverage([row('VCBF-FIF', 'Quỹ trái phiếu')], meta2)

    expect(missing).toEqual([])
  })

  it('không báo nhầm quỹ có gạch nối là mã dashboard không dùng', () => {
    const meta2 = [{ id: 'SSIEF', name_vi: '', type: 'balanced', start_date: '', csv_file: 'SSIEF.csv' }]
    const { extra } = diffCoverage([row('SSI-EF', 'Quỹ cân bằng')], meta2)

    expect(extra).toEqual([])
  })

  it('quỹ mới có gạch nối được lưu theo dạng liền như các mã sẵn có', () => {
    const { missing } = diffCoverage([row('SSI-PDF', 'Quỹ cổ phiếu')], [])

    expect(missing[0].code).toBe('SSIPDF')
  })

  it('bỏ qua dòng không có mã', () => {
    const { missing } = diffCoverage([{ name: 'không mã', dataFundAssetType: { name: 'Quỹ cổ phiếu' } }], [])

    expect(missing).toEqual([])
  })
})

describe('canonicalCode', () => {
  it('bỏ gạch nối, chấm, gạch dưới và khoảng trắng', () => {
    expect(canonicalCode('VCBF-FIF')).toBe('VCBFFIF')
    expect(canonicalCode('ssi.pdf')).toBe('SSIPDF')
    expect(canonicalCode('E1VFVN_30')).toBe('E1VFVN30')
    expect(canonicalCode(null)).toBe('')
  })
})

describe('normalizeCode', () => {
  it('lấy được mã dù fmarket để ở shortName hay code', () => {
    expect(normalizeCode({ shortName: 'veof' })).toBe('VEOF')
    expect(normalizeCode({ code: 'ssisca' })).toBe('SSISCA')
    expect(normalizeCode({})).toBe('')
  })
})

describe('toMetadataEntry', () => {
  it('để trống start_date để pipeline tự kéo toàn bộ lịch sử', () => {
    const e = toMetadataEntry({ code: 'VEOF', name: 'Quỹ Cổ Phiếu Hiệu Quả', type: 'mutual_fund' })

    expect(e).toEqual({
      id: 'VEOF',
      name_vi: 'VEOF - Quỹ Cổ Phiếu Hiệu Quả',
      type: 'mutual_fund',
      start_date: '',
      csv_file: 'VEOF.csv',
    })
  })
})

describe('serializeMetadata', () => {
  it('giữ khuôn mỗi quỹ một dòng và đọc lại được', () => {
    const out = serializeMetadata(meta)

    // Dòng đầu có dấu phẩy cuối vì còn quỹ phía sau; dòng cuối thì không.
    expect(out.split('\n')[1]).toBe('  ' + JSON.stringify(meta[0]) + ',')
    expect(out.split('\n')[3]).toBe('  ' + JSON.stringify(meta[2]))
    expect(JSON.parse(out)).toEqual(meta)
    expect(out.endsWith('\n')).toBe(true)
  })
})
