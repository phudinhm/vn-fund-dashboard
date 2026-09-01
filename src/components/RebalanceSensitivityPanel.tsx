/**
 * RebalanceSensitivityPanel: tab "Độ nhạy tái cân bằng".
 *
 * Ý tưởng từ công cụ Rebalancing Sensitivity của testfol.io: cố định MỘT
 * danh mục (từ 2 quỹ trở lên), rồi chạy nó qua mọi lịch tái cân bằng được
 * hỗ trợ (8 tần suất × mọi offset trong kỳ, kèm biến thể theo ngưỡng lệch
 * và baseline không tái cân bằng) để trả lời câu hỏi: chọn lịch rebalance
 * nào có thực sự thay đổi kết quả không?
 */
import { useState, useEffect, useMemo, memo } from 'react'
import Select from 'react-select'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { FundMeta, PortfolioCardState, PricePoint } from '../types'
import type { DCASlot } from '../utils/dca'
import { useFundSeriesMap } from '../hooks/useFundData'
import { useCommittedRun } from '../hooks/useCommittedRun'
import { alignFundsToCommonGridDaily } from '../utils/weeklyResample'
import {
  runRebalanceSensitivity, summarize, GROUP_LABEL_KEYS, SCHEDULES,
  type VariantResult, type VariantGroup, type ScheduleId, type BandSweep,
} from '../utils/rebalanceSensitivity'
import { PortfolioCard, portfolioSelectStyles } from './PortfolioCard'
import {
  savingsAssetId,
  SAVINGS_OPTION_LABEL, DEFAULT_SAVINGS_RATE,
} from '../utils/savingsAsset'
import { useT, useTRich, useDecimal, translateStatic } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  funds: FundMeta[]
}

const GROUP_COLORS: Record<VariantGroup, string> = {
  daily: '#94a3b8',
  weekly: '#0ea5e9',
  monthly: '#059669',
  bimonthly: '#10b981',
  quarterly: '#2563eb',
  every4months: '#8b5cf6',
  semiannual: '#d97706',
  yearly: '#dc2626',
  'band-abs': '#f59e0b',
  'band-rel': '#ec4899',
  none: '#141413',
}

/**
 * Nhãn của một biến thể, dựng từ group/offset/threshold thay vì lấy chuỗi dựng
 * sẵn trong util — để đổi ngôn ngữ là đổi luôn nhãn trên chart và trong bảng.
 */
function useVariantLabel(): (v: VariantResult) => string {
  const t = useT()
  const dec = useDecimal()
  return (v: VariantResult) => {
    if (v.group === 'band-abs') return t('rebal.variant.bandAbs', { v: dec(v.threshold ?? 0, 1) })
    if (v.group === 'band-rel') return t('rebal.variant.bandRel', { v: dec(v.threshold ?? 0, 1) })
    if (v.group === 'none') return t('rebal.group.none')
    const sched = t(GROUP_LABEL_KEYS[v.group])
    const maxOffset = SCHEDULES.find(x => x.id === v.group)?.maxOffset ?? 0
    if (maxOffset === 0) return sched
    return v.offset === 0
      ? t('rebal.variant.lastDay', { sched })
      : t('rebal.variant.offset', { sched, n: v.offset ?? 0 })
  }
}

type DateRangeMode = 'all' | 'years'

interface RebalanceParams {
  slots: DCASlot[]
  dateFrom: string
  dateTo: string
  schedules: ScheduleId[]
  absBand: BandSweep | null
  relBand: BandSweep | null
  feePct: number
}

interface RebalanceSnapshot {
  params: RebalanceParams
  data: Map<string, PricePoint[]>
}

function RebalanceSensitivityPanelImpl({ funds }: Props) {
  const t = useT()
  const tr = useTRich()
  const dec = useDecimal()
  const { language } = useLanguage()
  // ── Thông số ──
  const [dateMode, setDateMode] = useState<DateRangeMode>('all')
  const [yearsBack, setYearsBack] = useState(5)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleId[]>(
    SCHEDULES.map(s => s.id),
  )
  const [includeAbsBands, setIncludeAbsBands] = useState(false)
  const [absSweep, setAbsSweep] = useState<BandSweep>({ start: 1, step: 1, end: 20 })
  const [includeRelBands, setIncludeRelBands] = useState(false)
  const [relSweep, setRelSweep] = useState<BandSweep>({ start: 1, step: 1, end: 20 })
  // Phí giao dịch mỗi lần tái cân bằng, đơn vị % (mặc định 0,1%).
  const [feePct, setFeePct] = useState(0.1)

  // ── Danh mục (đúng 1, tối thiểu 2 quỹ) ──
  const [portfolio, setPortfolio] = useState<PortfolioCardState>(() => ({
    id: 'rebal1',
    num: 1,
    name: translateStatic('rebal.portfolioName', language),
    isNameCustom: false,
    slots: [
      { fundId: '', weight: 50 },
      { fundId: '', weight: 50 },
    ],
    rebalFreq: 'quarterly',
  }))

  // Tên mặc định đi theo ngôn ngữ; người dùng tự đặt tên rồi thì giữ nguyên.
  useEffect(() => {
    setPortfolio(p => p.isNameCustom
      ? p
      : { ...p, name: translateStatic('rebal.portfolioName', language) })
  }, [language])

  const scheduleOptions = useMemo(
    () => SCHEDULES.map(sched => ({ value: sched.id, label: t(GROUP_LABEL_KEYS[sched.id]) })),
    [language],
  )

  const fundOptions = useMemo(() => [
    ...funds.map(f => ({ value: f.id, label: f.name_vi })),
    { value: savingsAssetId(DEFAULT_SAVINGS_RATE), label: SAVINGS_OPTION_LABEL },
  ], [funds])

  // Fetch CSV cho các quỹ đã chọn (cùng pipeline adjusted-prices với các tab khác)
  const neededIds = useMemo(() => {
    const ids = new Set<string>()
    for (const s of portfolio.slots) {
      if (s.fundId && s.weight > 0) ids.add(s.fundId)
    }
    return ids
  }, [portfolio.slots])

  const neededIdList = useMemo(() => Array.from(neededIds), [neededIds])
  const { data: fundData, loading, errors } = useFundSeriesMap(neededIdList)

  // ── Validation ──
  const nonZeroSlots = portfolio.slots.filter(s => s.fundId && s.weight > 0)
  const totalWeight = portfolio.slots.reduce((s, f) => s + f.weight, 0)
  const hasVariantSource = selectedSchedules.length > 0 || includeAbsBands || includeRelBands
  const canRun = nonZeroSlots.length >= 2
    && Math.abs(totalWeight - 100) < 0.01
    && hasVariantSource

  // "X năm qua" quy về from/to cụ thể tại thời điểm chạy — cùng cách với tab DCA
  function getEffectiveDates(): { from: string; to: string } {
    if (dateMode === 'years') {
      const now = new Date()
      const from = new Date(now.getFullYear() - yearsBack, now.getMonth(), now.getDate())
      return { from: from.toISOString().substring(0, 10), to: '' }
    }
    return { from: dateFrom, to: dateTo }
  }

  function buildParams(): RebalanceParams {
    const { from, to } = getEffectiveDates()
    return {
      slots: portfolio.slots.map(s => ({ ...s })),
      dateFrom: from,
      dateTo: to,
      schedules: [...selectedSchedules],
      absBand: includeAbsBands ? { ...absSweep } : null,
      relBand: includeRelBands ? { ...relSweep } : null,
      feePct,
    }
  }

  function runAnalysis() {
    if (!canRun) return
    runCommitted()
  }

  // ── Chạy mô phỏng ──
  const liveParams = buildParams()
  const dataReady = Array.from(neededIds).every(id => fundData.has(id))
    && !loading
    && errors.size === 0
  const committedRun = useCommittedRun({
    ready: dataReady,
    valid: canRun,
    liveParams,
    captureSnapshot: (): RebalanceSnapshot => ({
      params: buildParams(),
      data: new Map(fundData),
    }),
    compute: snapshot => {
      const committed = snapshot.params
      const fundData = snapshot.data
      const slots = committed.slots.filter(s => s.fundId && s.weight > 0)
    if (slots.length < 2) return null

    // Cửa sổ chung: bắt đầu muộn nhất, kết thúc sớm nhất giữa các quỹ,
    // sau đó áp thêm khoảng ngày người dùng chọn (nếu có)
    let start = committed.dateFrom || ''
    let end = committed.dateTo || '9999-12-31'
    for (const s of slots) {
      const prices = fundData.get(s.fundId)
      if (!prices || prices.length === 0) return null
      if (prices[0]!.date > start) start = prices[0]!.date
      const last = prices[prices.length - 1]!.date
      if (last < end) end = last
    }
    if (start >= end) return null

    const filtered = new Map<string, PricePoint[]>()
    for (const s of slots) {
      filtered.set(
        s.fundId,
        fundData.get(s.fundId)!.filter(pt => pt.date >= start && pt.date <= end),
      )
    }
    const aligned = alignFundsToCommonGridDaily(filtered)

    return runRebalanceSensitivity({
      alignedPrices: aligned,
      slots,
      schedules: committed.schedules,
      absBand: committed.absBand,
      relBand: committed.relBand,
      feePct: committed.feePct,
    })
    },
  })

  const {
    committed,
    result,
    dirty: isDirty,
    run: runCommitted,
  } = committedRun
  const dataError = Array.from(errors.values())[0] ?? null

  return (
    <div className="simulation-panel">
      <div className="panel-header">
        <h2>{t('rebal.title')}</h2>
      </div>

      <div className="rebal-intro-card">
      <p className="dca-ratio-sub">{tr('rebal.intro')}</p>
      </div>

      {/* ── Thông số ── */}
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>

        <div className="dca-param-row">
          <label className="dca-label">{t('rebal.dateRange')}</label>
          <div className="dca-date-mode">
            <button
              className={`dca-mode-btn ${dateMode === 'all' ? 'dca-mode-btn-active' : ''}`}
              onClick={() => setDateMode('all')}
            >
              {t('rebal.modeAll')}
            </button>
            <button
              className={`dca-mode-btn ${dateMode === 'years' ? 'dca-mode-btn-active' : ''}`}
              onClick={() => setDateMode('years')}
            >
              {t('rebal.modeYears')}
            </button>
          </div>
        </div>

        {dateMode === 'years' && (
          <div className="dca-param-row dca-years-row">
            <label className="dca-label">{t('rebal.numYears')}</label>
            <div className="dca-years-selector">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  className={`dca-year-btn ${yearsBack === n ? 'dca-year-btn-active' : ''}`}
                  onClick={() => setYearsBack(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {dateMode === 'all' && (
          <div className="dca-param-row">
            <label className="dca-label">{t('rebal.fromTo')}</label>
            <div className="dca-date-inputs">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="dca-date-sep">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="dca-param-row">
          <label className="dca-label">{t('rebal.schedules')}</label>
          <div className="rebal-schedule-select">
            <Select
              isMulti
              options={scheduleOptions}
              value={scheduleOptions.filter(o => selectedSchedules.includes(o.value))}
              onChange={opts => setSelectedSchedules(opts.map(o => o.value))}
              placeholder={t('rebal.schedulesPlaceholder')}
              noOptionsMessage={() => t('rebal.schedulesNoOptions')}
              closeMenuOnSelect={false}
              styles={portfolioSelectStyles}
            />
          </div>
        </div>
        <p className="rebal-inline-note">{tr('rebal.schedulesNote')}</p>

        <div className="dca-param-row">
          <label className="dca-label">{t('rebal.bands')}</label>
          <div className="rebal-band-config">
            <div className="rebal-band-row">
              <label className="rebal-check">
                <input
                  type="checkbox"
                  checked={includeAbsBands}
                  onChange={e => setIncludeAbsBands(e.target.checked)}
                />
                {t('rebal.bandAbs')}
              </label>
              <BandSweepInputs
                sweep={absSweep}
                onChange={setAbsSweep}
                disabled={!includeAbsBands}
              />
            </div>
            <p className="rebal-inline-note">{tr('rebal.bandAbsNote')}</p>
            <div className="rebal-band-row">
              <label className="rebal-check">
                <input
                  type="checkbox"
                  checked={includeRelBands}
                  onChange={e => setIncludeRelBands(e.target.checked)}
                />
                {t('rebal.bandRel')}
              </label>
              <BandSweepInputs
                sweep={relSweep}
                onChange={setRelSweep}
                disabled={!includeRelBands}
              />
            </div>
            <p className="rebal-inline-note">{tr('rebal.bandRelNote')}</p>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('rebal.fee')}</label>
          <div className="rebal-fee-row">
            <input
              type="range"
              className="scnpath-slider"
              min={0}
              max={3}
              step={0.1}
              value={feePct}
              onChange={e => setFeePct(Number(e.target.value))}
            />
            <span className="rebal-fee-value">{dec(feePct, 1)}%</span>
          </div>
        </div>

        <p className="dca-note">{t('rebal.paramsNote')}</p>
      </div>

      {/* ── Danh mục ── */}
      <div className="dca-portfolios-card">
        <div className="dca-portfolios-card-header">
          <h3 className="dca-section-title">{t('rebal.portfolio')}</h3>
        </div>
        <div className="dca-portfolio-grid">
          <PortfolioCard
            portfolio={portfolio}
            pIdx={0}
            funds={funds}
            fundOptions={fundOptions}
            onUpdate={update => setPortfolio(p => ({ ...p, ...update }))}
            onRemove={() => {}}
            onAddSlot={() => setPortfolio(p => ({
              ...p,
              slots: [...p.slots, { fundId: '', weight: 0 }],
            }))}
            onRemoveSlot={idx => setPortfolio(p => ({
              ...p,
              slots: p.slots.length > 2 ? p.slots.filter((_, i) => i !== idx) : p.slots,
            }))}
            onUpdateSlot={(idx, update) => setPortfolio(p => ({
              ...p,
              slots: p.slots.map((s, i) => i === idx ? { ...s, ...update } : s),
            }))}
            onSetEqualWeights={() => setPortfolio(p => {
              const n = p.slots.length
              const w = Math.floor(100 / n)
              const remainder = 100 - w * n
              return {
                ...p,
                slots: p.slots.map((s, i) => ({ ...s, weight: w + (i < remainder ? 1 : 0) })),
              }
            })}
            showRebal={false}
            showRemove={false}
          />
        </div>
        {nonZeroSlots.length < 2 && (
          <p className="dca-note">{t('rebal.needTwoFunds')}</p>
        )}
        {!hasVariantSource && (
          <p className="dca-note">{t('rebal.needVariantSource')}</p>
        )}
      </div>

      <div className="btc-run-row">
        <button className="sim-run-btn" onClick={runAnalysis} disabled={!canRun}>
          {committed ? t('rebal.rerun') : t('rebal.run')}
        </button>
        {isDirty && (
          <span className="btc-run-hint">{t('rebal.staleParams')}</span>
        )}
      </div>

      {loading && <div className="loading-indicator">{t('app.loading')}</div>}

      {!loading && dataError && (
        <div className="error-banner">{dataError}</div>
      )}

      {committed && !loading && !result && !dataError && (
        <div className="error-banner">{t('rebal.insufficientData')}</div>
      )}

      {result && <SensitivityResults result={result} />}
    </div>
  )
}

export const RebalanceSensitivityPanel = memo(RebalanceSensitivityPanelImpl)

/** Chấm nhỏ, mờ nhẹ — hàng trăm biến thể chồng lên nhau nên chấm to sẽ rối mắt. */
function renderSmallDot(props: { cx?: number; cy?: number; fill?: string }) {
  const { cx, cy, fill } = props
  if (cx === undefined || cy === undefined) return <g />
  return <circle cx={cx} cy={cy} r={3.5} fill={fill} fillOpacity={0.75} />
}

/** Bộ 3 ô nhập Từ / Bước / Đến (%) cho một dải ngưỡng band. */
function BandSweepInputs({
  sweep,
  onChange,
  disabled,
}: {
  sweep: BandSweep
  onChange: (s: BandSweep) => void
  disabled: boolean
}) {
  const t = useT()
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, isNaN(v) ? min : v))
  return (
    <div className={`rebal-sweep-inputs${disabled ? ' rebal-sweep-inputs--disabled' : ''}`}>
      <label>
        {t('rebal.sweepFrom')}
        <input
          type="number" min={0.5} max={50} step={0.5}
          value={sweep.start}
          disabled={disabled}
          onChange={e => onChange({ ...sweep, start: clamp(Number(e.target.value), 0.5, 50) })}
        />
        %
      </label>
      <label>
        {t('rebal.sweepStep')}
        <input
          type="number" min={0.5} max={10} step={0.5}
          value={sweep.step}
          disabled={disabled}
          onChange={e => onChange({ ...sweep, step: clamp(Number(e.target.value), 0.5, 10) })}
        />
        %
      </label>
      <label>
        {t('rebal.sweepTo')}
        <input
          type="number" min={0.5} max={50} step={0.5}
          value={sweep.end}
          disabled={disabled}
          onChange={e => onChange({ ...sweep, end: clamp(Number(e.target.value), 0.5, 50) })}
        />
        %
      </label>
    </div>
  )
}

// ─── Kết quả ─────────────────────────────────────────────

function SensitivityResults({ result }: { result: NonNullable<ReturnType<typeof runRebalanceSensitivity>> }) {
  const t = useT()
  const dec = useDecimal()
  const variantLabel = useVariantLabel()
  const { variants, startDate, endDate, years } = result

  const cagrs = variants.map(v => v.cagr)
  const best = variants.reduce((a, b) => (b.cagr > a.cagr ? b : a))
  const worst = variants.reduce((a, b) => (b.cagr < a.cagr ? b : a))
  const spread = (best.cagr - worst.cagr) * 100
  const none = variants.find(v => v.group === 'none')

  // Gom nhóm cho bảng
  const groupOrder: VariantGroup[] = [
    ...SCHEDULES.map(s => s.id),
    'band-abs', 'band-rel', 'none',
  ]
  const groups = groupOrder
    .map(g => ({ group: g, items: variants.filter(v => v.group === g) }))
    .filter(g => g.items.length > 0)

  // Scatter: một series mỗi nhóm để có legend màu
  const scatterSeries = groups.map(g => ({
    group: g.group,
    color: GROUP_COLORS[g.group],
    data: g.items.map(v => ({
      ...v,
      pain: Math.abs(v.maxDrawdown * 100),
      cagrPct: v.cagr * 100,
    })),
  }))

  return (
    <>
      <div className="section-divider">
        <span className="section-divider-label">{t('rebal.results')}</span>
      </div>

      <div className="comparison-period" style={{ marginBottom: 16 }}>
        {t('rebal.resultsPeriod', {
          n: variants.length,
          from: formatDate(startDate),
          to: formatDate(endDate),
          years: dec(years, 1),
        })}
      </div>

      {/* Stat cards */}
      <div className="dca-storm-grid">
        <div className="dca-storm-stat">
          <div className="dca-storm-stat-label">{t('rebal.stat.best')}</div>
          <div className="dca-storm-stat-value">{t('rebal.perYear', { v: dec(best.cagr * 100) })}</div>
          <div className="dca-storm-stat-sub">{variantLabel(best)}</div>
        </div>
        <div className="dca-storm-stat">
          <div className="dca-storm-stat-label">{t('rebal.stat.worst')}</div>
          <div className="dca-storm-stat-value">{t('rebal.perYear', { v: dec(worst.cagr * 100) })}</div>
          <div className="dca-storm-stat-sub">{variantLabel(worst)}</div>
        </div>
        <div className="dca-storm-stat">
          <div className="dca-storm-stat-label">{t('rebal.stat.spread')}</div>
          <div className="dca-storm-stat-value">{t('rebal.points', { v: dec(spread) })}</div>
          <div className="dca-storm-stat-sub">{t('rebal.stat.spreadSub')}</div>
        </div>
      </div>

      {/* Scatter */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>{t('rebal.scatter.title')}</h3>
          <span className="chart-tooltip-icon" title={t('rebal.scatter.help')}>?</span>
        </div>
        <p className="rebal-inline-note">{t('rebal.scatter.note')}</p>
        <ResponsiveContainer width="100%" height={360}>
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis
              type="number"
              dataKey="pain"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `-${v.toFixed(0)}%`}
              tick={{ fontSize: 12 }}
              label={{ value: t('rebal.scatter.xAxis'), position: 'insideBottom', offset: -14, fontSize: 12, fill: '#5e5d59' }}
            />
            <YAxis
              type="number"
              dataKey="cagrPct"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fontSize: 12 }}
              width={60}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const p = payload[0].payload as VariantResult & { pain: number; cagrPct: number }
                return (
                  <div style={{ background: '#fff', border: '1px solid #e8e6dc', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                    <strong style={{ color: GROUP_COLORS[p.group] }}>{variantLabel(p)}</strong>
                    <div>{t('rebal.scatter.cagr', { v: dec(p.cagrPct) })}</div>
                    <div>{t('rebal.scatter.drawdown', { v: dec(p.pain, 1) })}</div>
                    <div>{t('rebal.scatter.count', { v: p.rebalCount })}</div>
                  </div>
                )
              }}
            />
            {scatterSeries.map(s => (
              <Scatter
                key={s.group}
                name={s.group}
                data={s.data}
                fill={s.color}
                isAnimationActive={false}
                shape={renderSmallDot}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
        <div className="rebal-scatter-legend">
          {scatterSeries.map(s => (
            <span key={s.group} className="rebal-scatter-legend-item">
              <span className="rebal-scatter-legend-dot" style={{ background: s.color }} />
              {t(GROUP_LABEL_KEYS[s.group])}
            </span>
          ))}
        </div>
      </div>

      {/* Bảng theo nhóm */}
      <div className="chart-container">
        <div className="chart-header">
          <h3>{t('rebal.table.title')}</h3>
          <span className="chart-tooltip-icon" title={t('rebal.table.help')}>?</span>
        </div>
        <div className="dca-stats-table-scroll">
          <table className="dca-stats-table">
            <thead>
              <tr>
                <th>{t('rebal.col.schedule')}</th>
                <th>{t('rebal.col.variants')}</th>
                <th>{t('rebal.col.cagrMedian')}</th>
                <th>{t('rebal.col.cagrRange')}</th>
                <th>{t('rebal.col.maxDrawdown')}</th>
                <th>{t('rebal.col.volatility')}</th>
                <th>{t('rebal.col.sharpe')}</th>
                <th>{t('rebal.col.rebalCount')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const c = summarize(g.items.map(v => v.cagr))
                const dd = summarize(g.items.map(v => v.maxDrawdown))
                const sd = summarize(g.items.map(v => v.stdev))
                const sh = summarize(g.items.map(v => v.sharpe))
                const rc = summarize(g.items.map(v => v.rebalCount))
                return (
                  <tr key={g.group}>
                    <td>
                      <span className="perf-dot" style={{ background: GROUP_COLORS[g.group] }} />
                      {t(GROUP_LABEL_KEYS[g.group])}
                    </td>
                    <td>{g.items.length}</td>
                    <td style={{ fontWeight: 600 }}>{dec(c.median * 100)}%</td>
                    <td>
                      {g.items.length > 1
                        ? `${dec(c.min * 100)}% – ${dec(c.max * 100)}%`
                        : '—'}
                    </td>
                    <td className="dca-loss">{dec(dd.median * 100, 1)}%</td>
                    <td>{dec(sd.median * 100, 1)}%</td>
                    <td>{dec(sh.median)}</td>
                    <td>{Math.round(rc.median)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <SensitivityNarrative
          spread={spread}
          best={best}
          worst={worst}
          none={none}
          cagrs={cagrs}
        />
      </div>
    </>
  )
}

function SensitivityNarrative({
  spread, best, worst, none, cagrs,
}: {
  spread: number
  best: VariantResult
  worst: VariantResult
  none: VariantResult | undefined
  cagrs: number[]
}) {
  const t = useT()
  const tr = useTRich()
  const dec = useDecimal()
  const variantLabel = useVariantLabel()
  const median = summarize(cagrs).median
  const noneVsMedian = none ? (none.cagr - median) * 100 : null

  const small = spread < 1.5
  const variant = small ? 'blue' : 'orange'
  const icon = small ? '🎯' : '⚖️'

  return (
    <div className={`chart-takeaway chart-takeaway--${variant}`}>
      <span className="chart-takeaway-icon">{icon}</span>
      <div className="chart-takeaway-body">
        {tr('rebal.narrative.spread', {
          best: variantLabel(best),
          bestCagr: dec(best.cagr * 100),
          worst: variantLabel(worst),
          worstCagr: dec(worst.cagr * 100),
          spread: dec(spread),
        })}
        {t(small ? 'rebal.narrative.small' : 'rebal.narrative.large')}
        {none && noneVsMedian !== null && tr(
          noneVsMedian >= 0 ? 'rebal.narrative.noneHigher' : 'rebal.narrative.noneLower',
          { cagr: dec(none.cagr * 100), gap: dec(Math.abs(noneVsMedian)) },
        )}
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
