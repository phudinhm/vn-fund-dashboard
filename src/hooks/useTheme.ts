import { useCallback, useSyncExternalStore } from 'react'
import { loadLS, saveLS } from '../utils/localStorage'

const STORAGE_KEY = 'theme_v1'

export type Theme = 'light' | 'dark'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(t: Theme) {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', t)
}

/** Store ngoài React (giống useWatchlist) — set data-theme lên <html> ngay lúc
 *  module load, trước cả render đầu tiên, để tránh nháy sáng/tối khi vào trang. */
let theme: Theme = loadLS<Theme>(STORAGE_KEY, systemPrefersDark() ? 'dark' : 'light')
applyTheme(theme)

const listeners = new Set<() => void>()

function setTheme(next: Theme) {
  theme = next
  saveLS(STORAGE_KEY, next)
  applyTheme(next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Theme {
  return theme
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const current = useSyncExternalStore(subscribe, getSnapshot)
  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [])
  return { theme: current, toggle }
}
