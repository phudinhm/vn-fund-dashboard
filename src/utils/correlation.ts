import { ZERO_VOLATILITY_EPSILON } from './calculations'

/**
 * Hệ số tương quan Pearson giữa lợi nhuận của các tài sản.
 *
 * Vì sao cần: dashboard cho phép ghép nhiều quỹ vào một danh mục, nhưng chọn 5
 * quỹ cổ phiếu Việt Nam cùng lúc thường KHÔNG đa dạng hoá được gì — chúng cùng
 * lên cùng xuống. Tab Overlap so trùng lặp CỔ PHIẾU nắm giữ; bảng này so cái
 * thực sự quyết định rủi ro danh mục: hai quỹ có đi cùng nhịp hay không.
 *
 * Đầu vào là các chuỗi lợi nhuận ĐÃ CĂN CHỈNH cùng mốc ngày (aligned) — cùng
 * độ dài, cùng thứ tự. useMultiComparison đã căn sẵn nên truyền thẳng vào được.
 */

/**
 * Tương quan Pearson của hai chuỗi số cùng độ dài.
 *
 * Trả về null khi không tính được thay vì một con số vô nghĩa:
 *   - dưới 2 điểm thì không có khái niệm tương quan;
 *   - một trong hai chuỗi phẳng (độ lệch chuẩn ~0, vd tiết kiệm ngân hàng lãi
 *     cố định) thì mẫu số bằng 0 — hệ số không xác định, không phải bằng 0.
 */
export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length)
  if (n < 2) return null

  let sumA = 0
  let sumB = 0
  for (let i = 0; i < n; i++) {
    sumA += a[i]!
    sumB += b[i]!
  }
  const meanA = sumA / n
  const meanB = sumB / n

  let cov = 0
  let varA = 0
  let varB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i]! - meanA
    const db = b[i]! - meanB
    cov += da * db
    varA += da * da
    varB += db * db
  }

  const denom = Math.sqrt(varA) * Math.sqrt(varB)
  if (!Number.isFinite(denom) || denom < ZERO_VOLATILITY_EPSILON) return null

  const r = cov / denom
  // Chặn sai số dấu phẩy động đẩy kết quả ra ngoài [-1, 1].
  return Math.max(-1, Math.min(1, r))
}

/**
 * Ma trận tương quan đối xứng cho n chuỗi lợi nhuận đã căn chỉnh.
 * matrix[i][j] = tương quan giữa chuỗi i và j; đường chéo luôn bằng 1.
 */
export function correlationMatrix(series: number[][]): (number | null)[][] {
  const n = series.length
  const matrix: (number | null)[][] = Array.from({ length: n }, () => Array<number | null>(n).fill(null))

  for (let i = 0; i < n; i++) {
    matrix[i]![i] = 1
    for (let j = i + 1; j < n; j++) {
      const r = pearson(series[i]!, series[j]!)
      matrix[i]![j] = r
      matrix[j]![i] = r
    }
  }
  return matrix
}

/**
 * Tương quan trung bình của một tài sản với TẤT CẢ tài sản còn lại.
 * Dùng để chỉ ra quỹ nào đang "trùng nhịp" nhất với phần còn lại của danh mục.
 * null khi không có cặp nào tính được.
 */
export function averageCorrelation(matrix: (number | null)[][], index: number): number | null {
  const row = matrix[index]
  if (!row) return null

  let sum = 0
  let count = 0
  for (let j = 0; j < row.length; j++) {
    if (j === index) continue
    const r = row[j]
    if (r === null || r === undefined) continue
    sum += r
    count++
  }
  return count > 0 ? sum / count : null
}
