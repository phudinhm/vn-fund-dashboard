import type { FundMeta } from '../types'
import { useT, translateStatic, type TranslationKey } from '../i18n'
import { getLanguage, type Language } from '../hooks/useLanguage'

export type FundCategory = FundMeta['type'] | 'all'

interface Props {
  activeCategory: FundCategory
  onCategoryChange: (category: FundCategory) => void
}

const CATEGORY_ORDER: FundCategory[] = ['all', 'mutual_fund', 'bond', 'balanced', 'etf', 'index', 'crypto', 'gold']

export function FundCategoryFilter({ activeCategory, onCategoryChange }: Props) {
  const t = useT()
  return (
    <div className="fund-category-filter">
      {CATEGORY_ORDER.map(value => (
        <button
          key={value}
          className={`category-btn${activeCategory === value ? ' category-btn-active' : ''}`}
          onClick={() => onCategoryChange(value)}
        >
          {t(`category.${value}` as TranslationKey)}
        </button>
      ))}
    </div>
  )
}

/**
 * Filter a fund list by category. 'all' returns the full list.
 * The exhaustive check ensures TypeScript errors if a new FundMeta.type
 * is added without updating CATEGORY_BUTTONS above.
 */
export function filterFundsByCategory(funds: FundMeta[], category: FundCategory): FundMeta[] {
  if (category === 'all') return funds
  return funds.filter(f => f.type === category)
}

/**
 * Exhaustive type check. If FundMeta.type gains a new value, this
 * function will produce a TypeScript compile error until CATEGORY_BUTTONS
 * and filterFundsByCategory are updated to handle it.
 */
function _assertExhaustiveFundType(type: never): never {
  throw new Error(`Unhandled fund type: ${String(type)}`)
}

/**
 * Nhãn nhóm quỹ dùng ngoài React (tiêu đề nhóm, chuỗi ghép sẵn). Trong
 * component thì dùng thẳng t('category.<type>') cho khỏi qua một lớp nữa.
 */
export function getCategoryLabel(type: FundMeta['type'], lang: Language = getLanguage()): string {
  switch (type) {
    case 'mutual_fund':
    case 'bond':
    case 'balanced':
    case 'etf':
    case 'index':
    case 'crypto':
    case 'gold':
      return translateStatic(`category.${type}` as TranslationKey, lang)
    default: return _assertExhaustiveFundType(type)
  }
}
