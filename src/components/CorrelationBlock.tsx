import { memo, useMemo } from 'react'
import type { FundComparisonData } from '../hooks/useCalculations'
import { correlationMatrix, averageCorrelation } from '../utils/correlation'

interface Props {
  funds: FundComparisonData[]
  colors: string[]
  /** Tên hiển thị theo id (id thô như "SAVINGS:6" không đọc được). */
  displayName: (fundId: string) => string
}

/**
 * Ma trận tương quan lợi nhuận giữa các tài sản đang so sánh.
 *
 * Tab Overlap trả lời "hai quỹ có nắm cùng cổ phiếu không". Block này trả lời
 * câu quan trọng hơn cho việc ghép danh mục: "hai quỹ có đi cùng nhịp không".
 * Hai quỹ nắm mã khác nhau vẫn có thể tương quan 0,95 nếu cùng là cổ phiếu VN.
 */

/** Nền ô theo mức tương quan: càng gần 1 càng đỏ, càng gần -1 càng xanh. */
function cellStyle(r: number | null): { background: string; color: string } {
  if (r === null) return { background: 'var(--color-border-subtle)', color: 'var(--color-text-muted)' }

  // alpha theo độ lớn |r| để mắt bắt được vùng tương quan cao ngay lập tức.
  const alpha = 0.12 + Math.abs(r) * 0.6
  const background = r >= 0
    ? `rgba(225, 29, 72, ${alpha.toFixed(3)})`   // rose: đi cùng nhịp
    : `rgba(16, 185, 129, ${alpha.toFixed(3)})`  // emerald: ngược nhịp (hiếm, quý)
  // Nền đậm thì chữ trắng mới đọc được.
  const color = Math.abs(r) > 0.62 ? '#ffffff' : 'var(--color-text)'
  return { background, color }
}

function formatR(r: number | null): string {
  return r === null ? '—' : r.toFixed(2)
}

/** Diễn giải mức tương quan trung bình thành câu người thường hiểu. */
function verdict(avg: number | null): string {
  if (avg === null) return 'Chưa đủ dữ liệu để đánh giá mức đa dạng hoá.'
  if (avg >= 0.9) {
    return 'Các tài sản này gần như đi chung một nhịp. Ghép chúng lại hầu như không giảm được rủi ro — lúc thị trường sập thì sập cùng nhau.'
  }
  if (avg >= 0.7) {
    return 'Tương quan cao. Có giảm rủi ro đôi chút, nhưng đừng kỳ vọng danh mục đứng vững khi thị trường chung đi xuống.'
  }
  if (avg >= 0.4) {
    return 'Tương quan vừa phải. Ghép lại có tác dụng đa dạng hoá thật, dù vẫn cùng chịu ảnh hưởng của thị trường chung.'
  }
  return 'Tương quan thấp. Đây là nhóm tài sản bổ trợ nhau tốt — khi cái này giảm, cái kia không nhất thiết giảm theo.'
}

function CorrelationBlockImpl({ funds, colors, displayName }: Props) {
  const matrix = useMemo(
    () => correlationMatrix(funds.map(f => f.returns.map(r => r.value))),
    [funds],
  )

  const averages = useMemo(
    () => funds.map((_, i) => averageCorrelation(matrix, i)),
    [funds, matrix],
  )

  // Trung bình của mọi CẶP (nửa trên ma trận) — mức đa dạng hoá của cả nhóm.
  const overallAvg = useMemo(() => {
    let sum = 0
    let count = 0
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix.length; j++) {
        const r = matrix[i]![j]
        if (r === null || r === undefined) continue
        sum += r
        count++
      }
    }
    return count > 0 ? sum / count : null
  }, [matrix])

  // Một tài sản thì không có gì để so.
  if (funds.length < 2) return null

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Tương quan lợi nhuận</h3>
        <span
          className="chart-tooltip-icon"
          title="Hệ số tương quan Pearson trên chuỗi lợi nhuận đã căn cùng mốc ngày. 1 = đi hoàn toàn cùng nhịp, 0 = không liên quan, -1 = ngược nhịp hoàn toàn."
        >?</span>
      </div>

      <div className="corr-scroll">
        <table className="corr-table">
          <thead>
            <tr>
              <th className="corr-corner" />
              {funds.map((f, i) => (
                <th key={f.id} className="corr-head">
                  <span style={{ color: colors[i % colors.length] }}>{displayName(f.id)}</span>
                </th>
              ))}
              <th className="corr-head corr-avg-head">TB</th>
            </tr>
          </thead>
          <tbody>
            {funds.map((rowFund, i) => (
              <tr key={rowFund.id}>
                <th className="corr-row-head">
                  <span style={{ color: colors[i % colors.length] }}>{displayName(rowFund.id)}</span>
                </th>
                {funds.map((colFund, j) => {
                  const r = matrix[i]![j]!
                  const style = cellStyle(i === j ? null : r)
                  return (
                    <td
                      key={colFund.id}
                      className={`corr-cell${i === j ? ' corr-cell-diagonal' : ''}`}
                      style={style}
                      title={i === j ? '' : `${displayName(rowFund.id)} vs ${displayName(colFund.id)}: ${formatR(r)}`}
                    >
                      {i === j ? '—' : formatR(r)}
                    </td>
                  )
                })}
                <td className="corr-cell corr-avg-cell">{formatR(averages[i] ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="fund-analysis-chart-note">
        {overallAvg !== null && (
          <>Tương quan trung bình giữa các cặp: <strong>{overallAvg.toFixed(2)}</strong>. </>
        )}
        {verdict(overallAvg)}
        {' '}Cột <strong>TB</strong> là mức tương quan trung bình của từng tài sản với phần
        còn lại — số càng cao thì tài sản đó càng ít đóng góp vào đa dạng hoá.
      </p>
      {/* Cảnh báo phương pháp: bỏ qua điều này thì người đọc dễ tưởng quỹ mở
          đa dạng hoá tốt hơn thực tế. */}
      <p className="fund-analysis-chart-note corr-caveat">
        <strong>Lưu ý cách đo:</strong> quỹ mở định giá NAV cuối ngày, còn ETF khớp lệnh
        liên tục trên sàn. Hai mốc định giá không trùng nhau nên tương quan đo được giữa
        quỹ mở và ETF thường <em>thấp hơn</em> mức đi cùng nhịp thật. Hãy đọc bảng này theo
        hướng so sánh tương đối giữa các cặp, đừng coi con số tuyệt đối là chính xác.
      </p>
    </div>
  )
}

export const CorrelationBlock = memo(CorrelationBlockImpl)
