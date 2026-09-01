import { memo, useMemo } from 'react'
import type { ReturnPoint } from '../types'
import { rollingCumulativeReturnsMap, winRateAgainstRolledB } from '../utils/calculations'
import { useT, useTRich, type TranslationKey } from '../i18n'

interface Props {
  portfolioReturns: ReturnPoint[][]    // [baseline, btc1, btc2, btc3]
  btcPercents: [number, number, number]
  stats: { name: string; color: string }[]    // portfolioStats cho color mapping
}

const HORIZONS: { months: number; labelKey: TranslationKey }[] = [
  { months: 12, labelKey: 'wr.h12' },
  { months: 24, labelKey: 'wr.h24' },
  { months: 36, labelKey: 'wr.h36' },
  { months: 60, labelKey: 'wr.h60' },
]

/**
 * Probability framing: trong tất cả khoảng rolling N năm, danh mục BTC
 * thắng baseline bao nhiêu lần? Giúp trả lời câu hỏi retail hay lo:
 * "BTC có vẻ hên xui, biết đâu tôi mua xong nó rớt thì sao?"
 *
 * Mỗi ô là một cặp (horizon, btc_weight). Ví dụ: ở ô "3% BTC × 3 năm",
 * hiển thị "87/100 lần thắng" = trong 100 khoảng 3-năm liên tiếp có
 * trong dữ liệu lịch sử, danh mục có 3% BTC thắng danh mục không BTC
 * 87 khoảng.
 */
function WinRateBlockImpl({ portfolioReturns, btcPercents, stats }: Props) {
  const t = useT()
  const baseReturns = portfolioReturns[0]
  if (!baseReturns) return null

  // Compute all (horizon × btc%) cells. baseReturns is shared across all 3
  // weight scenarios, nên chỉ tính rolling map của nó 1 lần/kỳ hạn (4 lần),
  // thay vì tính lại mỗi lần lặp qua btcPercents (12 lần) — cùng 1 dữ liệu,
  // cùng 1 kỳ hạn thì kết quả rolling y hệt nhau.
  const grid = useMemo(() => {
    if (!baseReturns) return []
    const baseRolledByHorizon = new Map(
      HORIZONS.map(h => [h.months, rollingCumulativeReturnsMap(baseReturns, h.months)]),
    )
    return btcPercents.map((_, i) => {
      const btcReturns = portfolioReturns[i + 1]
      if (!btcReturns) return null
      return HORIZONS.map(h => {
        const rolledBMap = baseRolledByHorizon.get(h.months)!
        const { wins, total } = winRateAgainstRolledB(btcReturns, h.months, rolledBMap)
        return { months: h.months, labelKey: h.labelKey, wins, total }
      })
    })
  }, [portfolioReturns, btcPercents, baseReturns])

  if (grid.length === 0 || !grid.some(row => row && row.some(c => c.total > 0))) return null

  // Best cell để làm takeaway: cao nhất win rate tuyệt đối
  let best: Best | null = null
  grid.forEach((row, i) => {
    if (!row) return
    row.forEach(c => {
      if (c.total === 0) return
      const rate = c.wins / c.total
      if (!best || rate > best.rate) {
        best = { btcPct: btcPercents[i]!, labelKey: c.labelKey, wins: c.wins, total: c.total, rate }
      }
    })
  })

  return (
    <div className="winrate-container">
      <div className="chart-header">
        <h3>{t('wr.title')}</h3>
        <span className="chart-tooltip-icon" title={t('wr.help')}>?</span>
      </div>
      <div className="winrate-intro">{t('wr.intro')}</div>

      <div className="winrate-table-wrap">
        <table className="winrate-table">
          <thead>
            <tr>
              <th className="winrate-th-name">{t('wr.colWeight')}</th>
              {HORIZONS.map(h => (
                <th key={h.months}>{t(h.labelKey)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => {
              if (!row) return null
              const stat = stats[i + 1]
              return (
                <tr key={i}>
                  <td className="winrate-td-name">
                    {stat && <span className="perf-dot" style={{ background: stat.color }} />}
                    {t('wr.rowLabel', { pct: btcPercents[i] ?? 0 })}
                  </td>
                  {row.map(c => {
                    if (c.total === 0) {
                      return <td key={c.months} className="winrate-cell winrate-cell--na">—</td>
                    }
                    const rate = c.wins / c.total
                    const pctStr = (rate * 100).toFixed(0) + '%'
                    const cls = rate >= 0.7 ? 'winrate-cell--strong'
                              : rate >= 0.5 ? 'winrate-cell--medium'
                              : 'winrate-cell--weak'
                    return (
                      <td key={c.months} className={`winrate-cell ${cls}`}>
                        <div className="winrate-fraction">{c.wins}<span className="winrate-slash">/</span>{c.total}</div>
                        <div className="winrate-bar-wrap">
                          <div className="winrate-bar" style={{ width: `${rate * 100}%` }} />
                        </div>
                        <div className="winrate-pct">{t('wr.winsPct', { pct: pctStr })}</div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {best && <WinRateTakeaway best={best} />}
    </div>
  )
}

export const WinRateBlock = memo(WinRateBlockImpl)

interface Best {
  btcPct: number
  labelKey: TranslationKey
  wins: number
  total: number
  rate: number
}

function WinRateTakeaway({ best }: { best: Best }) {
  const t = useT()
  const tr = useTRich()
  return (
    <div className="winrate-takeaway">
      <span className="mm-takeaway-emoji">🎯</span>
      <span>
        {tr('wr.takeaway', {
          pct: best.btcPct,
          total: best.total,
          horizon: t(best.labelKey),
          wins: best.wins,
          rate: (best.rate * 100).toFixed(0),
        })}
      </span>
    </div>
  )
}
