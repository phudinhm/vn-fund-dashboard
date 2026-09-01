/**
 * DcaEntryPointBlock: "Cùng 100 triệu, vào ở thời điểm khác nhau"
 *
 * Ý tưởng mượn từ section "Same ₩1억, different entry points" của Pramana:
 * thay vì phân phối xác suất (RollingReturnBlock đã lo phần đó), kể câu
 * chuyện tiền thật ngày thật: để dành 100 triệu mua MỘT LẦN tại từng mốc
 * thời gian, giữ đến nay thì mỗi khoản thành bao nhiêu.
 *
 * Trung thực kiểu Pramana: mốc nào quỹ chưa có dữ liệu thì để trống kèm
 * chú thích, không nội suy, không đoán mò. Tính trên TOÀN BỘ lịch sử dữ
 * liệu của quỹ, không phụ thuộc khoảng thời gian đã chọn ở phần Thông số.
 */
import { useMemo, memo } from 'react'
import type { PricePoint, RebalanceFrequency } from '../types'
import { simulateDCA, slicePricesWithPredecessor, type DCASlot } from '../utils/dca'
import { alignFundsToCommonGridDaily } from '../utils/weeklyResample'
import { useT, useTRich, translateStatic, type TranslationKey } from '../i18n'
import { useLanguage, type Language } from '../hooks/useLanguage'

/** Số tiền cố định cho mỗi lần vào, chọn tròn 100 triệu cho dễ nhẩm. */
const AMOUNT = 100_000_000

const ENTRY_POINTS: { labelKey: TranslationKey; months: number }[] = [
  { labelKey: 'entry.at10y', months: 120 },
  { labelKey: 'entry.at5y', months: 60 },
  { labelKey: 'entry.at3y', months: 36 },
  { labelKey: 'entry.at1y', months: 12 },
  { labelKey: 'entry.at6m', months: 6 },
]

export interface EntryPointPortfolio {
  id: string
  name: string
  color: string
  slots: DCASlot[]
  rebalFreq: RebalanceFrequency
}

interface Props {
  portfolios: EntryPointPortfolio[]
  fundData: Map<string, PricePoint[]>
  /** Giá "bán ra" — chỉ có entry cho quỹ 2-giá (vàng miếng SJC). Xem simulateDCA's purchasePrices option. */
  purchasePriceData: Map<string, PricePoint[]>
}

interface EntryCell {
  portfolio: EntryPointPortfolio
  /** Giá trị hiện tại của khoản 100 triệu, null = quỹ chưa có dữ liệu tại mốc đó */
  value: number | null
}

interface EntryRow {
  label: string
  months: number
  entryDate: string
  cells: EntryCell[]
}

function DcaEntryPointBlockImpl({ portfolios, fundData, purchasePriceData }: Props) {
  const t = useT()
  const tr = useTRich()
  const { language } = useLanguage()
  const rows = useMemo<EntryRow[]>(() => {
    if (portfolios.length === 0) return []

    // "Nay" = ngày dữ liệu mới nhất trong các quỹ đang dùng
    let globalNow = ''
    for (const p of portfolios) {
      for (const s of p.slots) {
        const prices = fundData.get(s.fundId)
        if (!prices || prices.length === 0) return [] // dữ liệu chưa load xong
        const last = prices[prices.length - 1]!.date
        if (last > globalNow) globalNow = last
      }
    }

    return ENTRY_POINTS.map(ep => {
      const entryDate = subtractMonths(globalNow, ep.months)
      const cells: EntryCell[] = portfolios.map(p => {
        // Trung thực: mọi quỹ trong danh mục phải có dữ liệu TẠI thời điểm vào
        for (const s of p.slots) {
          const prices = fundData.get(s.fundId)
          if (!prices || prices.length === 0 || prices[0]!.date > entryDate) {
            return { portfolio: p, value: null }
          }
        }
        const filtered = new Map<string, PricePoint[]>()
        const filteredPurchase = new Map<string, PricePoint[]>()
        for (const s of p.slots) {
          const prices = fundData.get(s.fundId)!.filter(pt => pt.date >= entryDate)
          filtered.set(s.fundId, prices)
          // Phải có entry cho MỌI fundId trong danh mục (fallback về `prices`
          // nếu quỹ không có giá bán riêng) — nếu không, khi danh mục trộn
          // vàng + quỹ thường, 2 map sẽ có tập fundId khác nhau khiến
          // alignFundsToCommonGridDaily merge ra 2 lưới ngày khác nhau, làm
          // vàng thiếu giá đúng ngày cần mua → NaN.
          const purchase = purchasePriceData.get(s.fundId)
          filteredPurchase.set(
            s.fundId,
            purchase ? slicePricesWithPredecessor(purchase, entryDate, '9999-12-31') : prices,
          )
        }
        const aligned = alignFundsToCommonGridDaily(filtered)
        const alignedPurchase = alignFundsToCommonGridDaily(filteredPurchase)
        const sim = simulateDCA(
          aligned,
          p.slots,
          { initialAmount: AMOUNT, cashflowAmount: 0, cashflowFreq: 'monthly' },
          p.rebalFreq,
          { purchasePrices: alignedPurchase },
        )
        return { portfolio: p, value: sim.cumulative.length > 0 ? sim.finalValue : null }
      })
      return { label: t(ep.labelKey), months: ep.months, entryDate, cells }
    }).filter(r => r.cells.some(c => c.value !== null))
  }, [portfolios, fundData, purchasePriceData, language])

  if (rows.length === 0) return null

  const hasMissing = rows.some(r => r.cells.some(c => c.value === null))
  const narrative = buildNarrative(rows)

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>{t('entry.title')}</h3>
        <span
          className="chart-tooltip-icon"
          title={t('entry.help')}
        >?</span>
      </div>

      <p className="dca-ratio-sub">
        {tr('entry.intro')}
      </p>

      <div className="dca-stats-table-scroll">
        <table className="dca-stats-table">
          <thead>
            <tr>
              <th>{t('entry.col.entryPoint')}</th>
              {portfolios.map(p => (
                <th key={p.id}>
                  <span className="perf-dot" style={{ background: p.color }} />
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const best = r.cells.reduce<number | null>(
                (m, c) => (c.value !== null && (m === null || c.value > m) ? c.value : m),
                null,
              )
              return (
                <tr key={r.months}>
                  <td>
                    {r.label}
                    <span className="dca-entry-date"> ({formatMonthYear(r.entryDate)})</span>
                  </td>
                  {r.cells.map(c => (
                    <td
                      key={c.portfolio.id}
                      className={c.value !== null && c.value < AMOUNT ? 'dca-loss' : ''}
                      style={c.value !== null && c.value === best && r.cells.filter(x => x.value !== null).length > 1
                        ? { fontWeight: 700 }
                        : undefined}
                    >
                      {c.value !== null
                        ? <>{formatCompactVND(c.value, language)} <span className="dca-entry-mult">({formatMultiple(c.value / AMOUNT, language)})</span></>
                        : '—'}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasMissing && (
        <div className="dca-eoy-footnote">
          {t('entry.footnoteMissing')}
        </div>
      )}
      {!hasMissing && rows.length > 0 && (
        <div className="dca-eoy-footnote">
          {t('entry.footnoteBold')}
        </div>
      )}

      {narrative && (
        <p className="dca-ratio-narrative">
          {tr('entry.narrative', {
            name: narrative.portfolio.name,
            longLabel: narrative.longLabel,
            longValue: formatCompactVND(narrative.longValue, language),
            shortLabel: narrative.shortLabel,
            shortValue: formatCompactVND(narrative.shortValue, language),
          })}
        </p>
      )}
    </div>
  )
}

export const DcaEntryPointBlock = memo(DcaEntryPointBlockImpl)

interface EntryNarrative {
  portfolio: EntryPointPortfolio
  longLabel: string
  longValue: number
  shortLabel: string
  shortValue: number
}

/**
 * Kể chuyện bằng danh mục có giá trị cao nhất ở mốc vào SỚM nhất: so khoản
 * đó với chính nó ở mốc vào gần nhất, làm nổi bật sức nặng của thời gian
 * nắm giữ. Chỉ kể khi có ít nhất 2 mốc để so.
 */
function buildNarrative(rows: EntryRow[]): EntryNarrative | null {
  if (rows.length < 2) return null
  const longest = rows[0]!
  const shortest = rows[rows.length - 1]!

  let bestCell: EntryCell | null = null
  for (const c of longest.cells) {
    if (c.value !== null && (bestCell === null || c.value > (bestCell.value ?? 0))) bestCell = c
  }
  if (!bestCell || bestCell.value === null) return null

  const shortCell = shortest.cells.find(c => c.portfolio.id === bestCell!.portfolio.id)
  if (!shortCell || shortCell.value === null) return null

  return {
    portfolio: bestCell.portfolio,
    longLabel: longest.label,
    longValue: bestCell.value,
    shortLabel: shortest.label,
    shortValue: shortCell.value,
  }
}

/**
 * Trừ N tháng khỏi ngày YYYY-MM-DD, clamp ngày về cuối tháng đích để tránh
 * bug tràn tháng của setMonth (31/01 lùi 1 tháng phải ra 31/12, không phải 02/01...
 * và 31/03 lùi 1 tháng phải ra 28/02 chứ không tràn sang 03/03).
 */
function subtractMonths(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const totalMonths = y! * 12 + (m! - 1) - months
  const ny = Math.floor(totalMonths / 12)
  const nm = totalMonths - ny * 12 // 0-11
  const daysInMonth = new Date(ny, nm + 1, 0).getDate()
  const nd = Math.min(d!, daysInMonth)
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

/** 412_345_678 → "412 triệu", 1_234_000_000 → "1,23 tỷ" */
function formatCompactVND(v: number, lang: Language): string {
  if (v >= 1e9) {
    const num = (v / 1e9).toFixed(2)
    return translateStatic('entry.billion', lang, { v: lang === 'vi' ? num.replace('.', ',') : num })
  }
  return translateStatic('entry.million', lang, { v: Math.round(v / 1e6) })
}

function formatMultiple(v: number, lang: Language): string {
  const num = v.toFixed(2)
  return (lang === 'vi' ? num.replace('.', ',') : num) + '×'
}

/** "2016-07-15" → "07/2016" */
function formatMonthYear(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]}/${parts[0]}`
}
