/**
 * Đối chiếu danh mục quỹ của fmarket với fund_metadata.json.
 *
 * Tách riêng khỏi audit_fund_coverage.mjs để phần logic thuần (không mạng)
 * kiểm thử được: chính phần này quyết định quỹ nào được thêm vào dashboard,
 * nên nó cần test chứ không chỉ chạy tay một lần rồi tin.
 */

/**
 * Loại tài sản fmarket → `type` trong fund_metadata.json.
 *
 * Cố ý KHÔNG có nhánh mặc định đoán mò: gặp loại lạ thì báo ra để người đọc
 * quyết định, vì đoán sai một quỹ trái phiếu thành quỹ cổ phiếu sẽ lặng lẽ
 * làm sai mọi phép so sánh theo nhóm.
 */
export const FMARKET_TYPE_MAP = {
  // Mã loại của fmarket, đối chiếu từ vnstock/explorer/fmarket (_FUND_TYPE_MAPPING).
  STOCK: 'mutual_fund',
  BOND: 'bond',
  BALANCED: 'balanced',
  // Tên hiển thị tiếng Việt, phòng khi API trả name thay vì code.
  'Quỹ cổ phiếu': 'mutual_fund',
  'Quỹ trái phiếu': 'bond',
  'Quỹ cân bằng': 'balanced',
}

/** Mã quỹ chuẩn hoá: fmarket lúc trả shortName, lúc trả code, hoa/thường lẫn lộn. */
export function normalizeCode(row) {
  const raw = row.shortName || row.code || row.productShortName || ''
  return String(raw).toUpperCase().replace(/\s+/g, '').trim()
}

/** Loại tài sản fmarket của một dòng, ở bất kỳ chỗ nào fmarket giấu nó. */
export function fmarketAssetType(row) {
  // Ưu tiên `code` (STOCK/BOND/BALANCED) hơn `name`: mã máy ổn định, còn tên
  // hiển thị có thể đổi chữ bất cứ lúc nào mà không báo trước.
  return row.dataFundAssetType?.code
    || row.dataFundAssetType?.name
    || row.fundAssetTypeName
    || row.fundType
    || ''
}

/**
 * So danh mục fmarket với metadata đang có.
 *
 * `missing`  — fmarket có, dashboard chưa có, và biết chắc loại → thêm được.
 * `unknown`  — fmarket có, dashboard chưa có, nhưng loại lạ → cần người xem.
 * `extra`    — dashboard có, fmarket không trả về. KHÔNG phải lỗi: ETF, chỉ số,
 *              vàng, BTC và hai quỹ digiinvest (TCBF, TCEF) vốn không nằm trên
 *              fmarket. Liệt kê ra để phát hiện quỹ bị đóng hoặc đổi mã.
 */
export function diffCoverage(fmarketRows, metadata) {
  const have = new Set(metadata.map(m => String(m.id).toUpperCase()))
  const seen = new Set()
  const missing = []
  const unknown = []

  for (const row of fmarketRows) {
    const code = normalizeCode(row)
    if (!code) continue
    seen.add(code)
    if (have.has(code)) continue

    const assetType = fmarketAssetType(row)
    const type = FMARKET_TYPE_MAP[assetType]
    const entry = {
      code,
      name: row.name || row.productName || '',
      assetType,
      issuer: row.owner?.name || row.issuerName || '',
    }
    if (type) missing.push({ ...entry, type })
    else unknown.push(entry)
  }

  const extra = metadata
    .filter(m => !seen.has(String(m.id).toUpperCase()))
    .map(m => ({ code: m.id, type: m.type, name: m.name_vi }))

  return { missing, unknown, extra }
}

/**
 * Dòng metadata cho một quỹ mới.
 *
 * start_date để trống có chủ đích: update_nav.mjs thấy CSV chưa tồn tại thì gọi
 * fmarket với isAllData=1 và kéo TOÀN BỘ lịch sử, nên ngày bắt đầu thật sẽ tự
 * hiện ra trong CSV. Viết sẵn một ngày đoán ở đây chỉ tạo ra một con số sai.
 */
export function toMetadataEntry(fund) {
  return {
    id: fund.code,
    name_vi: `${fund.code} - ${fund.name}`.trim(),
    type: fund.type,
    start_date: '',
    csv_file: `${fund.code}.csv`,
  }
}

/** Ghi lại metadata giữ nguyên khuôn: mỗi quỹ một dòng, thụt 2 dấu cách. */
export function serializeMetadata(entries) {
  const lines = entries.map(e => '  ' + JSON.stringify(e))
  return '[\n' + lines.join(',\n') + '\n]\n'
}
