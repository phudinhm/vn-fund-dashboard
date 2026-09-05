import { describe, it, expect } from 'vitest'
// @ts-expect-error — script thuần JS, không có khai báo kiểu
import { extractProfile, buildHouseProfiles, msToIsoDate, num } from '../../scripts/fundProfile.mjs'

const row = {
  shortName: 'VESAF',
  name: 'Quỹ Đầu Tư Cổ Phiếu Tiếp Cận Thị Trường VinaCapital',
  dataFundAssetType: { name: 'Quỹ cổ phiếu', code: 'STOCK' },
  owner: { name: 'VinaCapital' },
  managementFee: 1.75,
  firstIssueAt: 1490572800000, // 2017-03-27
  nav: 32000.5,
  id: 23,
  productNavChange: {
    navTo1Months: 1.2, navTo3Months: 5.5, navTo6Months: 9.9, navTo12Months: 20.1,
    navTo24Months: 40, navTo36Months: 60, annualizedReturn36Months: 17,
    navToBeginning: 220, updateAt: 1756944000000,
  },
}

describe('msToIsoDate', () => {
  it('đổi mili giây sang ngày ISO', () => {
    expect(msToIsoDate(1490572800000)).toBe('2017-03-27')
  })

  it('coi 0 và số âm là không có dữ liệu, không phải năm 1970', () => {
    expect(msToIsoDate(0)).toBeNull()
    expect(msToIsoDate(-1)).toBeNull()
    expect(msToIsoDate(86400000)).toBeNull()
  })

  it('trả null cho giá trị không phải số', () => {
    expect(msToIsoDate(null)).toBeNull()
    expect(msToIsoDate(NaN)).toBeNull()
  })
})

describe('num', () => {
  it('phân biệt ô trống với số 0', () => {
    expect(num('')).toBeNull()
    expect(num(null)).toBeNull()
    expect(num(0)).toBe(0)
    expect(num('1.75')).toBe(1.75)
  })
})

describe('extractProfile', () => {
  it('lấy đúng công ty quản lý, phí và ngày thành lập', () => {
    const p = extractProfile(row)

    expect(p).toMatchObject({
      code: 'VESAF',
      fundHouse: 'VinaCapital',
      fundType: 'Quỹ cổ phiếu',
      managementFee: 1.75,
      inceptionDate: '2017-03-27',
      nav: 32000.5,
      fmarketId: 23,
    })
    expect(p.returns).toMatchObject({ m12: 20.1, annualized36m: 17, sinceInception: 220 })
  })

  it('bỏ qua dòng không có mã quỹ', () => {
    expect(extractProfile({ name: 'không mã' })).toBeNull()
  })

  it('không gãy khi fmarket thiếu productNavChange', () => {
    const p = extractProfile({ shortName: 'X', name: 'Quỹ X' })

    expect(p.returns.m12).toBeNull()
    expect(p.managementFee).toBeNull()
    expect(p.inceptionDate).toBeNull()
  })
})

describe('buildHouseProfiles', () => {
  const profiles = [
    { code: 'VESAF', fundHouse: 'VinaCapital', managementFee: 1.75, inceptionDate: '2017-03-27' },
    { code: 'VEOF', fundHouse: 'VinaCapital', managementFee: 1.95, inceptionDate: '2014-07-01' },
    { code: 'VFF', fundHouse: 'VinaCapital', managementFee: 1.0, inceptionDate: '2013-04-01' },
    { code: 'DCDS', fundHouse: 'Dragon Capital', managementFee: 2.0, inceptionDate: '2004-05-20' },
    { code: 'NOHOUSE', fundHouse: '', managementFee: 1, inceptionDate: '2020-01-01' },
  ]

  it('gom quỹ theo công ty và xếp công ty nhiều quỹ lên trước', () => {
    const houses = buildHouseProfiles(profiles)

    expect(houses.map((h: { name: string }) => h.name)).toEqual(['VinaCapital', 'Dragon Capital'])
    expect(houses[0]).toMatchObject({ fundCount: 3, funds: ['VEOF', 'VESAF', 'VFF'] })
  })

  it('lấy quỹ sớm nhất làm mốc bề dày hoạt động', () => {
    const houses = buildHouseProfiles(profiles)

    expect(houses[0].earliestInception).toBe('2013-04-01')
    expect(houses[1].earliestInception).toBe('2004-05-20')
  })

  it('phí trung vị tính trên các quỹ có phí', () => {
    const houses = buildHouseProfiles(profiles)

    expect(houses[0].medianManagementFee).toBe(1.75)
    expect(houses[1].medianManagementFee).toBe(2.0)
  })

  it('bỏ quỹ không rõ công ty quản lý thay vì gom vào nhóm rỗng', () => {
    const houses = buildHouseProfiles(profiles)

    expect(houses.some((h: { name: string }) => h.name === '')).toBe(false)
  })
})
