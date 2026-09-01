import { useState, useEffect, useMemo } from 'react'
import Select from 'react-select'
import {
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import type { FundMeta, PricePoint, ReturnPoint } from '../types'
import { useFundSeries } from '../hooks/useFundData'
import { weeklyReturns, maxDrawdown, drawdownSeries, cagr } from '../utils/calculations'
import {
  getAvailablePeriods, parseHoldingsCSV, resolvePeriod,
  type AssetType, type Holding,
} from '../utils/overlap'
import { formatVND } from '../utils/vndFormat'
import { fundHouse } from '../utils/fundHouse'
import { useT, useTRich, type TranslationKey } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'
import { sectorName } from '../utils/sectorName'

/**
 * Phân tích quỹ dựa trên DANH MỤC (holdings), dùng cho 52 quỹ chưa có báo cáo
 * tài chính đầy đủ.
 *
 * Khác với FundAnalysisPanel (đọc báo cáo tài chính tháng theo Thông tư
 * 98/2020/TT-BTC, chỉ 3 quỹ Dragon Capital có): panel này chỉ cần
 * holdings/<FUND>_holdings.csv (nguồn fmarket/digiinvest) + chuỗi giá
 * data/<FUND>.csv mà quỹ nào cũng có. Vì vậy KHÔNG có các phần cần báo cáo
 * tài chính: dòng tiền vào/ra, phí quản lý, turnover, số nhà đầu tư, red flags.
 * Panel nói rõ điều đó thay vì để người đọc tưởng quỹ này thiếu minh bạch.
 */

interface Props {
  fund: FundMeta
  /** Nguồn dữ liệu holdings: 'fmarket' (chỉ top-10) hay 'digiinvest' (đầy đủ). */
  source: string | null
}

interface PeriodOption {
  value: string | null
  label: string
}

const ASSET_COLORS: Record<AssetType, string> = {
  STOCK: 'var(--color-primary)',
  BOND: '#818cf8',
  CASH: '#34d399',
  OTHER: '#94a3b8',
}

const ASSET_LABEL_KEYS: Record<AssetType, TranslationKey> = {
  STOCK: 'fa.asset.stock',
  BOND: 'fa.asset.bond',
  CASH: 'fa.asset.cash',
  OTHER: 'fa.asset.other',
}

const INDUSTRY_COLORS = ['#3b82f6', '#f59e0b', '#059669', '#8b5cf6', '#ef4444', '#0ea5e9', '#f97316', '#64748b']
const NAV_COLOR = '#0ea5e9'
const DRAWDOWN_COLOR = '#dc2626'
const CONCENTRATION_COLOR = '#8b5cf6'

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: 38,
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--color-primary)' },
    fontSize: '0.95rem',
  }),
  singleValue: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-text)' }),
  input: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-text)' }),
  menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 20, backgroundColor: 'var(--color-surface)' }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    fontSize: '0.9rem',
    backgroundColor: state.isSelected ? 'var(--color-primary)' : state.isFocused ? 'var(--color-primary-light)' : undefined,
    color: state.isSelected ? 'white' : 'var(--color-text)',
  }),
}

/** "2026-07-01" → "Tháng 7/2026" (vi) hoặc "7/2026" (en) */
function usePeriodLabel(): (period: string) => string {
  const t = useT()
  return (period: string) => {
    const [y, m] = period.split('-')
    if (!y || !m) return period
    return t('fa.periodLabel', { month: Number(m), year: y })
  }
}

/** "2026-07-01" → "7/26" cho nhãn trục X. */
function formatAxisTick(period: string): string {
  const [y, m] = period.split('-')
  if (!y || !m) return period
  return `${Number(m)}/${y.slice(2)}`
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(2)}%`
}

/** Tổng tỷ trọng theo loại tài sản cho một kỳ. */
function allocationByType(holdings: Holding[], label: (key: TranslationKey) => string) {
  const byType = new Map<AssetType, number>()
  for (const h of holdings) {
    byType.set(h.type, (byType.get(h.type) ?? 0) + h.weightPct)
  }
  return (['STOCK', 'BOND', 'CASH', 'OTHER'] as AssetType[])
    .map(type => ({ type, name: label(ASSET_LABEL_KEYS[type]), value: byType.get(type) ?? 0, color: ASSET_COLORS[type] }))
    .filter(d => d.value > 0.001)
}

/** Tổng tỷ trọng theo ngành, chỉ tính cổ phiếu. */
function allocationByIndustry(holdings: Holding[], otherLabel: string) {
  const byIndustry = new Map<string, number>()
  for (const h of holdings) {
    if (h.type !== 'STOCK') continue
    const key = sectorName(h.industry || otherLabel)
    byIndustry.set(key, (byIndustry.get(key) ?? 0) + h.weightPct)
  }
  return [...byIndustry.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function FundHoldingsAnalysis({ fund, source }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const formatPeriodLabel = usePeriodLabel()
  const [csvText, setCsvText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<string | null>(null)

  const { prices } = useFundSeries(fund.id)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setCsvText(null)
    setPeriod(null)

    fetch(`/data/holdings/${fund.id}_holdings.csv`)
      .then(resp => (resp.ok ? resp.text() : Promise.reject(new Error(`HTTP ${resp.status}`))))
      .then(text => {
        if (cancelled) return
        setCsvText(text)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('fh.loadFailed'))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [fund.id])

  const periods = useMemo(() => (csvText ? getAvailablePeriods(csvText) : []), [csvText])
  const resolved = useMemo(
    () => (periods.length > 0 ? resolvePeriod(periods, period) : ''),
    [periods, period],
  )
  const holdings = useMemo(
    () => (csvText && resolved ? parseHoldingsCSV(csvText, resolved) : []),
    [csvText, resolved],
  )

  const periodOptions: PeriodOption[] = useMemo(
    () => [
      { value: null, label: t('fa.latest') },
      ...periods.map(p => ({ value: p, label: formatPeriodLabel(p) })),
    ],
    [periods],
  )

  const assetAlloc = useMemo(() => allocationByType(holdings, t), [holdings])
  const industryAlloc = useMemo(() => allocationByIndustry(holdings, t('fa.industry.other')), [holdings])

  const industryPie = useMemo(() => {
    const top = industryAlloc.slice(0, 6).map(d => ({ ...d }))
    const rest = industryAlloc.slice(6).reduce((s, x) => s + x.value, 0)
    if (rest > 0.01) top.push({ name: t('fa.asset.rest'), value: rest })
    return top.map((d, i) => ({ ...d, color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]! }))
  }, [industryAlloc])

  const topStocks = useMemo(
    () => holdings.filter(h => h.type === 'STOCK').sort((a, b) => b.weightPct - a.weightPct).slice(0, 10),
    [holdings],
  )

  // Mức độ tập trung top-5 qua các kỳ — chỉ có nghĩa khi quỹ có nhiều kỳ.
  const concentration = useMemo(() => {
    if (!csvText || periods.length < 2) return []
    return [...periods].sort().map(p => {
      const stocks = parseHoldingsCSV(csvText, p)
        .filter(h => h.type === 'STOCK')
        .sort((a, b) => b.weightPct - a.weightPct)
      return { period: p, value: stocks.slice(0, 5).reduce((s, x) => s + x.weightPct, 0) }
    })
  }, [csvText, periods])

  // ── Hiệu suất & rủi ro từ chuỗi giá (quỹ nào cũng có) ──
  const returns: ReturnPoint[] = useMemo(() => {
    if (!prices || prices.length < 2) return []
    return weeklyReturns(prices.map(p => p.date), prices.map(p => p.price))
  }, [prices])

  const navSeries = useMemo(
    () => (prices ?? []).map((p: PricePoint) => ({ period: p.date, value: p.price })),
    [prices],
  )
  const ddSeries = useMemo(
    () => drawdownSeries(returns).map(p => ({ period: p.date, value: p.value * 100 })),
    [returns],
  )
  const maxDD = useMemo(() => (returns.length > 0 ? maxDrawdown(returns) : null), [returns])
  const fundCagr = useMemo(() => (returns.length > 0 ? cagr(returns) : null), [returns])

  const house = fundHouse(fund.id)
  const stockCount = holdings.filter(h => h.type === 'STOCK').length
  const isTopTenOnly = source === 'fmarket'

  if (error) {
    return (
      <div className="error-banner">{error}</div>
    )
  }

  if (loading) {
    return <div className="loading-indicator">{t('app.loading')}</div>
  }

  return (
    <>
      {/* Nói rõ panel này dựa trên nguồn nào và thiếu gì so với quỹ có báo cáo
          đầy đủ, để không ai hiểu nhầm là quỹ kém minh bạch hơn thực tế. */}
      <div className="fa-scope-note">
        {tr('fh.scopeNote')}
        {house && tr('fh.managedBy', { house })}
        {t('fh.sourceNote', {
          source: t(isTopTenOnly ? 'fh.sourceTopTen' : 'fh.sourceFull'),
        })}
      </div>

      {/* ── Hiệu suất & rủi ro ── */}
      <div className="section-divider">
        <span className="section-divider-label">{t('fa.sec.perf')}</span>
      </div>

      <div className="fund-analysis-charts-grid">
        <div className="chart-container">
          <div className="chart-header"><h3>{t('fh.navTitle')}</h3></div>
          {navSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={navSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                <defs>
                  <linearGradient id="holdingsNavFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={NAV_COLOR} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={NAV_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                <YAxis tick={{ fontSize: 11 }} width={76} domain={['auto', 'auto']} tickFormatter={(v: number) => Math.round(v).toLocaleString('vi-VN')} />
                <RechartsTooltip
                  formatter={(value: number | string) => [
                    `${Number(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} đ`,
                    t('fa.navLabel'),
                  ]}
                  labelFormatter={(p: string) => p}
                />
                <Area type="monotone" dataKey="value" stroke={NAV_COLOR} strokeWidth={2} fill="url(#holdingsNavFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="overlap-empty">{t('fh.noPriceSeries')}</p>
          )}
          <p className="fund-analysis-chart-note">
            {t('fh.navNote')}
            {fundCagr !== null && tr('fh.cagrSince', { v: formatPercent(fundCagr) })}
          </p>
        </div>

        <div className="chart-container">
          <div className="chart-header"><h3>{t('fa.ddChartTitle')}</h3></div>
          {ddSeries.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={ddSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                <YAxis tickFormatter={(v: number) => `${Math.round(v)}%`} tick={{ fontSize: 11 }} width={54} />
                <RechartsTooltip
                  formatter={(value: number | string) => [`${Number(value).toFixed(1)}%`, t('fa.ddLabel')]}
                  labelFormatter={(p: string) => p}
                />
                <Area type="monotone" dataKey="value" stroke={DRAWDOWN_COLOR} strokeWidth={2} fill="rgba(220,38,38,0.25)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="overlap-empty">{t('fh.noDrawdownData')}</p>
          )}
          <p className="fund-analysis-chart-note">
            {t('fh.ddNote', {
              deepest: maxDD !== null && maxDD < 0
                ? ` −${(Math.abs(maxDD) * 100).toFixed(0)}%`
                : t('fa.ddNotEnough'),
            })}
          </p>
        </div>
      </div>

      {/* ── Cấu trúc & phân bổ ── */}
      <div className="section-divider">
        <span className="section-divider-label">{t('fa.sec.allocation')}</span>
      </div>

      {periods.length === 0 ? (
        <p className="overlap-empty">{t('fh.noHoldings')}</p>
      ) : (
        <>
          <div className="chart-container">
            <div className="chart-header"><h3>{t('fh.allocTitle')}</h3></div>
            <div className="dca-param-row">
              <label className="dca-label">{t('fa.reportPeriod')}</label>
              <div className="overlap-select">
                <Select<PeriodOption>
                  className="fund-search-select"
                  classNamePrefix="fund-search"
                  options={periodOptions}
                  value={period === null
                    ? { value: null, label: t('fa.latest') }
                    : { value: period, label: formatPeriodLabel(period) }}
                  onChange={opt => opt && setPeriod(opt.value)}
                  isClearable={false}
                  isSearchable={false}
                  styles={selectStyles}
                />
              </div>
            </div>
            {assetAlloc.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={assetAlloc} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
                      {assetAlloc.map(d => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number | string, n: string) => [`${Number(v).toFixed(1)}%`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="fund-analysis-stack-legend">
                  {assetAlloc.map(d => (
                    <span key={d.name} className="fund-analysis-stack-legend-item">
                      <span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: d.color }} />
                      {d.name} {d.value.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="overlap-empty">{t('fh.noAllocData')}</p>
            )}
            <p className="fund-analysis-chart-note">
              {t('fh.allocNote', {
                period: resolved ? formatPeriodLabel(resolved) : t('fa.currentPeriod'),
              })}
              {isTopTenOnly && t('fh.topTenCaveat')}
            </p>
          </div>

          <div className="fund-analysis-charts-grid">
            <div className="chart-container">
              <div className="chart-header"><h3>{t('fa.industryTitle')}</h3></div>
              {industryPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={industryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
                        {industryPie.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <RechartsTooltip formatter={(v: number | string, n: string) => [`${Number(v).toFixed(1)}%`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="fund-analysis-stack-legend">
                    {industryPie.map(d => (
                      <span key={d.name} className="fund-analysis-stack-legend-item">
                        <span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="overlap-empty">{t('fa.noIndustryData')}</p>
              )}
              <p className="fund-analysis-chart-note">
                {t('fa.industryNote', { period: resolved ? formatPeriodLabel(resolved) : t('fa.currentPeriod') })}
              </p>
            </div>

            <div className="chart-container">
              <div className="chart-header"><h3>{t('fa.top10Title')}</h3></div>
              {topStocks.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topStocks} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="stockCode" width={72} interval={0} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      formatter={(v: number | string) => [`${Number(v).toFixed(2)}%`, t('fa.weight')]}
                      labelFormatter={(ticker: string) => {
                        const h = topStocks.find(s => s.stockCode === ticker)
                        return h?.industry ? `${ticker} · ${sectorName(h.industry)}` : ticker
                      }}
                    />
                    <Bar dataKey="weightPct" fill={ASSET_COLORS.STOCK} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="overlap-empty">{t('fa.noStocks')}</p>
              )}
              <p className="fund-analysis-chart-note">
                {t('fa.top10Note', { period: resolved ? formatPeriodLabel(resolved) : t('fa.currentPeriod') })}
              </p>
            </div>
          </div>

          {concentration.length > 1 && (
            <div className="chart-container">
              <div className="chart-header"><h3>{t('fa.concentrationTitle')}</h3></div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={concentration} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                  <YAxis tickFormatter={(v: number) => `${Math.round(v)}%`} tick={{ fontSize: 11 }} width={48} domain={[0, 100]} />
                  <RechartsTooltip
                    formatter={(v: number | string) => [`${Number(v).toFixed(1)}%`, 'Top 5']}
                    labelFormatter={(p: string) => formatPeriodLabel(p)}
                  />
                  <Line type="monotone" dataKey="value" stroke={CONCENTRATION_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="fund-analysis-chart-note">
                {t('fa.concentrationNote')}
              </p>
            </div>
          )}

          <div className="chart-container">
            <div className="chart-header">
              <h3>{t('fh.portfolioTitle', { n: stockCount })}</h3>
            </div>
            {holdings.length > 0 ? (
              <div className="dca-stats-table-scroll fund-analysis-table-scroll">
                <table className="dca-stats-table overlap-table">
                  <thead>
                    <tr>
                      <th>{t('fa.col.security')}</th>
                      <th>{t('fh.col.type')}</th>
                      <th>{t('fa.col.value')}</th>
                      <th>{t('fa.weight')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...holdings].sort((a, b) => b.weightPct - a.weightPct).map(h => (
                      <tr key={`${h.type}-${h.stockCode}`}>
                        <td>
                          <span className="fund-analysis-symbol">{h.stockCode}</span>
                          {h.industry && <span className="fund-analysis-industry">{sectorName(h.industry)}</span>}
                        </td>
                        <td>{t(ASSET_LABEL_KEYS[h.type])}</td>
                        <td>{h.assetValue > 0 ? formatVND(h.assetValue) : '—'}</td>
                        <td>{h.weightPct.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="overlap-empty">{t('fh.noHoldingsPeriod')}</p>
            )}
          </div>
        </>
      )}
    </>
  )
}
