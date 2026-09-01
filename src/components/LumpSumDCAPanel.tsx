import React, { useState, useMemo, useEffect, useRef, memo } from 'react'
import { MoneyInput } from './MoneyInput'
import { ShareButton } from './ShareButton'
import { buildLsDcaUrl } from '../utils/shareUrl'
import type { LsDcaShareState, ShareUrlState } from '../utils/shareUrl'
import { saveLS } from '../utils/localStorage'
import { useSharePersistence } from '../hooks/useSharePersistence'
import { useCommittedRun } from '../hooks/useCommittedRun'
import Select from 'react-select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import type { FundMeta, PortfolioCardState, PricePoint } from '../types'
import { derivePortfolioName, type DCASlot } from '../utils/dca'
import { parsePortfolio } from '../utils/portfolio'
import { alignFundsToCommonGridDaily } from '../utils/weeklyResample'
import { useFundSeriesMap } from '../hooks/useFundData'
import { DividendNotice } from './DividendNotice'
import { HoldingCostChart } from './HoldingCostChart'
import {
  computeRollingScenarios,
  summarizeScenarios,
  buildHistogram,
  computeHeatmap,
  computeHoldingCost,
  computeScenarioPath,
  computeDrawdownBuckets,
  computeSincePeakBuckets,
  MIN_INDEPENDENT_WINDOWS,
  HEATMAP_HOLDING_YEARS,
  HEATMAP_DCA_MONTHS,
  type CashMode,
  type LSvsDCAFreq,
  type HeatmapCell,
} from '../utils/lsVsDca'
import { isCashMode, isLSvsDCAFreq } from '../utils/lsVsDca'
import { ScenarioPathChart } from './ScenarioPathChart'
import { DrawdownBucketChart } from './DrawdownBucketChart'
import { SincePeakChart } from './SincePeakChart'
import {
  PortfolioCard,
  portfolioSelectStyles,
} from './PortfolioCard'
import { useT, useTRich, type TranslationKey } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

interface Props {
  funds: FundMeta[]
  shareUrl: ShareUrlState<Partial<LsDcaShareState>>
  active: boolean
}

const HORIZON_OPTIONS = [3, 6, 12, 18, 24, 36]

interface LsDcaCommittedParams {
  portfolio: PortfolioCardState | null
  totalCapital: number
  horizonMonths: number
  freq: LSvsDCAFreq
  cashMode: CashMode
  cashSavingsRate: number
  cashFundId: string
  compareFundId: string
}

interface LsDcaSnapshot {
  params: LsDcaCommittedParams
  data: Map<string, PricePoint[]>
  compareFundName: string | null
}

function hydrateLsDcaPortfolio(
  source: NonNullable<LsDcaShareState['portfolio']>,
  nextIdRef: { current: number },
): PortfolioCardState {
  const num = nextIdRef.current++
  return {
    id: `lsdca${num}`,
    num,
    name: source.name || derivePortfolioName(source.slots, `Portfolio ${num}`),
    isNameCustom: !!source.name,
    slots: source.slots,
    rebalFreq: source.rebalFreq,
  }
}

function LumpSumDCAPanelImpl({ funds, shareUrl, active }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const nextIdRef = useRef(1)

  // URL payload comes from App; this hook keeps localStorage precedence and the persist gate.
  const {
    parsedPayload: urlParams,
    hasExplicitPayload: hasUrlPayload,
    skipUrlPersist,
    readLocal,
  } = useSharePersistence({ source: shareUrl })

  // ── Parameters ──
  const [totalCapital, setTotalCapital] = useState(
    urlParams?.totalCapital ?? readLocal('lsdca_totalCapital', 100_000_000)
  )
  const [horizonMonths, setHorizonMonths] = useState(
    urlParams?.horizonMonths ?? readLocal('lsdca_horizonMonths', 12)
  )
  const [freq, setFreq] = useState<LSvsDCAFreq>(() => {
    if (urlParams?.freq) return urlParams.freq
    const saved = readLocal<unknown>('lsdca_freq', 'monthly')
    return isLSvsDCAFreq(saved) ? saved : 'monthly'
  })
  const [cashMode, setCashMode] = useState<CashMode>(() => {
    if (urlParams?.cashMode) return urlParams.cashMode
    const saved = readLocal<unknown>('lsdca_cashMode', 'flat')
    return isCashMode(saved) ? saved : 'flat'
  })
  const [savingsRate, setSavingsRate] = useState(
    urlParams?.savingsRate ?? readLocal('lsdca_savingsRate', 4)
  )
  const [cashFundId, setCashFundId] = useState<string>(
    urlParams?.cashFundId ?? readLocal('lsdca_cashFundId', '')
  )
  const [compareFundId, setCompareFundId] = useState<string>(
    urlParams?.compareFundId ?? readLocal('lsdca_compareFundId', '')
  )
  const [showCagr, setShowCagr] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)

  // ── Portfolio (single) ──
  const [portfolio, setPortfolio] = useState<PortfolioCardState | null>(() => {
    const src = hasUrlPayload
      ? urlParams?.portfolio ?? null
      : parsePortfolio(readLocal<unknown>('lsdca_portfolio', null))
    if (!src) return null
    return hydrateLsDcaPortfolio(src, nextIdRef)
  })

  const lastShareKeyRef = useRef(shareUrl.key)
  useEffect(() => {
    if (shareUrl.key === lastShareKeyRef.current) return
    lastShareKeyRef.current = shareUrl.key

    if (!hasUrlPayload && !active) return

    setTotalCapital(urlParams?.totalCapital ?? (hasUrlPayload ? 100_000_000 : readLocal('lsdca_totalCapital', 100_000_000)))
    setHorizonMonths(urlParams?.horizonMonths ?? (hasUrlPayload ? 12 : readLocal('lsdca_horizonMonths', 12)))
    const savedFreq = readLocal<unknown>('lsdca_freq', 'monthly')
    setFreq(urlParams?.freq ?? (hasUrlPayload ? 'monthly' : isLSvsDCAFreq(savedFreq) ? savedFreq : 'monthly'))
    const savedCashMode = readLocal<unknown>('lsdca_cashMode', 'flat')
    setCashMode(urlParams?.cashMode ?? (hasUrlPayload ? 'flat' : isCashMode(savedCashMode) ? savedCashMode : 'flat'))
    setSavingsRate(urlParams?.savingsRate ?? (hasUrlPayload ? 4 : readLocal('lsdca_savingsRate', 4)))
    setCashFundId(urlParams?.cashFundId ?? (hasUrlPayload ? '' : readLocal('lsdca_cashFundId', '')))
    setCompareFundId(urlParams?.compareFundId ?? (hasUrlPayload ? '' : readLocal('lsdca_compareFundId', '')))
    nextIdRef.current = 1
    const localPortfolio = parsePortfolio(readLocal<unknown>('lsdca_portfolio', null))
    setPortfolio(urlParams?.portfolio
      ? hydrateLsDcaPortfolio(urlParams.portfolio, nextIdRef)
      : hasUrlPayload ? null : localPortfolio ? hydrateLsDcaPortfolio(localPortfolio, nextIdRef) : null)
    resetCommitted()
  }, [shareUrl.key, active]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to localStorage ──
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_totalCapital', totalCapital) }, [totalCapital])
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_horizonMonths', horizonMonths) }, [horizonMonths])
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_freq', freq) }, [freq])
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_cashMode', cashMode) }, [cashMode])
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_savingsRate', savingsRate) }, [savingsRate])
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_cashFundId', cashFundId) }, [cashFundId])
  useEffect(() => { if (!skipUrlPersist) saveLS('lsdca_compareFundId', compareFundId) }, [compareFundId])
  useEffect(() => {
    if (!skipUrlPersist) saveLS('lsdca_portfolio', portfolio ? {
      slots: portfolio.slots, rebalFreq: portfolio.rebalFreq,
      name: portfolio.isNameCustom ? portfolio.name : undefined,
    } : null)
  }, [portfolio])

  const fundOptions = useMemo(
    () => funds.map(f => ({ value: f.id, label: f.name_vi })),
    [funds],
  )

  // Bond/balanced funds for cash fund picker
  const cashFundOptions = useMemo(
    () => funds
      .filter(f => ['VFF', 'DCBF', 'BVBF', 'SSIBF', 'DCIP'].includes(f.id))
      .map(f => ({ value: f.id, label: f.name_vi })),
    [funds],
  )

  // Collect fund IDs needed (portfolio slots + cash fund + compare fund)
  const neededIds = useMemo(() => {
    const ids = new Set<string>()
    if (portfolio) {
      for (const s of portfolio.slots) {
        if (s.fundId) ids.add(s.fundId)
      }
    }
    if (cashMode === 'fund' && cashFundId) ids.add(cashFundId)
    if (compareFundId) ids.add(compareFundId)
    return ids
  }, [portfolio, cashMode, cashFundId, compareFundId])

  const neededIdList = useMemo(() => Array.from(neededIds), [neededIds])
  const {
    data: fundData,
    loading,
    errors,
  } = useFundSeriesMap(neededIdList)
  const dataError = Array.from(errors.values())[0] ?? null

  // ── Portfolio management ──
  function addPortfolio() {
    if (portfolio) return
    const num = nextIdRef.current++
    const defaultFundId = funds[0]?.id || ''
    const slots = [{ fundId: defaultFundId, weight: 100 }]
    setPortfolio({
      id: `lsdca${num}`,
      num,
      name: derivePortfolioName(slots, `Portfolio ${num}`),
      isNameCustom: false,
      slots,
      rebalFreq: 'quarterly',
    })
  }

  function updatePortfolio(update: Partial<PortfolioCardState>) {
    setPortfolio(prev => prev ? { ...prev, ...update } : null)
  }

  function addSlot() {
    if (!portfolio) return
    const used = new Set(portfolio.slots.map(s => s.fundId))
    const available = funds.find(f => !used.has(f.id))
    const newSlots = [...portfolio.slots, { fundId: available?.id || '', weight: 0 }]
    const name = portfolio.isNameCustom ? portfolio.name : derivePortfolioName(newSlots, `Portfolio ${portfolio.num}`)
    setPortfolio(prev => prev ? { ...prev, name, slots: newSlots } : null)
  }

  function removeSlot(idx: number) {
    if (!portfolio || portfolio.slots.length <= 1) return
    const newSlots = portfolio.slots.filter((_, i) => i !== idx)
    const name = portfolio.isNameCustom ? portfolio.name : derivePortfolioName(newSlots, `Portfolio ${portfolio.num}`)
    setPortfolio(prev => prev ? { ...prev, name, slots: newSlots } : null)
  }

  function updateSlot(idx: number, update: Partial<DCASlot>) {
    if (!portfolio) return
    const newSlots = portfolio.slots.map((s, i) => i === idx ? { ...s, ...update } : s)
    const name = portfolio.isNameCustom ? portfolio.name : derivePortfolioName(newSlots, `Portfolio ${portfolio.num}`)
    setPortfolio(prev => prev ? { ...prev, name, slots: newSlots } : null)
  }

  function setEqualWeights() {
    if (!portfolio || portfolio.slots.length === 0) return
    const n = portfolio.slots.length
    const w = Math.floor(100 / n)
    const remainder = 100 - w * n
    setPortfolio(prev => prev
      ? { ...prev, slots: prev.slots.map((s, i) => ({ ...s, weight: w + (i < remainder ? 1 : 0) })) }
      : null)
  }

  const totalWeight = portfolio?.slots.reduce((s, f) => s + f.weight, 0) ?? 0
  const canRun = portfolio !== null
    && Math.abs(totalWeight - 100) < 0.01
    && portfolio.slots.every(s => s.fundId)
    && totalCapital > 0
    && (cashMode !== 'fund' || cashFundId !== '')

  function buildSnapshot(): LsDcaSnapshot {
    // Chỉ chụp đúng những quỹ đang cần, để dữ liệu quỹ khác tải về sau không
    // đụng tới kết quả đang hiển thị.
    const snapshot = new Map<string, PricePoint[]>()
    for (const id of neededIds) {
      const prices = fundData.get(id)
      if (prices) snapshot.set(id, prices)
    }
    return {
      params: {
        portfolio: { ...portfolio!, slots: [...portfolio!.slots] },
        totalCapital,
        horizonMonths,
        freq,
        cashMode,
        cashSavingsRate: savingsRate / 100,
        cashFundId,
        compareFundId,
      },
      data: snapshot,
      compareFundName: compareFundId
        ? funds.find(f => f.id === compareFundId)?.name_vi ?? compareFundId
        : null,
    }
  }

  const dataReady = Array.from(neededIds).every(id => fundData.has(id))
    && !loading
    && errors.size === 0

  function runAnalysis() {
    if (!canRun || !portfolio) return
    runCommitted()
  }

  // ── Compute results ──
  const committedRun = useCommittedRun({
    ready: dataReady,
    valid: canRun,
    liveParams: {
      portfolio,
      totalCapital,
      horizonMonths,
      freq,
      cashMode,
      cashSavingsRate: savingsRate / 100,
      cashFundId,
      compareFundId,
    },
    captureSnapshot: buildSnapshot,
    compute: snapshot => {
      const committed = {
        ...snapshot.params,
        data: snapshot.data,
        compareFundName: snapshot.compareFundName,
      }
      const p = committed.portfolio
      if (!p) return null

      const {
        cashMode: cm, cashFundId: cfId, compareFundId: cfId2,
        data: committedData,
      } = committed

      const validSlots = p.slots.filter(s => s.fundId && s.weight > 0)
      if (validSlots.length === 0) return null

      // Collect all fund prices
      const allFundIds = new Set(validSlots.map(s => s.fundId))
      const allPricesRaw = new Map<string, PricePoint[]>()
      for (const id of allFundIds) {
        const data = committedData.get(id)
        if (!data || data.length === 0) return null
        allPricesRaw.set(id, data)
      }

      // Align main portfolio funds
      const aligned = alignFundsToCommonGridDaily(allPricesRaw)

      // Cash fund prices (if needed)
      const cashFundPrices = (cm === 'fund' && cfId) ? committedData.get(cfId) ?? null : null
      if (cm === 'fund' && cfId && !cashFundPrices) return null

      const scenarios = computeRollingScenarios(
        aligned,
        validSlots,
        committed.totalCapital,
        committed.horizonMonths,
        committed.freq,
        cm,
        committed.cashSavingsRate,
        cashFundPrices,
      )

      const summary = summarizeScenarios(scenarios)
      if (!summary) return null

      const histogram = buildHistogram(scenarios)

      const heatmap = computeHeatmap(
        aligned, validSlots, committed.freq, cm, committed.cashSavingsRate, cashFundPrices,
      )

      const holdingCost = computeHoldingCost(
        aligned, validSlots, committed.horizonMonths,
        committed.freq, cm, committed.cashSavingsRate, cashFundPrices,
      )

      /**
       * Bảng chia theo mức giảm từ đỉnh, cho một kỳ nắm giữ cụ thể.
       *
       * Mốc so sánh phải tính lại theo đúng kỳ nắm giữ đó, không mượn con số của
       * kỳ khác, nếu không dòng mốc nói một đằng còn các dải nói một nẻo.
       */
      function bucketView(holdingMonths: number, reuse?: typeof scenarios) {
        const scen = reuse ?? computeRollingScenarios(
          aligned, validSlots, committed.totalCapital, committed.horizonMonths,
          committed.freq, cm, committed.cashSavingsRate, cashFundPrices, holdingMonths,
        )
        const sum = summarizeScenarios(scen)
        return {
          rows: computeDrawdownBuckets(aligned, validSlots, scen, holdingMonths),
          baselineWinRate: sum?.lsWinRate ?? 0,
          baselineCostOfCapital: sum ? -sum.medianDiff : 0,
          totalScenarios: scen.length,
          extraMonths: holdingMonths - committed.horizonMonths,
        }
      }

      // Kỳ "bán ngay" trùng đúng bộ kịch bản của khối tóm tắt, dùng lại cho khỏi tính hai lần.
      const drawdownViews = [
        bucketView(committed.horizonMonths, scenarios),
        bucketView(committed.horizonMonths + 12),
        bucketView(committed.horizonMonths + 24),
      ]

      // Heatmap for comparison fund (if selected)
      let heatmap2: HeatmapCell[][] | null = null
      let compareFundName: string | null = null
      if (cfId2) {
        const comparePrices = committedData.get(cfId2)
        if (comparePrices && comparePrices.length > 0) {
          const compareMap = new Map([[cfId2, comparePrices]])
          const aligned2 = alignFundsToCommonGridDaily(compareMap)
          heatmap2 = computeHeatmap(
            aligned2, [{ fundId: cfId2, weight: 100 }],
            committed.freq, cm, committed.cashSavingsRate, cashFundPrices,
          )
          compareFundName = committed.compareFundName
        }
      }

      // Khoảng thời gian THẬT SỰ đã phân tích: lấy từ chính mảng kịch bản, không
      // lấy dải của quỹ đứng đầu. Danh mục DCDS (2004) cộng E1VFVN30 (2014) chỉ
      // chạy được từ 2014, ghi "từ 2004" là nói quá phạm vi đã kiểm chứng.
      // Ngày cuối cộng thêm kỳ nắm giữ, vì kịch bản cuối còn chạy tới lúc bán.
      const fromDate = scenarios[0]?.startDate ?? ''
      const lastStart = scenarios[scenarios.length - 1]?.startDate ?? ''
      const alignedFirst = aligned.get(validSlots[0]!.fundId)
      const lastAvailable = alignedFirst?.[alignedFirst.length - 1]?.date ?? lastStart
      const effectiveWindow = `${formatDate(fromDate)} → ${formatDate(lastAvailable)}`

      return {
        summary, histogram, heatmap, heatmap2, compareFundName, effectiveWindow,
        drawdownViews,
        // Dùng chung bộ kịch bản "bán ngay khi rải xong" với khối tóm tắt, để
        // hai bảng chia nhóm khác nhau vẫn nói về cùng một tập dữ liệu.
        sincePeak: computeSincePeakBuckets(
          aligned, validSlots, scenarios, committed.horizonMonths,
        ),
        holdingCost, dcaMonths: committed.horizonMonths,
        totalCapital: committed.totalCapital,
        scenarios,
        pathInputs: { aligned, validSlots, cashFundPrices },
      }
    },
  })

  const {
    committed,
    result: results,
    dirty: isDirty,
    run: runCommitted,
    reset: resetCommitted,
  } = committedRun

  // ── Một kịch bản cụ thể ──
  /** null nghĩa là chưa chọn tay, lấy tháng nằm giữa làm mặc định. */
  const [selectedStart, setSelectedStart] = useState<string | null>(null)

  // Chạy lại phân tích thì tháng đang chọn không còn ý nghĩa, trả về mặc định.
  useEffect(() => { setSelectedStart(null) }, [committed])

  const pathView = useMemo(() => {
    if (!results || results.scenarios.length === 0) return null
    const { scenarios, pathInputs } = results
    const byDiff = [...scenarios].sort((a, b) => a.diff - b.diff)
    // diff = LS trừ DCA. Nhỏ nhất là lúc đầu tư một lần thua đậm nhất.
    const worstStart = byDiff[0]!.startDate
    const bestStart = byDiff[byDiff.length - 1]!.startDate
    const medianStart = byDiff[Math.floor(byDiff.length / 2)]!.startDate

    const start = (selectedStart && scenarios.some(s => s.startDate === selectedStart))
      ? selectedStart
      : medianStart

    const path = computeScenarioPath(
      pathInputs.aligned,
      pathInputs.validSlots,
      committed!.params.totalCapital,
      committed!.params.horizonMonths,
      committed!.params.freq,
      committed!.params.cashMode,
      committed!.params.cashSavingsRate,
      pathInputs.cashFundPrices,
      start,
    )
    if (path.length === 0) return null
    return { path, start, worstStart, medianStart, bestStart, scenarios }
    // Chỉ phụ thuộc kết quả đã chốt và tháng người dùng chọn. `results` vốn đã
    // chỉ phụ thuộc `committed`, nên tải quỹ mới về vẫn không kéo theo tính lại.
  }, [results, selectedStart]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──
  function formatDate(d: string): string {
    if (!d) return ''
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  }

  function fmtPct(v: number, decimals = 1): string {
    const pct = (v * 100)
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(decimals)}%`
  }

  function fmtGrowth(g: number): string {
    return fmtPct(g - 1)
  }

  function fmtCapital(n: number): string {
    if (n >= 1_000_000_000) {
      return t('lsdca.billionDong', { v: (n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1) })
    }
    if (n >= 1_000_000) return t('lsdca.millionDong', { v: Math.round(n / 1_000_000) })
    return t('lsdca.dong', { v: n.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') })
  }

  function fmtGrowthOrCagr(growthRatio: number): string {
    if (showCagr && committed && committed.params.horizonMonths > 0) {
      const annualized = Math.pow(growthRatio, 12 / committed.params.horizonMonths) - 1
      return t('lsdca.perYear', { v: fmtPct(annualized) })
    }
    return fmtGrowth(growthRatio)
  }

  function renderHeatmapGrid(data: HeatmapCell[][], label?: string) {
    return (
      <div className={label ? 'lsdca-heatmap-compare' : undefined}>
        {label && <p className="lsdca-heatmap-compare-label">{label}</p>}
        <div className="lsdca-heatmap-wrapper">
          <div className="lsdca-hm-yaxis-title">{t('lsdca.yAxisTitle')}</div>
          <div className="lsdca-heatmap-inner">
            <div
              className="lsdca-heatmap"
              style={{ gridTemplateColumns: `56px repeat(${HEATMAP_DCA_MONTHS.length}, 1fr)` }}
            >
              <div />
              {HEATMAP_DCA_MONTHS.map(m => (
                <div key={m} className="lsdca-hm-col-header">{t('lsdca.months', { n: m })}</div>
              ))}
              {data.map((row, ri) => (
                <React.Fragment key={ri}>
                  <div className="lsdca-hm-row-header">{t('lsdca.years', { n: HEATMAP_HOLDING_YEARS[ri]! })}</div>
                  {row.map((cell, ci) => {
                    if (cell.winRate === null) {
                      return (
                        <div
                          key={ci}
                          className="lsdca-hm-cell lsdca-hm-cell--na"
                          title={t('lsdca.noHistory')}
                        >—</div>
                      )
                    }
                    const tier = cell.winRate >= 0.70 ? 'strong'
                               : cell.winRate >= 0.50 ? 'medium'
                               : 'weak'
                    const wins = Math.round(cell.winRate * cell.totalScenarios)
                    // Số kịch bản chồng lấn trông rất nhiều, nhưng số lần thử
                    // tách rời mới là thứ quyết định con số này đáng tin cỡ nào.
                    const thin = cell.independentWindows < MIN_INDEPENDENT_WINDOWS
                    return (
                      <div
                        key={ci}
                        className={`lsdca-hm-cell lsdca-hm-cell--${tier}${thin ? ' lsdca-hm-cell-lown' : ''}`}
                        title={t('lsdca.cellTooltip', {
                          years: cell.holdingYears,
                          months: cell.dcaMonths,
                          rate: (cell.winRate * 100).toFixed(1),
                          wins,
                          total: cell.totalScenarios,
                          independent: cell.independentWindows,
                        })}
                      >
                        <div className="lsdca-hm-fraction">
                          {wins}<span className="lsdca-hm-slash">/</span>{cell.totalScenarios}
                        </div>
                        <div className="lsdca-hm-bar-wrap">
                          <div className="lsdca-hm-bar" style={{ width: `${cell.winRate * 100}%` }} />
                        </div>
                        <div className="lsdca-hm-pct">
                          {thin && '⚠ '}{t('lsdca.cellWinRate', { rate: (cell.winRate * 100).toFixed(0) })}
                        </div>
                        <div className="lsdca-hm-indep">
                          {t('lsdca.cellEpisodes', { n: cell.independentWindows })}
                        </div>
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="lsdca-hm-xaxis-title">{t('lsdca.xAxisTitle')}</div>
          </div>
        </div>
      </div>
    )
  }

  // ── Render ──
  return (
    <div className="simulation-panel lsdca-panel">
      <div className="panel-header">
        <h2>Lump Sum vs DCA</h2>
        <ShareButton getUrl={() => buildLsDcaUrl({
          totalCapital, horizonMonths, freq, cashMode,
          savingsRate, cashFundId, compareFundId,
          portfolio: portfolio ? {
            slots: portfolio.slots, rebalFreq: portfolio.rebalFreq,
            name: portfolio.isNameCustom ? portfolio.name : undefined,
          } : null,
        })} />
      </div>
      <p className="lsdca-subtitle">{t('lsdca.intro')}</p>

      {/* ── Parameters ── */}
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>

        <div className="dca-param-row">
          <label className="dca-label">{t('lsdca.capital')}</label>
          <div className="dca-amount-input-wrap">
            <div className="dca-amount-input">
              <MoneyInput value={totalCapital} onChange={setTotalCapital} min={1_000_000} />
              <span className="dca-currency">₫</span>
            </div>
            <span className="lsdca-capital-hint">= {fmtCapital(totalCapital)}</span>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('lsdca.spreadOver')}</label>
          <div className="lsdca-horizon-buttons">
            {HORIZON_OPTIONS.map(m => (
              <button
                key={m}
                className={`lsdca-horizon-btn ${horizonMonths === m ? 'lsdca-horizon-btn-active' : ''}`}
                onClick={() => setHorizonMonths(m)}
              >
                {t('lsdca.months', { n: m })}
              </button>
            ))}
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('lsdca.frequency')}</label>
          <div className="lsdca-freq-btns">
            <button
              className={`dca-mode-btn ${freq === 'monthly' ? 'dca-mode-btn-active' : ''}`}
              onClick={() => setFreq('monthly')}
            >
              {t('lsdca.freq.monthly')}
            </button>
            <button
              className={`dca-mode-btn ${freq === 'weekly' ? 'dca-mode-btn-active' : ''}`}
              onClick={() => setFreq('weekly')}
            >
              {t('lsdca.freq.weekly')}
            </button>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('lsdca.idleCapital')}</label>
          <select
            className="dca-freq-select"
            value={cashMode}
            onChange={e => setCashMode(e.target.value as CashMode)}
          >
            <option value="flat">{t('lsdca.idle.flat')}</option>
            <option value="savings">{t('lsdca.idle.savings')}</option>
            <option value="fund">{t('lsdca.idle.fund')}</option>
          </select>
        </div>

        {cashMode === 'savings' && (
          <div className="dca-param-row">
            <label className="dca-label">{t('lsdca.savingsRate')}</label>
            <div className="dca-amount-input">
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={savingsRate}
                onChange={e => setSavingsRate(Math.max(0, Number(e.target.value)))}
              />
              <span className="dca-currency">%</span>
            </div>
          </div>
        )}

        {cashMode === 'fund' && (
          <div className="dca-param-row">
            <label className="dca-label">{t('lsdca.parkFund')}</label>
            <Select
              className="lsdca-cash-fund-select"
              classNamePrefix="fund-search"
              options={cashFundOptions}
              value={cashFundOptions.find(o => o.value === cashFundId) || null}
              onChange={opt => setCashFundId(opt?.value || '')}
              placeholder={t('lsdca.parkPlaceholder')}
              noOptionsMessage={() => t('fundSelector.noOptions')}
              isSearchable
              styles={portfolioSelectStyles}
            />
          </div>
        )}

        <p className="dca-note">
          {t('lsdca.paramsNote1')}<br />
          {t('lsdca.paramsNote2')}<br />
          {t('lsdca.paramsNote3')}
        </p>
      </div>

      {/* ── Portfolio card ── */}
      {portfolio && (
        <PortfolioCard
          portfolio={portfolio}
          pIdx={0}
          funds={funds}
          fundOptions={fundOptions}
          onUpdate={updatePortfolio}
          onRemove={() => setPortfolio(null)}
          onAddSlot={addSlot}
          onRemoveSlot={removeSlot}
          onUpdateSlot={updateSlot}
          onSetEqualWeights={setEqualWeights}
          showRebal={false}
        />
      )}

      {!portfolio && (
        <button className="sim-add-portfolio-btn" onClick={addPortfolio}>
          {t('lsdca.addPortfolio')}
        </button>
      )}

      {portfolio && (
        <div className="btc-run-row">
          <button
            className="sim-run-btn"
            onClick={runAnalysis}
            disabled={!canRun}
          >
            {t('lsdca.run')}
          </button>
          {isDirty && (
            <span className="btc-run-hint">{t('lsdca.staleParams')}</span>
          )}
        </div>
      )}

      {loading && <div className="loading-indicator">{t('app.loading')}</div>}
      {dataError && !loading && <div className="error-banner">{dataError}</div>}

      {/* Pre-run hint */}
      {!committed && !loading && portfolio && (
        <div className="lsdca-pre-run-hint">
          {tr('lsdca.prompt')}
        </div>
      )}

      {/* ── Results ── */}
      {committed && !results && !loading && (
        <div className="error-banner">
          {t('lsdca.insufficientData')}
        </div>
      )}

      {results && (
        <div className="lsdca-results">
          <DividendNotice fundIds={Array.from(new Set([
            ...committed!.params.portfolio!.slots.map(s => s.fundId),
            committed!.params.cashFundId,
            committed!.params.compareFundId,
          ].filter(Boolean)))} />

          <div className="lsdca-window-info">
            {tr('lsdca.scenarioCount', { n: results.summary.totalScenarios })}
            &nbsp;({results.effectiveWindow})
          </div>

          {/* ── Summary card ── */}
          <div className="lsdca-summary-card">
            <div className="lsdca-winner-row">
              <span className="lsdca-winner-label">{t('lsdca.lsWins')}</span>
              <span className={`lsdca-winner-value ${results.summary.lsWinRate >= 0.5 ? 'lsdca-ls-color' : 'lsdca-dca-color'}`}>
                {(results.summary.lsWinRate * 100).toFixed(1)}%
              </span>
              <span className="lsdca-winner-sub">
                {t('lsdca.scenariosOf', {
                  won: Math.round(results.summary.lsWinRate * results.summary.totalScenarios),
                  total: results.summary.totalScenarios,
                })}
              </span>
              <button
                className={`lsdca-cagr-btn ${showCagr ? 'lsdca-cagr-btn-active' : ''}`}
                onClick={() => setShowCagr(v => !v)}
                title={showCagr
                  ? t('lsdca.cagrToggleOn')
                  : t('lsdca.cagrToggleOff', { months: committed!.params.horizonMonths })}
              >
                {t(showCagr ? 'lsdca.cagrOn' : 'lsdca.cagrOff')}
              </button>
            </div>

            <div className="lsdca-stats-context">
              {tr('lsdca.avgIntro', {
                months: committed!.params.horizonMonths,
                n: results.summary.totalScenarios,
              })}
            </div>

            <div className="lsdca-stats-grid">
              <div className="lsdca-stat-col">
                <div className="lsdca-stat-header lsdca-ls-color">Lump Sum</div>
                <div className="lsdca-stat-row">
                  <span>{showCagr
                    ? t('lsdca.avgPerYear')
                    : t('lsdca.avgPeriod', { months: committed!.params.horizonMonths })}</span>
                  <span>{fmtGrowthOrCagr(results.summary.meanLSGrowth)}</span>
                </div>
                <div className="lsdca-stat-row lsdca-stat-row-secondary">
                  <span>{showCagr
                    ? t('lsdca.medianPerYear')
                    : t('lsdca.medianPeriod', { months: committed!.params.horizonMonths })}</span>
                  <span>{fmtGrowthOrCagr(results.summary.medianLSGrowth)}</span>
                </div>
              </div>

              <div className="lsdca-stat-divider" />

              <div className="lsdca-stat-col">
                <div className="lsdca-stat-header lsdca-dca-color">DCA</div>
                <div className="lsdca-stat-row">
                  <span>{showCagr
                    ? t('lsdca.avgPerYear')
                    : t('lsdca.avgPeriod', { months: committed!.params.horizonMonths })}</span>
                  <span>{fmtGrowthOrCagr(results.summary.meanDCAGrowth)}</span>
                </div>
                <div className="lsdca-stat-row lsdca-stat-row-secondary">
                  <span>{showCagr
                    ? t('lsdca.medianPerYear')
                    : t('lsdca.medianPeriod', { months: committed!.params.horizonMonths })}</span>
                  <span>{fmtGrowthOrCagr(results.summary.medianDCAGrowth)}</span>
                </div>
              </div>

            </div>

            <div className="lsdca-percentiles">
              <span className="lsdca-pct-label">{t('lsdca.gapLabel')}</span>
              {([
                ['lsdca.scenario.veryBad', results.summary.p10],
                ['lsdca.scenario.bad',     results.summary.p25],
                ['lsdca.scenario.typical', results.summary.medianDiff],
                ['lsdca.scenario.good',    results.summary.p75],
                ['lsdca.scenario.veryGood', results.summary.p90],
              ] as [TranslationKey, number][]).map(([labelKey, val]) => (
                <span key={labelKey} className="lsdca-pct-item">
                  <span className="lsdca-pct-name">{t(labelKey)}</span>
                  <span className={val >= 0 ? 'lsdca-ls-color' : 'lsdca-dca-color'}>
                    {fmtPct(val)}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Heatmap ── */}
          <div className="lsdca-chart-card">
            <h4 className="lsdca-chart-title">{t('lsdca.heatmap.title')}</h4>
            <p className="lsdca-chart-sub">{t('lsdca.heatmap.meaning')}</p>

            {renderHeatmapGrid(results.heatmap)}

            {/* Legend, đặt ngay dưới heatmap chính để đọc màu trước khi qua phần khác */}
            <div className="lsdca-hm-legend-chips">
              <span className="lsdca-hm-chip lsdca-hm-chip--weak">
                {t('lsdca.legend.dcaWins')}
              </span>
              <span className="lsdca-hm-chip lsdca-hm-chip--medium">
                {t('lsdca.legend.lsEdge')}
              </span>
              <span className="lsdca-hm-chip lsdca-hm-chip--strong">
                {t('lsdca.legend.lsStrong')}
              </span>
            </div>

            {/* Compare fund picker */}
            <div className="lsdca-hm-compare">
              <span className="lsdca-hm-compare-label">{t('lsdca.compareWith')}</span>
              <Select
                className="lsdca-cash-fund-select"
                classNamePrefix="fund-search"
                options={[{ value: '', label: t('lsdca.noCompare') }, ...fundOptions]}
                value={compareFundId
                  ? (fundOptions.find(o => o.value === compareFundId) ?? null)
                  : { value: '', label: t('lsdca.noCompare') }}
                onChange={opt => setCompareFundId(opt?.value || '')}
                placeholder={t('lsdca.comparePlaceholder')}
                noOptionsMessage={() => t('fundSelector.noOptions')}
                isSearchable
                styles={portfolioSelectStyles}
              />
            </div>

            {results.heatmap2 && results.compareFundName && (
              renderHeatmapGrid(results.heatmap2, results.compareFundName)
            )}

            <p className="lsdca-hm-indep-note">
              {t('lsdca.overlapNote', { min: MIN_INDEPENDENT_WINDOWS })}
            </p>

            {/* Explanation toggle */}
            <div className="lsdca-hm-explainer">
              <button
                className="dca-glossary-toggle"
                onClick={() => setShowExplainer(v => !v)}
              >
                {t('lsdca.explainerToggle', { arrow: showExplainer ? '▲' : '▼' })}
              </button>
              {showExplainer && (
                <div className="dca-glossary-content">
                  <p>{tr('lsdca.explainer1')}</p>
                  <ul>
                    <li>{tr('lsdca.explainerLumpSum')}</li>
                    <li>{tr('lsdca.explainerDca')}</li>
                  </ul>
                  <p>{tr('lsdca.explainer2')}</p>
                  <p className="lsdca-hm-explainer-note">{t('lsdca.explainer3')}</p>
                </div>
              )}
            </div>
          </div>

          <HoldingCostChart
            data={results.holdingCost}
            dcaMonths={results.dcaMonths}
            totalCapital={results.totalCapital}
          />

          {pathView && (
            <ScenarioPathChart
              path={pathView.path}
              scenarios={pathView.scenarios}
              worstStart={pathView.worstStart}
              medianStart={pathView.medianStart}
              bestStart={pathView.bestStart}
              selectedStart={pathView.start}
              onSelectStart={setSelectedStart}
              totalCapital={results.totalCapital}
              dcaMonths={results.dcaMonths}
            />
          )}

          {/* ── Histogram ── */}
          <div className="lsdca-chart-card">
            <h4 className="lsdca-chart-title">{t('lsdca.distTitle')}</h4>
            <p className="lsdca-chart-sub">{tr('lsdca.distLegend')}</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={results.histogram}
                margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={Math.max(0, Math.floor(results.histogram.length / 12) - 1)}
                  angle={-40}
                  textAnchor="end"
                  height={48}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: number) => [t('lsdca.distTooltip', { n: value }), t('lsdca.distTooltipLabel')]}
                  labelFormatter={(label: string) => t('lsdca.distTooltipGap', { label })}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {results.histogram.map((bucket, i) => (
                    <Cell
                      key={i}
                      fill={bucket.positive ? '#059669' : '#DC2626'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <DrawdownBucketChart
            views={results.drawdownViews}
            totalCapital={results.totalCapital}
            dcaMonths={results.dcaMonths}
          />

          <SincePeakChart
            rows={results.sincePeak}
            totalCapital={results.totalCapital}
            dcaMonths={results.dcaMonths}
          />
        </div>
      )}

      {!portfolio && !committed && (
        <div className="chart-empty">
          {t('lsdca.emptyState')}
        </div>
      )}
    </div>
  )
}

// Memo hoá: App.tsx luôn mount cả 5 tab (ẩn bằng display:none), nên mỗi lần
// chuyển tab hoặc đổi state ở tab khác đều khiến App re-render. Không memo,
// component này (và toàn bộ chart bên trong) sẽ re-render/reconcile lại mỗi
// lần đó dù props không đổi — với dữ liệu daily (nhiều điểm hơn tuần 5-7 lần)
// chi phí này đủ lớn để gây "đơ" khi chuyển tab.
export const LumpSumDCAPanel = memo(LumpSumDCAPanelImpl)
