import type { ReturnPoint } from '../types'

/**
 * Lõi TWRR (time-weighted rate of return) dùng CHUNG cho tab DCA quỹ và tab
 * DCA cổ phiếu, để hai tab không thể lệch nhau về cách tính.
 *
 * Quy ước, áp dụng cho từng ngày:
 *
 *   prevEnd  giá trị tài khoản cuối ngày hôm trước (sau mọi giao dịch, phí)
 *   v0       giá trị tài khoản hôm nay TRƯỚC giao dịch, theo giá thị trường hôm nay
 *            (= chỉ có biến động giá, chưa có tiền nạp/rút, chưa mất phí)
 *   flow     tiền ngoài đưa vào (+) hoặc rút ra (−) hôm nay. Đây là dòng tiền của
 *            NHÀ ĐẦU TƯ, không phải lãi lỗ, nên bị tách khỏi TWRR.
 *   v1       giá trị tài khoản hôm nay SAU giao dịch, theo giá thị trường
 *   costs    tổng chi phí phát sinh hôm nay (phí mua, phí bán, thuế, chênh lệch
 *            mua-bán). Mặc định = v0 + flow − v1: mọi hụt giá trị so với vốn
 *            đang vận hành đều là chi phí. Bên cổ phiếu, nơi giao dịch còn có
 *            thể sinh lãi thật (mua quyền mua dưới giá thị trường), truyền
 *            `costs` tường minh để phần lãi đó không bị tính là "phí âm".
 *
 *   thị trường     = v0 / prevEnd
 *   TWRR sau phí   = Π thị trường × v1 / (v0 + flow)
 *   TWRR trước phí = Π thị trường × (v1 + costs) / (v0 + flow)
 *
 * Mọi chi phí trừ thẳng vào lợi nhuận NGAY NGÀY PHÁT SINH thay vì âm thầm nằm
 * trong giá vốn. Chi phí đo trên phần vốn đang vận hành hôm đó (v0 + flow), nên
 * khoản nạp đầu tiên mất 0,15% phí thì TWRR ngày đầu là −0,15% chứ không phải 0.
 *
 * Không có chi phí thì v1 = v0 + flow và công thức quy về TWRR chuẩn (chuỗi
 * nhân gộp lợi suất thị trường từng ngày).
 */

/** Dưới ngưỡng này (năm) thì KHÔNG quy lợi nhuận ra %/năm: mũ hoá vài tháng lên cả năm chỉ là nội suy. */
export const MIN_ANNUALIZE_YEARS = 1

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

/** Số năm giữa hai ngày YYYY-MM-DD (theo 365,25 ngày/năm). */
export function yearsBetween(startDate: string, endDate: string): number {
  return (new Date(endDate).getTime() - new Date(startDate).getTime()) / MS_PER_YEAR
}

/**
 * Kỳ có đủ dài để nói "%/năm" không. Dùng dung sai 1 ngày để kỳ "đúng 1 năm
 * lịch" (365 ngày, ngắn hơn 365,25 một chút) vẫn được tính là đủ năm.
 */
export function isAnnualizable(startDate: string, endDate: string): boolean {
  return yearsBetween(startDate, endDate) >= MIN_ANNUALIZE_YEARS - 1 / 365.25
}

/**
 * Quy hệ số tăng trưởng (1 + lợi nhuận tích lũy) ra %/năm.
 * Trả null khi kỳ chưa đủ 1 năm, khi hệ số ≤ 0, hoặc khi ngày không hợp lệ.
 */
export function annualizeGrowth(growth: number, startDate: string, endDate: string): number | null {
  if (!(growth > 0) || !isAnnualizable(startDate, endDate)) return null
  const years = yearsBetween(startDate, endDate)
  if (!(years > 0)) return null
  return Math.pow(growth, 1 / years) - 1
}

export interface TwrrDayInput {
  date: string
  /** Giá trị cuối ngày hôm trước, sau mọi giao dịch. 0 nếu chưa có vốn. */
  prevEnd: number
  /** Giá trị hôm nay trước giao dịch, theo giá hôm nay. */
  v0: number
  /** Tiền ngoài vào (+) / ra (−) hôm nay. */
  flow: number
  /** Giá trị hôm nay sau giao dịch và mọi chi phí, theo giá hôm nay. */
  v1: number
  /** Tổng chi phí hôm nay (VND). Bỏ trống = v0 + flow − v1 (tối thiểu 0). */
  costs?: number
}

export interface TwrrSeries {
  /** Lợi nhuận tích lũy SAU phí (growth − 1). */
  cumulative: ReturnPoint[]
  /** Lợi nhuận tích lũy TRƯỚC phí: chỉ biến động thị trường. */
  cumulativeGross: ReturnPoint[]
  /** Sụt giảm so với đỉnh, tính trên chuỗi sau phí. */
  drawdown: ReturnPoint[]
  /** Lợi suất ngày sau phí. */
  returns: ReturnPoint[]
  /** Tổng chi phí đã trả (VND): Σ (v0 + flow − v1). */
  totalCosts: number
}

/**
 * Bộ tích luỹ TWRR: gọi `start` cho ngày đầu, rồi `step` cho từng ngày sau.
 * Giữ toàn bộ trạng thái nhân gộp ở một chỗ để hai tab dùng y hệt nhau.
 */
export class TwrrChain {
  private growth = 1
  private growthGross = 1
  private peak = 1
  private costs = 0
  private readonly cumulative: ReturnPoint[] = []
  private readonly cumulativeGross: ReturnPoint[] = []
  private readonly drawdown: ReturnPoint[] = []
  private readonly returns: ReturnPoint[] = []

  /**
   * Ngày đầu. Khoản nạp đầu tiên chịu chi phí ngay (`flow` = tiền nạp, `v1` =
   * giá trị sau khi trừ phí), nên TWRR ngày 0 có thể âm.
   */
  start(date: string, flow: number, v1: number, costs?: number): void {
    this.applyDay(date, 1, flow, v1, costs, false)
  }

  step({ date, prevEnd, v0, flow, v1, costs }: TwrrDayInput): void {
    const market = prevEnd > 0 ? v0 / prevEnd : 1
    this.applyDay(date, market, v0 + flow, v1, costs, true)
  }

  private applyDay(
    date: string, market: number, base: number, v1: number, costs: number | undefined, record: boolean,
  ): void {
    const paid = Math.max(0, costs ?? base - v1)
    let net = 1
    let gross = 1
    if (base > 0) {
      // Chặn dưới rất nhỏ thay vì 0 để một ngày phí bất thường không xoá sạch chuỗi.
      net = Math.max(v1 / base, 1e-9)
      gross = Math.max((v1 + paid) / base, 1e-9)
    }
    this.costs += paid
    this.growth *= market * net
    this.growthGross *= market * gross
    if (this.growth > this.peak) this.peak = this.growth
    this.cumulative.push({ date, value: this.growth - 1 })
    this.cumulativeGross.push({ date, value: this.growthGross - 1 })
    this.drawdown.push({ date, value: this.growth / this.peak - 1 })
    if (record) this.returns.push({ date, value: market * net - 1 })
  }

  /** Lợi nhuận tích lũy sau phí hiện tại (growth − 1). */
  get currentReturn(): number {
    return this.growth - 1
  }

  /** Sụt giảm hiện tại so với đỉnh, sau phí (≤ 0). */
  get currentDrawdown(): number {
    return this.peak > 0 ? this.growth / this.peak - 1 : 0
  }

  /** Tăng trưởng sau phí NẾU hôm nay chỉ có biến động thị trường `market`. Dùng cho hook "bỏ nạp khi sụt sâu". */
  drawdownAfterMarket(market: number): number {
    return this.peak > 0 ? (this.growth * market) / this.peak - 1 : 0
  }

  result(): TwrrSeries {
    return {
      cumulative: this.cumulative,
      cumulativeGross: this.cumulativeGross,
      drawdown: this.drawdown,
      returns: this.returns,
      totalCosts: this.costs,
    }
  }
}
