import type { PricePoint, ReturnPoint } from '../types'
import { shouldInvest, type DCAFrequency } from './dca'
import { TwrrChain } from './twrr'

/**
 * DCA cổ phiếu: mô phỏng SỔ TÀI KHOẢN chứng khoán thay vì chia đơn vị quỹ.
 *
 * Khác quỹ mở ở chỗ nào (và vì sao cần một engine riêng):
 *  - Mua theo LÔ 100 cổ phiếu (sàn HOSE). Tiền lẻ không đủ một lô nằm lại tài
 *    khoản dưới dạng tiền mặt, dồn sang lần nạp sau. Tiền mặt nhàn rỗi này nằm
 *    trong giá trị tài khoản nên kéo TWRR xuống: đó là chi phí thật của việc
 *    mua theo lô, không giấu đi.
 *  - Chi phí giao dịch tách rõ: phí môi giới mua/bán, thuế bán 0,1%, chênh lệch
 *    mua-bán, thuế cổ tức tiền mặt 5%.
 *  - Sự kiện doanh nghiệp: cổ tức tiền mặt, cổ tức/thưởng bằng cổ phiếu, quyền mua.
 *
 * Giá đầu vào là giá đóng cửa CHƯA điều chỉnh (raw). Nếu đưa giá đã điều chỉnh
 * cổ tức/chia tách vào cùng với danh sách sự kiện thì mỗi sự kiện bị tính hai lần.
 *
 * TWRR tính bằng đúng TwrrChain của tab DCA quỹ (utils/twrr.ts): tiền nạp/rút
 * tách khỏi lợi nhuận, mọi chi phí trừ thẳng vào lợi nhuận ngay ngày phát sinh.
 */

/** Lô giao dịch chuẩn: mua theo bội số 100 cổ phiếu. */
export const LOT_SIZE = 100

export interface StockCashDividend {
  kind: 'cash'
  /** Ngày giao dịch không hưởng quyền: từ ngày này giá cổ phiếu đã bị trừ cổ tức. */
  exDate: string
  /** Ngày nhận tiền. Bỏ trống = nhận cùng ngày ex. */
  payDate?: string
  /** Cổ tức tiền mặt VND/cổ phiếu (gross, trước thuế). */
  perShare: number
}

export interface StockBonusShares {
  kind: 'stock'
  exDate: string
  /** Tỷ lệ nhận thêm: 0.1 = 10 cổ phiếu thưởng cho 100 đang giữ. Phần lẻ bị làm tròn xuống. */
  ratio: number
}

export interface StockRightsIssue {
  kind: 'rights'
  exDate: string
  /** Tỷ lệ quyền: 0.2 = được mua thêm 20 cổ phiếu cho 100 đang giữ. */
  ratio: number
  /** Giá phát hành thêm VND/cổ phiếu. */
  price: number
}

export type StockEvent = StockCashDividend | StockBonusShares | StockRightsIssue

export interface StockCostRates {
  /** Phí môi giới khi mua (tỷ lệ giá trị lệnh). */
  buyFeeRate: number
  /** Phí môi giới khi bán. */
  sellFeeRate: number
  /** Thuế thu nhập cá nhân khi bán (0,1% giá trị bán). */
  sellTaxRate: number
  /** Chênh lệch mua-bán TỔNG (bid-ask): mua ở giá đóng cửa × (1 + s/2), bán ở × (1 − s/2). */
  spreadRate: number
  /** Thuế thu nhập cá nhân trên cổ tức tiền mặt, khấu trừ tại nguồn (5%). */
  dividendTaxRate: number
}

export const DEFAULT_STOCK_COSTS: StockCostRates = {
  buyFeeRate: 0.0015,
  sellFeeRate: 0.0015,
  sellTaxRate: 0.001,
  spreadRate: 0,
  dividendTaxRate: 0.05,
}

export interface StockDcaParams {
  initialAmount: number
  cashflowAmount: number
  cashflowFreq: DCAFrequency
}

export interface StockWithdrawal {
  date: string
  /** Số tiền ròng nhà đầu tư nhận về (VND). */
  amount: number
}

export interface StockDcaOptions {
  costs?: Partial<StockCostRates>
  events?: StockEvent[]
  /** Thực hiện quyền mua (true) hay bỏ qua (false). Bỏ qua thì không bán được quyền, phần pha loãng nằm trong giá. */
  exerciseRights?: boolean
  /** Bán hết ở ngày cuối để tính nốt phí bán và thuế bán. Mặc định false: giá trị cuối kỳ là giá trị thị trường. */
  liquidateAtEnd?: boolean
  withdrawals?: StockWithdrawal[]
}

export type LedgerEntryType =
  | 'deposit' | 'buy' | 'sell' | 'withdraw'
  | 'cashDividend' | 'stockDividend' | 'rightsExercise'

export interface LedgerEntry {
  date: string
  type: LedgerEntryType
  /** Số cổ phiếu tăng (+) / giảm (−) trong dòng này. */
  qty: number
  /** Giá khớp hoặc giá phát hành (VND/cp). 0 với dòng không có giá. */
  price: number
  /** Giá trị tiền của dòng (VND, luôn dương). */
  amount: number
  /** Phí môi giới của dòng. */
  fee: number
  /** Thuế của dòng (thuế bán hoặc thuế cổ tức). */
  tax: number
  /** Chi phí do chênh lệch mua-bán. */
  spread: number
  cashAfter: number
  sharesAfter: number
}

export interface StockCostBreakdown {
  brokerage: number
  sellTax: number
  spread: number
  dividendTax: number
}

export interface StockDcaResult {
  values: { date: string; value: number }[]
  invested: { date: string; value: number }[]
  /** Dòng tiền nhà đầu tư cho MWRR: nạp âm, rút dương, giá trị cuối dương. */
  cashflows: { date: string; amount: number }[]
  cumulative: ReturnPoint[]
  cumulativeGross: ReturnPoint[]
  drawdown: ReturnPoint[]
  returns: ReturnPoint[]
  totalInvested: number
  totalWithdrawn: number
  finalValue: number
  totalCosts: number
  costBreakdown: StockCostBreakdown
  ledger: LedgerEntry[]
  finalShares: number
  finalCash: number
  cashDividendsNet: number
  bonusShares: number
  rightsShares: number
}

function emptyResult(): StockDcaResult {
  return {
    values: [], invested: [], cashflows: [], cumulative: [], cumulativeGross: [], drawdown: [], returns: [],
    totalInvested: 0, totalWithdrawn: 0, finalValue: 0, totalCosts: 0,
    costBreakdown: { brokerage: 0, sellTax: 0, spread: 0, dividendTax: 0 },
    ledger: [], finalShares: 0, finalCash: 0, cashDividendsNet: 0, bonusShares: 0, rightsShares: 0,
  }
}

/** Số cổ phiếu mua được theo lô với `cash` VND ở giá khớp `ask` và phí `feeRate`. */
export function lotsAffordable(cash: number, ask: number, feeRate: number): number {
  if (!(cash > 0) || !(ask > 0)) return 0
  const shares = cash / (ask * (1 + feeRate))
  return Math.floor(shares / LOT_SIZE + 1e-9) * LOT_SIZE
}

/**
 * Chạy mô phỏng. `prices` là giá đóng cửa RAW theo ngày, đã sắp xếp tăng dần.
 * Ngày đầu tiên là ngày nạp `initialAmount`.
 */
export function simulateStockDCA(
  prices: PricePoint[],
  params: StockDcaParams,
  options: StockDcaOptions = {},
): StockDcaResult {
  if (prices.length === 0) return emptyResult()

  const c: StockCostRates = { ...DEFAULT_STOCK_COSTS, ...options.costs }
  const halfSpread = Math.max(c.spreadRate, 0) / 2
  const exerciseRights = options.exerciseRights ?? false
  const events = [...(options.events ?? [])].sort((a, b) => a.exDate.localeCompare(b.exDate))
  const withdrawals = [...(options.withdrawals ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  const lastIdx = prices.length - 1

  let qty = 0
  let cash = 0
  let receivable = 0 // cổ tức tiền mặt đã ex nhưng chưa nhận (gross), tính vào giá trị tài khoản
  const pendingPay: { payDate: string; gross: number }[] = []
  let eventPtr = 0
  let wdPtr = 0

  let totalInvested = 0
  let totalWithdrawn = 0
  let lastInvestDate = ''
  let cashDividendsNet = 0
  let bonusShares = 0
  let rightsShares = 0
  const breakdown: StockCostBreakdown = { brokerage: 0, sellTax: 0, spread: 0, dividendTax: 0 }

  const values: { date: string; value: number }[] = []
  const invested: { date: string; value: number }[] = []
  const cashflows: { date: string; amount: number }[] = []
  const ledger: LedgerEntry[] = []
  const twrr = new TwrrChain()

  const push = (e: Omit<LedgerEntry, 'cashAfter' | 'sharesAfter'>) =>
    ledger.push({ ...e, cashAfter: cash, sharesAfter: qty })

  let prevEnd = 0

  for (let i = 0; i < prices.length; i++) {
    const { date, price } = prices[i]!
    let dayCosts = 0
    let flow = 0

    // ── A. Sự kiện doanh nghiệp có hiệu lực hôm nay (giá đã điều chỉnh theo sự kiện).
    //     Thưởng cổ phiếu và quyền nhận cổ tức bảo toàn giá trị nên xảy ra TRƯỚC v0.
    const rightsToday: StockRightsIssue[] = []
    while (eventPtr < events.length && events[eventPtr]!.exDate <= date) {
      const ev = events[eventPtr++]!
      if (qty <= 0) continue
      if (ev.kind === 'stock') {
        const extra = Math.floor(qty * ev.ratio + 1e-9)
        if (extra > 0) {
          qty += extra
          bonusShares += extra
          push({ date, type: 'stockDividend', qty: extra, price: 0, amount: 0, fee: 0, tax: 0, spread: 0 })
        }
      } else if (ev.kind === 'cash') {
        const gross = qty * ev.perShare
        if (gross > 0) pendingPay.push({ payDate: ev.payDate ?? ev.exDate, gross })
        if (gross > 0) receivable += gross
      } else {
        rightsToday.push(ev)
      }
    }

    // v0: giá trị trước mọi giao dịch hôm nay, chỉ có biến động giá (+ sự kiện bảo toàn giá trị)
    const v0 = qty * price + cash + receivable

    // ── B. Nhận cổ tức tiền mặt đến hạn: khấu trừ thuế tại nguồn (chi phí).
    for (let k = pendingPay.length - 1; k >= 0; k--) {
      const p = pendingPay[k]!
      if (p.payDate > date) continue
      pendingPay.splice(k, 1)
      const tax = p.gross * c.dividendTaxRate
      const net = p.gross - tax
      receivable -= p.gross
      cash += net
      cashDividendsNet += net
      breakdown.dividendTax += tax
      dayCosts += tax
      push({ date, type: 'cashDividend', qty: 0, price: 0, amount: net, fee: 0, tax, spread: 0 })
    }

    // ── C. Thực hiện quyền mua: trả tiền phát hành, thiếu thì nhà đầu tư nạp thêm.
    if (exerciseRights) {
      for (const r of rightsToday) {
        const n = Math.floor(qty * r.ratio + 1e-9)
        if (n <= 0) continue
        const pay = n * r.price
        if (cash < pay) {
          const topUp = pay - cash
          cash += topUp
          flow += topUp
          totalInvested += topUp
          cashflows.push({ date, amount: -topUp })
        }
        cash -= pay
        qty += n
        rightsShares += n
        push({ date, type: 'rightsExercise', qty: n, price: r.price, amount: pay, fee: 0, tax: 0, spread: 0 })
      }
    }

    // ── D. Nạp tiền
    let buyToday = false
    if (i === 0) {
      if (params.initialAmount > 0) {
        cash += params.initialAmount
        flow += params.initialAmount
        totalInvested += params.initialAmount
        cashflows.push({ date, amount: -params.initialAmount })
        push({ date, type: 'deposit', qty: 0, price: 0, amount: params.initialAmount, fee: 0, tax: 0, spread: 0 })
        buyToday = true
      }
      lastInvestDate = date
    } else if (params.cashflowAmount > 0 && shouldInvest(lastInvestDate || prices[0]!.date, date, params.cashflowFreq)) {
      cash += params.cashflowAmount
      flow += params.cashflowAmount
      totalInvested += params.cashflowAmount
      lastInvestDate = date
      cashflows.push({ date, amount: -params.cashflowAmount })
      push({ date, type: 'deposit', qty: 0, price: 0, amount: params.cashflowAmount, fee: 0, tax: 0, spread: 0 })
      buyToday = true
    }

    // ── E. Rút tiền: dùng tiền mặt trước, thiếu thì bán cổ phiếu (chịu phí, thuế, chênh lệch).
    while (wdPtr < withdrawals.length && withdrawals[wdPtr]!.date <= date) {
      const w = withdrawals[wdPtr++]!
      if (!(w.amount > 0)) continue
      if (cash < w.amount && qty > 0) {
        const bid = price * (1 - halfSpread)
        const perShareNet = bid * (1 - c.sellFeeRate - c.sellTaxRate)
        const need = Math.min(qty, Math.ceil((w.amount - cash) / perShareNet - 1e-9))
        const sale = sellShares(need, price, date)
        dayCosts += sale.costs
      }
      const paid = Math.min(w.amount, cash)
      if (paid > 0) {
        cash -= paid
        flow -= paid
        totalWithdrawn += paid
        cashflows.push({ date, amount: paid })
        push({ date, type: 'withdraw', qty: 0, price: 0, amount: paid, fee: 0, tax: 0, spread: 0 })
      }
    }

    // ── F. Mua theo lô bằng toàn bộ tiền mặt đang có (kể cả tiền lẻ và cổ tức các kỳ trước).
    if (buyToday) {
      const ask = price * (1 + halfSpread)
      const n = lotsAffordable(cash, ask, c.buyFeeRate)
      if (n > 0) {
        const gross = n * ask
        const fee = gross * c.buyFeeRate
        const spread = n * (ask - price)
        cash -= gross + fee
        qty += n
        breakdown.brokerage += fee
        breakdown.spread += spread
        dayCosts += fee + spread
        push({ date, type: 'buy', qty: n, price: ask, amount: gross, fee, tax: 0, spread })
      }
    }

    // ── G. Bán hết ở ngày cuối (tuỳ chọn) để tính nốt chi phí thoát vị thế.
    if (i === lastIdx && options.liquidateAtEnd && qty > 0) {
      dayCosts += sellShares(qty, price, date).costs
    }

    const v1 = qty * price + cash + receivable
    if (i === 0) {
      twrr.start(date, flow, v1, dayCosts)
    } else {
      twrr.step({ date, prevEnd, v0, flow, v1, costs: dayCosts })
    }
    values.push({ date, value: v1 })
    invested.push({ date, value: totalInvested })
    prevEnd = v1
  }

  function sellShares(n: number, price: number, date: string): { costs: number } {
    const bid = price * (1 - halfSpread)
    const gross = n * bid
    const fee = gross * c.sellFeeRate
    const tax = gross * c.sellTaxRate
    const spread = n * (price - bid)
    cash += gross - fee - tax
    qty -= n
    breakdown.brokerage += fee
    breakdown.sellTax += tax
    breakdown.spread += spread
    push({ date, type: 'sell', qty: -n, price: bid, amount: gross, fee, tax, spread })
    return { costs: fee + tax + spread }
  }

  const series = twrr.result()
  const finalValue = values[values.length - 1]!.value

  return {
    values,
    invested,
    cashflows: [...cashflows, { date: prices[lastIdx]!.date, amount: finalValue }],
    cumulative: series.cumulative,
    cumulativeGross: series.cumulativeGross,
    drawdown: series.drawdown,
    returns: series.returns,
    totalInvested,
    totalWithdrawn,
    finalValue,
    totalCosts: series.totalCosts,
    costBreakdown: breakdown,
    ledger,
    finalShares: qty,
    finalCash: cash,
    cashDividendsNet,
    bonusShares,
    rightsShares,
  }
}
