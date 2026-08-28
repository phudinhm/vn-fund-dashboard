import type { FundMeta } from '../types'

/**
 * Công ty quản lý quỹ ("tổ chức") của từng mã quỹ.
 *
 * Tên quỹ không đủ để suy ra công ty quản lý một cách máy móc: có quỹ ghi rõ
 * ("...VinaCapital"), có quỹ chỉ ghi tên thương hiệu ("Bảo Thịnh"), có quỹ đổi
 * tên sau khi sáp nhập (SSIVLGF → VLGF, MBBMFF → BMFF, DFVNCAF → DCAF). Vì vậy
 * map tay theo mã quỹ — nguồn duy nhất, sai thì sửa đúng một chỗ.
 *
 * Mã không có trong map (vàng, crypto) trả về null: chúng không thuộc công ty
 * quản lý quỹ nào, gom vào nhóm riêng theo loại tài sản.
 */
const FUND_HOUSE_BY_ID: Record<string, string> = {
  // Dragon Capital (quỹ mở + bộ ETF DCVFM)
  DCDS: 'Dragon Capital', DCBF: 'Dragon Capital', DCDE: 'Dragon Capital',
  DCIP: 'Dragon Capital', E1VFVN30: 'Dragon Capital', FUEVFVND: 'Dragon Capital',
  FUEDCMID: 'Dragon Capital',

  // VinaCapital
  VFF: 'VinaCapital', VEOF: 'VinaCapital', VESAF: 'VinaCapital',
  VIBF: 'VinaCapital', VLBF: 'VinaCapital', VMEEF: 'VinaCapital',
  VDEF: 'VinaCapital',

  // VCBF (Vietcombank Fund Management)
  VCBFTBF: 'VCBF', VCBFBCF: 'VCBF', VCBFFIF: 'VCBF', VCBFMGF: 'VCBF',
  VCBFAIF: 'VCBF',

  // SSI / SSIAM
  SSISCA: 'SSI', SSIBF: 'SSI', SSIEF: 'SSI',
  FUESSVFL: 'SSIAM', FUESSV50: 'SSIAM', VLGF: 'SSIAM',

  // Bảo Việt
  BVFED: 'Bảo Việt', BVBF: 'Bảo Việt', BVPF: 'Bảo Việt',

  // Manulife
  MAFEQI: 'Manulife', MAFBAL: 'Manulife', MAFF: 'Manulife', MDI: 'Manulife',

  // MB Capital
  MBVF: 'MB Capital', MBBOND: 'MB Capital', MBAM: 'MB Capital', BMFF: 'MB Capital',

  // Bản Việt (VCAM)
  VCAMBF: 'Bản Việt', VCAMFI: 'Bản Việt', VCAMDF: 'Bản Việt',

  // Eastspring Investments
  ENF: 'Eastspring', EVESG: 'Eastspring',

  // Techcom (TCC)
  TCBF: 'Techcom', TCEF: 'Techcom',

  // VNDIRECT
  VNDAF: 'VNDIRECT', VNDBF: 'VNDIRECT', VNDCF: 'VNDIRECT',

  // DFVN (Dai-ichi Life)
  DCAF: 'DFVN', DFIX: 'DFVN',

  // United (UOB Asset Management)
  UVEEF: 'United', UMMF: 'United', USIF: 'United', UVDIF: 'United',

  // Lighthouse
  LHBF: 'Lighthouse', LHCDF: 'Lighthouse', LHFCF: 'Lighthouse',

  // KIM (Korea Investment Management)
  KDEF: 'KIM', KSIF: 'KIM',

  // An Bình / Amber / PVCOM / LPBank
  ABBF: 'An Bình', ABEF: 'An Bình',
  ASBF: 'Amber', AEIF: 'Amber',
  PVBF: 'PVCOM', PBIF: 'PVCOM',
  LPBF: 'LPBank', LPLF: 'LPBank',

  // Các công ty còn lại, mỗi bên một quỹ
  MAGEF: 'Mirae Asset',
  TBLF: 'Ballad Việt Nam',
  NTPPF: 'NTP',
  PHVSF: 'Phú Hưng',
  HDBOND: 'HD',
  TCGF: 'Thành Công',
  GDEGF: 'Rồng Vàng',
  RVPIF: 'Rồng Việt',
  VBIF: 'VietinBank',
  FUEVN100: 'IPAAM',

  // Chỉ số thị trường do Sở GDCK TP.HCM tính và công bố
  VNINDEX: 'HOSE', VN30: 'HOSE', VN100: 'HOSE',
}

/** Công ty quản lý của một mã quỹ, hoặc null nếu không thuộc bên nào (vàng, crypto). */
export function fundHouse(fundId: string): string | null {
  return FUND_HOUSE_BY_ID[fundId] ?? null
}

/** Nhãn nhóm khi không có công ty quản lý — gom theo loại tài sản. */
const ASSET_GROUP_LABEL: Partial<Record<FundMeta['type'], string>> = {
  gold: 'Vàng',
  crypto: 'Crypto',
}

/**
 * Nhãn nhóm hiển thị trong dropdown chọn quỹ: ưu tiên công ty quản lý, không
 * có thì gom theo loại tài sản, không có nữa thì "Khác" (không bao giờ bỏ rơi
 * một mã nào ra ngoài mọi nhóm).
 */
export function fundGroupLabel(fund: FundMeta): string {
  return fundHouse(fund.id) ?? ASSET_GROUP_LABEL[fund.type] ?? 'Khác'
}

/** Số quỹ mỗi công ty quản lý đang có trong danh sách — dùng để xếp nhóm. */
function groupSizes(funds: FundMeta[]): Map<string, number> {
  const sizes = new Map<string, number>()
  for (const f of funds) {
    const label = fundGroupLabel(f)
    sizes.set(label, (sizes.get(label) ?? 0) + 1)
  }
  return sizes
}

export interface FundGroup {
  label: string
  funds: FundMeta[]
}

/**
 * Gom danh sách quỹ theo công ty quản lý, xếp nhóm nhiều quỹ lên trước rồi tới
 * A-Z. Nhóm càng nhiều quỹ càng dễ là cái người dùng đang tìm, để lên đầu thì
 * bớt phải cuộn.
 */
export function groupFundsByHouse(funds: FundMeta[]): FundGroup[] {
  const sizes = groupSizes(funds)
  const byLabel = new Map<string, FundMeta[]>()
  for (const f of funds) {
    const label = fundGroupLabel(f)
    const list = byLabel.get(label)
    if (list) list.push(f)
    else byLabel.set(label, [f])
  }

  return [...byLabel.entries()]
    .map(([label, list]) => ({ label, funds: list }))
    .sort((a, b) => {
      const diff = (sizes.get(b.label) ?? 0) - (sizes.get(a.label) ?? 0)
      return diff !== 0 ? diff : a.label.localeCompare(b.label, 'vi')
    })
}
