import { memo } from 'react'
import type { PortfolioStats } from './PerformanceTable'
import { formatVND } from '../utils/vndFormat'
import { useT, useTRich } from '../i18n'

interface Props {
  investAmount: number
  stats: PortfolioStats[]      // stats[0] = baseline (no BTC)
}

/**
 * Sleep Test: dịch 3 chỉ số rủi ro (worst week, worst month, max drawdown)
 * ra số tiền VND cụ thể. Mục tiêu là trả lời câu hỏi retail investor hay
 * hỏi nhất: "nếu tệ nhất thì tôi mất bao nhiêu?"
 *
 * Narrative chính: thêm BTC kéo lợi nhuận lên nhưng cũng làm đáy sâu hơn.
 * Người dùng cần thấy cả 2 mặt để quyết định tỷ trọng BTC nào họ thật sự
 * chịu nổi về mặt tâm lý (pain threshold), không chỉ về mặt toán học.
 */
function SleepTestBlockImpl({ investAmount, stats }: Props) {
  const t = useT()
  const tr = useTRich()
  if (stats.length < 2) return null

  const base = stats[0]!
  const worstBtc = stats.slice(1).reduce(
    (worst, s) => (s.maxDD < worst.maxDD ? s : worst),
    stats[1]!,
  )

  // Delta drawdown tệ nhất giữa portfolio BTC cao nhất và baseline, dùng cho takeaway
  const extraPainVND = investAmount * Math.abs(worstBtc.maxDD - base.maxDD)
  const btcFloor = investAmount * (1 + worstBtc.maxDD)

  return (
    <div className="sleep-test-container">
      <div className="chart-header">
        <h3>{t('sleep.title')}</h3>
        <span className="chart-tooltip-icon" title={t('sleep.help')}>?</span>
      </div>
      <div className="sleep-test-intro">
        {tr('sleep.intro', { amount: formatVND(investAmount) })}
      </div>

      <div className="perf-table-wrap">
        <table className="perf-table sleep-test-table">
          <thead>
            <tr>
              <th className="perf-th-name">{t('sleep.colPortfolio')}</th>
              <th title={t('sleep.colWorstWeekHelp')}>{t('sleep.colWorstWeek')}</th>
              <th title={t('sleep.colWorstMonthHelp')}>{t('sleep.colWorstMonth')}</th>
              <th title={t('sleep.colMaxDDHelp')}>{t('sleep.colMaxDD')}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map(s => (
              <tr key={s.name}>
                <td className="perf-td-name">
                  <span className="perf-dot" style={{ background: s.color }} />
                  {s.name}
                </td>
                <td className="perf-neg sleep-cell">
                  <div className="sleep-pct">{fmtPct(s.worstWeek)}</div>
                  <div className="sleep-vnd">{t('sleep.left', { amount: formatVND(investAmount * (1 + s.worstWeek)) })}</div>
                </td>
                <td className="perf-neg sleep-cell">
                  <div className="sleep-pct">{fmtPct(s.worstMonth)}</div>
                  <div className="sleep-vnd">{t('sleep.left', { amount: formatVND(investAmount * (1 + s.worstMonth)) })}</div>
                </td>
                <td className="perf-neg sleep-cell">
                  <div className="sleep-pct">{fmtPct(s.maxDD)}</div>
                  <div className="sleep-vnd">{t('sleep.left', { amount: formatVND(investAmount * (1 + s.maxDD)) })}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {extraPainVND > 0 && (
        <div className="sleep-test-takeaway">
          <span className="mm-takeaway-emoji">😰</span>
          <span>
            {tr('sleep.takeaway', {
              name: worstBtc.name,
              amount: formatVND(investAmount),
              floor: formatVND(btcFloor),
            })}
          </span>
        </div>
      )}
    </div>
  )
}

export const SleepTestBlock = memo(SleepTestBlockImpl)

function fmtPct(value: number): string {
  return (value * 100).toFixed(1) + '%'
}
