/**
 * Rút biểu phí một quỹ từ chi tiết sản phẩm fmarket (/res/products/{id}).
 *
 * Cấu trúc đối chiếu từ dữ liệu thật, không đoán:
 *  - productFeeList: danh sách bậc phí. `type` là BUY, SELL hoặc TRANSFER.
 *    BUY chia bậc theo SỐ TIỀN mua (VND), SELL chia bậc theo SỐ THÁNG nắm giữ.
 *    `fee` tính bằng % giá trị lệnh. Mỗi bậc có `beginVolume`/`endVolume`
 *    (null = không giới hạn) kèm toán tử `>`/`>=`/`<`/`<=`.
 *  - Mỗi bậc thuộc một chương trình (productProgram.scheme.code): NORMAL là mua
 *    thường, SIP là mua định kỳ. Biểu phí hiển thị lấy NORMAL, riêng SIP giữ
 *    thành `sipBuy` vì phí mua định kỳ có thể khác.
 *  - managementFee / performanceFee tính %/năm và ĐÃ nằm trong NAV: không trừ
 *    lần nữa khi tính lãi từ NAV. Chỉ phí mua và phí bán là phí nhà đầu tư trả
 *    thêm bên ngoài NAV.
 */

function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function tier(row) {
  return {
    from: num(row.beginVolume) ?? 0,
    to: num(row.endVolume),
    rate: num(row.fee) ?? 0,
  }
}

function dedupeTiers(tiers) {
  const seen = new Set()
  const out = []
  for (const t of tiers.sort((a, b) => a.from - b.from || (a.to ?? Infinity) - (b.to ?? Infinity))) {
    const key = `${t.from}|${t.to}|${t.rate}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function byScheme(list, scheme) {
  return (list || []).filter(r => (r.productProgram?.scheme?.code ?? 'NORMAL') === scheme)
}

/**
 * @param {string} code mã quỹ
 * @param {object} detail data của /res/products/{id}
 */
export function extractFees(code, detail) {
  const normal = byScheme(detail.productFeeList, 'NORMAL')
  // Một số quỹ chỉ có chương trình khác NORMAL: lấy chương trình đầu tiên có phí.
  const main = normal.length > 0 ? normal : (detail.productFeeList || [])
  const sip = (detail.productFeeSipList || []).filter(r => r.type === 'BUY')

  const buy = dedupeTiers(main.filter(r => r.type === 'BUY').map(tier))
  const sell = dedupeTiers(main.filter(r => r.type === 'SELL').map(tier))
  const sipBuy = dedupeTiers(sip.map(tier))

  return {
    code,
    management: num(detail.managementFee),
    performance: num(detail.performanceFee),
    /** Bậc phí mua theo số tiền (VND): from ≤ tiền < to. */
    buy,
    /** Bậc phí mua của chương trình SIP, nếu khác. */
    sipBuy,
    /** Bậc phí bán theo số tháng nắm giữ: from ≤ tháng < to. */
    sell,
  }
}
