import { useCallback, useSyncExternalStore } from 'react'
import { loadLS, saveLS } from '../utils/localStorage'

const STORAGE_KEY = 'language_v1'

export type Language = 'vi' | 'en'

/** Store ngoài React (giống useWatchlist/useTheme) — mọi component gọi
 *  useLanguage() dùng chung một nguồn, đổi ở đâu cũng phản ánh khắp app. */
let language: Language = loadLS<Language>(STORAGE_KEY, 'vi')
const listeners = new Set<() => void>()

function setStoredLanguage(next: Language) {
  language = next
  saveLS(STORAGE_KEY, next)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): Language {
  return language
}

export interface UseLanguageResult {
  language: Language
  setLanguage: (lang: Language) => void
  toggle: () => void
}

export function useLanguage(): UseLanguageResult {
  const current = useSyncExternalStore(subscribe, getSnapshot)
  const setLanguage = useCallback((lang: Language) => setStoredLanguage(lang), [])
  const toggle = useCallback(() => setStoredLanguage(language === 'vi' ? 'en' : 'vi'), [])
  return { language: current, setLanguage, toggle }
}
