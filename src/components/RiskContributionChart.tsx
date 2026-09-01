import { memo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts'
import { useT, useTRich } from '../i18n'

export interface RiskContribItem {
  name: string
  btcWeight: number      // 0–1
  btcRiskPct: number     // 0–1
  fundWeight: number     // 0–1
  fundRiskPct: number    // 0–1
}

interface Props {
  data: RiskContribItem[]
  fundId: string
}

const BTC_WEIGHT_COLOR  = '#264653'
const BTC_RISK_COLOR    = '#2a9d8f'
const FUND_WEIGHT_COLOR = '#e9c46a'
const FUND_RISK_COLOR   = '#f4a261'

function RiskContributionChartImpl({ data, fundId }: Props) {
  const t = useT()
  const tr = useTRich()
  if (data.length === 0) return null

  // dataKey trong Recharts vừa là khóa dữ liệu vừa là tên hiển thị mặc định.
  // Dùng id cố định rồi đặt tên riêng qua `name`, để đổi ngôn ngữ không làm
  // gãy việc tra dữ liệu.
  const chartData = data.map(d => ({
    name: d.name,
    btcWeight: +(d.btcWeight * 100).toFixed(2),
    btcRisk: +(d.btcRiskPct * 100).toFixed(2),
    fundWeight: +(d.fundWeight * 100).toFixed(2),
    fundRisk: +(d.fundRiskPct * 100).toFixed(2),
  }))

  // Takeaway: find portfolio with highest BTC weight (non-zero) to compute risk/weight ratio
  const btcPortfolios = data.filter(d => d.btcWeight > 0)
  const highlight = btcPortfolios.length > 0
    ? btcPortfolios.reduce((a, b) => (a.btcWeight > b.btcWeight ? a : b))
    : null
  const riskMultiplier = highlight && highlight.btcWeight > 0
    ? highlight.btcRiskPct / highlight.btcWeight
    : 0

  return (
    <div className="perf-table-container">
      <div className="chart-header">
        <h3>{t('rc.title')}</h3>
        <span className="chart-tooltip-icon" title={t('rc.help')}>?</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={v => v + '%'}
            tick={{ fontSize: 12 }}
            width={50}
            domain={[0, 'auto']}
          />
          <Tooltip formatter={(v: number) => v.toFixed(1) + '%'} />
          <Legend />
          <Bar dataKey="btcWeight" name={t('rc.btcWeight')} fill={BTC_WEIGHT_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="btcWeight"
              position="top"
              formatter={(v: number) => v.toFixed(1) + '%'}
              style={{ fontSize: 10, fill: '#264653', fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="btcRisk" name={t('rc.btcRisk')} fill={BTC_RISK_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="btcRisk"
              position="top"
              formatter={(v: number) => v.toFixed(1) + '%'}
              style={{ fontSize: 10, fill: '#2a9d8f', fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="fundWeight" name={t('rc.fundWeight', { fund: fundId })} fill={FUND_WEIGHT_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="fundWeight"
              position="top"
              formatter={(v: number) => v.toFixed(1) + '%'}
              style={{ fontSize: 10, fill: '#c9a227', fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="fundRisk" name={t('rc.fundRisk', { fund: fundId })} fill={FUND_RISK_COLOR} radius={[3, 3, 0, 0]} isAnimationActive={false}>
            <LabelList
              dataKey="fundRisk"
              position="top"
              formatter={(v: number) => v.toFixed(1) + '%'}
              style={{ fontSize: 10, fill: '#c07030', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {highlight && riskMultiplier > 1 && (
        <div className="chart-takeaway chart-takeaway--orange">
          <span className="chart-takeaway-icon">⚠️</span>
          <div className="chart-takeaway-body">
            {tr('rc.takeaway', {
              name: highlight.name,
              weight: (highlight.btcWeight * 100).toFixed(1),
              risk: (highlight.btcRiskPct * 100).toFixed(1),
              mult: riskMultiplier.toFixed(1),
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export const RiskContributionChart = memo(RiskContributionChartImpl)
