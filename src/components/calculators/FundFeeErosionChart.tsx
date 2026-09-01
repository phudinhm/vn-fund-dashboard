import { memo } from 'react'
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type { FundFeeErosionPoint } from '../../utils/calculators'
import { formatVNDAxis, formatVNDFull } from '../../utils/vndFormat'
import { useT, useDecimal } from '../../i18n'

/**
 * Biểu đồ phí ăn mòn: hai đường và khoảng đỏ giữa chúng.
 *
 * Đường trên là tài sản nếu không mất phí, đường dưới là thực nhận. Khoảng đỏ ở
 * giữa chính là phần phí lấy đi. Vẽ kiểu này để thấy khoảng đó nới rộng dần chứ
 * không đều đặn, đó mới là điều người ta hay đánh giá thấp ở phí.
 *
 * Dải đỏ dựng bằng hai lớp chồng: lớp dưới trong suốt kéo tới đường thực nhận,
 * lớp trên tô đỏ dày đúng bằng phần phí. Cùng cách làm với BtcContributionChart.
 */
const MAU_KHONG_PHI = '#5e5d59'
const MAU_THUC_NHAN = '#0ECB81'
const MAU_PHI_FILL = 'rgba(181, 51, 51, 0.22)'

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: FundFeeErosionPoint }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  const t = useT()
  const dec = useDecimal()
  const point = payload?.[0]?.payload
  if (!active || !point) return null
  return (
    <div className="custom-tooltip">
      <p className="ct-date">{t('calc.tooltip.yearN', { n: point.year })}</p>
      <p style={{ color: MAU_KHONG_PHI }}>{t('calc.fee.tooltipNoFee', { v: formatVNDFull(point.finalValueNoFee) })}</p>
      <p style={{ color: MAU_THUC_NHAN }}>{t('calc.fee.tooltipWithFee', { v: formatVNDFull(point.finalValueWithFee) })}</p>
      <p style={{ color: '#b53333', fontWeight: 600 }}>
        {t('calc.fee.tooltipLost', { v: formatVNDFull(point.feeLost), pct: dec(point.erosionPct * 100) })}
      </p>
    </div>
  )
}

interface Props {
  series: FundFeeErosionPoint[]
}

function FundFeeErosionChartImpl({ series }: Props) {
  const t = useT()
  const dec = useDecimal()
  if (series.length < 2) return null

  const cuoiKy = series[series.length - 1]!
  const giuaKy = series[Math.floor(series.length / 2)]!

  return (
    <div className="calc-chart">
      <div className="chart-header">
        <h3>{t('calc.fee.chartTitle')}</h3>
        <span className="chart-tooltip-icon" title={t('calc.fee.chartHelp')}>?</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={series} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11 }}
            tickFormatter={y => (y === 0 ? t('calc.axis.start') : t('calc.axis.year', { n: y }))}
          />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={formatVNDAxis} width={62} />
          <Tooltip content={<CustomTooltip />} />

          {/* Lớp nền trong suốt, đẩy dải đỏ lên đúng vị trí đường thực nhận */}
          <Area
            type="monotone"
            dataKey="finalValueWithFee"
            stackId="phi"
            fill="transparent"
            stroke="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="feeLost"
            stackId="phi"
            fill={MAU_PHI_FILL}
            stroke="none"
            isAnimationActive={false}
          />

          <Line
            type="monotone"
            dataKey="finalValueNoFee"
            stroke={MAU_KHONG_PHI}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="finalValueWithFee"
            stroke={MAU_THUC_NHAN}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="calc-legend">
        <span className="calc-legend-item">
          <span className="calc-legend-line calc-legend-line--dashed" style={{ background: MAU_KHONG_PHI }} />
          {t('calc.fee.legendNoFee')}
        </span>
        <span className="calc-legend-item">
          <span className="calc-legend-line" style={{ background: MAU_THUC_NHAN }} />
          {t('calc.fee.legendWithFee')}
        </span>
        <span className="calc-legend-item">
          <span className="calc-legend-swatch" style={{ background: MAU_PHI_FILL, border: '1px solid #b53333' }} />
          {t('calc.fee.legendLost')}
        </span>
      </div>

      <p className="calc-note">
        {t('calc.fee.chartNote', {
          midYear: giuaKy.year,
          midLost: formatVNDFull(giuaKy.feeLost),
          restLost: formatVNDFull(cuoiKy.feeLost - giuaKy.feeLost),
          multiple: giuaKy.feeLost > 0
            ? dec((cuoiKy.feeLost - giuaKy.feeLost) / giuaKy.feeLost, 1)
            : '0',
        })}
      </p>
    </div>
  )
}

export const FundFeeErosionChart = memo(FundFeeErosionChartImpl)
