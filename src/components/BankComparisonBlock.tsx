/**
 * BankComparisonBlock: so sánh DCA với gửi tiết kiệm ngân hàng.
 *
 * Retail VN luôn so với tiết kiệm. Dashboard này trả lời thẳng:
 * "Cùng số tiền đó, gửi ngân hàng thì có bao nhiêu?"
 *
 * Cách tính: lấy từng khoản nạp thực tế (từ investedSeries delta), compound
 * mỗi khoản tại lãi suất ngân hàng từ ngày nạp đến ngày kết thúc. Chính xác
 * hơn FV annuity formula (vốn giả định dòng tiền đều).
 *
 * Lãi suất mặc định 6.5%/năm, gần trung bình tiết kiệm kỳ hạn 12 tháng
 * nhóm ngân hàng lớn VN 2024–2026. Có thể user chỉnh trong tương lai.
 */
import { useState, memo } from 'react'
import { formatVND } from '../utils/vndFormat'
import { useT, useTRich } from '../i18n'

const DEFAULT_BANK_RATE = 0.065  // 6.5%/năm

const RATE_OPTIONS = [
  { label: '5%', value: 0.05 },
  { label: '6.5%', value: 0.065 },
  { label: '8%', value: 0.08 },
]

export interface BankCompareResult {
  id: string
  name: string
  color: string
  finalValue: number
  investedSeries: { date: string; value: number }[]
}

interface Props {
  results: BankCompareResult[]
  endDate: string  // YYYY-MM-DD
}

function BankComparisonBlockImpl({ results, endDate }: Props) {
  const t = useT()
  const tr = useTRich()
  const [bankRate, setBankRate] = useState<number>(DEFAULT_BANK_RATE)

  if (results.length === 0) return null

  const end = new Date(endDate).getTime()
  const msPerYear = 365.25 * 24 * 3600 * 1000

  const comparisons = results.map(r => {
    // Derive deltas from cumulative investedSeries
    let prevCum = 0
    let bankFV = 0
    for (const p of r.investedSeries) {
      const delta = p.value - prevCum
      prevCum = p.value
      if (delta <= 0) continue
      const yearsHeld = (end - new Date(p.date).getTime()) / msPerYear
      if (yearsHeld < 0) continue
      bankFV += delta * Math.pow(1 + bankRate, yearsHeld)
    }
    const diff = r.finalValue - bankFV
    return {
      ...r,
      bankFV,
      diff,
      diffPct: bankFV > 0 ? (diff / bankFV) * 100 : 0,
    }
  })

  return (
    <div className="dca-bank-compare-block">
      <div className="dca-bank-compare-head">
        <h3 className="dca-bank-compare-title">{t('bank.title')}</h3>
        <div className="dca-bank-compare-rate">
          <span>{t('bank.rateLabel')}</span>
          <div className="dca-bank-compare-rate-btns">
            {RATE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`dca-bank-rate-btn${Math.abs(opt.value - bankRate) < 1e-6 ? ' dca-bank-rate-btn--active' : ''}`}
                onClick={() => setBankRate(opt.value)}
                title={t('bank.rateHelp')}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="dca-bank-compare-sub">
        {tr('bank.intro', { rate: (bankRate * 100).toFixed(1) })}
      </p>

      <div className="dca-bank-compare-grid">
        {comparisons.map(c => (
          <div key={c.id} className="dca-bank-compare-row">
            <div className="dca-bank-compare-portfolio" style={{ borderLeftColor: c.color }}>
              <span className="dca-bank-compare-name" style={{ color: c.color }}>{c.name}</span>
              <span className="dca-bank-compare-val">{formatVND(c.finalValue)}</span>
            </div>
            <div className="dca-bank-compare-vs">vs</div>
            <div className="dca-bank-compare-bank">
              <span className="dca-bank-compare-name">{t('bank.deposit')}</span>
              <span className="dca-bank-compare-val">{formatVND(c.bankFV)}</span>
            </div>
            <div className={`dca-bank-compare-delta dca-bank-compare-delta--${c.diff >= 0 ? 'pos' : 'neg'}`}>
              <span className="dca-bank-compare-delta-label">
                {t(c.diff >= 0 ? 'bank.dcaAhead' : 'bank.bankAhead')}
              </span>
              <span className="dca-bank-compare-delta-val">
                {c.diff >= 0 ? '+' : ''}{formatVND(c.diff)}
              </span>
              <span className="dca-bank-compare-delta-pct">
                ({c.diff >= 0 ? '+' : ''}{c.diffPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      {comparisons.length > 0 && (
        <BankTakeaway comparisons={comparisons} />
      )}
    </div>
  )
}

interface TakeawayProps {
  comparisons: Array<{
    name: string
    diff: number
    diffPct: number
  }>
}

function BankTakeaway({ comparisons }: TakeawayProps) {
  const tr = useTRich()
  const winners = comparisons.filter(c => c.diff > 0)
  const losers  = comparisons.filter(c => c.diff <= 0)
  const best = [...comparisons].sort((a, b) => b.diff - a.diff)[0]!

  if (winners.length === comparisons.length) {
    // All beat bank
    return (
      <div className="chart-takeaway chart-takeaway--green">
        <span className="chart-takeaway-icon">🎯</span>
        <div className="chart-takeaway-body">
          {tr('bank.allWin', {
            n: comparisons.length,
            best: best.name,
            diff: `${formatVND(best.diff)} (${best.diffPct >= 0 ? '+' : ''}${best.diffPct.toFixed(1)}%)`,
          })}
        </div>
      </div>
    )
  }

  if (losers.length === comparisons.length) {
    // All lost to bank
    return (
      <div className="chart-takeaway chart-takeaway--red">
        <span className="chart-takeaway-icon">⚠️</span>
        <div className="chart-takeaway-body">
          {tr('bank.allLose', { n: comparisons.length })}
        </div>
      </div>
    )
  }

  // Mixed
  return (
    <div className="chart-takeaway chart-takeaway--orange">
      <span className="chart-takeaway-icon">⚖️</span>
      <div className="chart-takeaway-body">
        {tr('bank.mixed', {
          winners: winners.length,
          total: comparisons.length,
          best: best.name,
          diff: formatVND(best.diff),
        })}
      </div>
    </div>
  )
}

export const BankComparisonBlock = memo(BankComparisonBlockImpl)
