import { memo, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import type { FundMeta, PricePoint } from '../types'
import { PortfolioValueChart } from './PortfolioValueChart'
import { useFundSeriesMap } from '../hooks/useFundData'
import { useLanguage } from '../hooks/useLanguage'
import { useDecimal, useT, type TranslationKey } from '../i18n'
import { loadLS, saveLS } from '../utils/localStorage'
import { fundDisplayName } from '../utils/fundName'
import { formatVNDFull } from '../utils/vndFormat'
import { readXlsWorkbook, XlsError } from '../utils/xlsReader'
import { ReportError, parseAssetStatementWorkbook } from '../utils/fmarketReport'
import {
  EMPTY_STATE, computePerformance, deriveOrders, effectiveOrders, findOversells, priceDeviation, reconcile, removeSnapshot,
  sanitizeState, upsertSnapshot, type Order, type PortfolioState,
} from '../utils/myPortfolio'
import { IconWarning } from './icons'

interface Props { funds: FundMeta[] }

const STORAGE_KEY = 'my_portfolio_v1'
const MAX_REPORT_BYTES = 5 * 1024 * 1024

interface UploadNotice {
  kind: 'ok' | 'error'
  text: string
  orders?: Order[]
}

function newId(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Tab "Danh mục của tôi": nạp báo cáo tài sản fmarket (.xls), tự suy ra từng lệnh
 * từ chênh lệch giữa các báo cáo, và tính hiệu suất danh mục.
 *
 * RIÊNG TƯ: toàn bộ xử lý nằm trong trình duyệt. File không được gửi đi đâu, và
 * chỉ số dư (mã quỹ, số CCQ, giá) được lưu vào localStorage của trình duyệt này.
 * Họ tên và số giấy tờ trong báo cáo không bao giờ được đọc ra (xem fmarketReport.ts).
 */
function MyPortfolioPanelImpl({ funds }: Props) {
  const t = useT()
  const dec = useDecimal()
  const { language } = useLanguage()
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const [state, setState] = useState<PortfolioState>(() => sanitizeState(loadLS<unknown>(STORAGE_KEY, null)))
  const [notice, setNotice] = useState<UploadNotice | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ fund: '', side: 'buy' as 'buy' | 'sell', date: new Date().toISOString().slice(0, 10), units: '', price: '' })

  useEffect(() => { saveLS(STORAGE_KEY, state) }, [state])

  const orders = useMemo(() => effectiveOrders(state), [state])
  const fundIds = useMemo(() => [...new Set(orders.map(o => o.fund))].filter(id => funds.some(f => f.id === id)), [orders, funds])
  const dualPriceFundIds = useMemo(() => new Set(funds.filter(f => f.type === 'gold').map(f => f.id)), [funds])
  const { data: series, loading } = useFundSeriesMap(fundIds, { dualPriceFundIds })
  const byId = useMemo(() => new Map(funds.map(f => [f.id, f])), [funds])

  const latest = state.snapshots[state.snapshots.length - 1]
  const fallbackNav = useMemo(() => new Map((latest?.holdings ?? []).map(h => [h.fund, h.nav])), [latest])

  // NAV trong báo cáo mới hơn chuỗi giá của app thì nối thêm, để giá trị cuối khớp báo cáo.
  const priceByFund = useMemo(() => {
    const m = new Map<string, PricePoint[]>()
    for (const id of fundIds) {
      const s = series.get(id)
      if (!s) continue
      const nav = fallbackNav.get(id)
      m.set(id, latest && nav && s.length > 0 && latest.date > s[s.length - 1]!.date ? [...s, { date: latest.date, price: nav }] : s)
    }
    return m
  }, [fundIds, series, latest, fallbackNav])

  const perf = useMemo(
    () => (loading ? null : computePerformance(orders, priceByFund, fallbackNav, latest?.date)),
    [loading, orders, priceByFund, fallbackNav, latest],
  )
  const mismatches = useMemo(() => reconcile(state), [state])
  const oversells = useMemo(() => findOversells(orders), [orders])

  const name = (code: string) => {
    const m = byId.get(code)
    return m ? fundDisplayName(m, language) : code
  }
  const money = (v: number) => formatVNDFull(v)
  const pct = (v: number) => `${v >= 0 ? '+' : '−'}${dec(Math.abs(v) * 100, 2)}%`
  const tone = (v: number) => (v >= 0 ? 'dca-profit' : 'dca-loss')

  // ── Nạp báo cáo ──
  async function handleFile(file: File) {
    setNotice(null)
    if (file.size > MAX_REPORT_BYTES) { setNotice({ kind: 'error', text: t('mp.err.size') }); return }
    setBusy(true)
    try {
      const wb = readXlsWorkbook(await file.arrayBuffer())
      const statement = parseAssetStatementWorkbook(wb.sheets)
      const snap = {
        date: statement.date,
        holdings: statement.holdings.map(h => ({ fund: h.fund, units: h.units, avgPrice: h.avgPrice, nav: h.nav })),
      }
      const next = upsertSnapshot(state, snap)
      // Lệnh mới = lệnh suy ra thuộc đúng ảnh chụp vừa nạp (so với ảnh chụp liền trước nó).
      const detected = deriveOrders(next.snapshots).filter(o => o.id.startsWith(`${snap.date}|`))
      // Nạp lại cùng ngày thì các chỉnh sửa cũ của ngày đó không còn đúng nữa.
      const prefix = `${snap.date}|`
      setState({
        ...next,
        dateOverrides: Object.fromEntries(Object.entries(next.dateOverrides).filter(([k]) => !k.startsWith(prefix))),
        ignored: next.ignored.filter(k => !k.startsWith(prefix)),
      })
      setNotice({ kind: 'ok', text: t('mp.ok', { date: snap.date, n: snap.holdings.length }), orders: detected })
    } catch (e) {
      const code = e instanceof ReportError ? `mp.err.${e.code}` : e instanceof XlsError ? 'mp.err.notXls' : 'mp.err.unknown'
      setNotice({ kind: 'error', text: t(code as TranslationKey) })
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) void handleFile(f)
  }

  // ── Sửa sổ lệnh ──
  function setOrderDate(o: Order, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    if (o.source === 'manual') setState(s => ({ ...s, manualOrders: s.manualOrders.map(m => m.id === o.id ? { ...m, date } : m) }))
    else setState(s => ({ ...s, dateOverrides: { ...s.dateOverrides, [o.id]: date } }))
  }
  function deleteOrder(o: Order) {
    if (o.source === 'manual') setState(s => ({ ...s, manualOrders: s.manualOrders.filter(m => m.id !== o.id) }))
    else setState(s => ({ ...s, ignored: s.ignored.includes(o.id) ? s.ignored : [...s.ignored, o.id] }))
  }
  function restoreIgnored() { setState(s => ({ ...s, ignored: [] })) }

  function addManual() {
    const units = Number(form.units.replace(/,/g, ''))
    const price = Number(form.price.replace(/,/g, ''))
    if (!form.fund || !(units > 0) || !(price > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return
    const order: Order = { id: newId(), date: form.date, fund: form.fund.toUpperCase(), side: form.side, units, price, source: 'manual' }
    setState(s => ({ ...s, manualOrders: [...s.manualOrders, order] }))
    setForm(f => ({ ...f, units: '', price: '' }))
  }

  // ── Sao lưu ──
  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 1)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-portfolio-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  async function importBackup(file: File) {
    try {
      const parsed = sanitizeState(JSON.parse(await file.text()))
      if (parsed.snapshots.length === 0 && parsed.manualOrders.length === 0) { setNotice({ kind: 'error', text: t('mp.err.backup') }); return }
      if (state.snapshots.length + state.manualOrders.length > 0 && !window.confirm(t('mp.confirmImport'))) return
      setState(parsed)
      setNotice({ kind: 'ok', text: t('mp.importOk') })
    } catch {
      setNotice({ kind: 'error', text: t('mp.err.backup') })
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }
  function clearAll() {
    if (window.confirm(t('mp.confirmClear'))) { setState(EMPTY_STATE); setNotice(null) }
  }

  const hasData = state.snapshots.length > 0 || state.manualOrders.length > 0
  const ignoredCount = state.ignored.length
  const fundChoices = useMemo(() => funds.filter(f => ['mutual_fund', 'bond', 'balanced', 'etf'].includes(f.type)), [funds])

  return (
    <div className="simulation-panel mp-panel">
      <div className="panel-header"><h2>{t('mp.title')}</h2></div>

      <div className="adv-disclaimer" role="note">
        <IconWarning />
        <p>{t('mp.privacy')}</p>
      </div>

      {/* ── Nạp báo cáo ── */}
      <div
        className={`mp-drop${dragging ? ' mp-drop--over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xls,application/vnd.ms-excel"
          hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
        />
        <div className="mp-drop-title">{t('mp.drop.title')}</div>
        <p className="mp-drop-hint">{t('mp.drop.hint')}</p>
        <button type="button" className="rk-compare-btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? t('app.loading') : t('mp.drop.button')}
        </button>
      </div>

      {notice && (
        <div className={`mp-notice mp-notice--${notice.kind}`} role="status">
          <div>{notice.text}</div>
          {notice.orders && (
            <>
              <div className="mp-notice-sub">
                {notice.orders.length === 0 ? t('mp.noNewOrders') : t('mp.detected', { n: notice.orders.length })}
              </div>
              {notice.orders.length > 0 && (
                <ul>
                  {notice.orders.map(o => (
                    <li key={o.id}>
                      {o.source === 'opening' ? t('mp.opening') : o.side === 'buy' ? t('mp.buy') : t('mp.sell')} {name(o.fund)} · {dec(o.units, 2)} {t('mp.units')} @ {money(o.price)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {!hasData && (
        <div className="perf-table-container">
          <h3>{t('mp.howTitle')}</h3>
          <ol className="mp-how">
            <li>{t('mp.how1')}</li>
            <li>{t('mp.how2')}</li>
            <li>{t('mp.how3')}</li>
          </ol>
        </div>
      )}

      {hasData && loading && <p className="loading-indicator">{t('app.loading')}</p>}

      {mismatches.length > 0 && (
        <div className="mp-notice mp-notice--warn" role="alert">
          <div>{t('mp.mismatch')}</div>
          <ul>
            {mismatches.map(m => (
              <li key={m.fund}>{name(m.fund)}: {t('mp.mismatchRow', { orders: dec(m.fromOrders, 2), report: dec(m.fromReport, 2) })}</li>
            ))}
          </ul>
        </div>
      )}

      {oversells.length > 0 && (
        <div className="mp-notice mp-notice--warn" role="alert">
          <div>{t('mp.oversell')}</div>
          <ul>
            {oversells.map(({ order, held }) => (
              <li key={order.id}>{order.date} · {name(order.fund)}: {t('mp.oversellRow', { sell: dec(order.units, 2), held: dec(held, 2) })}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Hiệu suất ── */}
      {perf && (
        <>
          <div className="adv-stats">
            <div className="adv-stat"><div className="adv-stat-label">{t('mp.tile.value')}</div><div className="adv-stat-value">{money(perf.finalValue)}</div></div>
            <div className="adv-stat"><div className="adv-stat-label">{t('mp.tile.invested')}</div><div className="adv-stat-value">{money(perf.netInvested)}</div></div>
            <div className="adv-stat">
              <div className="adv-stat-label">{t('mp.tile.gain')}</div>
              <div className={`adv-stat-value adv-stat-value--${perf.gain >= 0 ? 'pos' : 'neg'}`}>{perf.gain >= 0 ? '+' : '−'}{money(Math.abs(perf.gain))}</div>
              {perf.gainPct !== null && <div className="sdca-tile-sub">{pct(perf.gainPct)}</div>}
            </div>
            <div className="adv-stat">
              <div className="adv-stat-label">{t('mp.tile.twrr')}</div>
              <div className={`adv-stat-value adv-stat-value--${perf.twrrCumulative >= 0 ? 'pos' : 'neg'}`}>{pct(perf.twrrCumulative)}</div>
              <div className="sdca-tile-sub" title={perf.twrrAnnualized === null ? t('dcaStats.shortPeriod') : undefined}>
                {perf.twrrAnnualized === null ? t('mp.tile.noAnnual') : `${pct(perf.twrrAnnualized)}${t('mp.perYear')}`}
              </div>
            </div>
            <div className="adv-stat">
              <div className="adv-stat-label">MWRR</div>
              <div className="adv-stat-value" title={perf.mwrr === null ? t('dcaStats.shortPeriod') : undefined}>{perf.mwrr === null ? '' : `${pct(perf.mwrr)}${t('mp.perYear')}`}</div>
              {perf.mwrr === null && <div className="sdca-tile-sub">{t('mp.tile.noAnnual')}</div>}
            </div>
          </div>
          <p className="adv-note">{t('mp.since', { from: perf.startDate, to: perf.endDate })} {t('mp.perfNote')}</p>
          {perf.fallbackFunds.length > 0 && (
            <p className="adv-note">{t('mp.fallback', { funds: perf.fallbackFunds.join(', ') })}</p>
          )}

          <PortfolioValueChart portfolios={[{ name: t('mp.title'), color: '#2563EB', values: perf.values, invested: perf.invested }]} />

          <section className="perf-table-container">
            <div className="chart-header"><h3>{t('mp.holdings')}</h3></div>
            <div className="perf-table-wrap">
              <table className="perf-table rk-table">
                <thead>
                  <tr>
                    <th>{t('fee.col.fund')}</th><th>{t('mp.col.units')}</th><th>{t('mp.col.avg')}</th><th>NAV</th>
                    <th>{t('mp.col.value')}</th><th>{t('mp.col.pnl')}</th><th>{t('mp.col.weight')}</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.positions.map(p => (
                    <tr key={p.fund}>
                      <td className="rk-name">{name(p.fund)}</td>
                      <td>{dec(p.units, 2)}</td>
                      <td>{money(p.avgCost)}</td>
                      <td>{money(p.nav)}</td>
                      <td>{money(p.value)}</td>
                      <td className={tone(p.unrealizedGain)}>
                        {p.unrealizedGain >= 0 ? '+' : '−'}{money(Math.abs(p.unrealizedGain))}{p.unrealizedPct !== null && ` (${pct(p.unrealizedPct)})`}
                      </td>
                      <td>
                        <span className="mp-weight"><span style={{ width: `${Math.round(p.weight * 100)}%` }} /></span> {dec(p.weight * 100, 1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ── Sổ lệnh ── */}
      {hasData && (
        <section className="perf-table-container">
          <div className="chart-header"><h3>{t('mp.orders')}</h3></div>
          <p className="adv-note">{t('mp.ordersNote')}</p>
          <div className="perf-table-wrap">
            <table className="perf-table rk-table">
              <thead>
                <tr>
                  <th>{t('mp.col.date')}</th><th>{t('fee.col.fund')}</th><th>{t('mp.col.side')}</th><th>{t('mp.col.units')}</th>
                  <th>{t('mp.col.price')}</th><th>{t('mp.col.amount')}</th><th>{t('mp.col.source')}</th><th />
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <input type="date" className="mp-date" value={o.date} onChange={e => setOrderDate(o, e.target.value)} />
                      {(() => {
                        const dev = priceDeviation(o, priceByFund.get(o.fund))
                        return dev !== null && Math.abs(dev) > 0.02
                          ? <span className="mp-warn" title={t('mp.priceFar', { pct: pct(dev) })}>⚠</span>
                          : null
                      })()}
                    </td>
                    <td className="rk-name">{name(o.fund)}</td>
                    <td><span className={`mp-side mp-side--${o.side}`}>{o.side === 'buy' ? t('mp.buy') : t('mp.sell')}</span></td>
                    <td>{dec(o.units, 2)}</td>
                    <td>{money(o.price)}</td>
                    <td>{money(o.units * o.price)}</td>
                    <td><span className="rk-type">{t(`mp.source.${o.source}` as TranslationKey)}</span></td>
                    <td><button type="button" className="fund-remove-btn" onClick={() => deleteOrder(o)} title={t('mp.deleteOrder')} aria-label={t('mp.deleteOrder')}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ignoredCount > 0 && (
            <p className="adv-note">{t('mp.ignored', { n: ignoredCount })} <button type="button" className="ffb-clear" onClick={restoreIgnored}>{t('mp.restore')}</button></p>
          )}
        </section>
      )}

      {/* ── Thêm lệnh tay ── */}
      <section className="perf-table-container">
        <div className="chart-header"><h3>{t('mp.addOrder')}</h3></div>
        <div className="mp-form">
          <select value={form.fund} onChange={e => setForm(f => ({ ...f, fund: e.target.value }))} aria-label={t('fee.col.fund')}>
            <option value="">{t('mp.chooseFund')}</option>
            {fundChoices.map(f => <option key={f.id} value={f.id}>{fundDisplayName(f, language)}</option>)}
          </select>
          <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value as 'buy' | 'sell' }))} aria-label={t('mp.col.side')}>
            <option value="buy">{t('mp.buy')}</option>
            <option value="sell">{t('mp.sell')}</option>
          </select>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} aria-label={t('mp.col.date')} />
          <input type="text" inputMode="decimal" placeholder={t('mp.col.units')} value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} />
          <input type="text" inputMode="decimal" placeholder={t('mp.col.price')} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <button type="button" className="rk-compare-btn" onClick={addManual}>{t('mp.add')}</button>
        </div>
      </section>

      {/* ── Báo cáo đã nạp & sao lưu ── */}
      {hasData && (
        <section className="perf-table-container">
          <div className="chart-header"><h3>{t('mp.reports')}</h3></div>
          {state.snapshots.length === 0 ? <p className="adv-note">{t('mp.noReports')}</p> : (
            <ul className="mp-reports">
              {[...state.snapshots].reverse().map(s => (
                <li key={s.date}>
                  <span><b>{s.date}</b> · {s.holdings.map(h => h.fund).join(', ')}</span>
                  <button type="button" className="ffb-clear" onClick={() => setState(prev => removeSnapshot(prev, s.date))}>{t('mp.removeReport')}</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className="mp-backup">
        <button type="button" className="lsdca-horizon-btn" onClick={exportBackup} disabled={!hasData}>{t('mp.export')}</button>
        <button type="button" className="lsdca-horizon-btn" onClick={() => importRef.current?.click()}>{t('mp.import')}</button>
        <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void importBackup(f) }} />
        {hasData && <button type="button" className="ffb-clear" onClick={clearAll}>{t('mp.clear')}</button>}
      </div>
    </div>
  )
}

export const MyPortfolioPanel = memo(MyPortfolioPanelImpl)
