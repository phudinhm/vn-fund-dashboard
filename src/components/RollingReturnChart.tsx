import { useState, useRef, useLayoutEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import type { ChartSeries, ReturnPoint } from '../types'
import { rollingReturnDistribution } from '../utils/calculations'
import { percentileSorted } from '../utils/stats'
import {
  mergeAllSeries, getYearTicks, formatYear, formatTooltipDate,
  formatPercent, formatPercentFull, BASELINE_COLOR, DIMMED_COLOR,
} from '../utils/chartPlumbing'
import { countIndependentWindows } from '../utils/dateWindow'
import { useDimLegend } from '../hooks/useDimLegend'
import { useT, type TranslationKey } from '../i18n'

interface Props {
  series: ChartSeries[]
  period: number
  availablePeriods?: number[]
  onPeriodChange: (period: number) => void
}

function spanMonths(points: ReturnPoint[]): number {
  if (points.length < 2) return 0
  const first = points[0]!.date.split('-').map(Number)
  const last = points[points.length - 1]!.date.split('-').map(Number)
  return (last[0]! - first[0]!) * 12 + (last[1]! - first[1]!)
}

/** Chu kỳ rolling, đơn vị tháng kèm nhãn hiển thị. */
const PERIODS = [
  { value: 6, labelKey: 'roll.months6' as TranslationKey, years: 0 },
  { value: 12, labelKey: 'roll.years' as TranslationKey, years: 1 },
  { value: 24, labelKey: 'roll.years' as TranslationKey, years: 2 },
  { value: 36, labelKey: 'roll.years' as TranslationKey, years: 3 },
  { value: 48, labelKey: 'roll.years' as TranslationKey, years: 4 },
  { value: 60, labelKey: 'roll.years' as TranslationKey, years: 5 },
  { value: 72, labelKey: 'roll.years' as TranslationKey, years: 6 },
  { value: 84, labelKey: 'roll.years' as TranslationKey, years: 7 },
  { value: 96, labelKey: 'roll.years' as TranslationKey, years: 8 },
  { value: 108, labelKey: 'roll.years' as TranslationKey, years: 9 },
  { value: 120, labelKey: 'roll.years' as TranslationKey, years: 10 },
] as const

/** Nhãn chu kỳ dịch tại chỗ render: "5 năm" / "5 years". */
function usePeriodLabel(): (months: number) => string {
  const t = useT()
  return (months: number) => {
    const p = PERIODS.find(x => x.value === months)
    if (!p) return t('roll.monthsN', { n: months })
    if (p.years === 0) return t(p.labelKey)
    // Tiếng Anh phân biệt số ít/số nhiều: "1 year" chứ không phải "1 years".
    return p.years === 1 ? t('roll.year1') : t(p.labelKey, { n: p.years })
  }
}

interface RollingStats {
  count: number
  independentWindows: number
  mean: number
  median: number
  p10: number
  p90: number
  min: number
  max: number
}

/** Thống kê của một chuỗi rolling return (đơn vị thập phân, 0.05 = 5%). */
function computeRollingStats(data: ReturnPoint[], period: number): RollingStats {
  const values = data.map(p => p.value)
  const sorted = [...values].sort((a, b) => a - b)
  const count = sorted.length
  if (count === 0) {
    return { count: 0, independentWindows: 0, mean: 0, median: 0, p10: 0, p90: 0, min: 0, max: 0 }
  }
  const sum = values.reduce((acc, v) => acc + v, 0)
  return {
    count,
    independentWindows: countIndependentWindows(spanMonths(data) + period, period),
    mean: sum / count,
    median: percentileSorted(sorted, 0.5),
    p10: percentileSorted(sorted, 0.1),
    p90: percentileSorted(sorted, 0.9),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
  }
}

function fmtPct(v: number): string {
  return formatPercent(v)
}

export function RollingReturnChart({ series, period, availablePeriods, onPeriodChange }: Props) {
  const t = useT()
  const periodLabel = usePeriodLabel()
  const seriesKey = series.map(s => s.name).join(',')
  const { handleLegendClick, isDimmed } = useDimLegend(seriesKey)

  const data = mergeAllSeries(series)

  const available = availablePeriods
    ? new Set(availablePeriods)
    : new Set(PERIODS.map(p => p.value))

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Rolling Returns ({periodLabel(period)})</h3>
        <div className="rolling-period-buttons">
          {PERIODS.map(p => {
            const hasData = available.has(p.value)
            return (
              <button
                key={p.value}
                className={`period-btn ${p.value === period ? 'period-btn-active' : ''} ${hasData ? '' : 'period-btn-disabled'}`}
                disabled={!hasData}
                title={hasData ? undefined : t('roll.noDataFor', { period: periodLabel(p.value) })}
                onClick={() => onPeriodChange(p.value)}
              >
                {periodLabel(p.value)}
              </button>
            )
          })}
        </div>
      </div>
      {data.length === 0 ? (
        <div className="chart-empty">
          {t('roll.noDataMsg', { period: periodLabel(period) })}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              ticks={getYearTicks(data)}
              tickFormatter={ts => formatYear(ts)}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={v => formatPercent(v, 0)}
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (isDimmed(name)) return []
                return formatPercentFull(value)
              }}
              labelFormatter={formatTooltipDate}
            />
            <Legend
              onClick={handleLegendClick}
              formatter={(value: string) => (
                <span style={{
                  color: isDimmed(value) ? DIMMED_COLOR : undefined,
                  cursor: 'pointer',
                  textDecoration: isDimmed(value) ? 'line-through' : undefined,
                }}>
                  {value}
                </span>
              )}
            />
            <ReferenceLine
              y={0}
              stroke={BASELINE_COLOR}
              strokeDasharray="6 3"
              strokeWidth={1.5}
            />
            {series.map(s => {
              const isDimmedLine = isDimmed(s.name)
              return (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={isDimmedLine ? DIMMED_COLOR : s.color}
                  strokeWidth={isDimmedLine ? 1 : 2}
                  opacity={isDimmedLine ? 0.4 : 1}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      )}
      {data.length > 0 && (
        <>
          <RollingStatsTable series={series} period={period} />
          <RollingReturnsNote />
        </>
      )}
    </div>
  )
}

function RollingReturnsNote() {
  const t = useT()
  return (
    <div className="rolling-note">
      <p>{t('roll.explain1')}</p>
      <p>{t('roll.explain2')}</p>
      <p>{t('roll.explain3')}</p>
      <p>{t('roll.explain4')}</p>
      <p>{t('roll.explain5')}</p>
    </div>
  )
}

function RollingStatsTable({ series, period }: { series: ChartSeries[]; period: number }) {
  const t = useT()
  const rows = series.map(s => {
    const stats = computeRollingStats(s.data, period)
    const distribution = rollingReturnDistribution(s.data.map(p => p.value))
    return { name: s.name, color: s.color, stats, distribution }
  })

  // Đo vị trí cột "Âm" (cột đầu của nhóm Phân bổ) để đặt vạch ngăn cách chạy
  // suốt chiều cao bảng, không bị đứt đoạn giữa các hàng.
  const amRef = useRef<HTMLSpanElement>(null)
  const [dividerLeft, setDividerLeft] = useState<number | null>(null)
  useLayoutEffect(() => {
    const am = amRef.current
    if (!am) return
    const update = () => setDividerLeft(am.offsetLeft)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div className="cmp-table cmp-table--rolling">
      {dividerLeft !== null && (
        <span className="cmp-table--rolling__divider" style={{ left: dividerLeft }} />
      )}
      <div className="cmp-table-row cmp-table-head cmp-table-group-head">
        <span>{t('roll.col.fund')}</span>
        <span className="cmp-group-title">{t('roll.group.stats')}</span>
        <span className="cmp-group-title">{t('roll.group.distribution')}</span>
      </div>
      <div className="cmp-table-row cmp-table-head cmp-table-head--rolling">
        <span>{t('roll.col.fund')}</span>
        <span>{t('roll.col.min')}</span>
        <span>P10</span>
        <span>{t('roll.col.median')}</span>
        <span>P90</span>
        <span>{t('roll.col.max')}</span>
        <span ref={amRef}>{t('roll.col.negative')}</span>
        <span>0–5%</span>
        <span>5–10%</span>
        <span>10–20%</span>
        <span>&gt;20%</span>
      </div>
      {rows.map(r => (
        <div key={r.name} className="cmp-table-row cmp-table-row--rolling">
          <span className="cmp-fund-cell">
            <span className="cmp-swatch" style={{ background: r.color }} />
            <span>
              <strong>{r.name}</strong>
              <small className="rolling-sample-count">
                {t('roll.windows', { n: r.stats.count, ind: r.stats.independentWindows })}
              </small>
            </span>
          </span>
          {r.stats.count === 0 ? (
            <span className="cmp-underwater">{t('roll.notEnough')}</span>
          ) : (
            <>
              <span className="cmp-num-neg">{fmtPct(r.stats.min)}</span>
              <span>{fmtPct(r.stats.p10)}</span>
              <span className="cmp-num-strong">{fmtPct(r.stats.median)}</span>
              <span>{fmtPct(r.stats.p90)}</span>
              <span>{fmtPct(r.stats.max)}</span>
              <span className={r.distribution[0]! > 0 ? 'cmp-num-neg' : undefined}>
                {fmtPct(r.distribution[0]!)}
              </span>
              <span>{fmtPct(r.distribution[1]!)}</span>
              <span>{fmtPct(r.distribution[2]!)}</span>
              <span>{fmtPct(r.distribution[3]!)}</span>
              <span>{fmtPct(r.distribution[4]!)}</span>
            </>
  )}
        </div>
      ))}
    </div>
  )
}
