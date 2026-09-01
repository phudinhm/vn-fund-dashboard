import { getLanguage, type Language } from '../hooks/useLanguage'

/**
 * Đơn vị rút gọn của tiền VND, theo ngôn ngữ đang chọn.
 *
 * Số vẫn là đồng ở cả hai ngôn ngữ — chỉ có tên bậc là dịch, để câu tiếng Anh
 * không lẫn "408 triệu" vào giữa.
 */
const SCALE_WORDS = {
  vi: { billion: 'tỷ', million: 'triệu' },
  en: { billion: 'bn', million: 'm' },
} as const

/**
 * Định dạng số tiền VND thành chuỗi ngắn, dễ đọc cho retail VN.
 *   1_500_000       → "1.5 triệu" / "1.5m"
 *   250_000_000     → "250 triệu" / "250m"
 *   2_500_000_000   → "2.5 tỷ"    / "2.5bn"
 *
 * `lang` mặc định lấy ngôn ngữ đang chọn của app; truyền tay khi cần kết quả
 * tất định (vd trong test).
 */
export function formatVND(value: number, lang: Language = getLanguage()): string {
  const v = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const words = SCALE_WORDS[lang]

  if (v >= 1_000_000_000) {
    const ty = v / 1_000_000_000
    // 1.5 tỷ, nhưng 10 tỷ không cần decimal
    const fmt = ty >= 10 ? ty.toFixed(1).replace(/\.0$/, '') : ty.toFixed(2).replace(/\.?0+$/, '')
    return `${sign}${fmt} ${words.billion}`
  }
  if (v >= 1_000_000) {
    const tr = v / 1_000_000
    const fmt = tr >= 10 ? tr.toFixed(0) : tr.toFixed(1).replace(/\.0$/, '')
    return `${sign}${fmt} ${words.million}`
  }
  if (v >= 1_000) {
    return `${sign}${(v / 1_000).toFixed(0)}k`
  }
  return `${sign}${Math.round(v)}`
}

/** Full VND, ví dụ 2.500.000.000 đ, dùng cho tooltip chi tiết */
export function formatVNDFull(value: number, lang: Language = getLanguage()): string {
  return Math.round(value).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') + ' đ'
}

/**
 * Trả về key từ điển cho câu so sánh đời thực của một khoản tiền (thường là
 * delta). Null nếu số tiền quá nhỏ để có câu phù hợp.
 *
 * Trả key thay vì trả thẳng câu tiếng Việt vì app có cả bản tiếng Anh: chỗ gọi
 * tự dịch bằng t(). Hàm này chỉ lo chọn mốc nào hợp nhất.
 *
 * Mỗi mốc gắn với giá thực tế VN 2026 của món đồ đó (retail-friendly):
 * xe máy → ô tô → nghỉ hưu. Chọn mốc có giá gần nhất theo tỷ lệ (log-scale)
 * thay vì "vượt ngưỡng nào thì lấy ngưỡng đó", để tránh trường hợp một số tiền
 * gần gấp đôi giá thực của món đồ vẫn bị gán nhãn món đồ đó.
 */
export type VndComparisonKey =
  | 'vndCompare.motorbike'
  | 'vndCompare.iphone'
  | 'vndCompare.scooter'
  | 'vndCompare.premiumScooter'
  | 'vndCompare.bigBike'
  | 'vndCompare.usedCar'
  | 'vndCompare.newSedan'
  | 'vndCompare.suv'
  | 'vndCompare.luxuryCar'
  | 'vndCompare.smallBusiness'
  | 'vndCompare.earlyRetire'
  | 'vndCompare.earlyRetireLong'

export function vndComparisonKey(value: number): VndComparisonKey | null {
  const v = Math.abs(value)
  if (v < 15_000_000) return null

  // Giá thực tế ước tính của từng món đồ (không phải ngưỡng tối thiểu)
  const anchors: { price: number; key: VndComparisonKey }[] = [
    { price: 20_000_000,     key: 'vndCompare.motorbike' },
    { price: 30_000_000,     key: 'vndCompare.iphone' },
    { price: 45_000_000,     key: 'vndCompare.scooter' },
    { price: 100_000_000,    key: 'vndCompare.premiumScooter' },
    { price: 250_000_000,    key: 'vndCompare.bigBike' },
    { price: 400_000_000,    key: 'vndCompare.usedCar' },
    { price: 550_000_000,    key: 'vndCompare.newSedan' },
    { price: 1_000_000_000,  key: 'vndCompare.suv' },
    { price: 2_000_000_000,  key: 'vndCompare.luxuryCar' },
    { price: 5_000_000_000,  key: 'vndCompare.smallBusiness' },
    { price: 10_000_000_000, key: 'vndCompare.earlyRetire' },
    { price: 25_000_000_000, key: 'vndCompare.earlyRetireLong' },
  ]

  // Chọn mốc có tỷ lệ giá/value gần 1 nhất (so sánh trên thang log để công bằng
  // giữa các bậc độ lớn khác nhau)
  let chosen = anchors[0]!
  let bestDist = Infinity
  for (const a of anchors) {
    const dist = Math.abs(Math.log(v / a.price))
    if (dist < bestDist) {
      bestDist = dist
      chosen = a
    }
  }
  return chosen.key
}

/**
 * Bản rút gọn của formatVND, dùng cho nhãn trục biểu đồ.
 *   250_000_000    → "250tr"
 *   2_500_000_000  → "2,5 tỷ"
 *
 * Khác formatVND ở chỗ bỏ khoảng trắng trước "tr". Nhãn trục Y có khung hẹp,
 * chuỗi "250 triệu" bị Recharts ngắt làm hai dòng, còn "250tr" thì vừa.
 * Mốc tỷ vẫn giữ khoảng trắng vì "2,5tỷ" đọc dính chữ, mà chuỗi cũng đã ngắn.
 */
export function formatVNDAxis(value: number, lang: Language = getLanguage()): string {
  const v = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (v >= 1_000_000_000) {
    const ty = v / 1_000_000_000
    const fmt = ty >= 10 ? ty.toFixed(0) : ty.toFixed(1).replace(/\.0$/, '')
    const decimal = lang === 'vi' ? fmt.replace('.', ',') : fmt
    return `${sign}${decimal} ${lang === 'vi' ? 'tỷ' : 'bn'}`
  }
  if (v >= 1_000_000) {
    return `${sign}${Math.round(v / 1_000_000)}${lang === 'vi' ? 'tr' : 'm'}`
  }
  if (v >= 1_000) {
    return `${sign}${Math.round(v / 1_000)}k`
  }
  return `${sign}${Math.round(v)}`
}

/** Xác định dấu cho delta, ví dụ +250 triệu / -30 triệu */
export function signedVND(value: number, lang: Language = getLanguage()): string {
  if (value > 0) return '+' + formatVND(value, lang)
  if (value < 0) return formatVND(value, lang) // formatVND đã xử lý dấu âm
  return formatVND(0, lang)
}
