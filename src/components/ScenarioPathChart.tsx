import { memo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { PathPoint, LSvsDCAScenario } from '../utils/lsVsDca'

import { formatVND, formatVNDFull } from '../utils/vndFormat'
import { useT, useTRich, type TranslationKey } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  path: PathPoint[]
  /** Toàn bộ kịch bản, sắp theo ngày, dùng cho thanh trượt. */
  scenarios: LSvsDCAScenario[]
  worstStart: string
  medianStart: string
  bestStart: string
  selectedStart: string
  onSelectStart: (startDate: string) => void
  totalCapital: number
  dcaMonths: number
}

function fmtMonth(date: string): string {
  return `${date.slice(5, 7)}/${date.slice(0, 4)}`
}

/**
 * Một tháng khởi đầu cụ thể chạy ra sao.
 *
 * Heatmap và bảng chi phí đều là con số gộp của hàng nghìn lần thử. Người đọc
 * gật đầu với con số gộp nhưng vẫn không hình dung được chuyện gì xảy ra với
 * tiền của mình. Khối này phóng to đúng một lần thử: hai đường tiền đi song
 * song từ cùng một điểm xuất phát, tách ra ở đâu, gặp lại nhau lúc nào.
 *
 * Ba nút chọn sẵn lấy thẳng từ danh sách kịch bản của histogram, nên đây chính
 * là một cột trong histogram được mở ra xem bên trong.
 */
function ScenarioPathChartImpl({
  path, scenarios, worstStart, medianStart, bestStart,
  selectedStart, onSelectStart, totalCapital, dcaMonths,
}: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  if (path.length === 0) return null

  const last = path[path.length - 1]!
  const diffMoney = last.dcaValue - last.lsValue
  const dcaWon = diffMoney > 0

  // Khoảng cách lớn nhất giữa hai đường trong kỳ, để nói về đoạn giữa chứ
  // không chỉ nói về đích. Đây là chỗ người DCA thấy sốt ruột nhất.
  const widestGap = path.reduce((acc, p) => {
    const gap = p.lsValue - p.dcaValue
    return Math.abs(gap) > Math.abs(acc.gap) ? { gap, date: p.date } : acc
  }, { gap: 0, date: path[0]!.date })

  const selectedIdx = scenarios.findIndex(s => s.startDate === selectedStart)

  const presets: [TranslationKey, string, TranslationKey][] = [
    ['scn.presetWorst', worstStart, 'scn.presetWorstHint'],
    ['scn.presetMedian', medianStart, 'scn.presetMedianHint'],
    ['scn.presetBest', bestStart, 'scn.presetBestHint'],
  ]

  return (
    <div className="perf-table-container">
      <div className="chart-header">
        <h3>{t('scn.title')}</h3>
        <span className="chart-tooltip-icon" title={t('scn.help')}>?</span>
      </div>

      <p className="holdcost-intro">
        {tr('scn.intro', {
          capital: formatVND(totalCapital),
          start: fmtMonth(selectedStart),
          months: dcaMonths,
          end: fmtMonth(last.date),
        })}
      </p>

      <div className="scnpath-presets">
        {presets.map(([labelKey, date, hintKey]) => (
          <button
            key={labelKey}
            className={`lsdca-horizon-btn ${selectedStart === date ? 'lsdca-horizon-btn-active' : ''}`}
            onClick={() => onSelectStart(date)}
            title={t(hintKey)}
          >
            {t(labelKey)}
            <span className="scnpath-preset-date">{fmtMonth(date)}</span>
          </button>
        ))}
      </div>

      <div className="scnpath-slider-row">
        <span className="scnpath-slider-label">{t('scn.sliderLabel')}</span>
        <input
          type="range"
          className="scnpath-slider"
          min={0}
          max={scenarios.length - 1}
          value={selectedIdx < 0 ? 0 : selectedIdx}
          onChange={e => onSelectStart(scenarios[Number(e.target.value)]!.startDate)}
        />
        <span className="scnpath-slider-value">{fmtMonth(selectedStart)}</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={path} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={fmtMonth}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v: number) => formatVND(v)}
            domain={['auto', 'auto']}
            width={64}
          />
          <Tooltip
            formatter={(value: number, name: string) => [formatVNDFull(value), name]}
            labelFormatter={(d: string) => t('scn.tooltipDate', {
              date: language === 'vi' ? d.split('-').reverse().join('/') : d,
            })}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            iconType="line"
          />
          <ReferenceLine
            y={totalCapital}
            stroke="#9CA3AF"
            strokeDasharray="4 4"
            label={{ value: t('scn.initialCapital'), position: 'insideTopLeft', fontSize: 10, fill: '#6B7280' }}
          />
          <Line
            type="monotone"
            dataKey="lsValue"
            name={t('scn.lumpSum')}
            stroke="#059669"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="dcaValue"
            name={t('scn.dcaLine')}
            stroke="#DC2626"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="scnpath-endstats">
        <div className="scnpath-endstat">
          <span className="scnpath-endstat-label">{t('scn.lsEnding')}</span>
          <span className="scnpath-endstat-value lsdca-ls-color">{formatVND(last.lsValue)}</span>
        </div>
        <div className="scnpath-endstat">
          <span className="scnpath-endstat-label">{t('scn.dcaEnding')}</span>
          <span className="scnpath-endstat-value lsdca-dca-color">{formatVND(last.dcaValue)}</span>
        </div>
        <div className="scnpath-endstat">
          <span className="scnpath-endstat-label">{t('scn.gap')}</span>
          <span className={`scnpath-endstat-value ${dcaWon ? 'cycle-pos' : 'cycle-neg'}`}>
            {dcaWon ? '+' : '−'}{formatVND(Math.abs(diffMoney))}
          </span>
        </div>
      </div>

      <div className="holdcost-note">
        <p>{tr('scn.sameStart')}</p>
        <p>
          {tr('scn.walkthrough', {
            start: fmtMonth(selectedStart),
            months: dcaMonths,
            ls: formatVND(last.lsValue),
            dca: formatVND(last.dcaValue),
          })}
          {dcaWon
            ? tr('scn.dcaWon', { diff: formatVND(Math.abs(diffMoney)) })
            : tr('scn.lsWon', { diff: formatVND(Math.abs(diffMoney)) })}
        </p>
        {Math.abs(widestGap.gap) > Math.abs(diffMoney) * 1.2 && (
          <p>
            {tr('scn.widestGap', {
              month: fmtMonth(widestGap.date),
              gap: formatVND(Math.abs(widestGap.gap)),
            })}
          </p>
        )}
      </div>
    </div>
  )
}

export const ScenarioPathChart = memo(ScenarioPathChartImpl)
