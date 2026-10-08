import { Suspense, useCallback, useEffect, useMemo, useState, type ReactElement } from 'react'
import type { CalculatorId } from './types'
import { useFundMetadata } from './hooks/useFundData'
import { useUrlState } from './hooks/useUrlState'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'
import { useT } from './i18n'
import { TAB_REGISTRY, type TabContext, type TabId } from './tabRegistry'
import { BrandMark } from './components/BrandMark'
import { useScrollDim } from './hooks/useScrollDim'
import { useTabsPill } from './hooks/useTabsPill'
import { SeoMetadata } from './components/SeoMetadata'
import {
  IconBank,
  IconBitcoin,
  IconCalculator,
  IconCalendar,
  IconCandles,
  IconCloud,
  IconCoin,
  IconCompare,
  IconCompass,
  IconMoon,
  IconOverlap,
  IconRefresh,
  IconRuler,
  IconScale,
  IconSearch,
  IconStar,
  IconSun,
  IconTarget,
  IconTrophy,
} from './components/icons'

/** Nút bấm được trong nav — đăng ký (ẩn) không tính. */
const VISIBLE_TABS = TAB_REGISTRY.filter(tab => !tab.hidden)

/**
 * Icon gợi ý cho từng tab — thuần trang trí, chỉ để quét nhanh bằng mắt.
 * SVG nét đơn (xem components/icons.tsx) thay vì emoji: emoji có màu riêng
 * theo hệ điều hành, không theo được theme sáng/tối hay màu chủ đạo của app.
 */
const TAB_ICONS: Record<TabId, ReactElement> = {
  compare: <IconCompare />,
  ranking: <IconTrophy />,
  myportfolio: <IconCoin />,
  advisor: <IconCompass />,
  watchlist: <IconStar />,
  dca: <IconCalendar />,
  stockdca: <IconCandles />,
  lsdca: <IconScale />,
  fundanalysis: <IconSearch />,
  overlap: <IconOverlap />,
  rebalance: <IconRefresh />,
  tactical: <IconTarget />,
  bitcoin: <IconBitcoin />,
  wallofworry: <IconCloud />,
  calculator: <IconCalculator />,
  profiles: <IconBank />,
  methodology: <IconRuler />,
}

/** Khung chờ khi chunk của tab đang tải: giữ chỗ để trang không giật. */
function TabSkeleton(): ReactElement {
  return (
    <div className="tab-skeleton" role="status" aria-busy="true">
      <div className="tab-skeleton-bar tab-skeleton-bar--title" />
      <div className="tab-skeleton-bar" />
      <div className="tab-skeleton-block" />
      <div className="tab-skeleton-block" />
    </div>
  )
}

export function App() {
  const { metadata, metadataError, loading: metaLoading } = useFundMetadata()
  const headerDim = useScrollDim()
  const { state, updateState, dcaUrlParams, lsDcaUrlParams } = useUrlState()
  const { theme, toggle: toggleTheme } = useTheme()
  const { language, toggle: toggleLanguage } = useLanguage()
  const t = useT()
  const { navRef, pillRef, registerTab } = useTabsPill(state.tab)

  // Stable callback references (qua useCallback, dep chỉ là `updateState` vốn
  // đã ổn định) để CompareTab (React.memo) không bị coi là "props đổi" mỗi
  // khi App re-render vì lý do khác (vd chuyển sang tab khác).
  const onChangeFunds = useCallback((funds: string[]) => updateState({ funds }), [updateState])
  const onChangeDateFrom = useCallback((v: string | null) => updateState({ dateFrom: v }), [updateState])
  const onChangeDateTo = useCallback((v: string | null) => updateState({ dateTo: v }), [updateState])
  const onChangeRollingPeriod = useCallback((p: number) => updateState({ rollingPeriod: p }), [updateState])
  const onSelectCalculator = useCallback((calcId: CalculatorId) => updateState({ calcId }), [updateState])

  // Context truyền vào từng tab. Phải đặt TRƯỚC early return (Rules of Hooks):
  // mọi hook gọi vô điều kiện ở đầu component. Khi metadata chưa có thì chỉ
  // là [] thừa — không ai dùng vì đã return loading screen.
  // Tab keepMounted chỉ mount lần đầu khi được mở (rồi giữ state), thay vì mount hết lúc khởi động.
  const [visited, setVisited] = useState<Set<TabId>>(() => new Set([state.tab]))
  useEffect(() => {
    setVisited(v => (v.has(state.tab) ? v : new Set(v).add(state.tab)))
  }, [state.tab])

  const tabContext = useMemo<TabContext>(
    () => ({
      metadata: metadata ?? [],
      state,
      updateState,
      dcaUrlParams,
      lsDcaUrlParams,
      onChangeFunds,
      onChangeDateFrom,
      onChangeDateTo,
      onChangeRollingPeriod,
      onSelectCalculator,
    }),
    [metadata, state, updateState, dcaUrlParams, lsDcaUrlParams, onChangeFunds, onChangeDateFrom, onChangeDateTo, onChangeRollingPeriod, onSelectCalculator],
  )

  if (metaLoading) {
    return <div className="loading-screen">{t('app.loading')}</div>
  }

  if (metadataError || !metadata) {
    return <div className="error-screen">{metadataError || t('app.error')}</div>
  }

  return (
    <div className="app">
      <SeoMetadata tab={state.tab} />
      <header className={`app-header${headerDim ? ' app-header--dim' : ''}`}>
        <div className="app-header-brand">
          <BrandMark />
          <h1>{t(`heading.${state.tab}`)}</h1>
        </div>
        <div className="app-header-actions">
          <button
            className="lang-toggle-btn"
            onClick={toggleLanguage}
            title={t('app.language.toggle')}
            aria-label={t('app.language.toggle')}
          >
            {language === 'vi' ? 'EN' : 'VI'}
          </button>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('app.theme.toLight') : t('app.theme.toDark')}
            aria-label={theme === 'dark' ? t('app.theme.toLight') : t('app.theme.toDark')}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      {/* Sidebar dọc trên màn rộng, thanh cuộn ngang trên mobile — xem .app-body
          trong index.css. 12 tab xếp ngang bị cắt mất một nửa ở màn thường. */}
      <div className="app-body">
        {/* Tabs — duyệt registry (đã lọc tab ẩn), không hardcode */}
        <nav className="tabs" aria-label={t('app.nav.label')} ref={navRef}>
          <span className="tabs-pill" ref={pillRef} aria-hidden="true" />
          {VISIBLE_TABS.map(tab => (
            <button
              key={tab.id}
              ref={registerTab(tab.id)}
              className={`tab ${state.tab === tab.id ? 'tab-active' : ''}`}
              onClick={() => updateState({ tab: tab.id })}
              aria-current={state.tab === tab.id ? 'page' : undefined}
            >
              <span className="tab-icon" aria-hidden="true">{TAB_ICONS[tab.id]}</span>
              {t(`tab.${tab.id}`)}
            </button>
          ))}
        </nav>

        {/* Panel: keepMounted = ẩn bằng CSS để giữ state; ngược lại mount khi active */}
        <main className="app-main">
          {TAB_REGISTRY.map(tab =>
            tab.keepMounted ? (
              !visited.has(tab.id) && state.tab !== tab.id ? null : (
              <div
                key={tab.id}
                className={tab.wrapperClass ? `${tab.wrapperClass} ${state.tab === tab.id ? '' : 'tab-panel-hidden'}` : (state.tab === tab.id ? undefined : 'tab-panel-hidden')}
              >
                <Suspense fallback={<TabSkeleton />}>{tab.render(tabContext)}</Suspense>
              </div>
              )
            ) : (
              state.tab === tab.id && <div key={tab.id}><Suspense fallback={<TabSkeleton />}>{tab.render(tabContext)}</Suspense></div>
            ),
          )}
        </main>
      </div>

      <footer className="app-footer">
        <p>{t('app.footer.dataSource')}</p>
        <p>{t('app.footer.by')}</p>
      </footer>
    </div>
  )
}
