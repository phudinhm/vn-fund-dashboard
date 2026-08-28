import { useMemo } from 'react'
import Select from 'react-select'
import type { FundMeta } from '../types'
import { FUND_COLORS, MAX_COMPARE_FUNDS } from '../constants'
import { SavingsRateInput } from './SavingsRateInput'
import { useWatchlist } from '../hooks/useWatchlist'
import { useT, type TranslationKey } from '../i18n'
import {
  buildGroupedFundOptions, findGroupedOption,
  type FundOption, type FundOptionGroup,
} from '../utils/fundSelectOptions'
import {
  isSavingsAssetId, savingsAssetId, parseSavingsRate, pickDefaultSavingsRate,
  SAVINGS_OPTION_LABEL,
} from '../utils/savingsAsset'
interface Props {
  allFunds: FundMeta[]
  selectedFunds: string[]
  onChangeFunds: (funds: string[]) => void
  startDate?: string
  endDate?: string
}

export function FundSelector({
  allFunds,
  selectedFunds,
  onChangeFunds,
  startDate,
  endDate,
}: Props) {
  const t = useT()
  const { isWatched, toggle } = useWatchlist()
  // Nhóm theo loại tài sản + công ty quản lý. 80+ quỹ trong một danh sách phẳng
  // rất khó quét bằng mắt; gom nhóm cho thấy ngay quỹ thuộc loại nào, của bên nào.
  const baseGroups: FundOptionGroup[] = useMemo(
    () => buildGroupedFundOptions(allFunds, type => t(`category.${type}` as TranslationKey)),
    [allFunds, t],
  )

  function changeFund(index: number, newId: string) {
    const next = [...selectedFunds]
    next[index] = newId
    onChangeFunds(next)
  }

  function removeFund(index: number) {
    if (selectedFunds.length <= 1) return
    onChangeFunds(selectedFunds.filter((_, i) => i !== index))
  }

  function addFund() {
    if (selectedFunds.length >= MAX_COMPARE_FUNDS) return
    const used = new Set(selectedFunds)
    const available = allFunds.find(f => !used.has(f.id))
    if (available) {
      onChangeFunds([...selectedFunds, available.id])
    }
  }

  return (
    <div className="fund-selector">
      <div className="fund-selector-list">
        {selectedFunds.map((fundId, i) => {
          // Mức lãi suất mặc định của Ô NÀY tránh trùng với tiết kiệm đã chọn
          // ở NHỮNG ô khác, để 2 ô cùng bấm "Tiết kiệm ngân hàng" không cùng ra
          // SAVINGS:6 (xem pickDefaultSavingsRate).
          const usedRatesElsewhere = selectedFunds
            .filter((id, j) => j !== i && isSavingsAssetId(id))
            .map(id => parseSavingsRate(id))
          const defaultRate = pickDefaultSavingsRate(usedRatesElsewhere)
          // Tiết kiệm ngân hàng là tài sản do dashboard tự sinh, không thuộc
          // công ty quản lý nào — cho vào nhóm riêng ở cuối danh sách.
          const groups: FundOptionGroup[] = [
            ...baseGroups,
            {
              label: t('fundSelector.savingsGroup'),
              options: [{ value: savingsAssetId(defaultRate), label: SAVINGS_OPTION_LABEL }],
            },
          ]
          return (
          <div key={i} className="fund-selector-item">
            <span
              className="fund-color-dot"
              style={{ background: FUND_COLORS[i % FUND_COLORS.length] }}
            />
            <Select<FundOption, false, FundOptionGroup>
              className="fund-search-select"
              classNamePrefix="fund-search"
              options={groups}
              // Lãi suất nằm trong id ("SAVINGS:7"), đổi lãi suất là đổi id, nên
              // id mới không khớp option nào. Tự dựng option cho đúng id hiện tại.
              value={isSavingsAssetId(fundId)
                ? { value: fundId, label: SAVINGS_OPTION_LABEL }
                : findGroupedOption(groups, fundId)}
              onChange={opt => opt && changeFund(i, opt.value)}
              placeholder={t('fundSelector.searchPlaceholder')}
              noOptionsMessage={() => t('fundSelector.noOptions')}
              isSearchable
              styles={selectStyles}
            />
            {isSavingsAssetId(fundId) && (
              <SavingsRateInput
                fundId={fundId}
                onCommit={rate => changeFund(i, savingsAssetId(rate))}
              />
            )}
            {!isSavingsAssetId(fundId) && (
              <button
                className={`fund-star-btn${isWatched(fundId) ? ' fund-star-btn-active' : ''}`}
                onClick={() => toggle(fundId)}
                title={isWatched(fundId) ? t('fundSelector.removeFromWatchlist') : t('fundSelector.addToWatchlist')}
              >
                {isWatched(fundId) ? '★' : '☆'}
              </button>
            )}
            <button
              className="fund-remove-btn"
              onClick={() => removeFund(i)}
              disabled={selectedFunds.length <= 1}
              title={t('fundSelector.removeFund')}
            >
              ✕
            </button>
          </div>
          )
        })}
      </div>

      <button
        className="fund-add-btn"
        onClick={addFund}
        disabled={selectedFunds.length >= MAX_COMPARE_FUNDS}
      >
        {t('fundSelector.addFund')}
      </button>

      {startDate && endDate && (
        <div className="comparison-period">
          {t('fundSelector.comparisonPeriod', { from: formatDate(startDate), to: formatDate(endDate) })}
        </div>
      )}
    </div>
  )
}

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: 38,
    backgroundColor: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--color-primary)' },
    fontSize: '0.95rem',
  }),
  singleValue: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-text)' }),
  input: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-text)' }),
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-text-muted)' }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 20,
    backgroundColor: 'var(--color-surface)',
  }),
  groupHeading: (base: Record<string, unknown>) => ({
    ...base,
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-primary)',
    backgroundColor: 'var(--color-primary-light)',
    padding: '6px 12px',
    marginBottom: 2,
    position: 'sticky' as const,
    top: 0,
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    fontSize: '0.9rem',
    backgroundColor: state.isSelected ? 'var(--color-primary)' : state.isFocused ? 'var(--color-primary-light)' : undefined,
    color: state.isSelected ? 'white' : 'var(--color-text)',
  }),
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
