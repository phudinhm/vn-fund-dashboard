import { useState, useEffect, useMemo, memo } from 'react'
import Select from 'react-select'
import {
  AreaChart, Area, BarChart, Bar, Cell, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import type { FundMeta, PricePoint, ReturnPoint } from '../types'
import { loadLS, saveLS } from '../utils/localStorage'
import { formatVND, formatVNDAxis } from '../utils/vndFormat'
import { maxDrawdown, drawdownSeries } from '../utils/calculations'
import {
  parseTidyPortfolio, parseTidyAssets, parseTidyIncome, parseTidyIndicators, fundReportPeriods, resolveReportPeriod,
  type FundPeriodSummary, type FundAssetsSnapshot, type FundIncomeSummary, type FundFlowSummary,
} from '../utils/fundReport'
import { RedFlagDetectors } from './RedFlagSection'
import { FundHoldingsAnalysis } from './FundHoldingsAnalysis'
import {
  findGroupedOption, type FundOptionGroup,
} from '../utils/fundSelectOptions'
import { useT, useTRich, type TranslationKey } from '../i18n'
import { useLanguage, type Language } from '../hooks/useLanguage'
import { sectorName } from '../utils/sectorName'

/**
 * Tab "Phân Tích Quỹ" — đọc báo cáo tài chính tháng chính thức (Thông tư
 * 98/2020/TT-BTC) của quỹ, hiện tại chỉ DCDS có dữ liệu tidy (92 kỳ).
 *
 * Bố cục:
 *   1. Tổng tài sản — pie phân bổ 4 loại tài sản + chi tiết bên phải.
 *   2. Tổng tài sản qua các tháng — cột, luôn hiện toàn bộ lịch sử.
 *   3. Tiền mặt qua các tháng — cột, luôn hiện toàn bộ lịch sử.
 *   4. Danh mục quỹ — bảng cổ phiếu.
 * Input "Kỳ báo cáo" đặt RIÊNG trong block 1 và block 4 (độc lập nhau,
 * mặc định "Mới nhất"). Hai biểu đồ cột là xu hướng nên không có input.
 */

interface Props {
  funds: FundMeta[]
}

interface FundOption {
  value: string
  label: string
}

/** Quỹ có báo cáo tài chính tidy. Thêm khi quỹ khác có report (xem
 *  scripts/fund_report/README.md và workflow "Backfill Fund Reports"). */
const REPORT_FUNDS = ['DCDS', 'DCBF', 'DCIP']

/** Màu tài sản theo bảng màu digiinvest (donut + cards phân bổ).
 *  Cổ phiếu + tổng tài sản dùng màu chủ đạo dashboard (--color-primary)
 *  để khớp tone button tab. */
const ASSET_COLORS = {
  stock: 'var(--color-primary)',
  bond: '#818cf8',
  cash: '#34d399',
  other: '#94a3b8',
} as const

/** Màu bar biểu đồ xu hướng + màu highlight tháng đang chọn. */
const SERIES_COLOR = '#3b82f6'
const CASH_SERIES_COLOR = '#16a34a'
const BANK_DEPOSIT_COLOR = '#0d9488'

/** Màu chart NAV/CCQ (giá quỹ) + xanh/đỏ cho lợi nhuận & dòng tiền. */
const NAV_CCQ_COLOR = '#0ea5e9'
const PROFIT_POS = '#059669'
const PROFIT_NEG = '#dc2626'
const FLOW_POS = '#059669'
const FLOW_NEG = '#dc2626'

/** Màu chart thu nhập / chi phí / lãi-lỗ (từ báo cáo kết quả hoạt động). */
const DIVIDEND_COLOR = '#059669'
const INTEREST_COLOR = '#0ea5e9'
const MGMT_FEE_COLOR = '#f59e0b'
const BROKERAGE_COLOR = '#f97316'
/** Màu chart mới: quy mô / dòng tiền / turnover / nhà đầu tư. */
const UNITS_COLOR = '#64748b'
const INVEST_COLOR = '#3b82f6'
const FLOW_NAV_COLOR = '#f97316'
const TURNOVER_COLOR = '#3b82f6'
const INVESTOR_COLOR = '#8b5cf6'
const OWNERSHIP_FMC_COLOR = '#6366f1'
const TOP10_COLOR = '#e11d48'
const FOREIGN_COLOR = '#0ea5e9'
const TOTAL_COST_COLOR = '#0ea5e9'

/** Màu chart: drawdown / red flags. */
const DRAWDOWN_COLOR = '#dc2626'
const LIAB_COLOR = '#b45309'
const SETTLE_COLOR = '#f97316'
const AUM_AXIS_COLOR = '#3b82f6'
const FLOW_AXIS_COLOR = '#f97316'

/** Palette cho donut phân bổ ngành. */
const INDUSTRY_COLORS = ['#3b82f6', '#f59e0b', '#059669', '#8b5cf6', '#ef4444', '#0ea5e9', '#f97316', '#64748b']

/** Các section kết quả (kiểu tab DCA): bấm pill để chỉ hiện section đó. */
const ANALYSIS_SECTIONS = [
  { id: 'all', labelKey: 'fa.sec.all' as TranslationKey },
  { id: 'allocation', labelKey: 'fa.sec.allocation' as TranslationKey },
  { id: 'perf', labelKey: 'fa.sec.perf' as TranslationKey },
  { id: 'size', labelKey: 'fa.sec.size' as TranslationKey },
  { id: 'cost', labelKey: 'fa.sec.cost' as TranslationKey },
  { id: 'redflags', labelKey: 'fa.sec.redFlags' as TranslationKey },
] as const
type AnalysisSectionId = typeof ANALYSIS_SECTIONS[number]['id']

/** Các loại tài sản cho stacked bar cơ cấu (khớp ASSET_COLORS). */
const ALLOC_KEYS = ['stock', 'bond', 'cash', 'other'] as const
const ALLOC_FIELDS = ['stockValue', 'bondValue', 'cashValue', 'otherValue'] as const

interface PeriodOption {
  value: string | null
  label: string
}

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
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-text-muted)' }),
  menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 20, backgroundColor: 'var(--color-surface)' }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    fontSize: '0.9rem',
    backgroundColor: state.isSelected ? 'var(--color-primary)' : state.isFocused ? 'var(--color-primary-light)' : undefined,
    color: state.isSelected ? 'white' : 'var(--color-text)',
  }),
}

/** "2026-07-31" → "Tháng 7/2026" (vi) hoặc "7/2026" (en) */
function usePeriodLabel(): (periodEnd: string) => string {
  const t = useT()
  return (periodEnd: string) => {
    const [y, m] = periodEnd.split('-')
    if (!y || !m) return periodEnd
    return t('fa.periodLabel', { month: Number(m), year: y })
  }
}

/** "2026-07-31" → "7/26" (nhãn trục X gọn cho 92 bar). */
function formatAxisTick(periodEnd: string): string {
  const [y, m] = periodEnd.split('-')
  if (!y || !m) return periodEnd
  return `${Number(m)}/${y.slice(2)}`
}

/**
 * Định dạng tiền kiểu digiinvest: "5.971,7 tỷ" — nhóm nghìn bằng dấu chấm,
 * dấu phẩy thập phân, 1 số lẻ từ 10 tỷ trở lên, 2 số lẻ dưới 10 tỷ.
 */
function formatVNDLocale(value: number, lang: Language): string {
  const sign = value < 0 ? '-' : ''
  const ty = Math.abs(value) / 1_000_000_000
  const decimals = ty >= 10 ? 1 : 2
  const [int = '0', frac = '0'] = ty.toFixed(decimals).split('.')
  const vi = lang === 'vi'
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, vi ? '.' : ',')
  return `${sign}${grouped}${vi ? ',' : '.'}${frac} ${vi ? 'tỷ' : 'bn'}`
}

/** Chữ ký delta có dấu, vd "+16,3%" / "-17,2%". value = phân số (0.163). */
function signedPct(value: number): string {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${(Math.abs(value) * 100).toFixed(1)}%`
}

export function top10StocksForPeriod(
  portfolio: Map<string, FundPeriodSummary> | null,
  period: string | null,
) {
  return (period ? portfolio?.get(period)?.stocks : null)?.slice(0, 10) ?? []
}

export function industryAllocationForPeriod(
  portfolio: Map<string, FundPeriodSummary> | null,
  period: string | null,
  industryMap: Record<string, string>,
  /** Nhãn cho mã không tra được ngành. Tên ngành là dữ liệu, chỉ nhãn này là UI. */
  otherLabel = 'Khác',
) {
  const stocks = period ? portfolio?.get(period)?.stocks : null
  if (!stocks) return []

  const byIndustry = new Map<string, number>()
  for (const stock of stocks) {
    const industry = sectorName(industryMap[stock.ticker] ?? otherLabel)
    byIndustry.set(industry, (byIndustry.get(industry) ?? 0) + stock.weightPct)
  }

  return [...byIndustry.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

function FundAnalysisPanelImpl({ funds }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const formatPeriodLabel = usePeriodLabel()
  const [fundId, setFundId] = useState<string>(() =>
    loadLS<string>('fund_analysis_fund', REPORT_FUNDS[0]!))
  /** Quỹ nào có dữ liệu danh mục (holdings) + nguồn của nó. */
  const [holdingsSource, setHoldingsSource] = useState<Map<string, string | null>>(new Map())
  const [piePeriod, setPiePeriod] = useState<string | null>(() => loadLS<string | null>('fund_analysis_pie_period', null))
  const [tablePeriod, setTablePeriod] = useState<string | null>(() => loadLS<string | null>('fund_analysis_table_period', null))

  const [portfolio, setPortfolio] = useState<Map<string, FundPeriodSummary> | null>(null)
  const [assets, setAssets] = useState<Map<string, FundAssetsSnapshot> | null>(null)
  const [income, setIncome] = useState<Map<string, FundIncomeSummary> | null>(null)
  const [flow, setFlow] = useState<Map<string, FundFlowSummary> | null>(null)
  const [industryMap, setIndustryMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<AnalysisSectionId>('all')

  useEffect(() => { saveLS('fund_analysis_fund', fundId) }, [fundId])
  useEffect(() => { saveLS('fund_analysis_pie_period', piePeriod) }, [piePeriod])
  useEffect(() => { saveLS('fund_analysis_table_period', tablePeriod) }, [tablePeriod])

  const showSection = (id: AnalysisSectionId) =>
    activeSection === 'all' || activeSection === id ? undefined : 'none'

  const isReportFund = REPORT_FUNDS.includes(fundId)

  // Quỹ nào có holdings — nguồn dữ liệu cho các quỹ chưa có báo cáo tài chính.
  useEffect(() => {
    let cancelled = false
    fetch('/data/holdings_index.json')
      .then(r => (r.ok ? r.json() : []))
      .then((entries: { id: string; source?: string }[]) => {
        if (cancelled || !Array.isArray(entries)) return
        setHoldingsSource(new Map(entries.map(e => [e.id, e.source ?? null])))
      })
      .catch(() => { /* không có holdings index thì chỉ còn quỹ có báo cáo */ })
    return () => { cancelled = true }
  }, [])

  // Load dữ liệu báo cáo của quỹ đang chọn (static, chỉ fetch 1 lần mỗi fund).
  // Quỹ không có báo cáo tài chính dùng FundHoldingsAnalysis, không fetch ở đây.
  useEffect(() => {
    if (!isReportFund) {
      setLoading(false)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      const [pfResp, asResp, icResp, flResp, indResp] = await Promise.all([
        fetch(`/data/${fundId}/tidied/tidy_portfolio.csv`),
        fetch(`/data/${fundId}/tidied/tidy_assets.csv`),
        fetch(`/data/${fundId}/tidied/tidy_income.csv`),
        fetch(`/data/${fundId}/tidied/tidy_indicators.csv`),
        fetch('/data/industry_map.json'),
      ])
      if (cancelled) return
      const pf = pfResp.ok ? await pfResp.text() : ''
      const as = asResp.ok ? await asResp.text() : ''
      const ic = icResp.ok ? await icResp.text() : ''
      const fl = flResp.ok ? await flResp.text() : ''
      const ind = indResp.ok ? (await indResp.json()) as Record<string, string> : {}
      if (!pf) {
        setError(t('fa.noReports'))
      }
      setPortfolio(parseTidyPortfolio(pf))
      setAssets(parseTidyAssets(as))
      setIncome(parseTidyIncome(ic))
      setFlow(parseTidyIndicators(fl))
      setIndustryMap(ind)
      setLoading(false)
    }

    load().catch(() => {
      if (!cancelled) {
        setError(t('fa.loadFailed'))
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [fundId, isReportFund])

  const periods = useMemo(
    () => portfolio ? fundReportPeriods(portfolio) : [],
    [portfolio],
  )

  const pieResolved = useMemo(
    () => portfolio ? resolveReportPeriod(periods, piePeriod) : null,
    [portfolio, periods, piePeriod],
  )
  const tableResolved = useMemo(
    () => portfolio ? resolveReportPeriod(periods, tablePeriod) : null,
    [portfolio, periods, tablePeriod],
  )

  /**
   * Quỹ chọn được: quỹ có báo cáo tài chính (phân tích đầy đủ) + quỹ có dữ
   * liệu danh mục (phân tích theo holdings). Tách hai nhóm trong dropdown để
   * người dùng biết trước mức chi tiết sẽ nhận được.
   */
  const fundGroups: FundOptionGroup[] = useMemo(() => {
    const label = (id: string) => funds.find(f => f.id === id)?.name_vi ?? id
    const reportOptions = REPORT_FUNDS.map(id => ({ value: id, label: label(id) }))
    const holdingsOnly = funds
      .filter(f => !REPORT_FUNDS.includes(f.id) && holdingsSource.has(f.id))
      .map(f => ({ value: f.id, label: f.name_vi }))

    const groups: FundOptionGroup[] = [
      { label: t('fa.group.fullReports', { n: reportOptions.length }), options: reportOptions },
    ]
    if (holdingsOnly.length > 0) {
      groups.push({ label: t('fa.group.holdingsOnly', { n: holdingsOnly.length }), options: holdingsOnly })
    }
    return groups
  }, [funds, holdingsSource])

  const selectedFund = useMemo(
    () => findGroupedOption(fundGroups, fundId)
      ?? { value: fundId, label: funds.find(f => f.id === fundId)?.name_vi ?? fundId },
    [fundGroups, fundId, funds],
  )
  const selectedMeta = funds.find(f => f.id === fundId)

  const periodOptions: PeriodOption[] = useMemo(
    () => [
      { value: null, label: t('fa.latest') },
      ...periods.map(p => ({ value: p, label: formatPeriodLabel(p) })),
    ],
    [periods],
  )

  // ── Block 1: Tổng tài sản (donut + cards phân bổ) ──
  const piePeriodSummary = pieResolved ? portfolio?.get(pieResolved) : null
  const pieIndex = pieResolved ? periods.indexOf(pieResolved) : -1
  // Kỳ trước (chronological) để so delta "so với kỳ trước" — kỳ cũ nhất không có.
  const prevPeriod = pieIndex >= 0 && pieIndex < periods.length - 1 ? periods[pieIndex + 1] : null
  const prevSummary = prevPeriod ? portfolio?.get(prevPeriod) : null

  const pieData = useMemo(() => {
    const a = piePeriodSummary?.allocation
    if (!a) return []
    const items = [
      { name: t('fa.asset.stock'), value: a.stockValue, field: 'stockValue' as const, color: ASSET_COLORS.stock },
      { name: t('fa.asset.bond'), value: a.bondValue, field: 'bondValue' as const, color: ASSET_COLORS.bond },
      { name: t('fa.asset.cash'), value: a.cashValue, field: 'cashValue' as const, color: ASSET_COLORS.cash },
      { name: t('fa.asset.other'), value: a.otherValue, field: 'otherValue' as const, color: ASSET_COLORS.other },
    ]
    return items.filter(d => d.value > 0)
  }, [piePeriodSummary])

  // Conic-gradient 4 slice, mỗi slice một cặp stop (màu từ → màu đến theo phần trăm).
  const donutGradient = useMemo(() => {
    const a = piePeriodSummary?.allocation
    if (!a || a.totalValue <= 0) return null
    let acc = 0
    const stops: string[] = []
    for (const d of pieData) {
      const from = (acc / a.totalValue) * 100
      acc += d.value
      const to = (acc / a.totalValue) * 100
      stops.push(`${d.color} ${from.toFixed(2)}%, ${d.color} ${to.toFixed(2)}%`)
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [piePeriodSummary, pieData])

  const pieTotal = piePeriodSummary?.allocation.totalValue ?? 0
  const pieAssets = pieResolved ? assets?.get(pieResolved) : null

  // Delta so kỳ trước cho header + từng loại tài sản.
  const headerDelta = useMemo(() => {
    const prevTotal = prevSummary?.allocation.totalValue
    if (prevTotal == null || prevTotal <= 0 || !prevPeriod) return null
    const delta = pieTotal - prevTotal
    return {
      label: formatPeriodLabel(prevPeriod),
      absLabel: formatVNDLocale(Math.abs(delta), language),
      pctLabel: signedPct(delta / prevTotal),
      positive: delta >= 0,
    }
  }, [prevSummary, prevPeriod, pieTotal, language, formatPeriodLabel])

  const categoryDelta = (field: 'stockValue' | 'bondValue' | 'cashValue' | 'otherValue', value: number) => {
    const prevVal = prevSummary?.allocation[field]
    if (prevVal == null || !prevPeriod) return null
    const delta = value - prevVal
    // Kỳ trước = 0 (vd trái phiếu mới xuất hiện) thì không có % — chỉ ghi số tuyệt đối.
    const pctLabel = prevVal > 0 ? ` (${signedPct(delta / prevVal)})` : ''
    return {
      label: `${formatVNDLocale(Math.abs(delta), language)}${pctLabel}`,
      positive: delta >= 0,
      show: delta !== 0,
    }
  }

  // ── Block 2 & 3: chuỗi tổng tài sản / tiền mặt qua các tháng ──
  // periods xếp GIẢM dần (cho dropdown); biểu đồ cột phải chạy tăng dần theo
  // thời gian (cũ nhất trái → mới nhất phải), nên đảo ngược riêng cho chart.
  const chartPeriods = useMemo(() => [...periods].reverse(), [periods])
  // ── Chart B: quy mô quỹ = tài sản RÒNG (NAV cuối kỳ, 2217) ──
  // Dùng NAV thay vì tổng tài sản gộp (2212): AUM chuẩn ngành là tài sản
  // thuộc về nhà đầu tư, không pha nợ phải trả. Khớp 2243 trong báo cáo.
  const aumSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: assets?.get(p)?.nav ?? 0,
    })),
    [assets, chartPeriods],
  )

  // ── Chart A: NAV/CCQ (giá quỹ) theo tháng — từ tidy_assets 2219 ──
  const navCcqSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: assets?.get(p)?.navPerUnit ?? 0,
    })),
    [assets, chartPeriods],
  )

  // ── Chart B: cơ cấu tài sản theo tháng (100% stacked) ──
  const allocationSeries = useMemo(
    () => chartPeriods.map(p => {
      const a = portfolio?.get(p)?.allocation
      const tot = a && a.totalValue > 0 ? a.totalValue : 0
      const pct = (v: number) => (tot ? (v / tot) * 100 : 0)
      return {
        period: p,
        stock: pct(a?.stockValue ?? 0),
        bond: pct(a?.bondValue ?? 0),
        cash: pct(a?.cashValue ?? 0),
        other: pct(a?.otherValue ?? 0),
      }
    }),
    [portfolio, chartPeriods],
  )

  // ── Tiền mặt (tiền và tương đương tiền) tuyệt đối theo tháng ──
  const cashSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: portfolio?.get(p)?.allocation.cashValue ?? 0,
    })),
    [portfolio, chartPeriods],
  )

  // ── Chart C: Lợi nhuận quỹ THẬT theo tháng — 2237 (đổi NAV do đầu tư) ──
  const profitSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: income?.get(p)?.investmentProfit ?? 0,
    })),
    [income, chartPeriods],
  )

  // ── Chart C2: Phân rã lãi/lỗ đầu tư — thực hiện (2235) + chưa thực hiện (2236) ──
  const gainSeries = useMemo(
    () => chartPeriods.map(p => {
      const s = income?.get(p)
      return {
        period: p,
        realized: s?.realizedGain ?? 0,
        unrealized: s?.unrealizedGain ?? 0,
      }
    }),
    [income, chartPeriods],
  )

  // ── Chart D: Thu nhập theo tháng — cổ tức (2221.1) + lãi tiền gửi (2222) ──
  const incomeSrcSeries = useMemo(
    () => chartPeriods.map(p => {
      const s = income?.get(p)
      return {
        period: p,
        dividends: s?.dividends ?? 0,
        interest: s?.interestIncome ?? 0,
      }
    }),
    [income, chartPeriods],
  )

  // ── Chart D2: Chi phí theo tháng — phí quản lý (2225) + phí giao dịch (2231) ──
  const costSeries = useMemo(
    () => chartPeriods.map(p => {
      const s = income?.get(p)
      return {
        period: p,
        mgmtFee: s?.managementFee ?? 0,
        brokerageFee: s?.brokerageFee ?? 0,
      }
    }),
    [income, chartPeriods],
  )

  // ── Chart E: dòng tiền ròng (2239.3) — thay đổi NAV do phát hành/mua lại ──
  // Dùng con số chính xác từ báo cáo thay vì (số CCQ 2277−22781) × NAV/CCQ cuối kỳ
  // vốn là ước tính (lệch ~2% vì mua/bán diễn ra ở NAV khác nhau trong tháng).
  const flowSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: income?.get(p)?.navChangeByFlow ?? 0,
    })),
    [income, chartPeriods],
  )

  // ── Phát hành (2239.3.1) / mua lại (2239.3.2) CCQ theo tháng ──
  // 25 kỳ đầu (trước 12/2020) báo cáo không tách mục này → null để vẽ khoảng trống.
  const subRedSeries = useMemo(
    () => chartPeriods.map(p => {
      const s = income?.get(p)
      return {
        period: p,
        subscription: s?.subscriptionFlow ?? null,
        redemption: s?.redemptionFlow ?? null,
      }
    }),
    [income, chartPeriods],
  )

  // ── Chart mới: số chứng chỉ quỹ lưu hành (2281) ──
  const unitsSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: flow?.get(p)?.outstandingUnits ?? 0,
    })),
    [flow, chartPeriods],
  )

  // ── Chart mới: thay đổi tổng NAV — đầu tư (2237) vs dòng tiền (2239.3) ──
  const navChangeSeries = useMemo(
    () => chartPeriods.map(p => {
      const s = income?.get(p)
      return {
        period: p,
        investment: s?.investmentProfit ?? 0,
        flow: s?.navChangeByFlow ?? 0,
      }
    }),
    [income, chartPeriods],
  )

  // ── Chart mới: lợi nhuận theo tháng (% NAV/CCQ) — hiệu quả thật trên 1 đơn vị ──
  const navCcqReturnSeries = useMemo(() => {
    const out: { period: string; value: number }[] = []
    for (let i = 0; i < chartPeriods.length; i++) {
      const p = chartPeriods[i]!
      const cur = assets?.get(p)?.navPerUnit ?? 0
      const prev = i > 0 ? assets?.get(chartPeriods[i - 1]!)?.navPerUnit ?? 0 : 0
      out.push({ period: p, value: prev > 0 ? ((cur - prev) / prev) * 100 : 0 })
    }
    return out
  }, [assets, chartPeriods])

  // ── Chart mới: portfolio turnover rate (2270) ──
  // CSV lưu tỉ lệ thô (6,8399 = 6,84 lần = 683,99%). Báo cáo công bố theo phần trăm
  // nên ×100 trước khi vẽ để khớp con số công bố.
  const turnoverSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: (flow?.get(p)?.turnoverRate ?? 0) * 100,
    })),
    [flow, chartPeriods],
  )

  // ── Chart mới: số nhà đầu tư (22841) ──
  const investorSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      value: flow?.get(p)?.investorCount ?? 0,
    })),
    [flow, chartPeriods],
  )

  // ── Cơ cấu sở hữu: 2282 (công ty quản lý + bên liên quan), 2283 (top 10), 2284 (nước ngoài) ──
  const relatedPartySeries = useMemo(
    () => chartPeriods.map(p => ({ period: p, value: flow?.get(p)?.relatedPartyOwnership ?? null })),
    [flow, chartPeriods],
  )
  const top10Series = useMemo(
    () => chartPeriods.map(p => ({ period: p, value: flow?.get(p)?.top10Ownership ?? null })),
    [flow, chartPeriods],
  )
  const foreignSeries = useMemo(
    () => chartPeriods.map(p => ({ period: p, value: flow?.get(p)?.foreignOwnership ?? null })),
    [flow, chartPeriods],
  )

  // ── Chart mới: chi phí/NAV (%) — phí quản lý (2265) + tổng chi phí (2269) ──
  const feeRatioSeries = useMemo(
    () => chartPeriods.map(p => {
      const s = flow?.get(p)
      return {
        period: p,
        mgmtFee: s?.mgmtFeeRatio ?? 0,
        totalCost: s?.expenseRatio ?? 0,
      }
    }),
    [flow, chartPeriods],
  )

  // ── Chuỗi NAV/CCQ theo tháng (PricePoint) — đầu vào cho các công thức có sẵn ──
  const navCcqPoints: PricePoint[] = useMemo(
    () => chartPeriods
      .map(p => ({ date: p, price: assets?.get(p)?.navPerUnit ?? 0 }))
      .filter(x => x.price > 0),
    [assets, chartPeriods],
  )
  const navCcqReturns: ReturnPoint[] = useMemo(() => {
    const out: ReturnPoint[] = []
    for (let i = 0; i < navCcqPoints.length; i++) {
      const prev = navCcqPoints[i - 1]?.price ?? 0
      out.push({ date: navCcqPoints[i]!.date, value: prev > 0 ? navCcqPoints[i]!.price / prev - 1 : 0 })
    }
    return out
  }, [navCcqPoints])

  // ── Max drawdown (Area, dùng drawdownSeries có sẵn) ──
  const drawdownSeriesData = useMemo(
    () => drawdownSeries(navCcqReturns).map(p => ({ period: p.date, value: p.value * 100 })),
    [navCcqReturns],
  )
  const maxDD = useMemo(() => maxDrawdown(navCcqReturns), [navCcqReturns])

  // ── Nhóm 3: phân bổ ngành theo kỳ đang chọn (donut) ──
  const industryAlloc = useMemo(() => {
    return industryAllocationForPeriod(portfolio, pieResolved, industryMap, t('fa.industry.other'))
  }, [portfolio, pieResolved, industryMap])

  // Top 6 ngành + "Còn lại", kèm màu cho donut.
  const industryPie = useMemo(() => {
    const top = industryAlloc.slice(0, 6).map(d => ({ ...d }))
    const rest = industryAlloc.slice(6).reduce((s, x) => s + x.value, 0)
    if (rest > 0.01) top.push({ name: t('fa.asset.rest'), value: rest })
    return top.map((d, i) => ({ ...d, color: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]! }))
  }, [industryAlloc])

  // ── Nhóm 3: danh mục kỳ đang chọn (bảng) ──
  const tableStocks = useMemo(
    () => (tableResolved ? portfolio?.get(tableResolved)?.stocks : null) ?? [],
    [portfolio, tableResolved],
  )

  // Top 10 nằm cùng snapshot với Tổng tài sản, không dùng kỳ của bảng.
  const top10Stocks = useMemo(
    () => top10StocksForPeriod(portfolio, pieResolved),
    [portfolio, pieResolved],
  )

  // ── Nhóm 3: mức độ tập trung top-5 qua các kỳ ──
  const top5Concentration = useMemo(
    () => chartPeriods.map(p => {
      const stocks = portfolio?.get(p)?.stocks ?? []
      const top5 = stocks.slice(0, 5).reduce((s, x) => s + x.weightPct, 0)
      return { period: p, value: top5 }
    }),
    [portfolio, chartPeriods],
  )

  // ── Nhóm 5: nợ phải trả (2216) + phải thu bán CK chưa về (2208) ──
  const liabilitySeries = useMemo(
    () => chartPeriods.map(p => ({ period: p, value: assets?.get(p)?.liabilities ?? 0 })),
    [assets, chartPeriods],
  )
  const settlementSeries = useMemo(
    () => chartPeriods.map(p => ({ period: p, value: assets?.get(p)?.settlementReceivables ?? 0 })),
    [assets, chartPeriods],
  )
  const bankDepositSeries = useMemo(
    () => chartPeriods.map(p => ({ period: p, value: assets?.get(p)?.cashAtBank ?? 0 })),
    [assets, chartPeriods],
  )
  const cashAumSeries = useMemo(
    () => chartPeriods.map(p => {
      const cash = portfolio?.get(p)?.allocation.cashValue ?? null
      const nav = assets?.get(p)?.nav ?? null
      return {
        period: p,
        value: cash !== null && nav !== null && nav > 0 ? (cash / nav) * 100 : null,
      }
    }),
    [portfolio, assets, chartPeriods],
  )

  // ── Nhóm 5: độ lệch pha AUM vs dòng tiền (dual-axis) ──
  // AUM = NAV (tài sản ròng), nhất quán với chart "Quy mô quỹ" và narrative.
  const aumFlowSeries = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      AUM: assets?.get(p)?.nav ?? 0,
      flow: income?.get(p)?.navChangeByFlow ?? 0,
    })),
    [assets, income, chartPeriods],
  )

  // ── Red Flags: điểm dữ liệu cho detector (thuần, asc theo kỳ) ──
  const redFlagPoints = useMemo(
    () => chartPeriods.map(p => ({
      period: p,
      turnoverRate: flow?.get(p)?.turnoverRate ?? null,
      brokerageFee: income?.get(p)?.brokerageFee ?? null,
      managementFee: income?.get(p)?.managementFee ?? null,
    })),
    [flow, income, chartPeriods],
  )

  const selectPeriod = (
    value: string | null,
    onChange: (v: string | null) => void,
  ) => (
    <Select<PeriodOption>
      className="fund-search-select"
      classNamePrefix="fund-search"
      options={periodOptions}
      value={value === null
        ? { value: null, label: t('fa.latest') }
        : { value, label: formatPeriodLabel(value) }}
      onChange={opt => opt && onChange(opt.value)}
      isClearable={false}
      styles={selectStyles}
    />
  )

  if (error) {
    return (
      <div className="simulation-panel dca-panel">
        <div className="error-banner">{error}</div>
      </div>
    )
  }

  return (
    <div className="simulation-panel dca-panel">
      <div className="panel-header">
        <h2>{t('fa.title')}</h2>
      </div>

      {/* ── Thông số ── */}
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>
        <div className="dca-param-row">
          <label className="dca-label">{t('fa.fund')}</label>
          <div className="overlap-select">
            <Select<FundOption, false, FundOptionGroup>
              className="fund-search-select"
              classNamePrefix="fund-search"
              options={fundGroups}
              value={selectedFund}
              onChange={opt => opt && setFundId(opt.value)}
              isSearchable
              placeholder={t('fundSelector.searchPlaceholder')}
              noOptionsMessage={() => t('fundSelector.noOptions')}
              styles={selectStyles}
            />
          </div>
        </div>
      </div>

      {/* Quỹ chưa có báo cáo tài chính: phân tích dựa trên danh mục + chuỗi giá. */}
      {!isReportFund && selectedMeta && (
        <FundHoldingsAnalysis
          fund={selectedMeta}
          source={holdingsSource.get(fundId) ?? null}
        />
      )}

      {isReportFund && loading && <div className="loading-indicator">{t('app.loading')}</div>}

      {isReportFund && !loading && portfolio && (
        <>
          {/* ── Pills chọn section (kiểu tab DCA) ── */}
          <div className="dca-anchor-nav">
            {ANALYSIS_SECTIONS.map(s => (
              <button
                key={s.id}
                className={`dca-anchor-btn${activeSection === s.id ? ' dca-anchor-btn--active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>

          {/* ════════════ Nhóm 3: Cấu trúc & Phân bổ ════════════ */}
          <div style={{ display: showSection('allocation') }}>
            <div className="section-divider">
              <span className="section-divider-label">{t('fa.sec.allocation')}</span>
            </div>

            {/* ── Tổng tài sản snapshot (donut 4 loại + kỳ báo cáo) ── */}
            <div className="chart-container">
              <div className="chart-header">
                <h3>{t('fa.totalAssets')}</h3>
              </div>
              <div className="dca-param-row">
                <label className="dca-label">{t('fa.reportPeriod')}</label>
                <div className="overlap-select">{selectPeriod(piePeriod, setPiePeriod)}</div>
              </div>
              {piePeriodSummary && pieData.length > 0 ? (
                <>
                  <div className="fund-analysis-summary">
                    <div className="fund-analysis-total-left">
                      <div className="fund-analysis-total-caption">{t('fa.totalAssets')}</div>
                      <div className="fund-analysis-total-value">{formatVNDLocale(pieTotal, language)}</div>
                      {headerDelta && (
                        <div className={`fund-analysis-delta ${headerDelta.positive ? 'pos' : 'neg'}`}>
                          {t('fa.vsPeriod', {
                            period: headerDelta.label,
                            abs: headerDelta.absLabel,
                            pct: headerDelta.pctLabel,
                          })}
                        </div>
                      )}
                    </div>
                    {donutGradient && (
                      <div className="fund-analysis-donut-wrap">
                        <div className="fund-analysis-donut" style={{ background: donutGradient }}>
                          <div className="fund-analysis-donut-hole" />
                        </div>
                      </div>
                    )}
                    <div className="fund-analysis-alloc-cards">
                      {pieData.map(d => {
                        const delta = categoryDelta(d.field, d.value)
                        return (
                          <div key={d.name} className="fund-analysis-alloc-card">
                            <div className="fund-analysis-alloc-head">
                              <span className="fund-analysis-alloc-dot" style={{ backgroundColor: d.color }} />
                              <span className="fund-analysis-alloc-name">{d.name}</span>
                            </div>
                            <div className="fund-analysis-alloc-value">{formatVNDLocale(d.value, language)}</div>
                            <div className="fund-analysis-alloc-meta">
                              <span className="fund-analysis-alloc-pct">
                                {pieTotal > 0 ? ((d.value / pieTotal) * 100).toFixed(1) : 0}%
                              </span>
                              {delta && delta.show && (
                                <span className={`fund-analysis-alloc-delta ${delta.positive ? 'pos' : 'neg'}`}>
                                  {delta.positive ? '↑' : '↓'} {delta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  {pieAssets && pieAssets.nav > 0 && (
                    <p className="fund-analysis-nav">
                      NAV: <strong>{formatVND(pieAssets.nav)}</strong>
                      {pieAssets.navPerUnit > 0 && <> · {tr('fa.navPerUnit', {
                        v: Math.round(pieAssets.navPerUnit).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'),
                      })}</>}
                      {' '}{t('fa.periodSuffix', { period: formatPeriodLabel(pieResolved!) })}
                    </p>
                  )}
                </>
              ) : (
                <p className="overlap-empty">{t('fa.noPortfolioData')}</p>
              )}
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.industryTitle')}</h3>
                </div>
                {industryPie.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={industryPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive={false}>
                          {industryPie.map(d => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: number | string, name: string) => [`${Number(value).toFixed(1)}%`, name]}
                        />
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
                  {t('fa.industryNote', {
                    period: pieResolved ? formatPeriodLabel(pieResolved) : t('fa.currentPeriod'),
                  })}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.top10Title')}</h3>
                </div>
                {top10Stocks.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={top10Stocks} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="ticker" width={72} interval={0} tick={{ fontSize: 11 }} tickFormatter={(t: string) => (t.length > 12 ? `${t.slice(0, 11)}…` : t)} />
                      <RechartsTooltip
                        formatter={(value: number | string) => [`${Number(value).toFixed(2)}%`, t('fa.weight')]}
                        labelFormatter={(ticker: string) => `${ticker}${industryMap[ticker] ? ` · ${sectorName(industryMap[ticker]!)}` : ''}`}
                      />
                      <Bar dataKey="weightPct" fill={ASSET_COLORS.stock} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="overlap-empty">{t('fa.noStocks')}</p>
                )}
                <p className="fund-analysis-chart-note">
                  {t('fa.top10Note', {
                    period: pieResolved ? formatPeriodLabel(pieResolved) : t('fa.currentPeriod'),
                  })}
                </p>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-header">
                <h3>{t('fa.concentrationTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={top5Concentration} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v)}%`} tick={{ fontSize: 11 }} width={48} domain={[0, 100]} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${Number(value).toFixed(1)}%`, 'Top 5']}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="value" stroke={INVESTOR_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.concentrationNote')}
                </p>
              </div>

            {/* ── Danh mục quỹ (bảng, kèm kỳ báo cáo riêng) ── */}
            <div className="chart-container">
              <div className="chart-header">
                <h3>{t('fa.portfolioTitle')}</h3>
              </div>
              <div className="dca-param-row">
                <label className="dca-label">{t('fa.reportPeriod')}</label>
                <div className="overlap-select">{selectPeriod(tablePeriod, setTablePeriod)}</div>
              </div>
              {tableStocks.length > 0 ? (
                <div className="dca-stats-table-scroll fund-analysis-table-scroll">
                  <table className="dca-stats-table overlap-table">
                    <thead>
                      <tr>
                        <th>{t('fa.col.security')}</th>
                        <th>{t('fa.col.quantity')}</th>
                        <th>{t('fa.col.value')}</th>
                        <th>{t('fa.weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableStocks.map(s => (
                        <tr key={s.ticker}>
                          <td>
                            <span className="fund-analysis-symbol">{s.ticker}</span>
                            {industryMap[s.ticker] && (
                              <span className="fund-analysis-industry">{sectorName(industryMap[s.ticker]!)}</span>
                            )}
                          </td>
                          <td>{s.quantity > 0 ? s.quantity.toLocaleString('vi-VN') : '—'}</td>
                          <td>{formatVND(s.value)}</td>
                          <td>{s.weightPct.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="overlap-empty">{t('fa.noStocksInPortfolio')}</p>
              )}
            </div>
          </div>

          {/* ════════════ Nhóm 1: Hiệu suất & Rủi ro ════════════ */}
          <div style={{ display: showSection('perf') }}>
            <div className="section-divider">
              <span className="section-divider-label">{t('fa.sec.perf')}</span>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.navChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={navCcqSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="navCcqFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={NAV_CCQ_COLOR} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={NAV_CCQ_COLOR} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tick={{ fontSize: 11 }} width={76} domain={['auto', 'auto']} tickFormatter={(v: number) => `${Math.round(v).toLocaleString('vi-VN')}`} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [
                        `${Number(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')} đ`,
                        t('fa.navLabel'),
                      ]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Area type="monotone" dataKey="value" stroke={NAV_CCQ_COLOR} strokeWidth={2} fill="url(#navCcqFill)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.navNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.ddChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={drawdownSeriesData} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v)}%`} tick={{ fontSize: 11 }} width={54} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${Number(value).toFixed(1)}%`, t('fa.ddLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Area type="monotone" dataKey="value" stroke={DRAWDOWN_COLOR} strokeWidth={2} fill="rgba(220,38,38,0.25)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.ddNote', {
                    deepest: maxDD < 0
                      ? ` −${(Math.abs(maxDD) * 100).toFixed(0)}%`
                      : t('fa.ddNotEnough'),
                  })}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.profitChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={profitSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.profitLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" isAnimationActive={false}>
                      {profitSeries.map(d => (
                        <Cell key={d.period} fill={d.value >= 0 ? PROFIT_POS : PROFIT_NEG} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.profitNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.navPctChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={navCcqReturnSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} width={54} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${Number(value).toFixed(2)}%`, t('fa.navPctLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" isAnimationActive={false}>
                      {navCcqReturnSeries.map(d => (
                        <Cell key={d.period} fill={d.value >= 0 ? PROFIT_POS : PROFIT_NEG} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.navPctNote')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.realizedChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={gainSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.realizedLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="realized" isAnimationActive={false}>
                      {gainSeries.map(d => (
                        <Cell key={d.period} fill={d.realized >= 0 ? PROFIT_POS : PROFIT_NEG} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.realizedNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.unrealizedChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={gainSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.unrealizedLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="unrealized" isAnimationActive={false}>
                      {gainSeries.map(d => (
                        <Cell key={d.period} fill={d.unrealized >= 0 ? PROFIT_POS : PROFIT_NEG} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.unrealizedNote')}
                </p>
              </div>
            </div>
          </div>

          {/* ════════════ Nhóm 2: Quy mô & Dòng tiền ════════════ */}
          <div style={{ display: showSection('size') }}>
            <div className="section-divider">
              <span className="section-divider-label">{t('fa.sec.size')}</span>
            </div>

            <div className="fund-analysis-insight">
              {t('fa.sizeIntro')}
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.aumTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={aumSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="aumFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={SERIES_COLOR} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={SERIES_COLOR} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.aumLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Area type="monotone" dataKey="value" stroke={SERIES_COLOR} strokeWidth={2} fill="url(#aumFill)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.aumNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.unitsTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={unitsSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1e6)}tr`} tick={{ fontSize: 11 }} width={54} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [
                        t('fa.unitsValue', { v: Number(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') }),
                        t('fa.unitsLabel'),
                      ]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="value" stroke={UNITS_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.subChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={subRedSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.series.subscription')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="subscription" fill={PROFIT_POS} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.subNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.redChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={subRedSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.series.redemption')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="redemption" fill={PROFIT_NEG} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.redNote')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.netFlowTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={flowSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.netFlowLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" isAnimationActive={false}>
                      {flowSeries.map(d => (
                        <Cell key={d.period} fill={d.value >= 0 ? FLOW_POS : FLOW_NEG} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.netFlowNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.navSplitTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={navChangeSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string, name: string) => [formatVND(Number(value)), name]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="investment" fill={INVEST_COLOR} isAnimationActive={false} />
                    <Bar dataKey="flow" fill={FLOW_NAV_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="fund-analysis-stack-legend">
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: INVEST_COLOR }} />{t('fa.legend.investment')}</span>
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: FLOW_NAV_COLOR }} />{t('fa.legend.flow')}</span>
                </div>
                <p className="fund-analysis-chart-note">
                  {t('fa.navSplitNote1')}<br />
                  {t('fa.navSplitNote2')}<br />
                  {t('fa.navSplitNote3')}<br />
                  <br />
                  {t('fa.navSplitNote4')}<br />
                  <br />
                  {t('fa.navSplitNote5')}<br />
                  <br />
                  {t('fa.navSplitNote6')}<br />
                  <br />
                  {t('fa.navSplitNote7')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.allocPctTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={allocationSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v)}%`} tick={{ fontSize: 11 }} width={44} domain={[0, 100]} />
                    <RechartsTooltip
                      formatter={(value: number | string, name: string) => [`${Number(value).toFixed(1)}%`, name]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    {ALLOC_KEYS.map((k, i) => (
                      <Area
                        key={k}
                        dataKey={k}
                        stackId="a"
                        stroke={ALLOC_FIELDS[i] === 'stockValue' ? ASSET_COLORS.stock : ALLOC_FIELDS[i] === 'bondValue' ? ASSET_COLORS.bond : ALLOC_FIELDS[i] === 'cashValue' ? ASSET_COLORS.cash : ASSET_COLORS.other}
                        fill={ALLOC_FIELDS[i] === 'stockValue' ? ASSET_COLORS.stock : ALLOC_FIELDS[i] === 'bondValue' ? ASSET_COLORS.bond : ALLOC_FIELDS[i] === 'cashValue' ? ASSET_COLORS.cash : ASSET_COLORS.other}
                        fillOpacity={0.7}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
                <div className="fund-analysis-stack-legend">
                  {ALLOC_KEYS.map((k, i) => (
                    <span key={k} className="fund-analysis-stack-legend-item">
                      <span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: ALLOC_FIELDS[i] === 'stockValue' ? ASSET_COLORS.stock : ALLOC_FIELDS[i] === 'bondValue' ? ASSET_COLORS.bond : ALLOC_FIELDS[i] === 'cashValue' ? ASSET_COLORS.cash : ASSET_COLORS.other }} />
                      {k}
                    </span>
                  ))}
                </div>
                <p className="fund-analysis-chart-note">
                  {t('fa.allocPctNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.cashTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cashSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.asset.cash')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" fill={CASH_SERIES_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.cashNote')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.depositTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={bankDepositSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.depositLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" fill={BANK_DEPOSIT_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.depositNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.cashPctTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cashAumSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${Math.round(v)}%`} tick={{ fontSize: 11 }} width={48} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${Number(value).toFixed(1)}%`, t('fa.cashPctLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" fill={BANK_DEPOSIT_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.cashPctNote')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.investorsTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={investorSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} width={50} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [
                        t('fa.investorsValue', { v: Number(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') }),
                        t('fa.investorsTitle'),
                      ]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" fill={INVESTOR_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.investorsNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.managerOwnTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={relatedPartySeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} width={44} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${(Number(value) * 100).toFixed(2)}%`, t('fa.managerOwnLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="value" stroke={OWNERSHIP_FMC_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.managerOwnNote')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.top10InvTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={top10Series} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} width={44} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${(Number(value) * 100).toFixed(2)}%`, t('fa.top10InvLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="value" stroke={TOP10_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.top10InvNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.foreignTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={foreignSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} width={44} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${(Number(value) * 100).toFixed(2)}%`, t('fa.foreignLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="value" stroke={FOREIGN_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.foreignNote')}
                </p>
              </div>
            </div>
          </div>

          {/* ════════════ Nhóm 4: Chi phí & Hiệu quả ════════════ */}
          <div style={{ display: showSection('cost') }}>
            <div className="section-divider">
              <span className="section-divider-label">{t('fa.sec.cost')}</span>
            </div>

            <p className="fund-analysis-narrative">
              {t('fa.costIntro')}
            </p>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.incomeTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={incomeSrcSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string, name: string) => [formatVND(Number(value)), name]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="dividends" stackId="a" fill={DIVIDEND_COLOR} isAnimationActive={false} />
                    <Bar dataKey="interest" stackId="a" fill={INTEREST_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="fund-analysis-stack-legend">
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: DIVIDEND_COLOR }} />{t('fa.legend.dividends')}</span>
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: INTEREST_COLOR }} />{t('fa.legend.interest')}</span>
                </div>
                <p className="fund-analysis-chart-note">
                  {t('fa.incomeNote1')}
                </p>
                <p className="fund-analysis-chart-note fund-analysis-note-em">
                  {t('fa.incomeNote2')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.costChartTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={costSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string, name: string) => [formatVND(Number(value)), name]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="mgmtFee" stackId="a" fill={MGMT_FEE_COLOR} isAnimationActive={false} />
                    <Bar dataKey="brokerageFee" stackId="a" fill={BROKERAGE_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="fund-analysis-stack-legend">
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: MGMT_FEE_COLOR }} />{t('fa.legend.mgmtFee')}</span>
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: BROKERAGE_COLOR }} />{t('fa.legend.brokerageFee')}</span>
                </div>
                <p className="fund-analysis-chart-note">
                  {t('fa.costNote1')}<br />
                  {t('fa.costNote2')}<br />
                  {t('fa.costNote3')}<br />
                  <br />
                  {t('fa.costNote4')}<br />
                  <br />
                  {t('fa.costNote5')}
                </p>
              </div>
            </div>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.costRatioTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={feeRatioSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${(v * 100).toFixed(2)}%`} tick={{ fontSize: 11 }} width={56} domain={[0, 'auto']} />
                    <RechartsTooltip
                      formatter={(value: number | string, name: string) => [`${(Number(value) * 100).toFixed(2)}%`, name]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="mgmtFee" stroke={MGMT_FEE_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="totalCost" stroke={TOTAL_COST_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="fund-analysis-stack-legend">
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: MGMT_FEE_COLOR }} />{t('fa.legend.mgmtRatio')}</span>
                  <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: TOTAL_COST_COLOR }} />{t('fa.legend.totalRatio')}</span>
                </div>
                <p className="fund-analysis-chart-note">
                  {t('fa.costRatioNote')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>Portfolio turnover rate</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={turnoverSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => `${v.toFixed(1)}%`} tick={{ fontSize: 11 }} width={54} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [`${Number(value).toFixed(2)}%`, 'Turnover']}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" fill={TURNOVER_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.turnoverNote')}
                </p>
              </div>
            </div>
          </div>

          {/* ════════════ Nhóm 5: Red Flags ════════════ */}
          <div style={{ display: showSection('redflags') }}>
            <div className="section-divider">
              <span className="section-divider-label">{t('fa.sec.redFlags')}</span>
            </div>

            <p className="fund-analysis-narrative">
              {t('fa.redFlagsIntro')}
            </p>

            <div className="fund-analysis-charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.liabilitiesTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={liabilitySeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.liabilitiesLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Line type="monotone" dataKey="value" stroke={LIAB_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.liabNote1')}<br />
                  {t('fa.liabNote2')}<br />
                  {t('fa.liabNote3')}<br />
                  {t('fa.liabNote4')}<br />
                  <br />
                  {t('fa.liabNote5')}<br />
                  <br />
                  {t('fa.liabNote6')}
                </p>
              </div>

              <div className="chart-container">
                <div className="chart-header">
                  <h3>{t('fa.receivableTitle')}</h3>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={settlementSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                    <YAxis tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                    <RechartsTooltip
                      formatter={(value: number | string) => [formatVND(Number(value)), t('fa.receivableLabel')]}
                      labelFormatter={(p: string) => formatPeriodLabel(p)}
                    />
                    <Bar dataKey="value" fill={SETTLE_COLOR} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="fund-analysis-chart-note">
                  {t('fa.recvNote1')}<br />
                  <br />
                  {t('fa.recvNote2')}<br />
                  {t('fa.recvNote3')}<br />
                  {t('fa.recvNote4')}<br />
                  <br />
                  {t('fa.recvNote5')}<br />
                  <br />
                  {t('fa.recvNote6')}
                </p>
              </div>
            </div>

            <div className="chart-container">
              <div className="chart-header">
                <h3>{t('fa.aumFlowTitle')}</h3>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={aumFlowSeries} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickFormatter={formatAxisTick} tick={{ fontSize: 10 }} minTickGap={32} />
                  <YAxis yAxisId="aum" tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                  <YAxis yAxisId="flow" orientation="right" tickFormatter={(v: number) => formatVNDAxis(v)} tick={{ fontSize: 11 }} width={76} />
                  <RechartsTooltip
                    formatter={(value: number | string, name: string) => [formatVND(Number(value)), name]}
                    labelFormatter={(p: string) => formatPeriodLabel(p)}
                  />
                  <Line yAxisId="aum" type="monotone" dataKey="AUM" stroke={AUM_AXIS_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line yAxisId="flow" type="monotone" dataKey="flow" stroke={FLOW_AXIS_COLOR} strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="fund-analysis-stack-legend">
                <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: AUM_AXIS_COLOR }} />{t('fa.legend.aumLeft')}</span>
                <span className="fund-analysis-stack-legend-item"><span className="fund-analysis-stack-legend-dot" style={{ backgroundColor: FLOW_AXIS_COLOR }} />{t('fa.legend.flowRight')}</span>
              </div>
              <p className="fund-analysis-chart-note">
                {t('fa.aumFlowNote1')}<br />
                {t('fa.aumFlowNote2')}<br />
                {t('fa.aumFlowNote3')}<br />
                <br />
                {t('fa.aumFlowNote4')}<br />
                {t('fa.aumFlowNote5')}<br />
                {t('fa.aumFlowNote6')}<br />
                {t('fa.aumFlowNote7')}<br />
                <br />
                {t('fa.aumFlowNote8')}<br />
                {t('fa.aumFlowNote9')}<br />
                {t('fa.aumFlowNote10')}<br />
                {t('fa.aumFlowNote11')}<br />
                {t('fa.aumFlowNote12')}<br />
                <br />
                {t('fa.aumFlowNote13')}
              </p>
            </div>

            <RedFlagDetectors points={redFlagPoints} />
          </div>
        </>
      )}
    </div>
  )
}

export const FundAnalysisPanel = memo(FundAnalysisPanelImpl)
