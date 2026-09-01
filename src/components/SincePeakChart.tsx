import { memo } from 'react'
import type { SincePeakRow } from '../utils/lsVsDca'
import { MIN_DRAWDOWN_EPISODES, MIN_DRAWDOWN_FOR_SINCE_PEAK, dcaEndingForNarrative } from '../utils/lsVsDca'
import { formatVND } from '../utils/vndFormat'
import { useT, useTRich } from '../i18n'

interface Props {
  rows: SincePeakRow[]
  totalCapital: number
  dcaMonths: number
}

/** "2015-01-14" thành "01/2015". */
function fmtMonth(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(0, 4)}`
}

function pct(v: number, digits = 0): string {
  const s = v >= 0 ? '+' : ''
  return `${s}${(v * 100).toFixed(digits)}%`
}

/**
 * Kết quả tách theo số tháng đã trôi qua kể từ đỉnh, thay vì theo mức giảm.
 *
 * Khối này ra đời sau khi đo lại khối chia theo mức giảm và phát hiện mức giảm
 * là biến yếu: cùng dải "giảm 50 tới 60%" của Bitcoin, vào lệnh 2 tháng sau
 * đỉnh thì một năm sau lỗ 61%, vào lệnh 29 tháng sau đỉnh thì lãi 430%. Thứ
 * tách hai kết quả đó ra là bear đã chạy được bao lâu, không phải giá đã rơi
 * bao sâu.
 *
 * Quy luật này lặp lại ở cả bốn quỹ đã thử, không riêng Bitcoin.
 */
function SincePeakChartImpl({ rows, totalCapital, dcaMonths }: Props) {
  const t = useT()
  const tr = useTRich()
  const filled = rows.filter(r => r.scenarios > 0)
  if (filled.length === 0) return null

  const maxAbs = Math.max(...filled.map(r => Math.abs(r.medianCostOfCapital ?? 0)), 0.01)

  // Hai đầu của bảng, dùng làm ví dụ trong phần chữ. Lấy từ chính dữ liệu đang
  // hiện chứ không viết cứng, để đổi quỹ thì câu chữ đổi theo.
  const early = filled[0]!
  const late = filled[filled.length - 1]!
  const swings = early.lsLossRate !== null && late.lsLossRate !== null
    && early.lsLossRate - late.lsLossRate > 0.2

  return (
    <div className="perf-table-container">
      <div className="chart-header">
        <h3>{t('spk.title')}</h3>
        <span className="chart-tooltip-icon" title={t('spk.help')}>?</span>
      </div>

      <p className="holdcost-intro">{t('spk.intro', { months: dcaMonths })}</p>

      <p className="holdcost-mode-note">
        {t('spk.filterNote', { pct: Math.abs(MIN_DRAWDOWN_FOR_SINCE_PEAK * 100) })}
      </p>

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
                ? t('spk.neverHappened')
                : r.medianLsGrowth !== null && r.medianCostOfCapital !== null
                  ? t('spk.rowTooltip', {
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
                  ? <span className="holdcost-na">{t('spk.naNever')}</span>
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
                      <span className="holdcost-indep ddbucket-market">
                        {t('spk.market', {
                          growth: pct(r.medianLsGrowth! - 1),
                          loss: (r.lsLossRate! * 100).toFixed(0),
                        })}
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
        <p>{t('spk.depthVsTime')}</p>
        <p>{t('spk.bearLength')}</p>
        <p className="sincepeak-sub">{t('spk.howToRead')}</p>
        {swings && (
          <ul className="sincepeak-list">
            <li>
              {tr('spk.riskItem', {
                early: t(early.labelKey).toLowerCase(),
                earlyLoss: (early.lsLossRate! * 100).toFixed(0),
                late: t(late.labelKey).toLowerCase(),
                lateLoss: (late.lsLossRate! * 100).toFixed(0),
              })}
            </li>
          </ul>
        )}
        <p>{tr('spk.dcaStrategy')}</p>
        <ul className="sincepeak-list">
          <li>{tr('spk.nearPeakItem')}</li>
          <li>{tr('spk.longAfterItem')}</li>
        </ul>
        <p>{tr('spk.closing')}</p>
      </div>
    </div>
  )
}

export const SincePeakChart = memo(SincePeakChartImpl)
