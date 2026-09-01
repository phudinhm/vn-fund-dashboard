/**
 * RollingReturnBlock: "Nếu bạn bắt đầu ở thời điểm khác thì sao?"
 *
 * Histogram của CAGR N-năm rolling. Trả lời câu hỏi quan trọng: "Kết quả của
 * tôi có phải do lucky timing không? Nếu bạn tôi bắt đầu trễ/sớm 1-2 năm thì
 * kết quả sẽ khác thế nào?"
 *
 * Mental model: retail VN hay so sánh với người khác đầu tư cùng quỹ nhưng
 * khác thời điểm, rồi buồn/vui vì kết quả lệch nhau. Block này cho thấy
 * phân phối toàn bộ kịch bản có thể xảy ra.
 */
import { useState, useMemo, memo } from 'react'
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, ReferenceLine, Cell,
} from 'recharts'
import { rollingCAGR, histogramBuckets, trailingWindowCagr } from '../utils/dca'
import type { ReturnPoint } from '../types'
import { useT, useTRich, type TranslationKey } from '../i18n'

export interface RollingPortfolio {
  id: string
  name: string
  color: string
  cumulative: ReturnPoint[]
}

interface Props {
  portfolios: RollingPortfolio[]
}

const WINDOW_OPTIONS = [3, 5, 7, 10]

function RollingReturnBlockImpl({ portfolios }: Props) {
  const t = useT()
  const tr = useTRich()
  const [windowYears, setWindowYears] = useState<number>(5)

  if (portfolios.length === 0) return null

  return (
    <div className="dca-rolling-block">
      <h3 className="dca-rolling-title">{t('rollBlock.title')}</h3>
      <p className="dca-rolling-sub">{tr('rollBlock.intro', { years: windowYears })}</p>

      <div className="dca-rolling-controls">
        <span className="dca-rolling-controls-label">{t('rollBlock.windowLabel')}</span>
        {WINDOW_OPTIONS.map(w => (
          <button
            key={w}
            className={`dca-rolling-btn${w === windowYears ? ' dca-rolling-btn--active' : ''}`}
            onClick={() => setWindowYears(w)}
          >
            {t('roll.years', { n: w })}
          </button>
        ))}
      </div>

      {portfolios.map(p => (
        <RollingForPortfolio key={p.id} portfolio={p} windowYears={windowYears} />
      ))}
    </div>
  )
}

export const RollingReturnBlock = memo(RollingReturnBlockImpl)

function RollingForPortfolio({
  portfolio,
  windowYears,
}: {
  portfolio: RollingPortfolio
  windowYears: number
}) {
  const t = useT()
  const tr = useTRich()
  const { rolls, buckets, stats, userCagr } = useMemo(() => {
    const rolls = rollingCAGR(portfolio.cumulative, windowYears)
    const values = rolls.map(r => r.cagr)
    const buckets = histogramBuckets(values, 0.02)
    const stats = computeStats(values)
    // Cùng công thức TWRR + cùng độ dài windowYears với `rolls` ở trên (khác
    // CAGR kiểu nhà đầu tư trên toàn bộ kỳ backtest) — để percentile so sánh
    // đúng nghĩa "kết quả windowYears năm gần nhất của bạn nằm ở đâu trong
    // phân phối windowYears năm lịch sử", không lẫn 2 công thức/2 độ dài khác nhau.
    const userCagr = trailingWindowCagr(portfolio.cumulative, windowYears)
    return { rolls, buckets, stats, userCagr }
  }, [portfolio.cumulative, windowYears])

  if (rolls.length < 3) {
    // Lý do thật thường không phải quỹ thiếu lịch sử, mà là khoảng thời gian
    // user chọn (mặc định "5 năm qua") ngắn hơn chu kỳ đang xét. Hiển thị ngày
    // thực tế của chuỗi để người đọc thấy ngay vấn đề ở đâu.
    const start = portfolio.cumulative[0]?.date
    const end = portfolio.cumulative[portfolio.cumulative.length - 1]?.date
    const span =
      start && end
        ? t('rollBlock.rangeSelected', { from: formatDate(start), to: formatDate(end) })
        : t('rollBlock.rangeShort')
    return (
      <div className="dca-rolling-card">
        <div className="dca-rolling-card-header">
          <span style={{ color: portfolio.color, fontWeight: 700 }}>{portfolio.name}</span>
        </div>
        <div className="dca-rolling-insufficient">
          {t('rollBlock.tooShort', { span, years: windowYears, need: windowYears + 1 })}
        </div>
      </div>
    )
  }

  const percentile = userCagr !== null ? percentileOf(rolls.map(r => r.cagr), userCagr) : null

  // Chart data
  const chartData = buckets.map(b => ({
    center: b.center * 100,
    centerLabel: `${(b.center * 100).toFixed(0)}%`,
    count: b.count,
    range: t('rollBlock.binRange', { min: (b.min * 100).toFixed(1), max: (b.max * 100).toFixed(1) }),
    // Highlight bucket chứa user CAGR
    highlight: userCagr !== null && userCagr >= b.min && userCagr < b.max,
  }))

  return (
    <div className="dca-rolling-card">
      <div className="dca-rolling-card-header">
        <span style={{ color: portfolio.color, fontWeight: 700 }}>{portfolio.name}</span>
        <span className="dca-rolling-card-count">
          {t('rollBlock.windowCount', { n: rolls.length, years: windowYears })}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="centerLabel"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            interval={Math.max(0, Math.floor(chartData.length / 10) - 1)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={36}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(v: number) => [t('rollBlock.tooltipCount', { n: v }), t('rollBlock.tooltipLabel')]}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as { range: string } | undefined
              return p ? `CAGR ${p.range}` : ''
            }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <ReferenceLine
            x={`${Math.round(stats.median * 100)}%`}
            stroke="#6b7280"
            strokeDasharray="3 3"
            label={{ value: `Median ${(stats.median * 100).toFixed(1)}%`, fontSize: 10, fill: '#6b7280', position: 'top' }}
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.highlight ? portfolio.color : '#cbd5e1'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="dca-rolling-stats">
        <StatBox label={t('rollBlock.stat.min')} value={fmtPct(stats.min)} />
        <StatBox label="P10" value={fmtPct(stats.p10)} />
        <StatBox label="Median" value={fmtPct(stats.median)} highlight />
        <StatBox label="P90" value={fmtPct(stats.p90)} />
        <StatBox label={t('rollBlock.stat.max')} value={fmtPct(stats.max)} />
      </div>

      {userCagr !== null && percentile !== null && (
        <div className="dca-rolling-takeaway">
          {tr('rollBlock.yourCagr', { cagr: fmtPct(userCagr) })}
          {t(percentileKey(percentile), { pct: percentile.toFixed(0) })}
          {stats.negCount > 0 && tr('rollBlock.negWarning', {
            n: rolls.length, years: windowYears, neg: stats.negCount,
          })}
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`dca-rolling-stat${highlight ? ' dca-rolling-stat--highlight' : ''}`}>
      <div className="dca-rolling-stat-label">{label}</div>
      <div className="dca-rolling-stat-value">{value}</div>
    </div>
  )
}

function percentileKey(pct: number): TranslationKey {
  if (pct >= 90) return 'rollBlock.pct.top10'
  if (pct >= 75) return 'rollBlock.pct.good'
  if (pct >= 50) return 'rollBlock.pct.aboveMedian'
  if (pct >= 25) return 'rollBlock.pct.belowMedian'
  return 'rollBlock.pct.bottom'
}

interface Stats {
  min: number
  max: number
  median: number
  p10: number
  p90: number
  negCount: number
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { min: 0, max: 0, median: 0, p10: 0, p90: 0, negCount: 0 }
  }
  const sorted = [...values].sort((a, b) => a - b)
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    median: sorted[Math.floor(sorted.length / 2)]!,
    p10: sorted[Math.floor(sorted.length * 0.1)]!,
    p90: sorted[Math.floor(sorted.length * 0.9)]!,
    negCount: sorted.filter(v => v < 0).length,
  }
}

function percentileOf(values: number[], x: number): number {
  if (values.length === 0) return 0
  const below = values.filter(v => v < x).length
  return (below / values.length) * 100
}

function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
