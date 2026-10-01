import { memo, useMemo } from 'react'
import type { FundMeta } from '../types'
import { useT, type TranslationKey } from '../i18n'
import { useFundFilter } from '../hooks/useFundFilter'
import {
  MAX_FEE_OPTIONS, MIN_YEARS_OPTIONS, activeFilterCount, applyFundFilter, availableHouses,
  availableTypes, facetCounts,
} from '../utils/fundFilter'
import { IconFilter, IconStar } from './icons'

interface Props {
  /** Toàn bộ quỹ (chưa lọc) để biết có những loại và công ty nào. */
  funds: FundMeta[]
}

/**
 * Thanh lọc danh sách quỹ dùng chung cho mọi tab (xem hooks/useFundFilter.ts).
 *
 * Thu gọn thành một dòng "Bộ lọc · n · hiện x/y" kèm các thẻ đang bật bấm × để
 * bỏ nhanh; mở ra có loại tài sản (kèm số quỹ), công ty quản lý, lịch sử tối
 * thiểu, phí quản lý tối đa và "chỉ quỹ theo dõi". Số kèm mỗi lựa chọn là số
 * quỹ sẽ còn lại nếu bấm vào nó, tính theo các bộ lọc khác đang bật.
 */
function FundFilterBarImpl({ funds }: Props) {
  const t = useT()
  const { filter, active, ctx, isOpen, setOpen, toggleType, patch, reset } = useFundFilter()
  const types = useMemo(() => availableTypes(funds), [funds])
  const houses = useMemo(() => availableHouses(funds), [funds])
  const facets = useMemo(() => facetCounts(funds, filter, ctx), [funds, filter, ctx])
  const shown = useMemo(() => applyFundFilter(funds, filter, ctx).length, [funds, filter, ctx])
  const count = activeFilterCount(filter)
  const noFeeData = (ctx.managementFee?.size ?? 0) === 0
  const typeLabel = (type: FundMeta['type']) => t(`category.${type}` as TranslationKey)

  return (
    <div className={`ffb${active ? ' ffb--active' : ''}`} role="group" aria-label={t('ffb.label')}>
      <div className="ffb-head">
        <button type="button" className="ffb-toggle" aria-expanded={isOpen} onClick={() => setOpen(!isOpen)}>
          <IconFilter />
          <span>{t('ffb.title')}</span>
          {count > 0 && <span className="ffb-badge">{count}</span>}
          <span className="ffb-caret" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
        </button>

        {active && (
          <span className={`ffb-result${shown === 0 ? ' ffb-result--empty' : ''}`} aria-live="polite">
            {t('ffb.count', { shown, total: funds.length })}
          </span>
        )}

        {/* Thẻ đang bật: thấy ngay cả khi thu gọn, bấm để bỏ từng cái. */}
        <div className="ffb-active">
          {filter.types.map(type => (
            <button key={type} type="button" className="ffb-tag" onClick={() => toggleType(type)}>
              {typeLabel(type)} <span aria-hidden="true">×</span>
              <span className="sr-only">{t('ffb.remove')}</span>
            </button>
          ))}
          {filter.house && (
            <button type="button" className="ffb-tag" onClick={() => patch({ house: null })}>
              {filter.house} <span aria-hidden="true">×</span>
            </button>
          )}
          {filter.minYears !== null && (
            <button type="button" className="ffb-tag" onClick={() => patch({ minYears: null })}>
              {t('ffb.history.tag', { n: filter.minYears })} <span aria-hidden="true">×</span>
            </button>
          )}
          {filter.maxFee !== null && (
            <button type="button" className="ffb-tag" onClick={() => patch({ maxFee: null })}>
              {t('ffb.fee.tag', { n: filter.maxFee })} <span aria-hidden="true">×</span>
            </button>
          )}
          {filter.watchOnly && (
            <button type="button" className="ffb-tag" onClick={() => patch({ watchOnly: false })}>
              <IconStar filled /> {t('ffb.watch')} <span aria-hidden="true">×</span>
            </button>
          )}
        </div>

        {active && <button type="button" className="ffb-clear" onClick={reset}>{t('ffb.clear')}</button>}
      </div>

      {isOpen && (
        <div className="ffb-body">
          <div className="ffb-group">
            <div className="ffb-label">{t('ffb.assetType')}</div>
            <div className="ffb-chips">
              {types.map(type => {
                const n = facets.types.get(type) ?? 0
                const on = filter.types.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    className={`ffb-chip${on ? ' ffb-chip--on' : ''}`}
                    aria-pressed={on}
                    disabled={n === 0 && !on}
                    onClick={() => toggleType(type)}
                  >
                    {typeLabel(type)} <em>{n}</em>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ffb-group">
            <label className="ffb-label" htmlFor="ffb-house">{t('ffb.house')}</label>
            <select
              id="ffb-house"
              className="ffb-house"
              value={filter.house ?? ''}
              onChange={e => patch({ house: e.target.value || null })}
            >
              <option value="">{t('ffb.house.all')}</option>
              {houses.map(h => {
                const n = facets.houses.get(h) ?? 0
                return <option key={h} value={h} disabled={n === 0 && filter.house !== h}>{h} ({n})</option>
              })}
            </select>
          </div>

          <div className="ffb-group">
            <div className="ffb-label">{t('ffb.history')}</div>
            <div className="ffb-seg" role="radiogroup" aria-label={t('ffb.history')}>
              <button type="button" role="radio" aria-checked={filter.minYears === null}
                className={filter.minYears === null ? 'on' : ''} onClick={() => patch({ minYears: null })}>{t('ffb.any')}</button>
              {MIN_YEARS_OPTIONS.map(y => (
                <button key={y} type="button" role="radio" aria-checked={filter.minYears === y}
                  className={filter.minYears === y ? 'on' : ''} onClick={() => patch({ minYears: y })}>{y}+ {t('ffb.years')}</button>
              ))}
            </div>
          </div>

          <div className="ffb-group">
            <div className="ffb-label">{t('ffb.fee')}</div>
            <div className="ffb-seg" role="radiogroup" aria-label={t('ffb.fee')}>
              <button type="button" role="radio" aria-checked={filter.maxFee === null}
                className={filter.maxFee === null ? 'on' : ''} onClick={() => patch({ maxFee: null })}>{t('ffb.any')}</button>
              {MAX_FEE_OPTIONS.map(fee => (
                <button key={fee} type="button" role="radio" aria-checked={filter.maxFee === fee}
                  className={filter.maxFee === fee ? 'on' : ''} disabled={noFeeData}
                  onClick={() => patch({ maxFee: fee })}>≤ {fee}%</button>
              ))}
            </div>
            {noFeeData && <div className="ffb-hint">{t('ffb.fee.noData')}</div>}
            {!noFeeData && filter.maxFee !== null && <div className="ffb-hint">{t('ffb.fee.hint')}</div>}
          </div>

          <div className="ffb-group">
            <div className="ffb-label">{t('ffb.watch')}</div>
            <button
              type="button"
              className={`ffb-chip ffb-chip--star${filter.watchOnly ? ' ffb-chip--on' : ''}`}
              aria-pressed={filter.watchOnly}
              disabled={facets.watched === 0 && !filter.watchOnly}
              onClick={() => patch({ watchOnly: !filter.watchOnly })}
              title={t('ffb.watchOnly.hint')}
            >
              <IconStar filled={filter.watchOnly} /> {t('ffb.watchOnly')} <em>{facets.watched}</em>
            </button>
          </div>
        </div>
      )}

      {active && shown === 0 && <div className="ffb-empty">{t('ffb.empty')}</div>}
    </div>
  )
}

export const FundFilterBar = memo(FundFilterBarImpl)
