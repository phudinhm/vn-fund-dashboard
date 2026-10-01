import { memo } from 'react'
import { useT, translateStatic } from '../i18n'
import { getLanguage, useLanguage, type Language } from '../hooks/useLanguage'

interface StatsRow {
  id: string
  name: string
  color: string
  finalValue: number
  totalInvested: number
  /** CAGR nhà đầu tư (giá trị cuối ÷ tổng đầu tư, quy năm). Null khi kỳ chưa đủ 1 năm. */
  cagr: number | null
  /** TWRR quy năm SAU phí. Null khi kỳ chưa đủ 1 năm. */
  twrrNet: number | null
  /** TWRR quy năm TRƯỚC phí. Null khi kỳ chưa đủ 1 năm. */
  twrrGross: number | null
  /** Tổng chi phí đã trả (VND). */
  totalCosts?: number
  mwrr: number | null
  maxDrawdown: number | null
  avgDrawdown: number | null
  longestDrawdownDays: number | null
  stdev: number | null
  profitFactor: number | null
}

interface Props {
  portfolios: StatsRow[]
}

/** Bảng thống kê ngang: mỗi danh mục 1 hàng, các chỉ số nằm cạnh nhau để dễ so sánh — bổ sung cho dca-summary-grid (dạng thẻ dọc) ở trên. */
function DCAStatsTableImpl({ portfolios }: Props) {
  const t = useT()
  const { language } = useLanguage()
  if (portfolios.length === 0) return null

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>{t('dcaStats.title')}</h3>
        <span
          className="chart-tooltip-icon"
          title={t('dcaStats.help')}
        >?</span>
      </div>
      <div className="dca-stats-table-scroll">
        <table className="dca-stats-table">
          <thead>
            <tr>
              <th>{t('dcaStats.col.portfolio')}</th>
              <th>
                {t('dcaStats.col.finalValue')}
                <span className="dca-info-icon" title={t('dcaStats.help.finalValue')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.invested')}
                <span className="dca-info-icon" title={t('dcaStats.help.invested')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.cumReturn')}
                <span className="dca-info-icon" title={t('dcaStats.help.cumReturn')}>?</span>
              </th>
              <th>
                CAGR
                <span className="dca-info-icon" title={t('dcaStats.help.cagr')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.twrrNet')}
                <span className="dca-info-icon" title={t('dcaStats.help.twrrNet')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.twrrGross')}
                <span className="dca-info-icon" title={t('dcaStats.help.twrrGross')}>?</span>
              </th>
              <th>
                MWRR
                <span className="dca-info-icon" title={t('dcaStats.help.mwrr')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.maxDD')}
                <span className="dca-info-icon" title={t('dcaStats.help.maxDD')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.avgDD')}
                <span className="dca-info-icon" title={t('dcaStats.help.avgDD')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.longestDD')}
                <span className="dca-info-icon" title={t('dcaStats.help.longestDD')}>?</span>
              </th>
              <th>
                {t('dcaStats.col.volatility')}
                <span className="dca-info-icon" title={t('dcaStats.help.volatility')}>?</span>
              </th>
              <th>
                Profit Factor
                <span className="dca-info-icon" title={t('dcaStats.help.profitFactor')}>?</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {portfolios.map(p => {
              const cumReturn = p.totalInvested > 0 ? p.finalValue / p.totalInvested - 1 : null
              return (
                <tr key={p.id}>
                  <td className="dca-stats-td-name">
                    <span className="perf-dot" style={{ background: p.color }} />
                    {p.name}
                  </td>
                  <td>{formatVND(Math.round(p.finalValue), language)}</td>
                  <td>{formatVND(p.totalInvested, language)}</td>
                  <td className={signClass(cumReturn)}>{formatSignedPercent(cumReturn)}</td>
                  <td className={signClass(p.cagr)} title={annualTitle(p.cagr)}>{formatAnnualized(p.cagr)}</td>
                  <td className={signClass(p.twrrNet)} title={annualTitle(p.twrrNet)}>{formatAnnualized(p.twrrNet)}</td>
                  <td className={signClass(p.twrrGross)} title={annualTitle(p.twrrGross)}>{formatAnnualized(p.twrrGross)}</td>
                  <td className={signClass(p.mwrr)} title={annualTitle(p.mwrr)}>{formatAnnualized(p.mwrr)}</td>
                  <td className={p.maxDrawdown !== null && p.maxDrawdown < 0 ? 'dca-loss' : ''}>
                    {p.maxDrawdown !== null ? (p.maxDrawdown * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td className={p.avgDrawdown !== null && p.avgDrawdown < 0 ? 'dca-loss' : ''}>
                    {p.avgDrawdown !== null ? (p.avgDrawdown * 100).toFixed(2) + '%' : '—'}
                  </td>
                  <td>{formatDuration(p.longestDrawdownDays, language)}</td>
                  <td>{p.stdev !== null ? (p.stdev * 100).toFixed(2) + '%' : '—'}</td>
                  <td className={p.profitFactor !== null ? (p.profitFactor >= 1 ? 'dca-profit' : 'dca-loss') : ''}>
                    {p.profitFactor !== null ? p.profitFactor.toFixed(2) + '×' : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const DCAStatsTable = memo(DCAStatsTableImpl)

function signClass(v: number | null): string {
  if (v === null) return ''
  return v >= 0 ? 'dca-profit' : 'dca-loss'
}

function formatSignedPercent(v: number | null): string {
  if (v === null) return '—'
  const pct = v * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
}

/**
 * Số quy năm (%/năm): null nghĩa là kỳ chưa đủ 1 năm nên KHÔNG quy năm, ô để
 * trống thay vì nội suy từ vài tháng. Tooltip giải thích vì sao trống.
 */
function formatAnnualized(v: number | null): string {
  return v === null ? '' : formatSignedPercent(v)
}

function annualTitle(v: number | null): string | undefined {
  return v === null ? translateStatic('dcaStats.shortPeriod', getLanguage()) : undefined
}

function formatVND(value: number, lang: Language): string {
  return Math.round(value).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') + ' đ'
}

/** Số ngày → "2.5 năm" / "8 tháng" / "45 ngày" */
function formatDuration(days: number | null, lang: Language): string {
  if (days === null) return '—'
  if (days >= 365) return translateStatic('dcaStats.years', lang, { v: (days / 365.25).toFixed(1) })
  if (days >= 60) return translateStatic('dcaStats.months', lang, { v: Math.round(days / 30.44) })
  return translateStatic('dcaStats.days', lang, { v: days })
}
