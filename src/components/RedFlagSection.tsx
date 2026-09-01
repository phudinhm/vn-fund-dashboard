import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import { computeVerdictAt, type RedFlagPoint, type Verdict } from '../utils/fundRedFlags'
import { formatVND, formatVNDAxis } from '../utils/vndFormat'
import { useT, useTRich, type TranslationKey } from '../i18n'

interface Props {
  points: RedFlagPoint[] // tăng dần theo kỳ
}

const VERDICT_META: Record<Verdict, { labelKey: TranslationKey; color: string; bg: string }> = {
  OK: { labelKey: 'rf.status.ok', color: '#166534', bg: '#ecfdf5' },
  WATCH: { labelKey: 'rf.status.watch', color: '#92400e', bg: '#fffbeb' },
  DANGER: { labelKey: 'rf.status.danger', color: '#b91c1c', bg: '#fef2f2' },
  'N/A': { labelKey: 'rf.status.na', color: '#9a9890', bg: '#f5f5f4' },
}

function usePeriodLabel(): (periodEnd: string) => string {
  const t = useT()
  return (periodEnd: string) => {
    const [y, m] = periodEnd.split('-')
    if (!y || !m) return periodEnd
    return t('rf.periodLabel', { month: Number(m), year: y })
  }
}

function formatAxisTick(periodEnd: string): string {
  const [y, m] = periodEnd.split('-')
  if (!y || !m) return periodEnd
  return `${Number(m)}/${y.slice(2)}`
}

const CHART_MARGIN = { left: 8, right: 8, top: 8, bottom: 4 } as const

function buildChartData(points: RedFlagPoint[]): Array<Record<string, unknown>> {
  return points.map(p => ({ period: p.period, brokerage: p.brokerageFee, mgmt: p.managementFee }))
}

function MachineChart({ data, width, height }: { data: Array<Record<string, unknown>>; width?: number; height?: number }) {
  const t = useT()
  const formatPeriodLabel = usePeriodLabel()
  return (
    <BarChart data={data} width={width} height={height} margin={CHART_MARGIN}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
      <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={66} />
      <RechartsTooltip
        formatter={(value: number | string, name) => [formatVND(Number(value)), name]}
        labelFormatter={(p: string) => formatPeriodLabel(p)}
      />
      <Bar dataKey="brokerage" name={t('rf.brokerage')} stackId="a" fill="#f97316" isAnimationActive={false} />
      <Bar dataKey="mgmt" name={t('fa.series.mgmtFee')} stackId="a" fill="#f59e0b" isAnimationActive={false} />
    </BarChart>
  )
}

export function RedFlagDetectors({ points }: Props) {
  const t = useT()
  const tr = useTRich()
  if (points.length === 0) return null
  const idx = points.length - 1
  const summary = computeVerdictAt('machine', points, idx)
  const meta = VERDICT_META[summary.verdict]
  const data = buildChartData(points)

  return (
    <div className="chart-container fund-analysis-chart-wide">
      <div className="chart-header redflag-header">
        <h3>{t('rf.tradingMachine.title')}</h3>
        <span className="redflag-badge" style={{ background: meta.bg, color: meta.color }}>
          {t(meta.labelKey)}
        </span>
      </div>
      <div className="redflag-metrics">
        {summary.keyMetric !== null && (
          <span>{tr('rf.turnover12m', { v: Math.round(summary.keyMetric) })}</span>
        )}
        {summary.extra !== null && <span>{tr('rf.ratio', { v: summary.extra })}</span>}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <MachineChart data={data} />
      </ResponsiveContainer>
      <div className="fund-analysis-stack-legend">
        <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: '#f97316' }} />{t('rf.legend.brokerage')}</span>
        <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: '#f59e0b' }} />{t('rf.legend.mgmt')}</span>
      </div>
      <p className="fund-analysis-chart-note">
        {t('rf.tm.note1')}<br />
        {t('rf.tm.note2')}<br />
        {t('rf.tm.note3')}<br />
        <br />
        {t('rf.tm.note4')}<br />
        <br />
        {t('rf.tm.note5')}<br />
        <br />
        {t('rf.tm.note6')}
      </p>
    </div>
  )
}
