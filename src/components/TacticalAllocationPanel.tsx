/**
 * TacticalAllocationPanel: tab "Chiến thuật phân bổ".
 *
 * Trả lời câu hỏi retail VN hay hỏi: "NAV quỹ X trên/dưới MA200 thì có nên
 * chuyển sang quỹ Y không?". Mô phỏng chuyển đổi giữa 2 danh mục (mỗi danh
 * mục có thể nhiều quỹ, tái dùng PortfolioCard) dựa trên tín hiệu Giá vs
 * SMA(N) của MỘT ticker do người dùng chọn riêng (không nhất thiết là quỹ
 * đang nắm giữ).
 *
 * Cố tình thu hẹp so với công cụ Tactical Allocation của testfol.io: đúng 1
 * kiểu tín hiệu, đúng 2 trạng thái, độ trễ thực thi CỐ ĐỊNH T+1 (không cho
 * chỉnh). Xem utils/tactical.ts để biết lý do.
 */
import { useState, useEffect, useMemo, memo } from 'react'
import Select from 'react-select'
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, ReferenceArea, ReferenceLine, Legend,
} from 'recharts'
import type { FundMeta, PortfolioCardState, PricePoint } from '../types'
import { useFundSeriesMap } from '../hooks/useFundData'
import { useCommittedRun } from '../hooks/useCommittedRun'
import { dcaCagr, dcaMaxDrawdown, derivePortfolioName } from '../utils/dca'
import { runTacticalBacktest, decomposeAdvantage, type TacticalBacktestResult, type AllocationId, type IndicatorType, type SignalFrequency } from '../utils/tactical'
import { PortfolioCard, portfolioSelectStyles, PORTFOLIO_COLORS } from './PortfolioCard'
import {
  isSavingsAssetId, savingsAssetId,
  SAVINGS_OPTION_LABEL, DEFAULT_SAVINGS_RATE,
} from '../utils/savingsAsset'
import { MoneyInput } from './MoneyInput'
import { formatVND, formatVNDAxis } from '../utils/vndFormat'
import { useT, useTRich, translateStatic, type TranslationKey } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  funds: FundMeta[]
}

type DateRangeMode = 'all' | 'years'

const INDICATOR_OPTIONS: IndicatorType[] = ['SMA', 'EMA', 'RSI']

const FREQUENCY_OPTIONS: { value: SignalFrequency; labelKey: TranslationKey }[] = [
  { value: 'daily', labelKey: 'tac.freq.daily' },
  { value: 'weekly', labelKey: 'tac.freq.weekly' },
  { value: 'monthly', labelKey: 'tac.freq.monthly' },
]
const COLOR_A = PORTFOLIO_COLORS[0]!
const COLOR_B = PORTFOLIO_COLORS[1]!

/** Nhãn hiển thị cho 1 cấu hình chỉ báo, vd "SMA200", "RSI14". */
function indicatorLabel(type: IndicatorType, period: number): string {
  return `${type}${period}`
}

/** Toàn bộ thông số chốt lại tại thời điểm bấm "Chạy". Backtest chỉ đọc từ đây. */
interface CommittedParams {
  signalFundId: string
  indicatorType: IndicatorType
  period: number
  toleranceBandPct: number
  signalFrequency: SignalFrequency
  rsiOverbought: number
  rsiOversold: number
  allocationASlots: PortfolioCardState['slots']
  allocationARebalFreq: PortfolioCardState['rebalFreq']
  allocationBSlots: PortfolioCardState['slots']
  allocationBRebalFreq: PortfolioCardState['rebalFreq']
  startValue: number
  switchCostPct: number
  dateFrom: string
  dateTo: string
}

/**
 * Một lần bấm "Chạy" chốt lại đúng một object thế này.
 *
 * `labels` để riêng khỏi `params` vì hai thứ dùng vào hai việc khác nhau: so sánh
 * dirty chỉ nhìn `params`, nên đổi tên danh mục không làm hiện dòng "thông số đã
 * thay đổi", còn kết quả thì luôn hiển thị đúng tên của chính lần chạy đó.
 */
interface CommittedSnapshot {
  params: CommittedParams
  labels: { nameA: string; nameB: string; signalFundName: string }
  data: Map<string, PricePoint[]>
}

/** Gom mọi quỹ mà một snapshot cần tới, kể cả quỹ làm tín hiệu. */
function collectCommittedIds(c: CommittedParams): Set<string> {
  const ids = new Set<string>()
  if (c.signalFundId) ids.add(c.signalFundId)
  for (const s of c.allocationASlots) if (s.fundId) ids.add(s.fundId)
  for (const s of c.allocationBSlots) if (s.fundId) ids.add(s.fundId)
  return ids
}

function makeEmptyAllocation(id: string, fallbackName: string): PortfolioCardState {
  const slots = [{ fundId: '', weight: 100 }]
  return {
    id, num: 1, name: derivePortfolioName(slots, fallbackName), isNameCustom: false,
    slots,
    rebalFreq: 'quarterly',
  }
}

function TacticalAllocationPanelImpl({ funds }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  // ── Thông số ──
  const [dateMode, setDateMode] = useState<DateRangeMode>('all')
  const [yearsBack, setYearsBack] = useState(5)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [startValue, setStartValue] = useState(100_000_000)
  const [switchCostPct, setSwitchCostPct] = useState(0.5)

  // ── Tín hiệu ──
  const [signalFundId, setSignalFundId] = useState('')
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('SMA')
  const [period, setPeriod] = useState(200)
  const [toleranceBandPct, setToleranceBandPct] = useState(2)
  const [signalFrequency, setSignalFrequency] = useState<SignalFrequency>('monthly')
  const [rsiOverbought, setRsiOverbought] = useState(70)
  const [rsiOversold, setRsiOversold] = useState(30)

  function selectIndicator(t: IndicatorType) {
    setIndicatorType(t)
    if (t === 'RSI') setPeriod(14)
    else { setPeriod(200); setToleranceBandPct(2) }
  }

  // ── 2 Allocation (mỗi cái có thể nhiều quỹ, tái dùng PortfolioCard) ──
  const [allocationA, setAllocationA] = useState<PortfolioCardState>(
    () => makeEmptyAllocation('tacticalA', translateStatic('tac.portfolioA', language)),
  )
  const [allocationB, setAllocationB] = useState<PortfolioCardState>(
    () => makeEmptyAllocation('tacticalB', translateStatic('tac.portfolioB', language)),
  )

  // Tên mặc định đi theo ngôn ngữ; người dùng tự đặt tên rồi thì giữ nguyên.
  useEffect(() => {
    setAllocationA(p => p.isNameCustom ? p : { ...p, name: derivePortfolioName(p.slots, translateStatic('tac.portfolioA', language)) })
    setAllocationB(p => p.isNameCustom ? p : { ...p, name: derivePortfolioName(p.slots, translateStatic('tac.portfolioB', language)) })
  }, [language])

  // Danh sách quỹ thật, không có tiết kiệm ngân hàng.
  const realFundOptions = useMemo(
    () => funds.map(f => ({ value: f.id, label: f.name_vi })),
    [funds],
  )

  // Danh sách đầy đủ, thêm tiết kiệm ngân hàng. Dùng cho CẢ 2 thẻ danh mục lẫn
  // ô chọn tín hiệu.
  //
  // Ở 2 thẻ danh mục thì tiết kiệm hữu ích thật, kiểu "trên MA200 thì giữ ETF,
  // dưới thì rút về gửi tiết kiệm".
  //
  // Ở ô tín hiệu thì nó là một cái bẫy, nên có cảnh báo đi kèm chứ không chặn.
  // Chuỗi lãi suất cố định chỉ tăng, không có ngày nào giảm, nên mọi chỉ báo
  // trên nó kẹt cứng một trạng thái: giá luôn nằm trên SMA/EMA (đo trên 4 năm,
  // 1263 trên 1263 ngày), còn RSI luôn đúng bằng 100 vì mẫu số (trung bình mức
  // giảm) bằng 0. Backtest vẫn chạy ra kết quả, nhưng là kết quả không bao giờ
  // đổi trạng thái. Trước đây ô tín hiệu dùng danh sách riêng để giấu hẳn tiết
  // kiệm đi; user chọn đổi sang cho chọn kèm cảnh báo, xem hồ sơ
  // process/2026-08-05_TietKiemNganHang.md.
  const fundOptions = useMemo(() => [
    ...realFundOptions,
    { value: savingsAssetId(DEFAULT_SAVINGS_RATE), label: SAVINGS_OPTION_LABEL },
  ], [realFundOptions])

  // Tín hiệu đang trỏ vào tiết kiệm thì backtest sẽ đứng im một trạng thái.
  const signalIsSavings = isSavingsAssetId(signalFundId)

  const dualPriceFundIds = useMemo(() => new Set(funds.filter(f => f.type === 'gold').map(f => f.id)), [funds])

  const neededIds = useMemo(() => {
    const ids = new Set<string>()
    if (signalFundId) ids.add(signalFundId)
    for (const s of allocationA.slots) if (s.fundId) ids.add(s.fundId)
    for (const s of allocationB.slots) if (s.fundId) ids.add(s.fundId)
    return ids
  }, [signalFundId, allocationA.slots, allocationB.slots])

  const neededIdList = useMemo(() => Array.from(neededIds), [neededIds])
  const {
    data: fundData,
    loading,
    errors,
  } = useFundSeriesMap(neededIdList, { dualPriceFundIds })
  const dataError = Array.from(errors.values())[0] ?? null

  function getEffectiveDates(): { from: string; to: string } {
    if (dateMode === 'years') {
      const now = new Date()
      const from = new Date(now.getFullYear() - yearsBack, now.getMonth(), now.getDate())
      return { from: from.toISOString().substring(0, 10), to: '' }
    }
    return { from: dateFrom, to: dateTo }
  }

  const validA = allocationA.slots.filter(s => s.fundId && s.weight > 0)
  const validB = allocationB.slots.filter(s => s.fundId && s.weight > 0)
  const totalA = allocationA.slots.reduce((s, x) => s + x.weight, 0)
  const totalB = allocationB.slots.reduce((s, x) => s + x.weight, 0)
  const canRun = !!signalFundId
    && validA.length > 0 && Math.abs(totalA - 100) < 0.01
    && validB.length > 0 && Math.abs(totalB - 100) < 0.01

  function buildParams(): CommittedParams {
    const { from, to } = getEffectiveDates()
    return {
      signalFundId, indicatorType, period, toleranceBandPct, signalFrequency, rsiOverbought, rsiOversold,
      allocationASlots: allocationA.slots.map(s => ({ ...s })),
      allocationARebalFreq: allocationA.rebalFreq,
      allocationBSlots: allocationB.slots.map(s => ({ ...s })),
      allocationBRebalFreq: allocationB.rebalFreq,
      startValue, switchCostPct,
      dateFrom: from, dateTo: to,
    }
  }

  const nameA = allocationA.name || t('tac.portfolioA')
  const nameB = allocationB.name || t('tac.portfolioB')
  const signalFundName = fundOptions.find(o => o.value === signalFundId)?.label || signalFundId

  function runBacktest() {
    if (!canRun) return
    runCommitted()
  }

  // Chỉ so `params`, không so `labels`: đổi tên danh mục không phải là đổi thông số.
  const liveParams = buildParams()

  const dataReady = Array.from(collectCommittedIds(liveParams)).every(id => fundData.has(id))
    && !loading
    && errors.size === 0
  const committedRun = useCommittedRun({
    ready: dataReady,
    valid: canRun,
    liveParams,
    captureSnapshot: (): CommittedSnapshot => {
      const params = buildParams()
      const data = new Map<string, PricePoint[]>()
      for (const id of collectCommittedIds(params)) {
        const series = fundData.get(id)
        if (series) data.set(id, series)
      }
      return { params, labels: { nameA, nameB, signalFundName }, data }
    },
    compute: snapshot => {
      const p = snapshot.params
      return runTacticalBacktest({
        rawPrices: snapshot.data,
        signalFundId: p.signalFundId,
        indicatorType: p.indicatorType,
        period: p.period,
        toleranceBandPct: p.toleranceBandPct,
        signalFrequency: p.signalFrequency,
        rsiOverbought: p.rsiOverbought,
        rsiOversold: p.rsiOversold,
        allocationASlots: p.allocationASlots,
        allocationARebalFreq: p.allocationARebalFreq,
        allocationBSlots: p.allocationBSlots,
        allocationBRebalFreq: p.allocationBRebalFreq,
        startValue: p.startValue,
        switchCostPct: p.switchCostPct,
        dateFrom: p.dateFrom || undefined,
        dateTo: p.dateTo || undefined,
      })
    },
  })

  const {
    committed,
    result,
    dirty: isDirty,
    run: runCommitted,
  } = committedRun

  // `useCommittedRun` keeps both the snapshot and the result stable while live
  // controls or unrelated fund data change.

  return (
    <div className="simulation-panel">
      <div className="panel-header">
        <h2>{t('tac.title')}</h2>
      </div>

      <div className="rebal-intro-card">
        <p className="dca-ratio-sub">
          {tr('tac.intro')}
        </p>
      </div>

      {/* ── Thông số ── */}
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>

        <div className="dca-param-row">
          <label className="dca-label">{t('tac.dateRange')}</label>
          <div className="dca-date-mode">
            <button className={`dca-mode-btn ${dateMode === 'all' ? 'dca-mode-btn-active' : ''}`} onClick={() => setDateMode('all')}>{t('tac.modeAll')}</button>
            <button className={`dca-mode-btn ${dateMode === 'years' ? 'dca-mode-btn-active' : ''}`} onClick={() => setDateMode('years')}>{t('tac.modeYears')}</button>
          </div>
        </div>

        {dateMode === 'years' && (
          <div className="dca-param-row dca-years-row">
            <label className="dca-label">{t('tac.numYears')}</label>
            <div className="dca-years-selector">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button key={n} className={`dca-year-btn ${yearsBack === n ? 'dca-year-btn-active' : ''}`} onClick={() => setYearsBack(n)}>{n}</button>
              ))}
            </div>
          </div>
        )}

        {dateMode === 'all' && (
          <div className="dca-param-row">
            <label className="dca-label">{t('tac.fromTo')}</label>
            <div className="dca-date-inputs">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="dca-date-sep">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
        )}

        <div className="dca-param-row">
          <label className="dca-label">{t('tac.startValue')}</label>
          <div className="dca-amount-input">
            <MoneyInput value={startValue} onChange={setStartValue} min={0} />
            <span className="dca-currency">₫</span>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('tac.switchCost')}</label>
          <div className="tactical-pct-input">
            <input
              type="number" min={0} max={10} step={0.1}
              value={switchCostPct}
              onChange={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setSwitchCostPct(v) }}
              onBlur={e => setSwitchCostPct(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
            />
            <span>%</span>
          </div>
        </div>
        <p className="dca-note">{t('tac.switchCostNote')}</p>
      </div>

      {/* ── Tín hiệu ── */}
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('tac.signalSection')}</h3>
        <div className="dca-param-row">
          <label className="dca-label">{t('tac.signalFund')}</label>
          <div className="tactical-signal-select">
            <Select
              options={fundOptions}
              value={fundOptions.find(o => o.value === signalFundId) || null}
              onChange={opt => setSignalFundId(opt?.value || '')}
              placeholder={t('fundSelector.searchPlaceholder')}
              noOptionsMessage={() => t('fundSelector.noOptions')}
              isSearchable
              styles={portfolioSelectStyles}
            />
          </div>
        </div>

        {signalIsSavings && (
          <p className="tactical-signal-warning">
            {t('tac.savingsWarning')}
          </p>
        )}
        <div className="dca-param-row">
          <label className="dca-label">{t('tac.signalFrequency')}</label>
          <div className="dca-years-selector">
            {FREQUENCY_OPTIONS.map(f => (
              <button
                key={f.value}
                className={`dca-year-btn tactical-freq-btn ${signalFrequency === f.value ? 'dca-year-btn-active' : ''}`}
                onClick={() => setSignalFrequency(f.value)}
              >{t(f.labelKey)}</button>
            ))}
          </div>
        </div>
        <p className="dca-note">{t('tac.freqNote1')}</p>
        <p className="dca-note">{t('tac.freqNote2')}</p>
        <div className="dca-param-row">
          <label className="dca-label">{t('tac.indicator')}</label>
          <div className="dca-years-selector">
            {INDICATOR_OPTIONS.map(t => (
              <button key={t} className={`dca-year-btn tactical-ma-btn ${indicatorType === t ? 'dca-year-btn-active' : ''}`} onClick={() => selectIndicator(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="dca-param-row">
          <label className="dca-label">{t('tac.period')}</label>
          <div className="tactical-pct-input">
            <input
              type="number" min={2} max={500} step={1}
              value={period}
              onChange={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setPeriod(v) }}
              onBlur={e => setPeriod(Math.max(2, Math.min(500, Math.round(Number(e.target.value) || 2))))}
            />
            <span>{t('tac.days')}</span>
          </div>
        </div>
        {indicatorType === 'RSI' ? (
          <>
            <div className="dca-param-row">
              <label className="dca-label">{t('tac.rsiOversold')}</label>
              <div className="tactical-pct-input">
                <input
                  type="number" min={0} max={49} step={1}
                  value={rsiOversold}
                  onChange={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setRsiOversold(v) }}
                  onBlur={e => setRsiOversold(Math.max(0, Math.min(49, Math.round(Number(e.target.value) || 0))))}
                />
                <span>RSI</span>
              </div>
            </div>
            <div className="dca-param-row">
              <label className="dca-label">{t('tac.rsiOverbought')}</label>
              <div className="tactical-pct-input">
                <input
                  type="number" min={51} max={100} step={1}
                  value={rsiOverbought}
                  onChange={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setRsiOverbought(v) }}
                  onBlur={e => setRsiOverbought(Math.max(51, Math.min(100, Math.round(Number(e.target.value) || 51))))}
                />
                <span>RSI</span>
              </div>
            </div>
            <p className="dca-note">{t('tac.rsiNote')}</p>
          </>
        ) : (
          <>
            <div className="dca-param-row">
              <label className="dca-label">{t('tac.band')}</label>
              <div className="tactical-pct-input">
                <input
                  type="number" min={0} max={50} step={0.5}
                  value={toleranceBandPct}
                  onChange={e => { const v = Number(e.target.value); if (!Number.isNaN(v)) setToleranceBandPct(v) }}
                  onBlur={e => setToleranceBandPct(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                />
                <span>%</span>
              </div>
            </div>
            <p className="dca-note">{t('tac.bandNote', { indicator: indicatorType })}</p>
          </>
        )}
      </div>

      {/* ── 2 Danh mục ── */}
      <div className="dca-portfolios-card">
        <div className="dca-portfolios-card-header">
          <h3 className="dca-section-title">{t('tac.portfoliosTitle')}</h3>
        </div>
        <div className="dca-portfolio-grid">
          <PortfolioCard
            portfolio={allocationA} pIdx={0} funds={funds} fundOptions={fundOptions}
            onUpdate={u => setAllocationA(p => ({ ...p, ...u }))}
            onRemove={() => {}}
            onAddSlot={() => setAllocationA(p => {
              const slots = [...p.slots, { fundId: '', weight: 0 }]
              return { ...p, slots, name: p.isNameCustom ? p.name : derivePortfolioName(slots, translateStatic('tac.portfolioA', language)) }
            })}
            onRemoveSlot={idx => setAllocationA(p => {
              const slots = p.slots.length > 1 ? p.slots.filter((_, i) => i !== idx) : p.slots
              return { ...p, slots, name: p.isNameCustom ? p.name : derivePortfolioName(slots, translateStatic('tac.portfolioA', language)) }
            })}
            onUpdateSlot={(idx, u) => setAllocationA(p => {
              const slots = p.slots.map((s, i) => i === idx ? { ...s, ...u } : s)
              return { ...p, slots, name: p.isNameCustom ? p.name : derivePortfolioName(slots, translateStatic('tac.portfolioA', language)) }
            })}
            onSetEqualWeights={() => setAllocationA(p => {
              const n = p.slots.length; const w = Math.floor(100 / n); const rem = 100 - w * n
              return { ...p, slots: p.slots.map((s, i) => ({ ...s, weight: w + (i < rem ? 1 : 0) })) }
            })}
            showRemove={false}
          />
          <PortfolioCard
            portfolio={allocationB} pIdx={1} funds={funds} fundOptions={fundOptions}
            onUpdate={u => setAllocationB(p => ({ ...p, ...u }))}
            onRemove={() => {}}
            onAddSlot={() => setAllocationB(p => {
              const slots = [...p.slots, { fundId: '', weight: 0 }]
              return { ...p, slots, name: p.isNameCustom ? p.name : derivePortfolioName(slots, translateStatic('tac.portfolioB', language)) }
            })}
            onRemoveSlot={idx => setAllocationB(p => {
              const slots = p.slots.length > 1 ? p.slots.filter((_, i) => i !== idx) : p.slots
              return { ...p, slots, name: p.isNameCustom ? p.name : derivePortfolioName(slots, translateStatic('tac.portfolioB', language)) }
            })}
            onUpdateSlot={(idx, u) => setAllocationB(p => {
              const slots = p.slots.map((s, i) => i === idx ? { ...s, ...u } : s)
              return { ...p, slots, name: p.isNameCustom ? p.name : derivePortfolioName(slots, translateStatic('tac.portfolioB', language)) }
            })}
            onSetEqualWeights={() => setAllocationB(p => {
              const n = p.slots.length; const w = Math.floor(100 / n); const rem = 100 - w * n
              return { ...p, slots: p.slots.map((s, i) => ({ ...s, weight: w + (i < rem ? 1 : 0) })) }
            })}
            showRemove={false}
          />
        </div>
        <p className="dca-note">
          {indicatorType === 'RSI' ? (
            tr('tac.ruleRSI', { nameA, nameB })
          ) : (
            tr('tac.ruleMA', { indicator: indicatorType, nameA, nameB })
          )}
        </p>
      </div>

      <div className="btc-run-row">
        <button className="sim-run-btn" onClick={runBacktest} disabled={!canRun}>
          {committed ? t('tac.rerun') : t('tac.run')}
        </button>
        {isDirty && (
          <span className="btc-run-hint">{t('tac.staleParams')}</span>
        )}
      </div>

      {loading && <div className="loading-indicator">{t('app.loading')}</div>}

      {!loading && dataError && (
        <div className="error-banner">{dataError}</div>
      )}

      {committed && !loading && !result && !dataError && (
        <div className="error-banner">
          {t('tac.insufficientData', {
            indicator: indicatorLabel(committed.params.indicatorType, committed.params.period),
            months: Math.round(committed.params.period / 21),
          })}
        </div>
      )}

      {result && committed && (
        <TacticalResults
          result={result}
          nameA={committed.labels.nameA}
          nameB={committed.labels.nameB}
          signalFundName={committed.labels.signalFundName}
          indicatorType={committed.params.indicatorType}
          period={committed.params.period}
          rsiOverbought={committed.params.rsiOverbought}
          rsiOversold={committed.params.rsiOversold}
        />
      )}
    </div>
  )
}

export const TacticalAllocationPanel = memo(TacticalAllocationPanelImpl)

// ─── Kết quả ──────────────────────────────────────────────────────

/**
 * Khối kết quả BẮT BUỘC bọc memo ở cuối file. Đừng gỡ.
 *
 * Mọi ô nhập trong panel cha (Vùng đệm, Số ngày, Số tiền đầu tư, Phí chuyển đổi)
 * đều giữ state ở cha, nên mỗi phím gõ là một lần cha render lại. Khối này vẽ 3
 * biểu đồ Recharts trên toàn bộ chuỗi ngày, đo được 116ms mỗi lần. Gõ vài phím
 * liên tiếp là trang đứng hình.
 *
 * Props ở đây đều ổn định giữa các lần gõ, và phải giữ nguyên như vậy. `result` cùng
 * mọi thông số đều lấy từ `committed`, tức snapshot chốt lúc bấm "Chạy", nên chỉ
 * đổi khi bấm nút. Kể cả tên danh mục (`nameA`, `nameB`) cũng lấy từ snapshot chứ không
 * lấy tên đang sống, vì tên đổi ngay khi người dùng chọn quỹ khác.
 *
 * Ai thêm prop mới phải lấy từ snapshot, đừng lấy state đang sống của cha. Lấy nhầm
 * một prop là 3 biểu đồ Recharts vẽ lại theo từng phím gõ, trang đứng hình ngay.
 */
function TacticalResultsImpl({
  result, nameA, nameB, signalFundName, indicatorType, period, rsiOverbought, rsiOversold,
}: {
  result: TacticalBacktestResult
  nameA: string
  nameB: string
  signalFundName: string
  indicatorType: IndicatorType
  period: number
  rsiOverbought: number
  rsiOversold: number
}) {
  const t = useT()
  const tr = useTRich()
  const { switching, indicatorSeries, strategyCumulative, buyHoldACumulative, buyHoldBCumulative, buyHoldAValue, buyHoldBValue, requestedStartDate, effectiveStartDate } = result
  const label = indicatorLabel(indicatorType, period)

  const nameOf = (id: AllocationId) => id === 'A' ? nameA : nameB
  const colorOf = (id: AllocationId) => id === 'A' ? COLOR_A : COLOR_B

  // ── Phân rã lợi thế: hệ số cuối kỳ so với mua giữ luôn A, tách theo từng đoạn ──
  const advantage = useMemo(
    () => decomposeAdvantage(switching.dates, switching.strategyValue, buyHoldAValue, switching.activeAllocation),
    [switching, buyHoldAValue],
  )
  const topAdvantageIdx = useMemo(() => {
    let idx = -1
    let maxLog = -Infinity
    advantage.segments.forEach((seg, i) => {
      if (seg.factor > 1 && Math.log(seg.factor) > maxLog) { maxLog = Math.log(seg.factor); idx = i }
    })
    return idx
  }, [advantage])

  // ── Gom activeAllocation thành các đoạn liên tục để tô nền ──
  const segments = useMemo(() => {
    const out: { from: string; to: string; allocation: AllocationId }[] = []
    let segStart = 0
    for (let i = 1; i <= switching.dates.length; i++) {
      if (i === switching.dates.length || switching.activeAllocation[i] !== switching.activeAllocation[segStart]) {
        out.push({
          from: switching.dates[segStart]!,
          to: switching.dates[Math.min(i, switching.dates.length - 1)]!,
          allocation: switching.activeAllocation[segStart]!,
        })
        segStart = i
      }
    }
    return out
  }, [switching])

  const chartData = indicatorSeries.map(p => ({
    date: p.date,
    price: p.price,
    indicator: p.value,
  }))

  const compareData = strategyCumulative.map((p, i) => ({
    date: p.date,
    strategy: p.value * 100,
    buyHoldA: buyHoldACumulative[i]!.value * 100,
    buyHoldB: buyHoldBCumulative[i]!.value * 100,
  }))

  const valueData = switching.dates.map((date, i) => ({
    date,
    strategy: switching.strategyValue[i]!,
    buyHoldA: buyHoldAValue[i]!,
    buyHoldB: buyHoldBValue[i]!,
  }))

  const strategyCagr = dcaCagr(strategyCumulative)
  const strategyMaxDD = dcaMaxDrawdown(strategyCumulative)
  const aCagr = dcaCagr(buyHoldACumulative)
  const aMaxDD = dcaMaxDrawdown(buyHoldACumulative)
  const bCagr = dcaCagr(buyHoldBCumulative)
  const bMaxDD = dcaMaxDrawdown(buyHoldBCumulative)

  const totalCost = switching.switches.reduce((s, sw) => s + sw.costPaid, 0)
  const finalValue = switching.strategyValue[switching.strategyValue.length - 1]!
  const currentAllocationName = nameOf(switching.currentSignal)
  const lastDate = switching.dates[switching.dates.length - 1]!

  const warmupNote = requestedStartDate < effectiveStartDate
    ? t('tac.effectiveStart', { date: fmtDate(effectiveStartDate), period, indicator: label })
    : null

  return (
    <div className="tactical-results">
      <div className="tactical-current-signal">
        {tr('tac.currentSignal', { date: fmtDate(lastDate), indicator: label, fund: signalFundName })}
        <strong style={{ color: colorOf(switching.currentSignal) }}>{currentAllocationName}</strong>.
        {' '}{t('tac.currentSignalTail')}
      </div>

      {warmupNote && <p className="dca-note">* {warmupNote}</p>}

      <div className="chart-container">
        <div className="chart-header">
          <h3>{indicatorType === 'RSI'
            ? t('tac.chartRSI', { period, fund: signalFundName })
            : t('tac.chartMA', { fund: signalFundName, indicator: label })}</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} minTickGap={40} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={56}
              domain={indicatorType === 'RSI' ? [0, 100] : ['auto', 'auto']}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            {segments.map((seg, i) => (
              <ReferenceArea
                key={i}
                x1={seg.from} x2={seg.to}
                fill={colorOf(seg.allocation)}
                fillOpacity={0.15}
                stroke="none"
              />
            ))}
            {indicatorType === 'RSI' ? (
              <>
                <ReferenceLine y={rsiOverbought} stroke="#dc2626" strokeDasharray="4 2" label={{ value: t('tac.overbought'), position: 'insideTopRight', fontSize: 11, fill: '#dc2626' }} />
                <ReferenceLine y={rsiOversold} stroke="#16a34a" strokeDasharray="4 2" label={{ value: t('tac.oversold'), position: 'insideBottomRight', fontSize: 11, fill: '#16a34a' }} />
                <Line type="monotone" dataKey="indicator" stroke="#d97706" strokeWidth={1.5} dot={false} isAnimationActive={false} name="RSI" />
              </>
            ) : (
              <>
                <Line type="monotone" dataKey="price" stroke="#141413" strokeWidth={1.5} dot={false} isAnimationActive={false} name={t('tac.price')} />
                <Line type="monotone" dataKey="indicator" stroke="#d97706" strokeWidth={1.5} dot={false} isAnimationActive={false} name={label} strokeDasharray="4 2" />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <div className="tactical-chart-legend">
          <span><span className="tactical-swatch" style={{ background: colorOf('A') }} /> {t('tac.holding', { name: nameA })}</span>
          <span><span className="tactical-swatch" style={{ background: colorOf('B') }} /> {t('tac.holding', { name: nameB })}</span>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3>{t('tac.valueChart')}</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={valueData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} minTickGap={40} />
            <YAxis tickFormatter={v => formatVNDAxis(v)} tick={{ fontSize: 11, fill: '#6b7280' }} width={62} />
            <Tooltip
              formatter={(v: number) => formatVND(Math.round(v))}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="strategy" name={t('tac.strategy', { indicator: label })} stroke="#141413" strokeWidth={2.2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="buyHoldA" name={t('tac.buyHold', { name: nameA })} stroke={COLOR_A} strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="buyHoldB" name={t('tac.buyHold', { name: nameB })} stroke={COLOR_B} strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3>{t('tac.cumChart')}</h3>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={compareData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} minTickGap={40} />
            <YAxis tickFormatter={v => `${v.toFixed(0)}%`} tick={{ fontSize: 11, fill: '#6b7280' }} width={56} />
            <Tooltip
              formatter={(v: number) => `${v.toFixed(1)}%`}
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="strategy" name={t('tac.strategy', { indicator: label })} stroke="#141413" strokeWidth={2.2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="buyHoldA" name={t('tac.buyHold', { name: nameA })} stroke={COLOR_A} strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="buyHoldB" name={t('tac.buyHold', { name: nameB })} stroke={COLOR_B} strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3>{t('tac.statsTitle')}</h3>
        </div>
        <div className="dca-stats-table-scroll">
          <table className="dca-stats-table">
            <thead>
              <tr>
                <th>{t('tac.col.scenario')}</th>
                <th>{t('tac.col.finalValue')}</th>
                <th>CAGR</th>
                <th>{t('tac.col.maxDD')}</th>
                <th>{t('tac.col.switches')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="tactical-stats-row--highlight">
                <td>{t('tac.strategy', { indicator: label })}</td>
                <td>{formatVND(Math.round(finalValue))}</td>
                <td className={signClass(strategyCagr)}>{fmtPct(strategyCagr)}</td>
                <td className={strategyMaxDD < 0 ? 'dca-loss' : ''}>{fmtPct(strategyMaxDD)}</td>
                <td>{t('tac.switchesWithCost', { n: switching.switches.length, cost: formatVND(Math.round(totalCost)) })}</td>
              </tr>
              <tr>
                <td>{t('tac.buyHold', { name: nameA })}</td>
                <td>{formatVND(Math.round(result.buyHoldAValue[result.buyHoldAValue.length - 1]!))}</td>
                <td className={signClass(aCagr)}>{fmtPct(aCagr)}</td>
                <td className={aMaxDD < 0 ? 'dca-loss' : ''}>{fmtPct(aMaxDD)}</td>
                <td>0</td>
              </tr>
              <tr>
                <td>{t('tac.buyHold', { name: nameB })}</td>
                <td>{formatVND(Math.round(result.buyHoldBValue[result.buyHoldBValue.length - 1]!))}</td>
                <td className={signClass(bCagr)}>{fmtPct(bCagr)}</td>
                <td className={bMaxDD < 0 ? 'dca-loss' : ''}>{fmtPct(bMaxDD)}</td>
                <td>0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="tactical-takeaway">
        {tr('tac.summary', {
          switches: switching.switches.length,
          cost: formatVND(Math.round(totalCost)),
          indicator: label,
          final: formatVND(Math.round(finalValue)),
          cagr: fmtPct(strategyCagr),
          dd: fmtPct(strategyMaxDD),
          nameA, aCagr: fmtPct(aCagr), aDD: fmtPct(aMaxDD),
          nameB, bCagr: fmtPct(bCagr), bDD: fmtPct(bMaxDD),
        })}
      </div>

      {switching.switches.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <h3>{t('tac.segmentsTitle')}</h3>
          </div>
          <p className="dca-note">
            {t('tac.segmentsIntro1', { indicator: label, nameA })}
          </p>
          <p className="dca-note">
            {t('tac.segmentsIntro2')}
          </p>
          <div className="dca-stats-table-scroll">
            <table className="dca-stats-table">
              <thead>
                <tr>
                  <th>{t('tac.col.segment')}</th>
                  <th>{t('tac.col.fromTo')}</th>
                  <th>{t('tac.col.held')}</th>
                  <th>{t('tac.col.sessions')}</th>
                  <th>{t('tac.col.contribution')}</th>
                </tr>
              </thead>
              <tbody>
                {advantage.segments.map((seg, i) => (
                  <tr key={i} className={i === topAdvantageIdx ? 'tactical-stats-row--highlight' : ''}>
                    <td>{i + 1}</td>
                    <td>{fmtDate(seg.from)} → {fmtDate(seg.to)}</td>
                    <td style={{ color: colorOf(seg.allocation) }}>{nameOf(seg.allocation)}</td>
                    <td>{seg.days}</td>
                    <td className={signClass(seg.factor - 1)}>{fmtPct(seg.factor - 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {advantage.topPositiveShare !== null && topAdvantageIdx >= 0 && (
            <p className={advantage.topPositiveShare > 0.5 ? 'tactical-signal-warning' : 'dca-note'}>
              {tr(
                advantage.topPositiveShare > 0.5 ? 'tac.topSegmentConcentrated' : 'tac.topSegmentSpread',
                {
                  from: fmtDate(advantage.segments[topAdvantageIdx]!.from),
                  to: fmtDate(advantage.segments[topAdvantageIdx]!.to),
                  name: nameOf(advantage.segments[topAdvantageIdx]!.allocation),
                  share: (advantage.topPositiveShare * 100).toFixed(0),
                  n: advantage.segments.length,
                },
              )}
            </p>
          )}
        </div>
      )}

      {switching.switches.length > 0 && (
        <div className="chart-container">
          <div className="chart-header">
            <h3>{t('tac.logTitle')}</h3>
          </div>
          <div className="dca-stats-table-scroll">
            <table className="dca-stats-table">
              <thead>
                <tr>
                  <th>{t('tac.col.date')}</th>
                  <th>{t('tac.col.from')}</th>
                  <th>{t('tac.col.to')}</th>
                  <th>{t('tac.col.fee')}</th>
                </tr>
              </thead>
              <tbody>
                {switching.switches.map((sw, i) => (
                  <tr key={i}>
                    <td>{fmtDate(sw.date)}</td>
                    <td style={{ color: colorOf(sw.from) }}>{nameOf(sw.from)}</td>
                    <td style={{ color: colorOf(sw.to) }}>{nameOf(sw.to)}</td>
                    <td>{formatVND(Math.round(sw.costPaid))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="tactical-disclaimer">
        <p>{t('tac.disclaimerTitle')}</p>
        <p>{t('tac.disclaimer1')}</p>
        <p>{t('tac.disclaimer2')}</p>
        <p>{t('tac.disclaimer3')}</p>
      </div>
    </div>
  )
}

const TacticalResults = memo(TacticalResultsImpl)

function signClass(v: number | null): string {
  if (v === null) return ''
  return v >= 0 ? 'dca-profit' : 'dca-loss'
}

function fmtPct(v: number | null): string {
  if (v === null) return '—'
  const pct = v * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
