import { memo } from 'react'
import type { HoldingCostCell } from '../utils/lsVsDca'
import { MIN_INDEPENDENT_WINDOWS, dcaEndingForNarrative } from '../utils/lsVsDca'
import { formatVND } from '../utils/vndFormat'
import { useT, useTRich, translateStatic } from '../i18n'
import { useLanguage, type Language } from '../hooks/useLanguage'

interface Props {
  /** Mốc là tổng thời gian kể từ ngày xuống tiền đầu tiên. */
  data: HoldingCostCell[]
  dcaMonths: number
  totalCapital: number
}

/** "24 tháng" thành "2 năm", "18 tháng" giữ nguyên, "42 tháng" thành "3 năm 6 tháng". */
function fmtMonths(m: number, lang: Language): string {
  if (m % 12 === 0) return fmtYears(m / 12, lang)
  if (m < 24) return m === 1
    ? translateStatic('hc.month1', lang)
    : translateStatic('hc.monthsN', lang, { n: m })
  return translateStatic('hc.yearsMonths', lang, { y: Math.floor(m / 12), m: m % 12 })
}

/** "1 năm" thay vì "1 năm" số nhiều, tiếng Anh phân biệt year/years. */
function fmtYears(y: number, lang: Language): string {
  return y === 1
    ? translateStatic('hc.year1', lang)
    : translateStatic('hc.yearsN', lang, { n: y })
}

/**
 * DCA lời lỗ bao nhiêu so với đầu tư một lần, đo ở từng mốc nắm giữ.
 *
 * Heatmap bên trên trả lời "DCA thua bao nhiêu LẦN". Khối này trả lời câu khác
 * hẳn: "thua thì thua bao nhiêu TIỀN". Hai câu đó lệch nhau được, vì thắng
 * thường xuyên mà mỗi lần thắng một ít thì vẫn thua ít lần mà lần nào cũng nặng.
 *
 * Mốc là TỔNG thời gian kể từ ngày đầu, và mỗi dòng tự ghi cách phân tách ra
 * thành quãng rải với quãng giữ thêm. Trước đây có nút chuyển sang kiểu đếm từ
 * lần mua cuối, đã bỏ vì hai kiểu chỉ là một đường cong lấy mẫu ở những điểm
 * khác nhau, mà lại bắt người đọc giữ hai mô hình trong đầu.
 *
 * Mốc nào không đủ giai đoạn tách rời thì làm mờ, không tô đậm như thể chắc chắn.
 */
function HoldingCostChartImpl({ data, dcaMonths, totalCapital }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const rows = data
  const measured = rows.filter(d => d.medianCost !== null)
  if (measured.length === 0) return null

  const maxAbs = Math.max(...measured.map(d => Math.abs(d.medianCost!)), 0.5)
  const solid = measured.filter(d => d.independentWindows >= MIN_INDEPENDENT_WINDOWS)

  // Lấy một mốc đủ tin cậy làm ví dụ bằng tiền thật cho câu mở đầu.
  const example = solid[0] ?? measured[0]!

  /** Số tháng thật sự của một mốc, tính từ ngày bắt đầu tới ngày bán. */
  const windowMonths = (holdingYears: number) => holdingYears * 12

  /**
   * Nhãn phụ nói rõ mốc đó tách ra thành quãng rải và quãng giữ thêm.
   *
   * Quãng rải ghi nguyên bằng tháng cho khớp với nút "Trải DCA trong" ở trên,
   * không quy về năm. Người dùng chọn "12 tháng" mà bảng ghi "1 năm" thì phải
   * dừng lại đối chiếu, mất công vô ích.
   */
  const breakdown = (holdingYears: number): string | null => {
    const extra = holdingYears * 12 - dcaMonths
    if (extra < 0) return null
    if (extra === 0) return t('hc.breakdownSellNow', { months: dcaMonths })
    return t('hc.breakdownHold', { months: dcaMonths, extra: fmtMonths(extra, language) })
  }

  // Mốc dùng để giải thích "giai đoạn tách rời". Ưu tiên mốc dài vài năm vì ở
  // đó phần chồng lấn mới lộ rõ, mốc 1 năm thì nghe không thấy vấn đề gì.
  const overlapExample = measured.find(d => d.holdingYears >= 5) ?? measured[measured.length - 1]!
  const exYears = overlapExample.holdingYears
  const exMonths = windowMonths(exYears)

  return (
    <div className="perf-table-container">
      <div className="chart-header">
        <h3>{t('hc.title')}</h3>
        <span className="chart-tooltip-icon" title={t('hc.help')}>?</span>
      </div>

      <p className="holdcost-intro">
        {tr('hc.intro', { capital: formatVND(totalCapital), months: dcaMonths })}
      </p>

      <p className="holdcost-mode-note">{tr('hc.modeNote', { months: dcaMonths })}</p>

      {example.medianLsGrowth !== null && example.medianCostOfCapital !== null && (
        <p className="holdcost-example">
          {tr('hc.example', {
            years: fmtYears(example.holdingYears, language),
            breakdown: breakdown(example.holdingYears) ?? '',
            ls: formatVND(example.medianLsGrowth * totalCapital),
            dca: formatVND(dcaEndingForNarrative(example.medianLsGrowth, example.medianCostOfCapital) * totalCapital),
          })}
          <strong className={example.medianCostOfCapital < 0 ? 'cycle-neg' : 'cycle-pos'}>
            {formatVND(Math.abs(example.medianCostOfCapital * totalCapital))}
          </strong>
          {t('hc.exampleTail')}
        </p>
      )}

      <div className="holdcost-rows">
        {rows.map(d => {
          const thin = d.independentWindows < MIN_INDEPENDENT_WINDOWS
          return (
            <div
              key={d.holdingYears}
              className="holdcost-row"
              title={d.medianLsGrowth !== null && d.medianCostOfCapital !== null
                ? t('hc.rowTooltip', {
                    years: fmtYears(d.holdingYears, language),
                    breakdown: breakdown(d.holdingYears) ?? '',
                    ls: formatVND(d.medianLsGrowth * totalCapital),
                    dca: formatVND(dcaEndingForNarrative(d.medianLsGrowth, d.medianCostOfCapital) * totalCapital),
                  })
                : undefined}
            >
              <div className="holdcost-label">
                <span className="holdcost-label-years">{fmtYears(d.holdingYears, language)}</span>
                {breakdown(d.holdingYears) && (
                  <span className="holdcost-label-breakdown">{breakdown(d.holdingYears)}</span>
                )}
              </div>
              <div className="holdcost-track">
                <div className="holdcost-zero" />
                {d.medianCost !== null && (
                  <div
                    className={`holdcost-bar ${d.medianCost < 0 ? 'holdcost-bar--neg' : 'holdcost-bar--pos'}${thin ? ' holdcost-bar--thin' : ''}`}
                    style={{
                      width: `${Math.abs(d.medianCost) / maxAbs * 48}%`,
                      [d.medianCost < 0 ? 'right' : 'left']: '50%',
                    }}
                  />
                )}
              </div>
              <div className="holdcost-value">
                {d.medianCost === null
                  ? <span className="holdcost-na">
                      {d.tooShort
                        ? t('hc.naTooShort', { months: dcaMonths })
                        : t('hc.naNoHistory')}
                    </span>
                  : <>
                      <span className={d.medianCost < 0 ? 'cycle-neg' : 'cycle-pos'}>
                        {d.medianCostOfCapital !== null && (
                          <>{d.medianCostOfCapital < 0 ? '−' : '+'}{formatVND(Math.abs(d.medianCostOfCapital * totalCapital))}</>
                        )}
                      </span>
                      <span className="holdcost-indep">
                        {d.medianCost > 0 ? '+' : ''}{d.medianCost.toFixed(1)}%
                        {' · '}
                        {thin && '⚠ '}{t('hc.windows', { n: d.independentWindows })}
                      </span>
                    </>
                }
              </div>
            </div>
          )
        })}
      </div>

      <p className="holdcost-axis-caption">{t('hc.axisCaption')}</p>

      <div className="holdcost-note">
        <p>{tr('hc.whyLess')}</p>
        <p>{tr('hc.whatIsWindow')}</p>
        <p>
          {tr('hc.overlapExample', {
            years: fmtYears(exYears, language),
            months: exMonths,
            overlap: exMonths - 1,
          })}
        </p>
        <p>
          {tr('hc.windowCount', {
            n: overlapExample.independentWindows,
            months: exMonths,
          })}
        </p>
        <p>
          {solid.length === 0
            ? tr('hc.allThin', { min: MIN_INDEPENDENT_WINDOWS })
            : tr('hc.someSolid', {
                solid: solid.length,
                total: rows.length,
                min: MIN_INDEPENDENT_WINDOWS,
              })}
        </p>
      </div>
    </div>
  )
}

export const HoldingCostChart = memo(HoldingCostChartImpl)
