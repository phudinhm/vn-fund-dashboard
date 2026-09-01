/**
 * CompareStoryBlock: kể câu chuyện từ bảng số.
 *
 * Người dùng nhìn KPI cards và chart xong thường không biết rút ra điều gì.
 * Block này sắp xếp 5 câu hỏi mà retail VN thực sự quan tâm, rồi trả lời từng
 * câu bằng con số cụ thể và một takeaway ngắn:
 *
 *   1. Ai đang dẫn đầu? (cumulative return + magnitude per 100tr)
 *   2. Được bao nhiêu cho mỗi đơn vị rủi ro? (CAGR / volatility)
 *   3. Đáng tin tới đâu? (% rolling 12m dương)
 *   4. Khi bão đến, mất bao lâu để hồi? (maxDD + recovery weeks)
 *   5. Tóm lại, quỹ nào hợp với bạn? (classify + recommend)
 *
 * Không phải demo kỹ thuật, là 5 lăng kính ra quyết định.
 */
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { FundComparisonData } from '../hooks/useCalculations'
import { formatVND } from '../utils/vndFormat'
import {
  annualizedStdev,
  drawdownStats,
  positiveRollingRate,
  rollingReturns,
} from '../utils/calculations'
import { useT, useTRich, translateStatic, type TranslationKey } from '../i18n'
import { useLanguage, type Language } from '../hooks/useLanguage'

interface Props {
  funds: FundComparisonData[]
  colors: string[]
  startDate: string
  endDate: string
}

interface FundStats {
  id: string
  color: string
  cagr: number
  totalReturn: number   // cumulative growth - 1 tại end
  vol: number           // annualized stdev
  efficiency: number    // cagr / vol
  maxDD: number         // âm
  recoveryWeeks: number | null
  underwaterWeeks: number | null
  posRate: number       // % rolling 12m dương
}

export function CompareStoryBlock({ funds, colors, startDate, endDate }: Props) {
  const t = useT()
  const stats = useMemo<FundStats[]>(() => {
    return funds.map((f, i) => {
      const cagr = f.kpi.cagr ?? 0
      const vol = annualizedStdev(f.returns)
      const last = f.cumulative[f.cumulative.length - 1]
      const totalReturn = last ? last.value : 0
      const dd = drawdownStats(f.returns)
      const roll12 = rollingReturns(f.returns, 12)
      const posRate = positiveRollingRate(roll12) ?? 0
      return {
        id: f.id,
        color: colors[i % colors.length] ?? 'var(--color-primary)',
        cagr,
        totalReturn,
        vol,
        efficiency: vol > 0 ? cagr / vol : 0,
        maxDD: dd.maxDrawdown,
        recoveryWeeks: dd.recoveryWeeks,
        underwaterWeeks: dd.underwaterWeeks,
        posRate,
      }
    })
  }, [funds, colors])

  if (stats.length < 2) return null

  const years = yearsBetween(startDate, endDate)

  return (
    <>
    <div className="section-divider">
      <span className="section-divider-label">{t('story.divider')}</span>
    </div>
    <div className="cmp-story">
      <header className="cmp-story-header">
        <h2 className="cmp-story-title">{t('story.title')}</h2>
        <p className="cmp-story-sub">
          {t('story.intro', {
            from: formatDate(startDate),
            to: formatDate(endDate),
            years: years.toFixed(1),
          })}
        </p>
      </header>

      <WinnerSection stats={stats} />
      <EfficiencySection stats={stats} />
      <ConsistencySection stats={stats} />
      <DrawdownSection stats={stats} />
      <CharacterSection stats={stats} />
    </div>
    </>
  )
}

// ─── 1. Ai đang dẫn đầu? ───────────────────────────────────

function WinnerSection({ stats }: { stats: FundStats[] }) {
  const t = useT()
  const tr = useTRich()
  const sorted = [...stats].sort((a, b) => b.totalReturn - a.totalReturn)
  const winner = sorted[0]!
  const loser = sorted[sorted.length - 1]!
  const gap = winner.totalReturn - loser.totalReturn

  // Magnitude per 100 triệu vốn
  const BASE = 100_000_000
  const winnerFinalAtBase = BASE * (1 + winner.totalReturn)
  const loserFinalAtBase = BASE * (1 + loser.totalReturn)
  const gapVND = winnerFinalAtBase - loserFinalAtBase

  const barData = sorted.map(s => ({
    id: s.id,
    color: s.color,
    value: s.totalReturn * 100,
    final: BASE * (1 + s.totalReturn),
  }))

  return (
    <section className="cmp-sec">
      <h3 className="cmp-sec-title">{t('story.q1')}</h3>
      <p className="cmp-sec-lead">{t('story.q1.intro')}</p>

      <div className="cmp-chart">
        <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 44)}>
          <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 80, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={v => `${v.toFixed(0)}%`}
            />
            <YAxis type="category" dataKey="id" tick={{ fontSize: 12 }} width={axisWidthFor(sorted.map(s => s.id))} />
            <Tooltip
              formatter={(v: number, _n, item) => {
                const p = item?.payload as { final?: number } | undefined
                const finalStr = p?.final !== undefined
                  ? t('story.q1.becomes', { v: formatVND(p.final) })
                  : ''
                return [`${v.toFixed(1)}%${finalStr}`, t('story.q1.tooltipLabel')]
              }}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="cmp-takeaway">
        {tr('story.q1.leader', {
          id: winner.id,
          final: formatVND(winnerFinalAtBase),
          pct: `${(winner.totalReturn * 100).toFixed(1)}%`,
        })}
        {sorted.length > 1 && tr('story.q1.laggard', {
          id: loser.id,
          final: formatVND(loserFinalAtBase),
          gap: formatVND(gapVND),
          pts: (gap * 100).toFixed(1),
        })}
        {t('story.q1.caveat')}
      </p>
    </section>
  )
}

// ─── 2. Được bao nhiêu cho mỗi đơn vị rủi ro? ───────────────

function EfficiencySection({ stats }: { stats: FundStats[] }) {
  const t = useT()
  const tr = useTRich()
  const sorted = [...stats].sort((a, b) => b.efficiency - a.efficiency)
  const best = sorted[0]!
  const worst = sorted[sorted.length - 1]!

  return (
    <section className="cmp-sec">
      <h3 className="cmp-sec-title">{t('story.q2')}</h3>
      <p className="cmp-sec-lead">{t('story.q2.intro')}</p>

      <div className="cmp-table">
        <div className="cmp-table-row cmp-table-head">
          <span>{t('story.col.fund')}</span>
          <span>CAGR</span>
          <span>{t('story.col.volatility')}</span>
          <span>{t('story.col.ratio')}</span>
        </div>
        {sorted.map(s => (
          <div key={s.id} className="cmp-table-row">
            <span className="cmp-fund-cell">
              <span className="cmp-swatch" style={{ background: s.color }} />
              <strong>{s.id}</strong>
            </span>
            <span>{(s.cagr * 100).toFixed(1)}%</span>
            <span>{(s.vol * 100).toFixed(1)}%</span>
            <span className="cmp-num-strong">{s.efficiency.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="cmp-takeaway">
        {tr('story.q2.best', { id: best.id, ratio: best.efficiency.toFixed(2) })}
        {sorted.length > 1 && tr('story.q2.worst', { id: worst.id, ratio: worst.efficiency.toFixed(2) })}
        {t('story.q2.caveat')}
      </p>
    </section>
  )
}

// ─── 3. Đáng tin tới đâu? ─────────────────────────────────

function ConsistencySection({ stats }: { stats: FundStats[] }) {
  const t = useT()
  const tr = useTRich()
  const sorted = [...stats].sort((a, b) => b.posRate - a.posRate)
  const best = sorted[0]!
  const worst = sorted[sorted.length - 1]!

  const barData = sorted.map(s => ({
    id: s.id,
    color: s.color,
    value: s.posRate * 100,
  }))

  return (
    <section className="cmp-sec">
      <h3 className="cmp-sec-title">{t('story.q3')}</h3>
      <p className="cmp-sec-lead">{t('story.q3.intro')}</p>

      <div className="cmp-chart">
        <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 44)}>
          <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 60, left: 16, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              tickFormatter={v => `${v.toFixed(0)}%`}
            />
            <YAxis type="category" dataKey="id" tick={{ fontSize: 12 }} width={axisWidthFor(sorted.map(s => s.id))} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, t('story.q3.tooltipLabel')]} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive={false}>
              {barData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="cmp-takeaway">
        {tr('story.q3.best', {
          id: best.id,
          pct: (best.posRate * 100).toFixed(0),
          n: Math.round(best.posRate * 10),
        })}
        {sorted.length > 1 && tr('story.q3.worst', {
          id: worst.id,
          pct: (worst.posRate * 100).toFixed(0),
        })}
        {t('story.q3.caveat')}
      </p>
    </section>
  )
}

// ─── 4. Khi bão đến, mất bao lâu để hồi? ───────────────────

function DrawdownSection({ stats }: { stats: FundStats[] }) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const sorted = [...stats].sort((a, b) => a.maxDD - b.maxDD) // sâu nhất ở đầu
  const worst = sorted[0]!
  const best = sorted[sorted.length - 1]!

  return (
    <section className="cmp-sec">
      <h3 className="cmp-sec-title">{t('story.q4')}</h3>
      <p className="cmp-sec-lead">{t('story.q4.intro')}</p>

      <div className="cmp-table">
        <div className="cmp-table-row cmp-table-head cmp-table-head--dd">
          <span>{t('story.col.fund')}</span>
          <span>{t('story.col.deepest')}</span>
          <span>{t('story.col.recovery')}</span>
        </div>
        {sorted.map(s => (
          <div key={s.id} className="cmp-table-row cmp-table-row--dd">
            <span className="cmp-fund-cell">
              <span className="cmp-swatch" style={{ background: s.color }} />
              <strong>{s.id}</strong>
            </span>
            <span className="cmp-num-neg">{(s.maxDD * 100).toFixed(1)}%</span>
            <span>
              {s.recoveryWeeks !== null
                ? formatRecovery(s.recoveryWeeks, language)
                : s.underwaterWeeks !== null
                  ? <span className="cmp-underwater">{t('story.notRecovered', { time: formatRecovery(s.underwaterWeeks, language) })}</span>
                  : '—'}
            </span>
          </div>
        ))}
      </div>

      <p className="cmp-takeaway">
        {tr('story.q4.worst', { id: worst.id, dd: `${(worst.maxDD * 100).toFixed(1)}%` })}
        {worst.recoveryWeeks !== null
          ? tr('story.q4.recovered', { time: formatRecovery(worst.recoveryWeeks, language) })
          : tr('story.q4.stillUnder')}
        {tr('story.q4.best', {
          id: best.id,
          dd: `${(best.maxDD * 100).toFixed(1)}%`,
          recovery: best.recoveryWeeks !== null
            ? t('story.q4.bestRecovery', { time: formatRecovery(best.recoveryWeeks, language) })
            : '',
        })}
        {t('story.q4.caveat')}
      </p>
    </section>
  )
}

// ─── 5. Quỹ nào hợp với bạn? ──────────────────────────────

type Character = 'aggressive' | 'stable' | 'balanced' | 'weak'

interface Classified extends FundStats {
  character: Character
  label: string
  tagline: string
}

function classify(s: FundStats, allStats: FundStats[], lang: Language): Classified {
  const avgCagr = allStats.reduce((a, x) => a + x.cagr, 0) / allStats.length
  const avgVol = allStats.reduce((a, x) => a + x.vol, 0) / allStats.length

  const highReturn = s.cagr > avgCagr
  const highVol = s.vol > avgVol

  let character: Character
  let labelKey: TranslationKey
  let taglineKey: TranslationKey

  if (highReturn && !highVol) {
    character = 'balanced'
    labelKey = 'story.card.efficient'
    taglineKey = 'story.card.efficientTag'
  } else if (highReturn && highVol) {
    character = 'aggressive'
    labelKey = 'story.card.aggressive'
    taglineKey = 'story.card.aggressiveTag'
  } else if (!highReturn && !highVol) {
    character = 'stable'
    labelKey = 'story.card.steady'
    taglineKey = 'story.card.steadyTag'
  } else {
    character = 'weak'
    labelKey = 'story.card.review'
    taglineKey = 'story.card.reviewTag'
  }

  const label = translateStatic(labelKey, lang)
  const tagline = translateStatic(taglineKey, lang)

  return { ...s, character, label, tagline }
}

function CharacterSection({ stats }: { stats: FundStats[] }) {
  const t = useT()
  const { language } = useLanguage()
  const classified = stats.map(s => classify(s, stats, language))

  return (
    <section className="cmp-sec cmp-sec--verdict">
      <h3 className="cmp-sec-title">{t('story.q5')}</h3>
      <p className="cmp-sec-lead">{t('story.q5.intro')}</p>

      <div className="cmp-verdict-grid">
        {classified.map(c => (
          <div key={c.id} className={`cmp-verdict-card cmp-verdict--${c.character}`}>
            <div className="cmp-verdict-head">
              <span className="cmp-swatch" style={{ background: c.color }} />
              <strong>{c.id}</strong>
              <span className={`cmp-verdict-badge cmp-verdict-badge--${c.character}`}>
                {c.label}
              </span>
            </div>
            <div className="cmp-verdict-kpis">
              <span>CAGR <strong>{(c.cagr * 100).toFixed(1)}%</strong></span>
              <span>σ <strong>{(c.vol * 100).toFixed(1)}%</strong></span>
              <span>{t('story.card.drawdown')} <strong className="cmp-num-neg">{(c.maxDD * 100).toFixed(0)}%</strong></span>
            </div>
            <p className="cmp-verdict-tagline">{c.tagline}</p>
          </div>
        ))}
      </div>

      <p className="cmp-takeaway">
        {t('story.q5.closing')}
      </p>
    </section>
  )
}

// ─── Utils ────────────────────────────────────────────────

/** Chiều rộng trục Y (px) đủ chứa tên dài nhất. 12px font ≈ 6.5px/ký tự. */
function axisWidthFor(ids: string[]): number {
  const longest = ids.reduce((max, id) => Math.max(max, id.length), 0)
  return Math.max(80, Math.ceil(longest * 6.8) + 14)
}

function yearsBetween(start: string, end: string): number {
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  return (b - a) / (365.25 * 24 * 60 * 60 * 1000)
}

function formatDate(d: string): string {
  const parts = d.split('-')
  if (parts.length !== 3) return d
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatRecovery(weeks: number, lang: Language): string {
  if (weeks < 4) return translateStatic('story.weeks', lang, { n: weeks })
  const months = weeks / 4.345
  if (months < 12) return translateStatic('story.months', lang, { n: months.toFixed(months < 3 ? 1 : 0) })
  const years = months / 12
  return translateStatic('story.years', lang, { n: years.toFixed(1) })
}
