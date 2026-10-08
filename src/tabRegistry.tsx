import { lazy, type ReactElement } from 'react'
import type { CalculatorId, DashboardState, FundMeta } from './types'
import type { DcaShareState, LsDcaShareState, ShareUrlState } from './utils/shareUrl'
const CompareTab = lazy(() => import('./components/CompareTab').then(m => ({ default: m.CompareTab })))
const WatchlistPanel = lazy(() => import('./components/WatchlistPanel').then(m => ({ default: m.WatchlistPanel })))
const AdvisorPanel = lazy(() => import('./components/AdvisorPanel').then(m => ({ default: m.AdvisorPanel })))
const RankingPanel = lazy(() => import('./components/RankingPanel').then(m => ({ default: m.RankingPanel })))
const MyPortfolioPanel = lazy(() => import('./components/MyPortfolioPanel').then(m => ({ default: m.MyPortfolioPanel })))
const DCAPanel = lazy(() => import('./components/DCAPanel').then(m => ({ default: m.DCAPanel })))
const StockDCAPanel = lazy(() => import('./components/StockDCAPanel').then(m => ({ default: m.StockDCAPanel })))
const LumpSumDCAPanel = lazy(() => import('./components/LumpSumDCAPanel').then(m => ({ default: m.LumpSumDCAPanel })))
const FundAnalysisPanel = lazy(() => import('./components/FundAnalysisPanel').then(m => ({ default: m.FundAnalysisPanel })))
const OverlapPanel = lazy(() => import('./components/OverlapPanel').then(m => ({ default: m.OverlapPanel })))
const RebalanceSensitivityPanel = lazy(() => import('./components/RebalanceSensitivityPanel').then(m => ({ default: m.RebalanceSensitivityPanel })))
const TacticalAllocationPanel = lazy(() => import('./components/TacticalAllocationPanel').then(m => ({ default: m.TacticalAllocationPanel })))
const BitcoinPanel = lazy(() => import('./components/BitcoinPanel').then(m => ({ default: m.BitcoinPanel })))
const WallOfWorryPanel = lazy(() => import('./components/WallOfWorryPanel').then(m => ({ default: m.WallOfWorryPanel })))
const CalculatorTab = lazy(() => import('./components/calculators/CalculatorTab').then(m => ({ default: m.CalculatorTab })))
const FundProfilePanel = lazy(() => import('./components/FundProfilePanel').then(m => ({ default: m.FundProfilePanel })))
const MethodologyPanel = lazy(() => import('./components/MethodologyPanel').then(m => ({ default: m.MethodologyPanel })))

/**
 * Nguồn duy nhất của danh sách tab.
 *
 * Mỗi tab là một manifest: id (tên trong URL), nhãn hiển thị, và cách render.
 * App.tsx chỉ duyệt registry này. Thêm tab = thêm một entry ở đây, không sửa
 * App.tsx (đúng ô tick 1.1 GRAND_PLAN: "Thêm tab = thêm 1 file, không sửa App.tsx").
 *
 * `keepMounted`: true = ẩn bằng CSS khi không active để GIỮ STATE (người dùng
 * đang chỉnh thông số DCA qua tab khác rồi quay lại vẫn còn nguyên). false =
 * mount khi active, unmount khi rời (chỉ áp cho tab nhẹ, mất số nhập không sao).
 *
 * `wrapperClass`: class tùy chọn gắn vào div bọc panel (vd `compare-content` mà
 * CSS đang dùng để style tiêu đề của tab So Sánh). Không khai báo thì để trống.
 */

/** Kiểu id của tab. Khai báo tay ở đây (17 giá trị), registry và các file khác
 * đều suy từ nó — thêm tab phải thêm id vào union này VÀ một entry trong registry. */
export type TabId =
  | 'compare' | 'ranking' | 'myportfolio' | 'advisor' | 'watchlist' | 'dca' | 'stockdca' | 'lsdca' | 'fundanalysis' | 'overlap'
  | 'rebalance' | 'tactical' | 'bitcoin' | 'wallofworry'
  | 'calculator' | 'methodology' | 'profiles'

/** Manifest của một tab trong registry. */
export interface TabManifest {
  id: TabId
  /**
   * Nhãn hiển thị KHÔNG nằm ở đây. App.tsx tra `tab.<id>` trong từ điển, nên
   * một chuỗi tên tab trong registry chỉ là bản sao thứ hai chờ lệch nhau.
   */
  /** true = giữ state khi ẩn bằng CSS; false = mount khi active */
  keepMounted: boolean
  /** Class tùy chọn gắn vào div bọc panel (vd `compare-content` để CSS style tiêu đề). */
  wrapperClass?: string
  /**
   * true = không hiện nút trong thanh nav, nhưng route và nội dung vẫn còn
   * nguyên (link cũ trỏ ?tab= vào đây vẫn chạy được). Dùng để tạm giấu một
   * tab mà không phải xoá code — khác với xoá hẳn.
   */
  hidden?: boolean
  render: (ctx: TabContext) => ReactElement
}

/** Những thứ mọi tab có thể cần, do App.tsx chuẩn bị (handler ổn định qua useCallback). */
export interface TabContext {
  metadata: FundMeta[]
  state: DashboardState
  updateState: (updates: Partial<DashboardState>) => void
  dcaUrlParams: ShareUrlState<Partial<DcaShareState>>
  lsDcaUrlParams: ShareUrlState<Partial<LsDcaShareState>>
  onChangeFunds: (funds: string[]) => void
  onChangeDateFrom: (v: string | null) => void
  onChangeDateTo: (v: string | null) => void
  onChangeRollingPeriod: (p: number) => void
  onSelectCalculator: (id: CalculatorId) => void
}

export const TAB_REGISTRY: TabManifest[] = [
  {
    id: 'compare',
    keepMounted: true,
    wrapperClass: 'compare-content',
    render: ({ metadata, state, onChangeFunds, onChangeDateFrom, onChangeDateTo, onChangeRollingPeriod }: TabContext): ReactElement => (
      <CompareTab
        metadata={metadata}
        funds={state.funds}
        dateFrom={state.dateFrom}
        dateTo={state.dateTo}
        rollingPeriod={state.rollingPeriod}
        onChangeFunds={onChangeFunds}
        onChangeDateFrom={onChangeDateFrom}
        onChangeDateTo={onChangeDateTo}
        onChangeRollingPeriod={onChangeRollingPeriod}
      />
    ),
  },
  {
    id: 'ranking',
    // keepMounted=false: tab nạp giá của cả 80+ quỹ, không nên tải ngay lúc mở app.
    keepMounted: false,
    render: ({ metadata, updateState }: TabContext): ReactElement => (
      <RankingPanel funds={metadata} onCompare={fundIds => updateState({ funds: fundIds, tab: 'compare' })} />
    ),
  },
  {
    id: 'myportfolio',
    keepMounted: false,
    render: ({ metadata }: TabContext): ReactElement => <MyPortfolioPanel funds={metadata} />,
  },
  {
    id: 'advisor',
    keepMounted: false,
    render: ({ metadata }: TabContext): ReactElement => <AdvisorPanel funds={metadata} />,
  },
  {
    id: 'watchlist',
    keepMounted: false,
    render: ({ metadata, updateState }: TabContext): ReactElement => (
      <WatchlistPanel
        funds={metadata}
        onCompare={fundIds => updateState({ funds: fundIds, tab: 'compare' })}
      />
    ),
  },
  {
    id: 'dca',
    keepMounted: true,
    render: ({ metadata, state, dcaUrlParams }: TabContext): ReactElement => <DCAPanel funds={metadata} active={state.tab === 'dca'} shareUrl={dcaUrlParams} />,
  },
  {
    id: 'stockdca',
    keepMounted: true,
    render: (): ReactElement => <StockDCAPanel />,
  },
  {
    id: 'lsdca',
    keepMounted: true,
    render: ({ metadata, state, lsDcaUrlParams }: TabContext): ReactElement => <LumpSumDCAPanel funds={metadata} active={state.tab === 'lsdca'} shareUrl={lsDcaUrlParams} />,
  },
  {
    id: 'fundanalysis',
    keepMounted: true,
    render: ({ metadata }: TabContext): ReactElement => <FundAnalysisPanel funds={metadata} />,
  },
  {
    id: 'overlap',
    keepMounted: true,
    render: ({ metadata }: TabContext): ReactElement => <OverlapPanel funds={metadata} />,
  },
  {
    id: 'rebalance',
    keepMounted: true,
    render: ({ metadata }: TabContext): ReactElement => <RebalanceSensitivityPanel funds={metadata} />,
  },
  {
    id: 'tactical',
    keepMounted: true,
    render: ({ metadata }: TabContext): ReactElement => <TacticalAllocationPanel funds={metadata} />,
  },
  {
    id: 'bitcoin',
    keepMounted: true,
    render: ({ metadata }: TabContext): ReactElement => <BitcoinPanel funds={metadata} />,
  },
  {
    id: 'wallofworry',
    keepMounted: true,
    hidden: true,
    render: (): ReactElement => <WallOfWorryPanel />,
  },
  {
    id: 'calculator',
    keepMounted: false,
    render: ({ state, onSelectCalculator }: TabContext): ReactElement => (
      <CalculatorTab calcId={state.calcId} onSelect={onSelectCalculator} />
    ),
  },
  {
    id: 'profiles',
    keepMounted: false,
    render: ({ metadata }: TabContext): ReactElement => <FundProfilePanel funds={metadata} />,
  },
  {
    id: 'methodology',
    keepMounted: false,
    render: (): ReactElement => <MethodologyPanel />,
  },
] as const
