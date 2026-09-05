import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import type { TabId } from '../tabRegistry'
import { translateStatic, type TranslationKey } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

export interface SeoMeta {
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  indexable: boolean
}

const SITE_ORIGIN = 'https://fund.minhphudinh.com'

/**
 * Chữ nằm trong từ điển, ở đây chỉ giữ khóa. Thẻ meta phải theo ngôn ngữ đang
 * chọn, nếu không thì người đọc bản tiếng Anh chia sẻ link ra ngoài lại thấy
 * preview tiếng Việt.
 */
export const SEO_BY_TAB: Record<TabId, SeoMeta> = {
  compare:      { titleKey: 'seo.compare.title',      descriptionKey: 'seo.compare.description',      indexable: true },
  watchlist:    { titleKey: 'seo.watchlist.title',    descriptionKey: 'seo.watchlist.description',    indexable: false },
  dca:          { titleKey: 'seo.dca.title',          descriptionKey: 'seo.dca.description',          indexable: true },
  lsdca:        { titleKey: 'seo.lsdca.title',        descriptionKey: 'seo.lsdca.description',        indexable: true },
  fundanalysis: { titleKey: 'seo.fundanalysis.title', descriptionKey: 'seo.fundanalysis.description', indexable: true },
  overlap:      { titleKey: 'seo.overlap.title',      descriptionKey: 'seo.overlap.description',      indexable: true },
  rebalance:    { titleKey: 'seo.rebalance.title',    descriptionKey: 'seo.rebalance.description',    indexable: true },
  tactical:     { titleKey: 'seo.tactical.title',     descriptionKey: 'seo.tactical.description',     indexable: true },
  bitcoin:      { titleKey: 'seo.bitcoin.title',      descriptionKey: 'seo.bitcoin.description',      indexable: true },
  wallofworry:  { titleKey: 'seo.wallofworry.title',  descriptionKey: 'seo.wallofworry.description',  indexable: true },
  calculator:   { titleKey: 'seo.calculator.title',   descriptionKey: 'seo.calculator.description',   indexable: true },
  profiles:     { titleKey: 'seo.profiles.title',     descriptionKey: 'seo.profiles.description',     indexable: true },
  methodology:  { titleKey: 'seo.methodology.title',  descriptionKey: 'seo.methodology.description',  indexable: true },
}

function setMetaContent(attribute: 'name' | 'property', value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, value)
    document.head.appendChild(element)
  }
  element.content = content
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }
  element.href = href
}

export function SeoMetadata({ tab }: { tab: TabId }) {
  const location = useLocation()
  const { language } = useLanguage()

  useEffect(() => {
    const meta = SEO_BY_TAB[tab]
    const appHomepage = location.pathname === '/' && location.search === ''
    const canonical = `${SITE_ORIGIN}/`
    const title = translateStatic(meta.titleKey, language)
    const description = translateStatic(meta.descriptionKey, language)

    document.documentElement.lang = language
    document.title = title
    setMetaContent('name', 'description', description)
    setMetaContent('property', 'og:title', title)
    setMetaContent('property', 'og:description', description)
    setMetaContent('property', 'og:url', canonical)
    setMetaContent('property', 'og:locale', language === 'vi' ? 'vi_VN' : 'en_US')
    setMetaContent('name', 'twitter:title', title)
    setMetaContent('name', 'twitter:description', description)
    setMetaContent('name', 'robots', !meta.indexable || !appHomepage ? 'noindex, follow' : 'index, follow')
    setCanonical(canonical)
  }, [location.pathname, location.search, tab, language])

  return null
}
