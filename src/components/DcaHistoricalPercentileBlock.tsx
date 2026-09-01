import { memo, useMemo, useState } from 'react'
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { rollingCAGR, type RollingCAGRPoint } from '../utils/dca'
import type { ReturnPoint } from '../types'
import { useT, useTRich, type TranslationKey } from '../i18n'

export interface HistoricalPercentilePortfolio {
  id: string
  name: string
  color: string
  cumulative: ReturnPoint[]
}

interface Props {
  portfolios: HistoricalPercentilePortfolio[]
}

interface HistoricalWindow {
  percentile: number
  cagr: number
  startDate: string
  endDate: string
  points: { month: number; value: number }[]
}

interface PortfolioWindows {
  portfolio: HistoricalPercentilePortfolio
  windows: Map<number, HistoricalWindow>
  totalWindows: number
}

const WINDOW_OPTIONS = [1, 2, 3, 4, 5]
const PERCENTILES = [0.10, 0.25, 0.50, 0.75]

/** Tên gọi bằng lời cho từng percentile, đọc dễ hơn "P10". */
const BAND_LABEL_KEY: Record<number, TranslationKey> = {
  0.1: 'hp.bandBad',
  0.25: 'hp.bandSomewhatBad',
  0.5: 'hp.bandMedian',
  0.75: 'hp.bandSomewhatGood',
}

function DcaHistoricalPercentileBlockImpl({ portfolios }: Props) {
  const [windowYears, setWindowYears] = useState(5)
  const t = useT()
  const availableWindowYears = useMemo(
    () => WINDOW_OPTIONS.filter(years => portfolios.some(portfolio => hasEnoughHistory(portfolio, years))),
    [portfolios],
  )
  const activeWindowYears = availableWindowYears.includes(windowYears)
    ? windowYears
    : availableWindowYears[availableWindowYears.length - 1] ?? windowYears
  const results = useMemo(
    () => portfolios.map(portfolio => collectHistoricalWindows(portfolio, activeWindowYears)),
    [portfolios, activeWindowYears],
  )
  const hasWindows = results.some(result => result.windows.size > 0)

  return (
    <div className="chart-container dca-historical-percentile">
      <div className="chart-header">
        <div>
          <h3>{t('hp.title')}</h3>
        </div>
      </div>

      <div className="dca-historical-percentile-controls">
        <span>{t('hp.windowLength')}</span>
        {WINDOW_OPTIONS.map(years => (
          <button
            key={years}
            className={`dca-mc-btn${years === activeWindowYears ? ' dca-mc-btn--active' : ''}`}
            onClick={() => setWindowYears(years)}
            disabled={!availableWindowYears.includes(years)}
          >
            {years === 1 ? t('hp.year1') : t('hp.years', { n: years })}
          </button>
        ))}
      </div>

      {hasWindows ? <>
        <div className="dca-stats-table-scroll">
        <table className="dca-stats-table dca-historical-percentile-table">
          <thead>
            <tr>
              <th>{t('hp.colPortfolio')}</th>
              {PERCENTILES.map(percentile => <th key={percentile}>P{Math.round(percentile * 100)}</th>)}
            </tr>
          </thead>
          <tbody>
            {results.map(({ portfolio, windows, totalWindows }) => (
              <tr key={portfolio.id}>
                <td>
                  <span className="perf-dot" style={{ background: portfolio.color }} />
                  {portfolio.name}
                  <span className="dca-historical-window-count">{t('hp.windowCount', { n: totalWindows })}</span>
                </td>
                {PERCENTILES.map(percentile => {
                  const window = windows.get(percentile)
                  return (
                    <td key={percentile}>
                      {window ? (
                        <>
                          <strong>{formatPercent(window.cagr)}</strong>
                          <span className="dca-historical-window-date">
                            {t('hp.dateRange', {
                              from: formatMonthYear(window.startDate),
                              to: formatMonthYear(window.endDate),
                            })}
                          </span>
                        </>
                      ) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <HistoricalNarrative results={results} windowYears={activeWindowYears} />

        <div className="dca-historical-percentile-grid">
        {PERCENTILES.map(percentile => (
          <HistoricalPathChart
            key={percentile}
            percentile={percentile}
            portfolios={results}
          />
        ))}
        </div>

      </> : (
        <p className="dca-historical-percentile-sub">{t('hp.tooShort')}</p>
      )}
    </div>
  )
}

export const DcaHistoricalPercentileBlock = memo(DcaHistoricalPercentileBlockImpl)

function hasEnoughHistory(portfolio: HistoricalPercentilePortfolio, windowYears: number): boolean {
  const start = portfolio.cumulative[0]
  const end = portfolio.cumulative[portfolio.cumulative.length - 1]
  if (!start || !end) return false
  return new Date(end.date).getTime() - new Date(start.date).getTime() >= windowYears * 365.25 * 24 * 60 * 60 * 1000
}

function HistoricalPathChart({
  percentile,
  portfolios,
}: {
  percentile: number
  portfolios: PortfolioWindows[]
}) {
  const t = useT()
  const data = mergeChartData(portfolios, percentile)

  return (
    <div className="dca-historical-percentile-card">
      <strong>{t(BAND_LABEL_KEY[percentile] ?? 'hp.bandMedian')} · P{Math.round(percentile * 100)}</strong>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            type="number"
            tickFormatter={month => `${(month / 12).toFixed(month % 12 === 0 ? 0 : 1)}y`}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            domain={[0, 'dataMax']}
            minTickGap={28}
          />
          <YAxis tickFormatter={formatPercent} tick={{ fontSize: 10, fill: '#6b7280' }} width={48} />
          <Tooltip
            formatter={(value: number, name: string) => [formatPercent(value), name]}
            labelFormatter={(month: number) => t('hp.afterYears', { n: (month / 12).toFixed(1) })}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {portfolios.map(({ portfolio, windows }) => (
            windows.has(percentile) && (
              <Line
                key={portfolio.id}
                type="monotone"
                dataKey={portfolio.id}
                name={portfolio.name}
                stroke={portfolio.color}
                strokeWidth={2}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function collectHistoricalWindows(
  portfolio: HistoricalPercentilePortfolio,
  windowYears: number,
): PortfolioWindows {
  const rolls = rollingCAGR(portfolio.cumulative, windowYears)
  const windows = new Map<number, HistoricalWindow>()
  for (const percentile of PERCENTILES) {
    const roll = nearestPercentileRoll(rolls, percentile)
    if (!roll) continue
    windows.set(percentile, {
      percentile,
      cagr: roll.cagr,
      startDate: roll.startDate,
      endDate: roll.endDate,
      points: windowPoints(portfolio.cumulative, roll),
    })
  }
  return { portfolio, windows, totalWindows: rolls.length }
}

function nearestPercentileRoll(rolls: RollingCAGRPoint[], percentile: number): RollingCAGRPoint | null {
  if (rolls.length === 0) return null
  const sorted = [...rolls].sort((a, b) => a.cagr - b.cagr)
  const target = percentileValue(sorted.map(roll => roll.cagr), percentile)
  return sorted.reduce((best, roll) => (
    Math.abs(roll.cagr - target) < Math.abs(best.cagr - target) ? roll : best
  ))
}

function windowPoints(cumulative: ReturnPoint[], roll: RollingCAGRPoint): { month: number; value: number }[] {
  const start = cumulative.find(point => point.date === roll.startDate)
  if (!start) return []
  const startGrowth = 1 + start.value
  const startTime = new Date(start.date).getTime()
  const points = new Map<number, number>()
  for (const point of cumulative) {
    if (point.date < roll.startDate || point.date > roll.endDate) continue
    const month = Math.round((new Date(point.date).getTime() - startTime) / (365.25 / 12 * 24 * 60 * 60 * 1000))
    points.set(month, (1 + point.value) / startGrowth - 1)
  }
  return Array.from(points, ([month, value]) => ({ month, value })).sort((a, b) => a.month - b.month)
}

function mergeChartData(portfolios: PortfolioWindows[], percentile: number): Record<string, number>[] {
  const rows = new Map<number, Record<string, number>>()
  for (const { portfolio, windows } of portfolios) {
    for (const point of windows.get(percentile)?.points ?? []) {
      const row = rows.get(point.month) ?? { month: point.month }
      row[portfolio.id] = point.value
      rows.set(point.month, row)
    }
  }
  return Array.from(rows.values()).sort((a, b) => a.month! - b.month!)
}

function percentileValue(sortedValues: number[], percentile: number): number {
  const index = (sortedValues.length - 1) * percentile
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]!
  const fraction = index - lower
  return sortedValues[lower]! + (sortedValues[upper]! - sortedValues[lower]!) * fraction
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

function formatMonthYear(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(0, 4)}`
}

function HistoricalNarrative({
  results,
  windowYears,
}: {
  results: PortfolioWindows[]
  windowYears: number
}) {
  const t = useT()
  const tr = useTRich()
  const rows = results
    .map(result => ({
      name: result.portfolio.name,
      p10: result.windows.get(0.1)?.cagr,
      p50: result.windows.get(0.5)?.cagr,
      p75: result.windows.get(0.75)?.cagr,
    }))
    .filter(row => row.p10 !== undefined && row.p50 !== undefined && row.p75 !== undefined)
    .map(row => ({
      name: row.name,
      p10: row.p10!,
      p50: row.p50!,
      p75: row.p75!,
    }))

  if (rows.length === 0) {
    return (
      <p className="dca-historical-percentile-sub">
        {t('hp.narrowRange', { years: windowYears })}
      </p>
    )
  }

  return (
    <div className="dca-consist-takeaway">
      <p>{t('hp.intro', { years: windowYears })}</p>

      {rows.map(row => (
        <p key={row.name}>
          {tr('hp.fundLine', { name: row.name, story: describeHistoricalOutcome(row, t) })}
        </p>
      ))}

      <p>{t('hp.closing')}</p>
    </div>
  )
}

function describeHistoricalOutcome(
  row: { p10: number; p50: number; p75: number },
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
): string {
  const worst = t(row.p10 < 0 ? 'hp.worstLoss' : 'hp.worstThin', { pct: formatPercent(row.p10) })
  const typical = t(row.p50 >= 0 ? 'hp.typicalGain' : 'hp.typicalLoss', { pct: formatPercent(row.p50) })
  const favorable = t(row.p75 >= 0 ? 'hp.favorableGain' : 'hp.favorableLoss', { pct: formatPercent(row.p75) })
  return `${worst} ${typical} ${favorable}`
}
