import { useCallback, useMemo } from 'react'
import type { CalculatorId } from './types'
import { useFundMetadata } from './hooks/useFundData'
import { useUrlState } from './hooks/useUrlState'
import { useTheme } from './hooks/useTheme'
import { useLanguage } from './hooks/useLanguage'
import { useT } from './i18n'
import { TAB_REGISTRY, type TabContext, type TabId } from './tabRegistry'
import { SeoMetadata } from './components/SeoMetadata'

/** Icon gợi ý cho từng tab — thuần trang trí, chỉ để quét nhanh bằng mắt. */
const TAB_ICONS: Record<TabId, string> = {
  compare: '📊',
  watchlist: '⭐',
  dca: '📅',
  lsdca: '⚖️',
  fundanalysis: '🔍',
  overlap: '🧩',
  rebalance: '🔄',
  tactical: '🎯',
  bitcoin: '₿',
  wallofworry: '🌩️',
  calculator: '🧮',
  methodology: '📐',
}

export function App() {
  const { metadata, metadataError, loading: metaLoading } = useFundMetadata()
  const { state, updateState, dcaUrlParams, lsDcaUrlParams } = useUrlState()
  const { theme, toggle: toggleTheme } = useTheme()
  const { language, toggle: toggleLanguage } = useLanguage()
  const t = useT()

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
      <header className="app-header">
        <div className="app-header-brand">
          <span className="app-header-mark" aria-hidden="true">MP</span>
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
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Tabs — duyệt registry, không hardcode */}
      <nav className="tabs">
        {TAB_REGISTRY.map(tab => (
          <button
            key={tab.id}
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
      {TAB_REGISTRY.map(tab =>
        tab.keepMounted ? (
          <div
            key={tab.id}
            className={tab.wrapperClass ? `${tab.wrapperClass} ${state.tab === tab.id ? '' : 'tab-panel-hidden'}` : (state.tab === tab.id ? undefined : 'tab-panel-hidden')}
          >
            {tab.render(tabContext)}
          </div>
        ) : (
          state.tab === tab.id && <div key={tab.id}>{tab.render(tabContext)}</div>
        ),
      )}

      <footer className="app-footer">
        <p>{t('app.footer.dataSource')}</p>
        <p>{t('app.footer.by')}</p>
      </footer>
    </div>
  )
}
