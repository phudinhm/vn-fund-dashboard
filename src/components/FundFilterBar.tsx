import { memo, useMemo } from 'react'
import type { FundMeta } from '../types'
import { useT, type TranslationKey } from '../i18n'
import { useFundFilter } from '../hooks/useFundFilter'
import { applyFundFilter, availableHouses, availableTypes } from '../utils/fundFilter'
import { IconStar } from './icons'

interface Props {
  /** Toàn bộ quỹ (chưa lọc) để biết có những loại và công ty nào. */
  funds: FundMeta[]
}

/**
 * Thanh lọc danh sách quỹ: loại tài sản (chọn nhiều), công ty quản lý, chỉ quỹ
 * theo dõi. Một bộ lọc chung cho mọi tab, xem hooks/useFundFilter.ts.
 */
function FundFilterBarImpl({ funds }: Props) {
  const t = useT()
  const { filter, active, watchedIds, toggleType, setHouse, setWatchOnly, reset } = useFundFilter()
  const types = useMemo(() => availableTypes(funds), [funds])
  const houses = useMemo(() => availableHouses(funds), [funds])
  const shown = useMemo(() => applyFundFilter(funds, filter, watchedIds).length, [funds, filter, watchedIds])

  return (
    <div className="ffb" role="group" aria-label={t('ffb.label')}>
      <div className="ffb-chips">
        {types.map(type => (
          <button
            key={type}
            type="button"
            className={`ffb-chip${filter.types.includes(type) ? ' ffb-chip--on' : ''}`}
            aria-pressed={filter.types.includes(type)}
            onClick={() => toggleType(type)}
          >
            {t(`category.${type}` as TranslationKey)}
          </button>
        ))}
        <button
          type="button"
          className={`ffb-chip ffb-chip--star${filter.watchOnly ? ' ffb-chip--on' : ''}`}
          aria-pressed={filter.watchOnly}
          onClick={() => setWatchOnly(!filter.watchOnly)}
          title={t('ffb.watchOnly.hint')}
        >
          <IconStar filled={filter.watchOnly} /> {t('ffb.watchOnly', { n: watchedIds.length })}
        </button>
      </div>
      <div className="ffb-row">
        <select
          className="ffb-house"
          value={filter.house ?? ''}
          onChange={e => setHouse(e.target.value || null)}
          aria-label={t('ffb.house')}
        >
          <option value="">{t('ffb.house.all')}</option>
          {houses.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        {active && (
          <>
            <span className="ffb-count">{t('ffb.count', { shown, total: funds.length })}</span>
            <button type="button" className="ffb-clear" onClick={reset}>{t('ffb.clear')}</button>
          </>
        )}
      </div>
    </div>
  )
}

export const FundFilterBar = memo(FundFilterBarImpl)
