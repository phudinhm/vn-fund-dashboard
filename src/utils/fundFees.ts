import { annualizeGrowth, yearsBetween } from './twrr'

/** Một bậc phí. Phí mua: from ≤ số tiền (VND) < to. Phí bán: from ≤ số tháng nắm giữ < to. to=null là không giới hạn. */
export interface FeeTier {
  from: number
  to: number | null
  /** % giá trị lệnh. */
  rate: number
}

/** Biểu phí một quỹ, sinh bởi scripts/fetch_fund_fees.mjs. */
export interface FundFees {
  code: string
  /** %/năm, ĐÃ nằm trong NAV (không trừ lần nữa khi tính lãi từ NAV). */
  management: number | null
  /** Phí thưởng hiệu quả, cũng đã nằm trong NAV. */
  performance: number | null
  buy: FeeTier[]
  sipBuy: FeeTier[]
  sell: FeeTier[]
}

/**
 * ETF giao dịch trên sàn, không qua biểu phí của công ty quản lý quỹ. Dùng mức
 * ước tính của phí môi giới + thuế bán, cùng mặc định với tab DCA cổ phiếu.
 */
export const EXCHANGE_TRADED_FEES: Pick<FundFees, 'buy' | 'sell'> = {
  buy: [{ from: 0, to: null, rate: 0.15 }],
  // Phí bán không theo thời gian nắm giữ: 0,15% phí môi giới + 0,1% thuế bán.
  sell: [{ from: 0, to: null, rate: 0.25 }],
}

function pickTier(tiers: FeeTier[], value: number): FeeTier | null {
  for (const t of tiers) {
    if (value >= t.from && (t.to === null || value < t.to)) return t
  }
  // Giá trị nằm ngoài mọi bậc (vd bậc đầu bắt đầu ở ">0"): lấy bậc gần nhất bên dưới.
  const below = tiers.filter(t => t.from <= value)
  return below.length > 0 ? below[below.length - 1]! : (tiers[0] ?? null)
}

/** Phí mua (%) cho khoản mua `amount` VND. Không có biểu phí thì null. */
export function buyFeePct(tiers: FeeTier[], amount: number): number | null {
  if (tiers.length === 0) return null
  return pickTier(tiers, amount)?.rate ?? null
}

/** Phí bán (%) khi nắm giữ `months` tháng. Không có biểu phí thì null. */
export function sellFeePct(tiers: FeeTier[], months: number): number | null {
  if (tiers.length === 0) return null
  return pickTier(tiers, months)?.rate ?? null
}

export interface NetOnHand {
  buyPct: number
  sellPct: number
  /** Lợi nhuận gộp theo NAV (đã trừ phí quản lý), dạng thập phân. */
  gross: number
  /** Lợi nhuận THỰC NHẬN sau phí mua và phí bán đã chọn. */
  net: number
  /** Số điểm lợi nhuận bị phí mua/bán lấy đi (gross − net). */
  drag: number
  grossAnnualized: number | null
  netAnnualized: number | null
}

/**
 * Mua `amount` ở đầu kỳ, giữ tới cuối kỳ rồi bán hết.
 *   giá trị thực nhận = (1 − phí mua) × (1 + gross) × (1 − phí bán)
 * Phí mua lấy từ tiền mua trước khi đổi thành đơn vị quỹ; phí bán lấy từ giá trị
 * bán. Phí quản lý không xuất hiện ở đây vì NAV đã trừ sẵn.
 */
export function netOnHand(args: {
  gross: number
  buyPct: number
  sellPct: number
  startDate: string
  endDate: string
}): NetOnHand {
  const { gross, buyPct, sellPct, startDate, endDate } = args
  const value = (1 - buyPct / 100) * (1 + gross) * (1 - sellPct / 100)
  const net = value - 1
  return {
    buyPct, sellPct, gross, net, drag: gross - net,
    grossAnnualized: annualizeGrowth(1 + gross, startDate, endDate),
    netAnnualized: annualizeGrowth(value, startDate, endDate),
  }
}

/** Số tháng giữa hai ngày (thực, có phần lẻ), dùng chọn bậc phí bán. */
export function holdingMonths(startDate: string, endDate: string): number {
  return yearsBetween(startDate, endDate) * 12
}

/** Mô tả ngắn một biểu phí bán: "<6th 2,5% · 6-12th 2% · ≥24th 0%". */
export function describeSellTiers(tiers: FeeTier[], unit: string, fmt: (n: number) => string): string {
  return tiers.map(t => {
    const range = t.to === null ? `≥${t.from}${unit}` : t.from === 0 ? `<${t.to}${unit}` : `${t.from}-${t.to}${unit}`
    return `${range} ${fmt(t.rate)}%`
  }).join(' · ')
}

export interface FeeFreeInfo {
  /** Phí bán (%) nếu rút ngay hôm nay. */
  currentRate: number
  /** Số tháng còn phải giữ để phí bán về 0: 0 nếu đã hết phí, null nếu biểu phí không bao giờ về 0. */
  monthsLeft: number | null
}

/**
 * Còn bao lâu nữa thì rút không mất phí bán. `months` là thời gian đã giữ.
 * Không có biểu phí thì null (không biết, không đoán).
 */
export function feeFreeInfo(tiers: FeeTier[], months: number): FeeFreeInfo | null {
  const currentRate = sellFeePct(tiers, months)
  if (currentRate === null) return null
  if (currentRate === 0) return { currentRate, monthsLeft: 0 }
  const freeFrom = tiers.filter(t => t.rate === 0 && t.from > months).map(t => t.from)
  return { currentRate, monthsLeft: freeFrom.length > 0 ? Math.min(...freeFrom) - months : null }
}
