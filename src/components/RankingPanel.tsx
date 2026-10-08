import { memo, useEffect, useMemo, useState } from 'react'
import type { FundMeta } from '../types'
import { FundFilterBar } from './FundFilterBar'
import { IconStar } from './icons'
import { useFundSeriesMap } from '../hooks/useFundData'
import { useFundFilter } from '../hooks/useFundFilter'
import { useLanguage } from '../hooks/useLanguage'
import { useWatchlist } from '../hooks/useWatchlist'
import { useDecimal, useT, type TranslationKey } from '../i18n'
import { MAX_COMPARE_FUNDS } from '../constants'
import { loadLS, saveLS } from '../utils/localStorage'
import { fundDisplayName } from '../utils/fundName'
import { applyFundFilter, availableTypes } from '../utils/fundFilter'
import {
  ALL_PERIODS, MIXED_PERIODS, RANK_METRICS, buildMixedRows, computePeriodStat, metricValue, rankEntries,
  referenceEnd, type MixedRow, type PeriodId, type PeriodStat, type RankMetric,
} from '../utils/ranking'

interface Props {
  funds: FundMeta[]
  /** Mở tab So Sánh với các quỹ đã chọn. */
  onCompare: (fundIds: string[]) => void
}

type View = 'category' | 'mixed'
type MixedSort = 'score' | PeriodId

const TOP_N = 10
const MIXED_PREVIEW = 30
const MAX_MIXED_COLS = 4
const DEFAULT_MIXED_COLS: PeriodId[] = ['3m', '1y', '3y', '5y']

function pickEnum<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

/**
 * Tab "Xếp hạng": (1) theo từng loại tài sản trong một kỳ chọn, (2) bảng mixed
 * xếp chung mọi loại qua nhiều kỳ với điểm tổng hợp. Số liệu tính ngay trên
 * trình duyệt từ chuỗi giá đã điều chỉnh cổ tức (cùng nguồn tab So Sánh).
 * Xếp hạng chỉ trong tập quỹ đang qua bộ lọc chung ở đầu trang.
 */
function RankingPanelImpl({ funds, onCompare }: Props) {
  const t = useT()
  const dec = useDecimal()
  const { language } = useLanguage()
  const { filter, ctx } = useFundFilter()
  const { isWatched, toggle } = useWatchlist()

  const [view, setView] = useState<View>(() => pickEnum(loadLS<unknown>('rk_view', 'category'), ['category', 'mixed'], 'category'))
  const [period, setPeriod] = useState<PeriodId>(() => pickEnum(loadLS<unknown>('rk_period', '1y'), ALL_PERIODS, '1y'))
  const [metric, setMetric] = useState<RankMetric>(() => pickEnum(loadLS<unknown>('rk_metric', 'return'), RANK_METRICS, 'return'))
  const [mixedSort, setMixedSort] = useState<MixedSort>(() => pickEnum(loadLS<unknown>('rk_sort', 'score'), ['score', ...ALL_PERIODS], 'score'))
  const [cols, setCols] = useState<PeriodId[]>(() => {
    const saved = loadLS<unknown>('rk_cols', DEFAULT_MIXED_COLS)
    const valid = Array.isArray(saved) ? MIXED_PERIODS.filter(p => saved.includes(p)).slice(0, MAX_MIXED_COLS) : []
    return valid.length > 0 ? valid : DEFAULT_MIXED_COLS
  })
  const [showAllMixed, setShowAllMixed] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => { saveLS('rk_view', view) }, [view])
  useEffect(() => { saveLS('rk_period', period) }, [period])
  useEffect(() => { saveLS('rk_metric', metric) }, [metric])
  useEffect(() => { saveLS('rk_sort', mixedSort) }, [mixedSort])
  useEffect(() => { saveLS('rk_cols', cols) }, [cols])
  // Cột đang dùng để xếp bị bỏ thì quay về xếp theo điểm tổng hợp.
  useEffect(() => { if (mixedSort !== 'score' && !cols.includes(mixedSort)) setMixedSort('score') }, [cols, mixedSort])

  const toggleCol = (p: PeriodId) => setCols(cur => {
    if (cur.includes(p)) return cur.length <= 1 ? cur : cur.filter(x => x !== p)
    if (cur.length >= MAX_MIXED_COLS) return cur
    return MIXED_PERIODS.filter(x => x === p || cur.includes(x))
  })

  const ids = useMemo(() => funds.map(f => f.id), [funds])
  const dualPriceFundIds = useMemo(() => new Set(funds.filter(f => f.type === 'gold').map(f => f.id)), [funds])
  const { data, loading, errors } = useFundSeriesMap(ids, { dualPriceFundIds })

  const refEnd = useMemo(() => referenceEnd(data.values()), [data])

  // Tập được xếp hạng: qua bộ lọc chung và có dữ liệu.
  const universe = useMemo(
    () => applyFundFilter(funds, filter, ctx).filter(f => data.has(f.id)),
    [funds, filter, ctx, data],
  )
  const typeOrder = useMemo(() => availableTypes(universe), [universe])
  const byId = useMemo(() => new Map(funds.map(f => [f.id, f])), [funds])

  const name = (id: string) => {
    const m = byId.get(id)
    return m ? fundDisplayName(m, language) : id
  }
  const typeLabel = (type: FundMeta['type']) => t(`category.${type}` as TranslationKey)
  const periodLabel = (p: PeriodId) => t(`rank.period.${p}` as TranslationKey)
  const pct = (v: number) => `${v >= 0 ? '+' : '−'}${dec(Math.abs(v) * 100, 2)}%`
  const cell = (stat: PeriodStat | undefined, m: RankMetric): string => {
    if (!stat) return ''
    const v = metricValue(stat, m)
    if (v === null) return ''
    return m === 'riskAdjusted' || m === 'sortino' || m === 'calmar' ? dec(v, 2) : pct(v)
  }

  // ── Theo loại tài sản ──
  const categories = useMemo(() => {
    if (!refEnd || view !== 'category') return []
    return typeOrder.map(type => {
      const members = universe.filter(f => f.type === type)
      const ranked = rankEntries(
        members.map(f => ({ id: f.id, stat: computePeriodStat(data.get(f.id)!, period, refEnd) })),
        metric,
      )
      return { type, members: members.length, ranked }
    })
  }, [refEnd, view, typeOrder, universe, data, period, metric])

  // ── Mixed ──
  const mixed = useMemo(() => {
    if (!refEnd || view !== 'mixed') return []
    return buildMixedRows(
      universe.map(f => ({ id: f.id, type: f.type, prices: data.get(f.id)! })),
      MIXED_PERIODS, metric, refEnd,
    )
  }, [refEnd, view, universe, data, metric])

  const mixedSorted = useMemo(() => {
    const rows = [...mixed]
    if (mixedSort === 'score') {
      rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.id.localeCompare(b.id))
    } else {
      rows.sort((a, b) => (a.ranks[mixedSort] ?? Infinity) - (b.ranks[mixedSort] ?? Infinity) || a.id.localeCompare(b.id))
    }
    return rows
  }, [mixed, mixedSort])

  const togglePick = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : p.length >= MAX_COMPARE_FUNDS ? p : [...p, id])
  const failed = errors.size
  const excluded = (metricPeriodRows: number) => Math.max(0, universe.length - metricPeriodRows)

  const rowActions = (id: string) => (
    <td>
      <div className="rk-actions">
      <input
        type="checkbox"
        aria-label={t('rank.pick')}
        checked={picked.includes(id)}
        onChange={() => togglePick(id)}
        disabled={!picked.includes(id) && picked.length >= MAX_COMPARE_FUNDS}
      />
      <button
        type="button"
        className={`fund-star-btn${isWatched(id) ? ' fund-star-btn-active' : ''}`}
        onClick={() => toggle(id)}
        title={isWatched(id) ? t('fundSelector.removeFromWatchlist') : t('fundSelector.addToWatchlist')}
      >
        <IconStar filled={isWatched(id)} />
      </button>
      </div>
    </td>
  )

  const rankBadge = (rank: number) => <span className={`rk-rank rk-rank--${rank <= 3 ? rank : 'n'}`}>{rank}</span>

  return (
    <div className="simulation-panel rk-panel">
      <div className="panel-header"><h2>{t('rank.title')}</h2></div>
      <p className="lsdca-subtitle">{t('rank.intro')}</p>

      <FundFilterBar funds={funds} />

      <div className="rk-controls">
        <div className="ffb-seg" role="radiogroup" aria-label={t('rank.view')}>
          {(['category', 'mixed'] as View[]).map(v => (
            <button key={v} type="button" role="radio" aria-checked={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {t(`rank.view.${v}` as TranslationKey)}
            </button>
          ))}
        </div>
        <div className="ffb-seg" role="radiogroup" aria-label={t('rank.metric')}>
          {RANK_METRICS.map(m => (
            <button key={m} type="button" role="radio" aria-checked={metric === m} className={metric === m ? 'on' : ''}
              title={t(`rank.metric.${m}.hint` as TranslationKey)} onClick={() => setMetric(m)}>
              {t(`rank.metric.${m}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {view === 'category' && (
        <div className="rk-periods" role="radiogroup" aria-label={t('rank.period')}>
          {ALL_PERIODS.map(p => (
            <button key={p} type="button" role="radio" aria-checked={period === p}
              className={`ffb-chip${period === p ? ' ffb-chip--on' : ''}`} onClick={() => setPeriod(p)}>
              {periodLabel(p)}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="loading-indicator">{t('rank.loading', { n: ids.length })}</p>}
      {!loading && failed > 0 && <p className="adv-note">{t('rank.failed', { n: failed, ids: [...errors.keys()].join(', ') })}</p>}
      {!loading && universe.length === 0 && <p className="overlap-empty">{t('rank.noFunds')}</p>}

      {picked.length > 0 && (
        <div className="rk-pickbar" role="status">
          <span>{t('rank.picked', { n: picked.length, max: MAX_COMPARE_FUNDS })}</span>
          <button type="button" className="ffb-clear" onClick={() => setPicked([])}>{t('rank.pickClear')}</button>
          <button type="button" className="rk-compare-btn" onClick={() => onCompare(picked)}>{t('rank.compare')}</button>
        </div>
      )}

      {!loading && refEnd && view === 'category' && categories.map(cat => {
        const open = expanded.has(cat.type)
        const rows = open ? cat.ranked : cat.ranked.slice(0, TOP_N)
        return (
          <section key={cat.type} className="perf-table-container rk-section">
            <div className="chart-header">
              <h3>{typeLabel(cat.type)}</h3>
              <span className="rk-meta">{t('rank.ranked', { n: cat.ranked.length, total: cat.members })}</span>
            </div>
            {cat.ranked.length === 0 ? (
              <p className="adv-note">{t('rank.noneInPeriod')}</p>
            ) : (
              <div className="perf-table-wrap">
                <table className="perf-table rk-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('fee.col.fund')}</th>
                      <th className={metric === 'return' ? 'rk-sorted' : ''}>{t('rank.col.return')}</th>
                      <th>{t('rank.col.annual')}</th>
                      <th className={metric === 'drawdown' ? 'rk-sorted' : ''}>{t('rank.col.dd')}</th>
                      <th>{t('rank.col.vol')}</th>
                      <th className={metric === 'riskAdjusted' ? 'rk-sorted' : ''}>{t('rank.col.ra')}</th>
                      <th className={metric === 'sortino' ? 'rk-sorted' : ''} title={t('rank.metric.sortino.hint')}>{t('rank.col.sortino')}</th>
                      <th className={metric === 'calmar' ? 'rk-sorted' : ''} title={t('rank.metric.calmar.hint')}>{t('rank.col.calmar')}</th>
                      <th title={t('rank.col.upDays.hint')}>{t('rank.col.upDays')}</th>
                      <th title={t('rank.col.curDd.hint')}>{t('rank.col.curDd')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.id}>
                        <td>{rankBadge(r.rank)}</td>
                        <td className="rk-name">{name(r.id)}</td>
                        <td className={`${metric === 'return' ? 'rk-sorted' : ''} ${r.stat.ret >= 0 ? 'dca-profit' : 'dca-loss'}`}>{pct(r.stat.ret)}</td>
                        <td title={r.stat.annualized === null ? t('dcaStats.shortPeriod') : undefined}>{r.stat.annualized === null ? '' : pct(r.stat.annualized)}</td>
                        <td className={metric === 'drawdown' ? 'rk-sorted' : ''}>{dec(r.stat.maxDrawdown * 100, 1)}%</td>
                        <td>{r.stat.volatility === null ? '' : `${dec(r.stat.volatility * 100, 1)}%`}</td>
                        <td className={metric === 'riskAdjusted' ? 'rk-sorted' : ''}>{r.stat.riskAdjusted === null ? '' : dec(r.stat.riskAdjusted, 2)}</td>
                        <td className={metric === 'sortino' ? 'rk-sorted' : ''}>{r.stat.sortino === null ? '' : dec(r.stat.sortino, 2)}</td>
                        <td className={metric === 'calmar' ? 'rk-sorted' : ''} title={r.stat.calmar === null ? t('dcaStats.shortPeriod') : undefined}>{r.stat.calmar === null ? '' : dec(r.stat.calmar, 2)}</td>
                        <td>{r.stat.upDays === null ? '' : `${dec(r.stat.upDays * 100, 0)}%`}</td>
                        <td className={r.stat.currentDrawdown < -0.1 ? 'dca-loss' : ''}>{r.stat.currentDrawdown === 0 ? t('rank.atPeak') : `${dec(r.stat.currentDrawdown * 100, 1)}%`}</td>
                        {rowActions(r.id)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {cat.ranked.length > TOP_N && (
              <button type="button" className="lsdca-horizon-btn rk-more" onClick={() => setExpanded(s => {
                const n = new Set(s)
                if (n.has(cat.type)) n.delete(cat.type)
                else n.add(cat.type)
                return n
              })}>
                {open ? t('rank.showTop', { n: TOP_N }) : t('rank.showAll', { n: cat.ranked.length })}
              </button>
            )}
            {excluded(cat.ranked.length) > 0 && cat.members > cat.ranked.length && (
              <p className="adv-note">{t('rank.excluded', { n: cat.members - cat.ranked.length })}</p>
            )}
          </section>
        )
      })}

      {!loading && refEnd && view === 'mixed' && mixedSorted.length > 0 && (
        <section className="perf-table-container rk-section">
          <div className="chart-header">
            <h3>{t('rank.mixed.title')}</h3>
            <span className="rk-meta">{t('rank.mixed.asOf', { date: refEnd })}</span>
          </div>
          <p className="adv-note rk-lead">{t('rank.mixed.lead')}</p>
          <div className="rk-colpick">
            <span className="rk-colpick-label">{t('rank.cols.label', { n: cols.length, max: MAX_MIXED_COLS })}</span>
            <div className="rk-periods rk-periods--inline" role="group" aria-label={t('rank.cols.label', { n: cols.length, max: MAX_MIXED_COLS })}>
              {MIXED_PERIODS.map(p => {
                const on = cols.includes(p)
                const full = !on && cols.length >= MAX_MIXED_COLS
                return (
                  <button key={p} type="button" aria-pressed={on} disabled={full}
                    title={full ? t('rank.cols.full', { max: MAX_MIXED_COLS }) : undefined}
                    className={`ffb-chip${on ? ' ffb-chip--on' : ''}`} onClick={() => toggleCol(p)}>
                    {periodLabel(p)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="perf-table-wrap">
            <table className="perf-table rk-table rk-mixed">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{t('fee.col.fund')}</th>
                  <th>{t('rank.col.type')}</th>
                  <th className={mixedSort === 'score' ? 'rk-sorted' : ''}>
                    <button type="button" className="rk-th" onClick={() => setMixedSort('score')} title={t('rank.score.hint')}>
                      {t('rank.col.score')}{mixedSort === 'score' ? ' ▾' : ''}
                    </button>
                  </th>
                  {cols.map(p => (
                    <th key={p} className={mixedSort === p ? 'rk-sorted' : ''}>
                      <button type="button" className="rk-th" onClick={() => setMixedSort(p)}>
                        {periodLabel(p)}{mixedSort === p ? ' ▾' : ''}
                      </button>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {(showAllMixed ? mixedSorted : mixedSorted.slice(0, MIXED_PREVIEW)).map((row: MixedRow, i) => (
                  <tr key={row.id}>
                    <td>{rankBadge(i + 1)}</td>
                    <td className="rk-name">{name(row.id)}</td>
                    <td><span className={`rk-type rk-type--${row.type}`}>{typeLabel(row.type)}</span></td>
                    <td className={mixedSort === 'score' ? 'rk-sorted' : ''}>
                      {row.score === null ? <span title={t('rank.score.few')}>—</span> : <strong>{dec(row.score, 0)}</strong>}
                    </td>
                    {cols.map(p => {
                      const stat = row.stats[p]
                      const rank = row.ranks[p]
                      const v = stat ? metricValue(stat, metric) : null
                      return (
                        <td key={p} className={mixedSort === p ? 'rk-sorted' : ''}>
                          {rank === undefined ? '' : (
                            <span className="rk-cell">
                              <span className={metric !== 'return' && metric !== 'drawdown' ? '' : v !== null && v >= 0 && metric === 'return' ? 'dca-profit' : metric === 'return' ? 'dca-loss' : ''}>{cell(stat, metric)}</span>
                              <em className={rank <= 3 ? 'rk-top' : ''} title={t('rank.cellRank', { rank, total: row.totals[p] ?? 0 })}>#{rank}</em>
                            </span>
                          )}
                        </td>
                      )
                    })}
                    {rowActions(row.id)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mixedSorted.length > MIXED_PREVIEW && (
            <button type="button" className="lsdca-horizon-btn rk-more" onClick={() => setShowAllMixed(v => !v)}>
              {showAllMixed ? t('rank.showTop', { n: MIXED_PREVIEW }) : t('rank.showAll', { n: mixedSorted.length })}
            </button>
          )}
        </section>
      )}

      {!loading && refEnd && (
        <p className="adv-note rk-foot">{t('rank.note')}</p>
      )}
    </div>
  )
}

export const RankingPanel = memo(RankingPanelImpl)
