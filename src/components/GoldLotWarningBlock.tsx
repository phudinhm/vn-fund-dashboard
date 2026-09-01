/**
 * GoldLotWarningBlock: minh bạch giới hạn "mua theo lô" của vàng vật chất.
 *
 * Vị trí: tab DCA, ngay dưới nút "Chạy DCA".
 *
 * Khác với quỹ mở/ETF (chia nhỏ vô hạn, mua được bằng bất kỳ số tiền nào),
 * vàng miếng/nhẫn SJC ngoài đời chỉ bán theo lô cố định — nhỏ nhất là 0,5 chỉ
 * (1 lượng = 10 chỉ). Engine DCA hiện tại vẫn giả định vàng chia nhỏ được y
 * hệt quỹ mở (đơn giản hoá cần thiết để tái dùng chung logic mô phỏng), nên
 * nếu số tiền nạp mỗi kỳ/ban đầu thấp hơn giá 1 lô, kết quả mô phỏng sẽ lạc
 * quan hơn thực tế — nhà đầu tư ngoài đời phải gộp nhiều kỳ mới đủ tiền mua.
 *
 * Giá vàng tăng theo thời gian, nên "không đủ tiền mua 1 lô" là một mốc thời
 * điểm, không phải hằng số — 5 triệu/tháng có thể từng dư sức mua 0,5 chỉ hồi
 * 2016 nhưng không còn đủ ở giá hiện tại. Vì vậy điều kiện cảnh báo luôn xét
 * theo giá tại thời điểm CUỐI của khoảng ngày đang mô phỏng (mặc định là hôm
 * nay nếu chọn "Tất cả"/"X năm qua" không giới hạn ngày kết thúc), rồi dò
 * ngược lịch sử trong đúng khoảng đó để báo chính xác từ khi nào mới thành
 * vấn đề — tránh đánh đồng cả giai đoạn mô phỏng là "không đủ tiền" khi thực
 * ra chỉ gần đây mới vậy.
 *
 * Chỉ hiển thị khi danh mục có ít nhất 1 quỹ vàng (type: 'gold'); im lặng
 * (return null) với danh mục toàn quỹ mở/ETF.
 */
import { useMemo, useState } from 'react'
import type { FundMeta, PortfolioCardState, PricePoint } from '../types'
import { formatVND } from '../utils/vndFormat'
import { useT, useTRich } from '../i18n'

/** Đơn vị bán lẻ nhỏ nhất SJC thực tế cho cả vàng miếng và vàng nhẫn. */
const SMALLEST_LOT_CHI = 0.5
const CHI_PER_LUONG = 10

interface Props {
  portfolios: PortfolioCardState[]
  initialAmount: number
  cashflowAmount: number
  funds: FundMeta[]
  /** Giá "bán ra" (sell) — giá nhà đầu tư phải trả khi mua. Chỉ có entry cho quỹ vàng. */
  purchasePriceData: Map<string, PricePoint[]>
  /** Khoảng ngày đang mô phỏng (YYYY-MM-DD). Rỗng = không giới hạn (dùng toàn bộ lịch sử có sẵn). */
  dateFrom: string
  dateTo: string
}

interface LotIssue {
  portfolioName: string
  fundName: string
  weight: number
  kind: 'initial' | 'periodic'
  contribution: number
  lotPrice: number
  periodsNeeded: number
  /** Nếu số tiền từng đủ mua 1 lô trong giai đoạn mô phỏng, mốc ngày bắt đầu không còn đủ nữa. */
  sinceDate: string | null
  rangeStart: string
  rangeEnd: string
}

function lotPriceAt(p: PricePoint) {
  return (p.price / CHI_PER_LUONG) * SMALLEST_LOT_CHI
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Lọc chuỗi giá theo khoảng ngày (rỗng = không giới hạn phía đó). Giả định `prices` đã sắp theo ngày tăng dần. */
function filterRange(prices: PricePoint[], dateFrom: string, dateTo: string): PricePoint[] {
  return prices.filter(p => (!dateFrom || p.date >= dateFrom) && (!dateTo || p.date <= dateTo))
}

/**
 * Xét mức đủ tiền tại thời điểm CUỐI khoảng mô phỏng. Nếu đủ ở cuối, coi như
 * không có vấn đề (bỏ qua biến động trong quá khứ). Nếu không đủ, dò ngược để
 * tìm mốc ngày gần nhất mà số tiền còn đủ (nếu có) — đó là lúc bắt đầu thành
 * vấn đề trong giai đoạn mô phỏng.
 */
function evaluateContribution(arr: PricePoint[], contribution: number) {
  const n = arr.length
  const endLot = lotPriceAt(arr[n - 1]!)
  if (contribution >= endLot) return null

  let sinceIdx = 0
  for (let i = n - 1; i >= 0; i--) {
    if (contribution >= lotPriceAt(arr[i]!)) {
      sinceIdx = i + 1
      break
    }
  }
  return {
    lotPrice: endLot,
    sinceDate: sinceIdx > 0 ? arr[Math.min(sinceIdx, n - 1)]!.date : null,
    rangeStart: arr[0]!.date,
    rangeEnd: arr[n - 1]!.date,
  }
}

export function GoldLotWarningBlock({
  portfolios, initialAmount, cashflowAmount, funds, purchasePriceData, dateFrom, dateTo,
}: Props) {
  const t = useT()
  const tr = useTRich()
  const [expanded, setExpanded] = useState(false)

  const goldFunds = useMemo(
    () => new Map(funds.filter(f => f.type === 'gold').map(f => [f.id, f])),
    [funds],
  )

  const { issues, hasGold } = useMemo(() => {
    const issues: LotIssue[] = []
    let hasGold = false

    for (const p of portfolios) {
      for (const s of p.slots) {
        const goldFund = s.fundId ? goldFunds.get(s.fundId) : undefined
        if (!goldFund || s.weight <= 0) continue
        hasGold = true

        const allPrices = purchasePriceData.get(s.fundId)
        if (!allPrices || allPrices.length === 0) continue // data chưa load xong
        const prices = filterRange(allPrices, dateFrom, dateTo)
        if (prices.length === 0) continue
        const weightFrac = s.weight / 100

        if (cashflowAmount > 0) {
          const contribution = cashflowAmount * weightFrac
          const detail = contribution > 0 ? evaluateContribution(prices, contribution) : null
          if (detail) {
            issues.push({
              portfolioName: p.name, fundName: goldFund.name_vi, weight: s.weight,
              kind: 'periodic', contribution, lotPrice: detail.lotPrice,
              periodsNeeded: Math.ceil(detail.lotPrice / contribution),
              sinceDate: detail.sinceDate, rangeStart: detail.rangeStart, rangeEnd: detail.rangeEnd,
            })
          }
        }
        if (initialAmount > 0) {
          const contribution = initialAmount * weightFrac
          const detail = contribution > 0 ? evaluateContribution(prices, contribution) : null
          if (detail) {
            issues.push({
              portfolioName: p.name, fundName: goldFund.name_vi, weight: s.weight,
              kind: 'initial', contribution, lotPrice: detail.lotPrice,
              periodsNeeded: Math.ceil(detail.lotPrice / contribution),
              sinceDate: detail.sinceDate, rangeStart: detail.rangeStart, rangeEnd: detail.rangeEnd,
            })
          }
        }
      }
    }
    return { issues, hasGold }
  }, [portfolios, initialAmount, cashflowAmount, purchasePriceData, goldFunds, dateFrom, dateTo])

  if (!hasGold) return null

  const hasWarnings = issues.length > 0

  return (
    <div className={`dq-block ${hasWarnings ? 'dq-block--warn' : 'dq-block--ok'}`}>
      <button
        className="dq-header"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className={`dq-dot ${hasWarnings ? 'dq-dot--warn' : 'dq-dot--ok'}`} />
        <span className="dq-header-main">
          {hasWarnings ? (
            <>
              <strong>{t('gold.warnTitle')}</strong>
              <span className="dq-header-sub">{t('gold.warnSub', { n: issues.length })}</span>
            </>
          ) : (
            <>
              <strong>{t('gold.okTitle')}</strong>
              <span className="dq-header-sub">{t('gold.okSub')}</span>
            </>
          )}
        </span>
        <span className="dq-toggle">{t(expanded ? 'dq.collapse' : 'dq.expand')}</span>
      </button>

      {expanded && (
        <div className="dq-body">
          <p className="dq-intro">
            {tr('gold.intro1')}
            <span className="dq-highlight">{t('gold.intro2')}</span>{' '}
            {tr('gold.intro3')}
          </p>

          {hasWarnings && (
            <div className="dq-issues">
              <h4 className="dq-issues-title">{t('gold.issuesTitle')}</h4>
              {issues.map((iss, i) => (
                <div className="dq-issue-card" key={i}>
                  <div className="dq-issue-head">
                    <strong>{iss.portfolioName}</strong> — {iss.fundName} ({iss.weight}%)
                  </div>
                  <ul className="dq-issue-list">
                    <li>
                      {tr(iss.kind === 'periodic' ? 'gold.issuePeriodic' : 'gold.issueInitial', {
                        amount: formatVND(iss.contribution),
                        date: fmtDate(iss.rangeEnd),
                        lotPrice: formatVND(iss.lotPrice),
                      })}{' '}
                      {iss.sinceDate
                        ? tr('gold.wasEnough', { since: fmtDate(iss.sinceDate) })
                        : tr('gold.neverEnough', {
                            from: fmtDate(iss.rangeStart),
                            to: fmtDate(iss.rangeEnd),
                          })}{' '}
                      {tr(iss.kind === 'periodic' ? 'gold.periodsNeeded' : 'gold.timesNeeded', {
                        n: iss.periodsNeeded,
                      })}
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
