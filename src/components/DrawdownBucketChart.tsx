import { memo, useState } from 'react'
import type { DrawdownBucketRow } from '../utils/lsVsDca'
import { MIN_DRAWDOWN_EPISODES, dcaEndingForNarrative } from '../utils/lsVsDca'
import { formatVND } from '../utils/vndFormat'
import { useT, useTRich, translateStatic } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'
import type { Language } from '../hooks/useLanguage'

/** "2015-01-14" thành "01/2015". */
function fmtMonth(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(0, 4)}`
}

/** Một kiểu chọn ngày bán, kèm mốc so sánh tính trên đúng kỳ nắm giữ đó. */
export interface DrawdownBucketView {
  rows: DrawdownBucketRow[]
  /** Tỷ lệ LS thắng tính trên mọi tháng, làm mốc so sánh. */
  baselineWinRate: number
  /** Chênh lệch trung vị trên mọi tháng, theo tỷ lệ vốn. Âm là DCA về ít tiền hơn. */
  baselineCostOfCapital: number
  totalScenarios: number
  /** Số tháng giữ thêm sau khi rải xong. 0 là bán ngay. */
  extraMonths: number
}

interface Props {
  /** Các kỳ nắm giữ cho chọn, sắp theo thứ tự giữ càng lâu càng về sau. */
  views: DrawdownBucketView[]
  totalCapital: number
  dcaMonths: number
}

/** Nhãn nút, suy từ số tháng giữ thêm nên thêm mốc mới không phải sửa gì ở đây. */
function modeLabel(extraMonths: number, lang: Language): string {
  if (extraMonths <= 0) return translateStatic('ddb.sellNow', lang)
  const years = extraMonths / 12
  if (years === 1) return translateStatic('ddb.holdOneYear', lang)
  return translateStatic('ddb.holdYears', lang, { n: years })
}

/**
 * Vào lệnh lúc thị trường đã giảm sâu thì kết quả khác gì lúc bình thường.
 *
 * Mọi khối khác trong tab đều gộp chung mọi thời điểm bắt đầu. Khối này tách
 * theo trạng thái thị trường lúc vào lệnh, đo bằng mức giảm so với đỉnh cao
 * nhất TÍNH TỚI đúng ngày đó.
 *
 * Đây là khối dễ làm người đọc tự tin sai nhất trong cả tab, nên lớp trung
 * thực ở đây nặng tay hơn mọi chỗ khác. Lý do: các dải sâu gom toàn bộ kịch
 * bản vào đúng vài cú sập. Bitcoin giảm quá 60% có 735 kịch bản, nghe như một
 * quy luật, thực chất là 3 lần. Vì vậy cột đáng đọc không phải số kịch bản mà
 * là số giai đoạn.
 */
function DrawdownBucketChartImpl({ views, totalCapital, dcaMonths }: Props) {
  const [modeIdx, setModeIdx] = useState(0)
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const view = views[Math.min(modeIdx, views.length - 1)] ?? views[0]!
  const { rows, baselineWinRate, baselineCostOfCapital, totalScenarios } = view

  const filled = rows.filter(r => r.scenarios > 0)
  if (filled.length === 0) return null

  const deep = filled.filter(r => r.to <= -0.3)
  const solid = filled.filter(r => r.episodes >= MIN_DRAWDOWN_EPISODES)
  const deepest = deep[deep.length - 1]

  // Thang đo chung cho mọi thanh, để so chiều dài giữa các dòng có nghĩa.
  const maxAbs = Math.max(
    ...filled.map(r => Math.abs(r.medianCostOfCapital ?? 0)),
    Math.abs(baselineCostOfCapital),
    0.01,
  )

  return (
    <div className="perf-table-container">
      <div className="chart-header">
        <h3>{t('ddb.title')}</h3>
        <span className="chart-tooltip-icon" title={t('ddb.help')}>?</span>
      </div>

      <p className="holdcost-intro">{tr('ddb.intro', { months: dcaMonths })}</p>

      <div className="holdcost-modes">
        <span className="holdcost-modes-label">{t('ddb.sellWhen')}</span>
        {views.map((v, i) => (
          <button
            key={v.extraMonths}
            className={`lsdca-horizon-btn ${i === modeIdx ? 'lsdca-horizon-btn-active' : ''}`}
            onClick={() => setModeIdx(i)}
            title={v.extraMonths <= 0
              ? t('ddb.modeSellNow', { months: dcaMonths })
              : t('ddb.modeHold', { months: dcaMonths, years: v.extraMonths / 12 })}
          >
            {modeLabel(v.extraMonths, language)}
          </button>
        ))}
      </div>

      <p className="holdcost-mode-note">
        {view.extraMonths > 0
          ? t('ddb.noteHold', {
              months: dcaMonths,
              years: view.extraMonths / 12,
              total: dcaMonths + view.extraMonths,
            })
          : t('ddb.noteSellNow', { months: dcaMonths })}
      </p>

      <div className="ddbucket-baseline">
        <span className="ddbucket-baseline-label">
          {t('ddb.baselineLabel', { n: totalScenarios.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') })}
        </span>
        <span className="ddbucket-baseline-value">
          {tr('ddb.lsWins', { pct: (baselineWinRate * 100).toFixed(0) })}
          {' · '}
          {t('ddb.medianGap')}
          <strong className={baselineCostOfCapital < 0 ? 'cycle-neg' : 'cycle-pos'}>
            {baselineCostOfCapital < 0 ? '−' : '+'}{formatVND(Math.abs(baselineCostOfCapital * totalCapital))}
          </strong>
        </span>
      </div>

      <div className="holdcost-rows ddbucket-rows">
        {rows.map(r => {
          const thin = r.episodes < MIN_DRAWDOWN_EPISODES
          const empty = r.scenarios === 0
          const cost = r.medianCostOfCapital
          return (
            <div
              key={r.labelKey}
              className="holdcost-row"
              title={empty
                ? t('ddb.neverFell')
                : r.medianLsGrowth !== null && r.medianCostOfCapital !== null
                  ? t('ddb.rowTooltip', {
                      label: t(r.labelKey),
                      ls: formatVND(r.medianLsGrowth * totalCapital),
                      dca: formatVND(dcaEndingForNarrative(r.medianLsGrowth, r.medianCostOfCapital) * totalCapital),
                    })
                  : undefined}
            >
              <div className="holdcost-label ddbucket-label">
                <span className="ddbucket-band">{t(r.labelKey)}</span>
                {r.episodeStarts.length > 0 && (
                  <span className="ddbucket-dates">
                    {r.episodeStarts.map(fmtMonth).join(' · ')}
                  </span>
                )}
              </div>
              <div className="holdcost-track">
                <div className="holdcost-zero" />
                {cost !== null && (
                  <div
                    className={`holdcost-bar ${cost < 0 ? 'holdcost-bar--neg' : 'holdcost-bar--pos'}${thin ? ' holdcost-bar--thin' : ''}`}
                    style={{
                      width: `${Math.abs(cost) / maxAbs * 48}%`,
                      [cost < 0 ? 'right' : 'left']: '50%',
                    }}
                  />
                )}
              </div>
              <div className="holdcost-value">
                {empty
                  ? <span className="holdcost-na">{t('ddb.naNeverFell')}</span>
                  : <>
                      <span className={cost! < 0 ? 'cycle-neg' : 'cycle-pos'}>
                        {cost! < 0 ? '−' : '+'}{formatVND(Math.abs(cost! * totalCapital))}
                      </span>
                      <span className="holdcost-indep">
                        {t('ddb.lsWinRate', { pct: (r.lsWinRate! * 100).toFixed(0) })}
                        {' · '}
                        {t('ddb.scenarios', { n: r.scenarios })}
                        {' · '}
                        {thin && '⚠ '}{t('ddb.episodes', { n: r.episodes })}
                      </span>
                    </>
                }
              </div>
            </div>
          )
        })}
      </div>

      <p className="holdcost-axis-caption">{t('ddb.axisNote')}</p>

      <div className="holdcost-note">
        <p>{t('ddb.episodeNote1')}</p>
        <p>
          {t('ddb.episodeNote2', {
            months: view.extraMonths > 0 ? dcaMonths + view.extraMonths : dcaMonths,
          })}
        </p>
        <p>
          {t('ddb.episodeNote3')}
          {deepest && deepest.scenarios > 0 && tr('ddb.episodeExample', {
            label: t(deepest.labelKey).toLowerCase(),
            scenarios: deepest.scenarios,
            episodes: deepest.episodes,
          })}
          {t('ddb.episodeNote4')}
        </p>
        <p>
          {solid.length === 0
            ? tr('ddb.allThin', { min: MIN_DRAWDOWN_EPISODES })
            : tr('ddb.someSolid', {
                solid: solid.length,
                total: filled.length,
                min: MIN_DRAWDOWN_EPISODES,
              })}
          {t('ddb.evenSolidThin')}
        </p>
        <p>{tr('ddb.sharedCrash')}</p>
        <p>{t('ddb.depthNote')}</p>
        <p>{tr('ddb.closing')}</p>
      </div>
    </div>
  )
}

export const DrawdownBucketChart = memo(DrawdownBucketChartImpl)
