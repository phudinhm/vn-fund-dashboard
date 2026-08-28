import type { FundMeta } from '../types'
import { useT, type TranslationKey } from '../i18n'

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

export function getCategoryLabel(type: FundMeta['type']): string {
  switch (type) {
    case 'mutual_fund': return 'Cổ phiếu'
    case 'bond': return 'Trái phiếu'
    case 'balanced': return 'Cân bằng'
    case 'etf': return 'ETF'
    case 'index': return 'Chỉ số'
    case 'crypto': return 'Crypto'
    case 'gold': return 'Vàng'
    default: return _assertExhaustiveFundType(type)
  }
}
