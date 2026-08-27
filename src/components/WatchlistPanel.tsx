import { useMemo } from 'react'
import Select from 'react-select'
import type { FundMeta, PricePoint } from '../types'
import { useWatchlist } from '../hooks/useWatchlist'
import { useMultiFundSeries } from '../hooks/useFundData'
import { weeklyReturns, cagr, maxDrawdown } from '../utils/calculations'
import { getCategoryLabel } from './FundCategoryFilter'
import { MAX_COMPARE_FUNDS } from '../constants'

interface Props {
  funds: FundMeta[]
  /** Mở tab So Sánh với danh sách quỹ đã cho, dùng chung updateState của App. */
  onCompare: (fundIds: string[]) => void
}

interface FundOption {
  value: string
  label: string
}

/** Màu badge theo loại quỹ — tách riêng khỏi FundCategoryFilter (chỉ có nhãn, không màu). */
const CATEGORY_COLORS: Record<FundMeta['type'], string> = {
  mutual_fund: 'var(--color-primary)',
  bond: '#818cf8',
  balanced: '#34d399',
  etf: '#8b5cf6',
  crypto: '#f59e0b',
  gold: '#eab308',
}

const selectStyles = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    minHeight: 38,
    borderColor: '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563EB' },
    fontSize: '0.95rem',
  }),
  menu: (base: Record<string, unknown>) => ({ ...base, zIndex: 20 }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    fontSize: '0.9rem',
    backgroundColor: state.isSelected ? '#2563EB' : state.isFocused ? '#eff6ff' : undefined,
    color: state.isSelected ? 'white' : '#1a1a1a',
  }),
}

/** Lợi nhuận trailing tính đến `days` ngày trước điểm cuối cùng. null nếu chưa đủ lịch sử. */
function trailingReturn(prices: PricePoint[], days: number): number | null {
  if (prices.length < 2) return null
  const last = prices[prices.length - 1]!
  const targetTime = new Date(last.date).getTime() - days * 24 * 60 * 60 * 1000

  let refPrice: number | null = null
  for (const p of prices) {
    if (new Date(p.date).getTime() <= targetTime) refPrice = p.price
    else break
  }
  if (refPrice === null || refPrice <= 0) return null
  return last.price / refPrice - 1
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(2)}%`
}

function pctClass(value: number | null): string {
  if (value === null) return ''
  return value >= 0 ? 'pos' : 'neg'
}

export function WatchlistPanel({ funds, onCompare }: Props) {
  const { ids: watchedIds, add, remove } = useWatchlist()
  const { data, loading, errors } = useMultiFundSeries(watchedIds)

  const fundById = useMemo(() => new Map(funds.map(f => [f.id, f])), [funds])

  const addOptions: FundOption[] = useMemo(
    () => funds
      .filter(f => !watchedIds.includes(f.id))
      .map(f => ({ value: f.id, label: f.name_vi })),
    [funds, watchedIds],
  )

  const cards = useMemo(() => {
    return watchedIds
      .map(id => {
        const meta = fundById.get(id)
        const prices = data.get(id)
        if (!meta) return null

        let sinceInceptionCagr: number | null = null
        let dd: number | null = null
        let trailing1Y: number | null = null
        let latest: PricePoint | null = null

        if (prices && prices.length > 1) {
          const dates = prices.map(p => p.date)
          const priceValues = prices.map(p => p.price)
          const returns = weeklyReturns(dates, priceValues)
          sinceInceptionCagr = cagr(returns)
          dd = maxDrawdown(returns)
          trailing1Y = trailingReturn(prices, 365)
          latest = prices[prices.length - 1]!
        }

        return { meta, latest, sinceInceptionCagr, dd, trailing1Y, error: errors.get(id) ?? null }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
  }, [watchedIds, fundById, data, errors])

  const compareIds = watchedIds.slice(0, MAX_COMPARE_FUNDS)

  return (
    <div className="simulation-panel watchlist-panel">
      <div className="panel-header">
        <h2>Theo Dõi</h2>
      </div>

      <div className="chart-container watchlist-add">
        <div className="chart-header">
          <h3>Thêm quỹ vào danh sách theo dõi</h3>
        </div>
        <Select<FundOption>
          className="fund-search-select"
          classNamePrefix="fund-search"
          options={addOptions}
          value={null}
          onChange={opt => opt && add(opt.value)}
          placeholder="Tìm quỹ..."
          noOptionsMessage={() => (funds.length === 0 ? 'Đang tải...' : 'Đã theo dõi hết quỹ')}
          isSearchable
          isDisabled={addOptions.length === 0}
          styles={selectStyles}
        />
      </div>

      {watchedIds.length === 0 && (
        <p className="watchlist-empty">
          Chưa có quỹ nào trong danh sách theo dõi. Tìm và thêm quỹ ở ô phía trên, hoặc bấm ngôi sao ☆
          cạnh mỗi quỹ trong tab So Sánh.
        </p>
      )}

      {watchedIds.length > 0 && (
        <div className="watchlist-toolbar">
          <button
            className="watchlist-compare-btn"
            onClick={() => onCompare(compareIds)}
          >
            So sánh {compareIds.length} quỹ đang theo dõi
          </button>
          {watchedIds.length > MAX_COMPARE_FUNDS && (
            <span className="watchlist-toolbar-note">
              Chỉ lấy {MAX_COMPARE_FUNDS} quỹ đầu (giới hạn so sánh)
            </span>
          )}
        </div>
      )}

      {loading && watchedIds.length > 0 && <div className="loading-indicator">Đang tải dữ liệu...</div>}

      <div className="watchlist-grid">
        {cards.map(({ meta, latest, sinceInceptionCagr, dd, trailing1Y, error }) => (
          <div key={meta.id} className="watchlist-card">
            <div className="watchlist-card-head">
              <div className="watchlist-card-title">
                <span className="watchlist-badge" style={{ background: CATEGORY_COLORS[meta.type] }}>
                  {getCategoryLabel(meta.type)}
                </span>
                <span className="watchlist-card-name" title={meta.name_vi}>{meta.id}</span>
              </div>
              <button
                className="fund-star-btn fund-star-btn-active"
                onClick={() => remove(meta.id)}
                title="Bỏ khỏi danh sách theo dõi"
              >
                ★
              </button>
            </div>
            <p className="watchlist-card-fullname">{meta.name_vi}</p>

            {error && <p className="overlap-empty">{error}</p>}

            {!error && (
              <div className="watchlist-stats">
                <div className="watchlist-stat">
                  <span className="watchlist-stat-label">Giá mới nhất</span>
                  <span className="watchlist-stat-value">
                    {latest ? `${Math.round(latest.price).toLocaleString('vi-VN')} đ` : '—'}
                  </span>
                  {latest && <span className="watchlist-stat-date">{formatDate(latest.date)}</span>}
                </div>
                <div className="watchlist-stat">
                  <span className="watchlist-stat-label">1 năm</span>
                  <span className={`watchlist-stat-value ${pctClass(trailing1Y)}`}>
                    {formatPercent(trailing1Y)}
                  </span>
                </div>
                <div className="watchlist-stat">
                  <span className="watchlist-stat-label">CAGR từ đầu</span>
                  <span className={`watchlist-stat-value ${pctClass(sinceInceptionCagr)}`}>
                    {formatPercent(sinceInceptionCagr)}
                  </span>
                </div>
                <div className="watchlist-stat">
                  <span className="watchlist-stat-label">Sụt giảm tối đa</span>
                  <span className={`watchlist-stat-value ${pctClass(dd)}`}>
                    {dd !== null ? formatPercent(dd) : '—'}
                  </span>
                </div>
              </div>
            )}

            <button
              className="watchlist-card-compare-btn"
              onClick={() => onCompare([meta.id])}
            >
              Xem trong So Sánh →
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
