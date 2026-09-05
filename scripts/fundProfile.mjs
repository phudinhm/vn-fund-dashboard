/**
 * Rút hồ sơ quỹ từ một dòng danh mục fmarket.
 *
 * Tên trường đối chiếu từ vnstock/explorer/fmarket/const.py (_FUND_LIST_MAPPING),
 * chứ không đoán: `owner.name` là công ty quản lý, `managementFee` là phí quản
 * lý, `firstIssueAt` là ngày phát hành đầu tiên tính bằng mili giây.
 *
 * Tách khỏi script gọi mạng để test được phần biến đổi dữ liệu — đây là chỗ dễ
 * sai lặng lẽ nhất (đơn vị thời gian, phí theo % hay theo lần).
 */

/** Mốc thời gian fmarket (mili giây) → 'YYYY-MM-DD'. Giá trị vô lý trả về null. */
export function msToIsoDate(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return null
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  const iso = d.toISOString().slice(0, 10)
  // fmarket dùng 0 hoặc số âm cho "không có dữ liệu"; sau khi đổi ra ngày thì
  // chúng rơi về 1970, không phải ngày thành lập quỹ nào cả.
  return iso >= '1990-01-01' ? iso : null
}

/** Số hoặc null — fmarket trả cả chuỗi rỗng lẫn null cho ô trống. */
export function num(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Hồ sơ một quỹ. Chỉ giữ trường fmarket thật sự trả về; không bịa thêm ô nào
 * để UI khỏi hiển thị chỗ trống giả vờ là dữ liệu.
 */
export function extractProfile(row) {
  const code = String(row.shortName || row.code || '').toUpperCase().trim()
  if (!code) return null
  const change = row.productNavChange || {}
  return {
    code,
    name: row.name || '',
    fundType: row.dataFundAssetType?.name || row.dataFundAssetType?.code || '',
    fundHouse: row.owner?.name || '',
    managementFee: num(row.managementFee),
    inceptionDate: msToIsoDate(num(row.firstIssueAt)),
    nav: num(row.nav),
    navUpdatedAt: msToIsoDate(num(change.updateAt)),
    returns: {
      m1: num(change.navTo1Months),
      m3: num(change.navTo3Months),
      m6: num(change.navTo6Months),
      m12: num(change.navTo12Months),
      m24: num(change.navTo24Months),
      m36: num(change.navTo36Months),
      annualized36m: num(change.annualizedReturn36Months),
      sinceInception: num(change.navToBeginning),
    },
    fmarketId: num(row.id),
  }
}

/**
 * Gom hồ sơ công ty quản lý từ chính các quỹ nó quản lý.
 *
 * Cố ý suy ra từ dữ liệu thay vì chép tay một danh sách công ty: quỹ đổi chủ,
 * công ty sáp nhập, và một bảng viết tay sẽ lệch dần mà không ai biết.
 */
export function buildHouseProfiles(profiles) {
  const byHouse = new Map()
  for (const p of profiles) {
    if (!p.fundHouse) continue
    if (!byHouse.has(p.fundHouse)) byHouse.set(p.fundHouse, [])
    byHouse.get(p.fundHouse).push(p)
  }

  return [...byHouse.entries()]
    .map(([name, funds]) => {
      const fees = funds.map(f => f.managementFee).filter(f => f !== null)
      const dates = funds.map(f => f.inceptionDate).filter(Boolean).sort()
      return {
        name,
        fundCount: funds.length,
        funds: funds.map(f => f.code).sort(),
        // Quỹ sớm nhất của công ty: dấu hiệu bề dày hoạt động, đọc được ngay
        // mà không cần thêm nguồn nào khác.
        earliestInception: dates[0] ?? null,
        medianManagementFee: median(fees),
      }
    })
    .sort((a, b) => b.fundCount - a.fundCount || a.name.localeCompare(b.name))
}

function median(values) {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
