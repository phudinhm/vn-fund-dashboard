/**
 * DcaJourneyBlock: hero narrative cho tab DCA.
 *
 * Single portfolio: 1 câu chuyện chi tiết với vndComparison trên lời ròng.
 * Multi portfolio: nêu winner + loser, gọi tên chênh lệch bằng ví dụ đời thường.
 *
 * Mental model: retail VN không quen tách net profit khỏi total value. Hero
 * phải kể: "đã nạp X, giờ có Y, lời ròng Z, đó bằng cái gì trong đời thực".
 */
import { Fragment, memo } from 'react'
import { formatVND, vndComparisonKey } from '../utils/vndFormat'
import { useT, useTRich, translateStatic } from '../i18n'
import { useLanguage, type Language } from '../hooks/useLanguage'
import { dcaYearlyMWRR } from '../utils/dca'

export interface JourneyPortfolio {
  id: string
  name: string
  color: string
  totalInvested: number
  finalValue: number
  /** Giá trị danh mục theo thời gian (đã gồm cashflow) — dùng để tính MWRR từng năm */
  valueSeries: { date: string; value: number }[]
  /** Toàn bộ cashflows (âm = nạp tiền) — dùng để tính MWRR từng năm */
  cashflows: { date: string; amount: number }[]
}

interface Props {
  portfolios: JourneyPortfolio[]
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}

function DcaJourneyBlockImpl({ portfolios, startDate, endDate }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  if (portfolios.length === 0) return null

  const period = describePeriod(startDate, endDate, language)

  // Single portfolio → full narrative
  if (portfolios.length === 1) {
    const p = portfolios[0]!
    const netProfit = p.finalValue - p.totalInvested
    const profitPct = p.totalInvested > 0 ? (netProfit / p.totalInvested) * 100 : 0
    const comparisonKey = netProfit > 0 ? vndComparisonKey(netProfit) : null
    const comparison = comparisonKey ? t(comparisonKey) : null

    return (
      <div className="dca-journey-block">
        <div className="dca-journey-headline">
          {tr('journey.headlineSingle', {
            period,
            name: p.name,
            invested: formatVND(p.totalInvested),
          })}
        </div>

        <div className="dca-journey-grid">
          <div className="dca-journey-stat">
            <div className="dca-journey-stat-label">{t('journey.stat.invested')}</div>
            <div className="dca-journey-stat-value">{formatVND(p.totalInvested)}</div>
          </div>
          <div className="dca-journey-stat dca-journey-stat--highlight">
            <div className="dca-journey-stat-label">{t('journey.stat.value')}</div>
            <div className="dca-journey-stat-value">{formatVND(p.finalValue)}</div>
          </div>
          <div className={`dca-journey-stat dca-journey-stat--${netProfit >= 0 ? 'pos' : 'neg'}`}>
            <div className="dca-journey-stat-label">{t('journey.stat.profit')}</div>
            <div className="dca-journey-stat-value">
              {netProfit >= 0 ? '+' : ''}{formatVND(netProfit)}
            </div>
            <div className="dca-journey-stat-sub">
              {netProfit >= 0 ? '+' : ''}{profitPct.toFixed(1)}%
            </div>
          </div>
        </div>

        {netProfit > 0 && (
          <div className="dca-journey-takeaway">
            <span className="dca-journey-takeaway-icon">💰</span>
            <div>
              {comparison
                ? tr('journey.takeaway.gain', {
                    period,
                    pct: profitPct.toFixed(1),
                    profit: formatVND(netProfit),
                    comparison,
                  })
                : tr('journey.takeaway.gainNoComparison', {
                    period,
                    pct: profitPct.toFixed(1),
                    profit: formatVND(netProfit),
                  })}
            </div>
          </div>
        )}
        {netProfit <= 0 && (
          <div className="dca-journey-takeaway dca-journey-takeaway--neg">
            <span className="dca-journey-takeaway-icon">📉</span>
            <div>
              {tr('journey.takeaway.loss', { period, pct: Math.abs(profitPct).toFixed(1) })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Multi portfolio → winner + loser framing
  const sorted = [...portfolios].sort((a, b) => b.finalValue - a.finalValue)
  const winner = sorted[0]!
  const loser = sorted[sorted.length - 1]!
  const gap = winner.finalValue - loser.finalValue
  const gapComparisonKey = gap > 0 ? vndComparisonKey(gap) : null
  const gapComparison = gapComparisonKey ? t(gapComparisonKey) : null

  return (
    <div className="dca-journey-block">
      <div className="dca-journey-headline">
        {tr('journey.headlineMulti', { period, n: portfolios.length })}
      </div>

      <div className="dca-journey-ranked">
        {sorted.map((p, idx) => {
          const netProfit = p.finalValue - p.totalInvested
          const profitPct = p.totalInvested > 0 ? (netProfit / p.totalInvested) * 100 : 0
          const rankLabel = idx === 0 ? '🥇' : idx === sorted.length - 1 && sorted.length > 2 ? '🥉' : idx === 1 ? '🥈' : ''
          return (
            <div key={p.id} className="dca-journey-card" style={{ borderLeftColor: p.color }}>
              <div className="dca-journey-card-head">
                <span className="dca-journey-card-rank">{rankLabel}</span>
                <span className="dca-journey-card-name" style={{ color: p.color }}>{p.name}</span>
              </div>
              <div className="dca-journey-card-value">{formatVND(p.finalValue)}</div>
              <div className="dca-journey-card-sub">
                {t('journey.rankLine', { invested: formatVND(p.totalInvested) })}
                {' '}<span className={netProfit >= 0 ? 'dca-journey-pos' : 'dca-journey-neg'}>
                  {netProfit >= 0 ? '+' : ''}{formatVND(netProfit)} ({netProfit >= 0 ? '+' : ''}{profitPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {sorted.length >= 2 && gap > 0 && (
        <div className="dca-journey-takeaway">
          <span className="dca-journey-takeaway-icon">🎯</span>
          <div>
            {tr('journey.gap', { winner: winner.name, loser: loser.name })}
            <strong>{formatVND(gap)}</strong>
            {gapComparison && tr('journey.gapComparison', { thing: gapComparison })}.
            {t('journey.gapTail')}
          </div>
        </div>
      )}
    </div>
  )
}

export const DcaJourneyBlock = memo(DcaJourneyBlockImpl)

/**
 * EOYReturnsTable: hiệu suất DANH MỤC CỦA NHÀ ĐẦU TƯ từng năm (End-of-Year Returns),
 * tính bằng Modified Dietz method (money-weighted, có tính dòng tiền nạp).
 *
 * Khác với TWRR (dcaYearlyReturns, đo hiệu suất bản thân quỹ như thể đầu tư
 * 1 lần từ đầu, bất kể bạn nạp bao nhiêu/khi nào), Modified Dietz đo đúng
 * trải nghiệm DCA thực tế: tiền nạp sớm trong năm được tính trọng số cao hơn
 * (nhiều thời gian sinh lời), tiền nạp cuối năm gần như chưa kịp sinh lời.
 * Đây là công thức chuẩn GIPS, không cần giải lặp nên luôn ổn định dù mỗi
 * năm chỉ có ~12 lần nạp tiền.
 */
function EOYReturnsTableImpl({ portfolios }: { portfolios: JourneyPortfolio[] }) {
  const t = useT()
  const tr = useTRich()
  const perPortfolio = portfolios.map(p => ({
    id: p.id,
    name: p.name,
    color: p.color,
    byYear: new Map(dcaYearlyMWRR(p.valueSeries, p.cashflows).map(y => [y.year, y])),
  }))

  const allYears = Array.from(
    new Set(perPortfolio.flatMap(p => Array.from(p.byYear.keys()))),
  ).sort((a, b) => a - b)

  if (allYears.length === 0) return null

  // Cột "Chênh lệch" chỉ có ý nghĩa rõ ràng khi so sánh đúng 2 danh mục (B trừ A).
  // Với 3+ danh mục, "chênh lệch với cái nào" không còn là câu hỏi có 1 đáp án.
  const showDiff = perPortfolio.length === 2

  return (
    <div className="dca-eoy-block">
      <h4 className="dca-eoy-title">{t('journey.eoy.title')}</h4>
      <p className="dca-eoy-explainer">
        {tr('journey.eoy.intro')}
      </p>
      <div className="dca-eoy-table-scroll">
        <table className="dca-eoy-table">
          <thead>
            <tr>
              <th rowSpan={2} className="dca-eoy-th-year">{t('journey.eoy.year')}</th>
              {perPortfolio.map(p => (
                <th key={p.id} colSpan={2} className="dca-eoy-group-start" style={{ color: p.color }}>{p.name}</th>
              ))}
              {showDiff && <th rowSpan={2} className="dca-eoy-group-start">{t('journey.eoy.gap')}</th>}
            </tr>
            <tr>
              {perPortfolio.map(p => (
                <Fragment key={p.id}>
                  <th className="dca-eoy-subhead dca-eoy-group-start">{t('journey.eoy.return')}</th>
                  <th className="dca-eoy-subhead">{t('journey.eoy.value')}</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {allYears.map(year => {
              const rows = perPortfolio.map(p => p.byYear.get(year))
              const diffPct = showDiff && rows[0]?.value != null && rows[1]?.value != null
                ? (rows[1]!.value! - rows[0]!.value!) * 100
                : null

              return (
                <tr key={year}>
                  <td className="dca-eoy-year">{year}</td>
                  {perPortfolio.map((p, idx) => {
                    const r = rows[idx]
                    if (!r || r.value === null) {
                      return (
                        <Fragment key={p.id}>
                          <td className="dca-eoy-cell dca-eoy-cell--empty dca-eoy-group-start">—</td>
                          <td className="dca-eoy-cell dca-eoy-cell--empty">—</td>
                        </Fragment>
                      )
                    }
                    const pct = r.value * 100
                    return (
                      <Fragment key={p.id}>
                        <td className={`dca-eoy-cell dca-eoy-group-start ${pct >= 0 ? 'dca-eoy-cell--pos' : 'dca-eoy-cell--neg'}`}>
                          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                          {r.isPartial && <sup className="dca-eoy-partial">*</sup>}
                        </td>
                        <td className="dca-eoy-cell dca-eoy-cell--balance">
                          {formatVND(r.endValue)}
                        </td>
                      </Fragment>
                    )
                  })}
                  {showDiff && (
                    <td
                      className={`dca-eoy-cell dca-eoy-group-start ${diffPct === null ? 'dca-eoy-cell--empty' : diffPct >= 0 ? 'dca-eoy-cell--pos' : 'dca-eoy-cell--neg'}`}
                    >
                      {diffPct === null ? '—' : t('journey.eoy.points', { v: `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}` })}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="dca-eoy-footnote">
        {t('journey.eoy.footnote')}
        {showDiff && t('journey.eoy.gapFootnote')}
      </div>
    </div>
  )
}

export const EOYReturnsTable = memo(EOYReturnsTableImpl)

/** Mô tả khoảng thời gian: "8 năm 3 tháng", "15 tháng", "45 ngày"... */
function describePeriod(startDate: string, endDate: string, lang: Language): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const ms = end.getTime() - start.getTime()
  const days = Math.floor(ms / (24 * 3600 * 1000))
  if (days < 60) return translateStatic('journey.period.days', lang, { n: days })

  const totalMonths = Math.floor(days / 30.44)
  if (totalMonths < 12) return translateStatic('journey.period.months', lang, { n: totalMonths })

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths - years * 12
  if (months === 0) return translateStatic('journey.period.years', lang, { n: years })
  return translateStatic('journey.period.yearsMonths', lang, { y: years, m: months })
}
