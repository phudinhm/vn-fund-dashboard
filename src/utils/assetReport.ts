import type { CellValue } from './xlsReader'

/**
 * Đọc "Báo cáo tài sản" (Asset Statement) dạng .xls.
 *
 * Báo cáo này là ẢNH CHỤP SỐ DƯ tại ngày xuất, không phải lịch sử lệnh: mỗi quỹ
 * có số CCQ đang giữ, giá mua bình quân và NAV gần nhất. Hàm này CỐ Ý chỉ trả
 * phần số dư. Báo cáo còn chứa họ tên, số giấy tờ tùy thân và mã khách hàng:
 * những trường đó không bao giờ được đọc ra khỏi bảng, nên không thể bị lưu
 * hay gửi đi nhầm.
 */

export class ReportError extends Error {
  constructor(readonly code: 'no-date' | 'no-header' | 'no-holdings') {
    super(code)
  }
}

export interface ReportHolding {
  fund: string
  program: string
  units: number
  avgPrice: number
  nav: number
  value: number
}

export interface AssetStatement {
  /** Ngày xuất báo cáo (YYYY-MM-DD): ngày của ảnh chụp số dư. */
  date: string
  holdings: ReportHolding[]
  /** Tổng giá trị chứng chỉ quỹ theo báo cáo, nếu đọc được. */
  total: number | null
}

/** "30,608.22" → 30608.22. Nhận cả số thật, và dạng Việt "30.608,22". Null nếu không phải số. */
export function parseNumber(v: CellValue): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  let s = v.trim().replace(/\s/g, '')
  if (!s || !/^[-+]?[\d.,]+$/.test(s)) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // Dấu xuất hiện sau cùng là dấu thập phân, dấu kia là phân cách nghìn.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma > -1) {
    // Chỉ có dấu phẩy: nhóm đúng 3 chữ số là phân cách nghìn, ngược lại là thập phân.
    s = /^[-+]?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (lastDot > -1 && /^[-+]?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    s = s.replace(/\./g, '') // 1.234.567: nhiều nhóm 3 chữ số = phân cách nghìn
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** "02/10/2026" → "2026-10-02". */
export function parseVnDate(v: CellValue): string | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const t = new Date(iso + 'T00:00:00Z')
  return Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== iso ? null : iso
}

const text = (v: CellValue) => (typeof v === 'string' ? v.trim() : v === null ? '' : String(v))
const FUND_CODE = /^[A-Z][A-Z0-9_]{1,14}$/

export function parseAssetStatement(rows: CellValue[][]): AssetStatement {
  // Ngày xuất báo cáo: ô đứng ngay sau nhãn "Ngày xuất báo cáo".
  let date: string | null = null
  let headerRow = -1
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!
    const cells = row.map(text)
    const labelAt = cells.findIndex(c => /^ngày xuất báo cáo/i.test(c))
    if (labelAt > -1 && date === null) {
      for (let c = labelAt + 1; c < row.length; c++) {
        const d = parseVnDate(row[c]!)
        if (d) { date = d; break }
      }
    }
    if (headerRow === -1 && cells.includes('Sản phẩm') && cells.some(c => /^số lượng/i.test(c))) headerRow = r
  }
  if (!date) throw new ReportError('no-date')
  if (headerRow === -1) throw new ReportError('no-header')

  const holdings: ReportHolding[] = []
  let total: number | null = null
  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = rows[r]!.filter(c => c !== null && text(c) !== '')
    if (cells.length === 0) continue
    const first = text(cells[0]!)
    if (/^tổng giá trị/i.test(first)) {
      total = parseNumber(cells[1] ?? null)
      break
    }
    // Dòng tiếng Anh của tiêu đề ("Fund", "Quantity (unit)"...) và mọi dòng không phải mã quỹ: bỏ qua.
    if (!FUND_CODE.test(first) || cells.length < 6) continue
    // Các ô có giá trị đứng theo thứ tự cố định, không phụ thuộc cột bị gộp ô: sản phẩm,
    // chương trình, số lượng, giá mua bình quân, NAV gần nhất, giá trị.
    const units = parseNumber(cells[2]!)
    const avgPrice = parseNumber(cells[3]!)
    const nav = parseNumber(cells[4]!)
    const value = parseNumber(cells[5]!)
    if (units === null || avgPrice === null || nav === null || value === null) continue
    if (units <= 0 || avgPrice <= 0 || nav <= 0) continue
    holdings.push({ fund: first.toUpperCase(), program: text(cells[1]!), units, avgPrice, nav, value })
  }
  if (holdings.length === 0) throw new ReportError('no-holdings')
  return { date, holdings, total }
}

/** Tìm sheet chứa báo cáo tài sản; thử từng sheet cho tới khi một cái đọc được. */
export function parseAssetStatementWorkbook(sheets: { rows: CellValue[][] }[]): AssetStatement {
  let last: ReportError | null = null
  for (const s of sheets) {
    try { return parseAssetStatement(s.rows) } catch (e) {
      if (e instanceof ReportError) last = e
      else throw e
    }
  }
  throw last ?? new ReportError('no-header')
}
