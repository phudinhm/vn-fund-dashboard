import type { KPIData } from '../types'
import { useT } from '../i18n'

interface FundKPI {
  name: string
  color: string
  kpi: KPIData
}

interface Props {
  funds: FundKPI[]
  dcaMode?: boolean
}

export function KPICards({ funds, dcaMode }: Props) {
  const t = useT()

  return (
    <div className="kpi-grid">
      <KPICard
        title={t(dcaMode ? 'kpi.cagrTwrr' : 'kpi.cagr')}
        tooltip={t(dcaMode ? 'kpi.tooltip.cagrTwrr' : 'kpi.tooltip.cagr')}
        funds={funds}
        getValue={f => f.kpi.cagr}
        format={formatPercent}
        higherIsBetter
      />
      <KPICard
        title={t('kpi.maxDrawdown')}
        tooltip={t(dcaMode ? 'kpi.tooltip.maxDrawdownTwrr' : 'kpi.tooltip.maxDrawdown')}
        funds={funds}
        getValue={f => f.kpi.maxDrawdown}
        format={formatPercent}
        higherIsBetter={false}
        isDrawdown
      />
      <KPICard
        title={t('kpi.rollingAvg')}
        tooltip={t(dcaMode ? 'kpi.tooltip.rollingAvgTwrr' : 'kpi.tooltip.rollingAvg')}
        funds={funds}
        getValue={f => f.kpi.rollingAvg12M}
        format={formatPercent}
        higherIsBetter
      />
      <KPICard
        title={t('kpi.winRate')}
        tooltip={t('kpi.tooltip.winRate')}
        funds={funds}
        getValue={f => f.kpi.winRate}
        format={formatPercent}
        higherIsBetter
      />
    </div>
  )
}

interface CardProps {
  title: string
  tooltip: string | undefined
  funds: FundKPI[]
  getValue: (f: FundKPI) => number | null
  format: (v: number) => string
  higherIsBetter: boolean
  /** Sụt giảm: giá trị gần 0 (ít âm hơn) mới là tốt, không phụ thuộc higherIsBetter. */
  isDrawdown?: boolean
}

function KPICard({
  title,
  tooltip,
  funds,
  getValue,
  format,
  higherIsBetter,
  isDrawdown,
}: CardProps) {
  // Find the best value
  const values = funds.map(f => getValue(f))
  let bestIdx = -1

  if (values.every(v => v !== null)) {
    // For drawdown: higher (closer to 0) is better
    const better = isDrawdown || higherIsBetter
      ? Math.max(...(values as number[]))
      : Math.min(...(values as number[]))
    bestIdx = values.indexOf(better)
  }

  return (
    <div className="kpi-card">
      <div className="kpi-title">
        {title}
        <span className="kpi-tooltip" title={tooltip}>?</span>
      </div>
      <div className="kpi-values">
        {funds.map((f, i) => (
          <div key={f.name} className={`kpi-value ${i === bestIdx ? 'kpi-winner' : ''}`}>
            <span className="kpi-fund-name" style={{ color: f.color }}>{f.name}</span>
            <span className="kpi-number">
              {values[i] !== null ? format(values[i]!) : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + '%'
}
