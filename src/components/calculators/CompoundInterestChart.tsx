import { memo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { CompoundInterestPoint } from '../../utils/calculators'
import { formatVNDAxis, formatVNDFull } from '../../utils/vndFormat'
import { useT, useTRich, useDecimal } from '../../i18n'

/**
 * Biểu đồ lãi kép: hai lớp chồng lên nhau, dưới là tiền bạn đầu tư, trên là phần
 * lãi sinh ra. Tổng hai lớp là giá trị danh mục.
 *
 * Chồng lớp thay vì vẽ hai đường riêng vì thứ đáng nhìn ở đây là lúc nào phần lãi
 * bắt đầu vượt phần vốn. Nhìn hai đường cắt nhau thì phải tự trừ trong đầu, còn
 * nhìn hai mảng thì thấy ngay mảng nào dày hơn.
 */
const MAU_VON = '#8b8a83'
const MAU_LAI = '#c96442'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: CompoundInterestPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  const t = useT()
  const dec = useDecimal()
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  const tyLeLai = point.finalValue > 0 ? (point.interestEarned / point.finalValue) * 100 : 0
  return (
    <div className="custom-tooltip">
      <p className="ct-date">{t('calc.tooltip.yearN', { n: point.year })}</p>
      <p style={{ color: MAU_VON }}>{t('calc.compound.tooltipContrib', { v: formatVNDFull(point.contributions) })}</p>
      <p style={{ color: MAU_LAI }}>{t('calc.compound.tooltipInterest', { v: formatVNDFull(point.interestEarned) })}</p>
      <p style={{ fontWeight: 600 }}>{t('calc.compound.tooltipTotal', { v: formatVNDFull(point.finalValue) })}</p>
      <p style={{ color: 'var(--color-text-muted)' }}>
        {t('calc.compound.tooltipShare', { pct: dec(tyLeLai, 1) })}
      </p>
    </div>
  )
}

interface Props {
  series: CompoundInterestPoint[]
}

function CompoundInterestChartImpl({ series }: Props) {
  const t = useT()
  const tr = useTRich()
  if (series.length < 2) return null

  // Năm đầu tiên phần lãi vượt phần vốn. Không phải lúc nào cũng có, góp thêm
  // hàng tháng nhiều thì vốn luôn dày hơn lãi.
  const namLaiVuotVon = series.find(p => p.interestEarned > p.contributions)?.year

  return (
    <div className="calc-chart">
      <div className="chart-header">
        <h3>{t('calc.compound.chartTitle')}</h3>
        <span className="chart-tooltip-icon" title={t('calc.compound.chartHelp')}>?</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={series} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickFormatter={y => (y === 0 ? t('calc.axis.start') : t('calc.axis.year', { n: y }))}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatVNDAxis} width={62} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="contributions"
            stackId="tong"
            stroke={MAU_VON}
            fill={MAU_VON}
            fillOpacity={0.35}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="interestEarned"
            stackId="tong"
            stroke={MAU_LAI}
            fill={MAU_LAI}
            fillOpacity={0.45}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="calc-legend">
        <span className="calc-legend-item">
          <span className="calc-legend-swatch" style={{ background: MAU_VON, opacity: 0.55 }} />
          {t('calc.compound.legendContrib')}
        </span>
        <span className="calc-legend-item">
          <span className="calc-legend-swatch" style={{ background: MAU_LAI, opacity: 0.65 }} />
          {t('calc.compound.legendInterest')}
        </span>
      </div>

      {namLaiVuotVon !== undefined && (
        <p className="calc-note">{tr('calc.compound.crossover', { year: namLaiVuotVon })}</p>
      )}
    </div>
  )
}

export const CompoundInterestChart = memo(CompoundInterestChartImpl)
