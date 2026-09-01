/**
 * ProjectionBlock: "Nếu bạn tiếp tục DCA thêm X năm nữa?"
 *
 * Chiếu về tương lai dựa trên CAGR lịch sử + lịch nạp tiền hiện tại.
 * 3 scenario: pessimistic (CAGR − 3%), base (CAGR), optimistic (CAGR + 3%).
 *
 * Đây KHÔNG phải dự báo. Là thought experiment để user thấy magnitude của
 * compound interest khi giữ kỷ luật DCA trong nhiều năm. Phải có disclaimer.
 *
 * Mental model: retail VN hay nghĩ "đầu tư 5 năm là dài". Thực tế chứng khoán
 * là trò chơi 20-30 năm. Block này cho user một góc nhìn về thời gian đúng.
 */
import { useState, memo } from 'react'
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, ReferenceLine,
} from 'recharts'
import { formatVND } from '../utils/vndFormat'
import { MoneyInput } from './MoneyInput'
import { useT, useTRich, type TranslationKey } from '../i18n'

export interface ProjectionPortfolio {
  id: string
  name: string
  color: string
  totalInvested: number
  finalValue: number
  /** CAGR đã quy năm từ backtest, dùng làm base rate cho projection */
  cagr: number | null
  /** Số tiền nạp mỗi tháng (ước lượng từ lịch nạp thực tế) */
  monthlyContribution: number
}

interface Props {
  portfolios: ProjectionPortfolio[]
}

const HORIZON_OPTIONS = [5, 10, 20, 30]

function ProjectionBlockImpl({ portfolios }: Props) {
  const t = useT()
  const [years, setYears] = useState<number>(10)
  const [contribOverride, setContribOverride] = useState<number | null>(null)

  if (portfolios.length === 0) return null

  // Chỉ project được cho portfolio có CAGR dương và > 0
  const valid = portfolios.filter(p => p.cagr !== null && p.finalValue > 0)
  if (valid.length === 0) return null

  // Mặc định = số tiền đầu tư định kỳ thật (ở phần "Thông số" trên đầu tab).
  // Override ở đây chỉ đổi giả định cho TƯƠNG LAI, không đụng tới lịch sử/giá
  // trị hiện tại của danh mục — trả lời "nếu tôi tăng tiền đầu tư từ nay".
  const defaultContribution = valid[0]?.monthlyContribution ?? 0
  const effectiveContribution = contribOverride ?? defaultContribution

  return (
    <div className="dca-projection-block">
      <h3 className="dca-projection-title">{t('proj.title')}</h3>
      <p className="dca-projection-sub">
        {t('proj.intro')}
      </p>

      <div className="dca-projection-controls">
        <span className="dca-projection-controls-label">{t('proj.horizonLabel')}</span>
        {HORIZON_OPTIONS.map(h => (
          <button
            key={h}
            className={`dca-projection-btn${h === years ? ' dca-projection-btn--active' : ''}`}
            onClick={() => setYears(h)}
          >
            {t('proj.yearsAhead', { n: h })}
          </button>
        ))}
      </div>

      <div className="dca-projection-controls">
        <span className="dca-projection-controls-label">{t('proj.contribLabel')}</span>
        <MoneyInput
          value={effectiveContribution}
          onChange={setContribOverride}
          className="dca-projection-custom-input"
        />
        {contribOverride !== null && contribOverride !== defaultContribution && (
          <button className="dca-projection-btn" onClick={() => setContribOverride(null)}>
            {t('proj.reset', { v: formatVND(defaultContribution) })}
          </button>
        )}
      </div>
      <div className="dca-projection-hint">
        {t('proj.contribNote')}
      </div>

      {valid.map(p => (
        <ProjectionForPortfolio key={p.id} portfolio={p} years={years} monthlyContribution={effectiveContribution} />
      ))}

      <div className="dca-projection-disclaimer">
        {t('proj.warning')}
      </div>
    </div>
  )
}

export const ProjectionBlock = memo(ProjectionBlockImpl)

function ProjectionForPortfolio({
  portfolio,
  years,
  monthlyContribution,
}: {
  portfolio: ProjectionPortfolio
  years: number
  monthlyContribution: number
}) {
  const t = useT()
  const tr = useTRich()
  const cagr = portfolio.cagr ?? 0
  const baseRate = cagr
  const pessRate = cagr - 0.03
  const optRate = cagr + 0.03

  const monthlyContrib = monthlyContribution
  const months = years * 12

  // Simulate month by month: value_next = value_now * (1 + monthly_rate) + monthly_contrib
  function project(annualRate: number): { month: number; value: number }[] {
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1
    const series: { month: number; value: number }[] = []
    let v = portfolio.finalValue
    series.push({ month: 0, value: v })
    for (let m = 1; m <= months; m++) {
      v = v * (1 + monthlyRate) + monthlyContrib
      series.push({ month: m, value: v })
    }
    return series
  }

  const basePts = project(baseRate)
  const pessPts = project(pessRate)
  const optPts = project(optRate)

  const data = basePts.map((b, i) => ({
    month: b.month,
    base: b.value,
    pess: pessPts[i]!.value,
    opt: optPts[i]!.value,
  }))

  const finalBase = basePts[basePts.length - 1]!.value
  const finalPess = pessPts[pessPts.length - 1]!.value
  const finalOpt = optPts[optPts.length - 1]!.value
  const totalContribFuture = monthlyContrib * months
  const totalInvestedEnd = portfolio.totalInvested + totalContribFuture
  const growthBase = finalBase - totalInvestedEnd

  return (
    <div className="dca-projection-card">
      <div className="dca-projection-card-header">
        <span style={{ color: portfolio.color, fontWeight: 700 }}>{portfolio.name}</span>
        <span className="dca-projection-card-cagr">
          {t('proj.historicalCagr', { v: (cagr * 100).toFixed(1) })}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(m) => `${Math.round(m / 12)}y`}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            ticks={[0, 12, 24, 36, 48, 60, 120, 180, 240, 300, 360].filter(t => t <= months)}
          />
          <YAxis
            tickFormatter={(v) => formatMillions(v)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={56}
          />
          <Tooltip
            labelFormatter={(m: number) => t('proj.monthLabel', { m, y: (m / 12).toFixed(1) })}
            formatter={(v: number, name: string) => [formatVND(Math.round(v)), t(scenarioKey(name))]}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="2 2" label={{ value: t('proj.now'), fontSize: 10, fill: '#6b7280', position: 'top' }} />
          <Line type="monotone" dataKey="opt" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
          <Line type="monotone" dataKey="base" stroke={portfolio.color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="pess" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="dca-projection-legend">
        <span className="dca-projection-legend-item">
          <span className="dca-projection-swatch" style={{ background: '#10b981' }} />
          {t('proj.legendOpt', { rate: ((cagr + 0.03) * 100).toFixed(1), value: formatVND(Math.round(finalOpt)) })}
        </span>
        <span className="dca-projection-legend-item">
          <span className="dca-projection-swatch" style={{ background: portfolio.color }} />
          {tr('proj.legendBase', { rate: (cagr * 100).toFixed(1), value: formatVND(Math.round(finalBase)) })}
        </span>
        <span className="dca-projection-legend-item">
          <span className="dca-projection-swatch" style={{ background: '#ef4444' }} />
          {t('proj.legendPess', { rate: ((cagr - 0.03) * 100).toFixed(1), value: formatVND(Math.round(finalPess)) })}
        </span>
      </div>

      <div className="dca-projection-takeaway">
        {tr('proj.takeaway', {
          name: portfolio.name,
          current: formatVND(Math.round(portfolio.finalValue)),
          cagr: (cagr * 100).toFixed(1),
          monthly: formatVND(Math.round(monthlyContrib)),
          years,
          final: formatVND(Math.round(finalBase)),
          contributed: formatVND(Math.round(totalContribFuture)),
          growth: formatVND(Math.round(growthBase)),
        })}
      </div>
    </div>
  )
}

function scenarioKey(key: string): TranslationKey {
  if (key === 'opt') return 'proj.scenario.opt'
  if (key === 'pess') return 'proj.scenario.pess'
  return 'proj.scenario.base'
}

function formatMillions(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B'
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(0) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'K'
  return v.toString()
}
