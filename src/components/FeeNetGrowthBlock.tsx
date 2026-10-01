import { memo, useEffect, useMemo, useState } from 'react'
import type { FundMeta } from '../types'
import { MoneyInput } from './MoneyInput'
import { useFundFees } from '../hooks/useFundFees'
import { useDecimal, useT } from '../i18n'
import { loadLS, saveLS } from '../utils/localStorage'
import {
  EXCHANGE_TRADED_FEES, buyFeePct, describeSellTiers, holdingMonths, netOnHand, sellFeePct,
  type FeeTier,
} from '../utils/fundFees'

export interface FeeBlockFund {
  id: string
  name: string
  color: string
  /** Tổng lợi nhuận theo NAV trong kỳ so sánh (thập phân). */
  gross: number
}

interface Props {
  funds: FeeBlockFund[]
  metadata: FundMeta[]
  startDate: string
  endDate: string
}

function pickAmount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 100_000_000
}

/**
 * "Tăng trưởng thực nhận" (net on hand): lãi theo NAV đã trừ phí quản lý và phí
 * thưởng hiệu quả, nhưng CHƯA trừ phí mua và phí bán, vì hai phí đó thu ngoài
 * NAV khi nhà đầu tư vào và ra quỹ. Khối này trừ chúng theo đúng số tiền mua và
 * số tháng nắm giữ của kỳ đang so sánh.
 */
function FeeNetGrowthBlockImpl({ funds, metadata, startDate, endDate }: Props) {
  const t = useT()
  const dec = useDecimal()
  const { fees, loaded } = useFundFees()
  const [amount, setAmount] = useState(() => pickAmount(loadLS<unknown>('fee_amount', 100_000_000)))
  const [withBuy, setWithBuy] = useState(() => loadLS<unknown>('fee_buy', true) !== false)
  const [withSell, setWithSell] = useState(() => loadLS<unknown>('fee_sell', true) !== false)
  useEffect(() => { saveLS('fee_amount', amount) }, [amount])
  useEffect(() => { saveLS('fee_buy', withBuy) }, [withBuy])
  useEffect(() => { saveLS('fee_sell', withSell) }, [withSell])

  const months = holdingMonths(startDate, endDate)
  const typeById = useMemo(() => new Map(metadata.map(m => [m.id, m.type])), [metadata])
  const pct = (v: number) => `${v >= 0 ? '+' : '−'}${dec(Math.abs(v) * 100, 2)}%`
  const rate = (v: number) => dec(v, 2)

  const rows = funds.map(f => {
    const type = typeById.get(f.id)
    const known = fees.get(f.id)
    let buy: FeeTier[] = []
    let sell: FeeTier[] = []
    let estimated = false
    if (type === 'etf') {
      buy = EXCHANGE_TRADED_FEES.buy
      sell = EXCHANGE_TRADED_FEES.sell
      estimated = true
    } else if (known && (known.buy.length > 0 || known.sell.length > 0)) {
      buy = known.buy
      sell = known.sell
    }
    const hasSchedule = buy.length > 0 || sell.length > 0
    const buyPct = withBuy ? (buyFeePct(buy, amount) ?? 0) : 0
    const sellPct = withSell ? (sellFeePct(sell, months) ?? 0) : 0
    return {
      ...f, known, buy, sell, estimated, hasSchedule,
      result: hasSchedule ? netOnHand({ gross: f.gross, buyPct, sellPct, startDate, endDate }) : null,
    }
  })

  return (
    <section className="perf-table-container fee-block">
      <div className="chart-header">
        <h3>{t('fee.title')}</h3>
        <span className="chart-tooltip-icon" title={t('fee.help')}>?</span>
      </div>
      <p className="adv-note fee-lead">{t('fee.lead', { months: dec(months, 0) })}</p>

      <div className="fee-controls">
        <label className="fee-amount">
          <span>{t('fee.amount')}</span>
          <span className="dca-amount-input">
            <MoneyInput value={amount} onChange={setAmount} min={1_000_000} />
            <span className="dca-currency">₫</span>
          </span>
        </label>
        <label className="fee-check"><input type="checkbox" checked={withBuy} onChange={e => setWithBuy(e.target.checked)} /> {t('fee.withBuy')}</label>
        <label className="fee-check"><input type="checkbox" checked={withSell} onChange={e => setWithSell(e.target.checked)} /> {t('fee.withSell')}</label>
      </div>

      <div className="perf-table-wrap">
        <table className="perf-table">
          <thead>
            <tr>
              <th>{t('fee.col.fund')}</th>
              <th>{t('fee.col.mgmt')}</th>
              <th>{t('fee.col.buy')}</th>
              <th>{t('fee.col.sell', { months: dec(months, 0) })}</th>
              <th>{t('fee.col.gross')}</th>
              <th>{t('fee.col.net')}</th>
              <th>{t('fee.col.drag')}</th>
              <th>{t('fee.col.netYear')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td><span className="perf-dot" style={{ background: r.color }} />{r.name}</td>
                <td>{r.known?.management != null ? `${rate(r.known.management)}%` : '—'}</td>
                <td>{r.result ? `${rate(r.result.buyPct)}%` : '—'}</td>
                <td>{r.result ? `${rate(r.result.sellPct)}%` : '—'}</td>
                <td>{pct(r.gross)}</td>
                <td className={r.result ? (r.result.net >= 0 ? 'dca-profit' : 'dca-loss') : undefined}>
                  {r.result ? <strong>{pct(r.result.net)}</strong> : '—'}
                </td>
                <td>{r.result ? `−${dec(r.result.drag * 100, 2)}` : '—'}</td>
                <td title={r.result && r.result.netAnnualized === null ? t('dcaStats.shortPeriod') : undefined}>
                  {r.result && r.result.netAnnualized !== null ? pct(r.result.netAnnualized) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="fee-schedule">
        <summary>{t('fee.schedule')}</summary>
        <ul>
          {rows.map(r => (
            <li key={r.id}>
              <b>{r.name}</b>
              {r.hasSchedule ? (
                <>
                  {': '}
                  {t('fee.sched.buy')} {r.buy.length > 0 ? r.buy.map(b => `${rate(b.rate)}%`).filter((v, i, a) => a.indexOf(v) === i).join(' / ') : '—'}
                  {' · '}
                  {t('fee.sched.sell')} {r.sell.length > 0 ? describeSellTiers(r.sell, t('fee.monthUnit'), rate) : '—'}
                  {r.known?.performance ? ` · ${t('fee.sched.perf')} ${rate(r.known.performance)}%` : ''}
                  {r.estimated ? ` (${t('fee.estimated')})` : ''}
                </>
              ) : (
                <>: {loaded ? t('fee.none') : t('app.loading')}</>
              )}
            </li>
          ))}
        </ul>
      </details>
      <p className="adv-note">{t('fee.note')}</p>
    </section>
  )
}

export const FeeNetGrowthBlock = memo(FeeNetGrowthBlockImpl)
