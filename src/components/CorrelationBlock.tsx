import { memo, useMemo } from 'react'
import type { FundComparisonData } from '../hooks/useCalculations'
import { correlationMatrix, averageCorrelation } from '../utils/correlation'
import { useT, useTRich, type TranslationKey } from '../i18n'

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
function verdictKey(avg: number | null): TranslationKey {
  if (avg === null) return 'corr.verdict.noData'
  if (avg >= 0.9) return 'corr.verdict.veryHigh'
  if (avg >= 0.7) return 'corr.verdict.high'
  if (avg >= 0.4) return 'corr.verdict.moderate'
  return 'corr.verdict.low'
}

function CorrelationBlockImpl({ funds, colors, displayName }: Props) {
  const t = useT()
  const tr = useTRich()
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
        <h3>{t('corr.title')}</h3>
        <span
          className="chart-tooltip-icon"
          title={t('corr.help')}
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
              <th className="corr-head corr-avg-head">{t('corr.avgCol')}</th>
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
        {overallAvg !== null && tr('corr.summary', { avg: overallAvg.toFixed(2) })}
        {t(verdictKey(overallAvg))}
        {tr('corr.colNote')}
      </p>
      {/* Cảnh báo phương pháp: bỏ qua điều này thì người đọc dễ tưởng quỹ mở
          đa dạng hoá tốt hơn thực tế. */}
      <p className="fund-analysis-chart-note corr-caveat">
        {tr('corr.caveat')}
      </p>
    </div>
  )
}

export const CorrelationBlock = memo(CorrelationBlockImpl)
