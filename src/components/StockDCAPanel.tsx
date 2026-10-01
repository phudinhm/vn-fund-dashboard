import { memo, useEffect, useMemo, useState } from 'react'
import { MoneyInput } from './MoneyInput'
import { PortfolioValueChart } from './PortfolioValueChart'
import { DCAStatsTable } from './DCAStatsTable'
import { ReturnMetricsExplainer } from './ReturnMetricsExplainer'
import { useStockIndex, useStockSeries } from '../hooks/useStockData'
import { useLanguage } from '../hooks/useLanguage'
import { useDecimal, useT, type TranslationKey } from '../i18n'
import { parseCSV } from '../utils/csvParser'
import { loadLS, saveLS } from '../utils/localStorage'
import { formatVND } from '../utils/vndFormat'
import { annualizedStdevFromCumulative, avgDrawdown, longestDrawdownDays } from '../utils/drawdownStats'
import {
  dcaCagr, dcaMaxDrawdown, dcaMWRR, dcaProfitFactor, investorCagr,
  isDCAFrequency, type DCAFrequency,
} from '../utils/dca'
import {
  DEFAULT_STOCK_COSTS, LOT_SIZE, parseStockEvents, simulateStockDCA,
  type LedgerEntryType, type StockCostRates,
} from '../utils/stockDca'
import { buildSampleScenario } from '../utils/stockSample'
import { IconWarning } from './icons'

type SourceMode = 'auto' | 'manual'

const FREQ_OPTIONS: { value: DCAFrequency; labelKey: TranslationKey }[] = [
  { value: 'weekly', labelKey: 'dca.freq.weekly' },
  { value: 'biweekly', labelKey: 'dca.freq.biweekly' },
  { value: 'monthly', labelKey: 'dca.freq.monthly' },
  { value: 'quarterly', labelKey: 'dca.freq.quarterly' },
  { value: 'semiannual', labelKey: 'dca.freq.semiannual' },
  { value: 'yearly', labelKey: 'dca.freq.yearly' },
]

const RANGE_OPTIONS = [1, 3, 5, 10, 0] as const // 0 = toàn bộ dữ liệu
const LEDGER_PREVIEW = 40

const LEDGER_LABEL: Record<LedgerEntryType, TranslationKey> = {
  deposit: 'sdca.ledger.deposit',
  buy: 'sdca.ledger.buy',
  sell: 'sdca.ledger.sell',
  withdraw: 'sdca.ledger.withdraw',
  cashDividend: 'sdca.ledger.cashDividend',
  stockDividend: 'sdca.ledger.stockDividend',
  rightsExercise: 'sdca.ledger.rightsExercise',
}

function pickNumber(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback
}

/** Ô nhập phần trăm: hiển thị %, lưu tỷ lệ. Giữ chuỗi đang gõ để không nuốt dấu chấm. */
function PctField({ label, value, onChange, hint }: {
  label: string
  value: number
  onChange: (rate: number) => void
  hint?: string
}) {
  const [text, setText] = useState(() => String(+(value * 100).toFixed(4)))
  return (
    <label className="sdca-pct-field" title={hint}>
      <span>{label}</span>
      <span className="sdca-pct-input">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={5}
          step={0.01}
          value={text}
          onChange={e => {
            setText(e.target.value)
            const v = Number(e.target.value)
            if (Number.isFinite(v) && v >= 0 && v <= 5) onChange(v / 100)
          }}
        />
        <em>%</em>
      </span>
    </label>
  )
}

/**
 * Tab "DCA cổ phiếu": mô phỏng sổ tài khoản chứng khoán (lô 100, phí, thuế,
 * chênh lệch mua-bán, cổ tức, quyền mua). TWRR dùng chung lõi với tab DCA quỹ.
 */
function StockDCAPanelImpl() {
  const t = useT()
  const dec = useDecimal()
  const { language } = useLanguage()

  const [mode, setMode] = useState<SourceMode>(() => loadLS<unknown>('sdca_mode', 'auto') === 'manual' ? 'manual' : 'auto')
  const [ticker, setTicker] = useState<string>(() => {
    const v = loadLS<unknown>('sdca_ticker', 'VNM')
    return typeof v === 'string' ? v : 'VNM'
  })
  const [initialAmount, setInitialAmount] = useState(() => pickNumber(loadLS<unknown>('sdca_initial', 20_000_000), 20_000_000, 0, 1e13))
  const [cashflowAmount, setCashflowAmount] = useState(() => pickNumber(loadLS<unknown>('sdca_amount', 5_000_000), 5_000_000, 0, 1e13))
  const [freq, setFreq] = useState<DCAFrequency>(() => {
    const v = loadLS<unknown>('sdca_freq', 'monthly')
    return isDCAFrequency(v) ? v : 'monthly'
  })
  const [years, setYears] = useState<number>(() => {
    const v = loadLS<unknown>('sdca_years', 5)
    return (RANGE_OPTIONS as readonly number[]).includes(v as number) ? (v as number) : 5
  })
  const [costs, setCosts] = useState<StockCostRates>(() => {
    const v = loadLS<Partial<StockCostRates>>('sdca_costs', {})
    const d = DEFAULT_STOCK_COSTS
    return {
      buyFeeRate: pickNumber(v.buyFeeRate, d.buyFeeRate, 0, 0.05),
      sellFeeRate: pickNumber(v.sellFeeRate, d.sellFeeRate, 0, 0.05),
      sellTaxRate: pickNumber(v.sellTaxRate, d.sellTaxRate, 0, 0.05),
      spreadRate: pickNumber(v.spreadRate, d.spreadRate, 0, 0.05),
      dividendTaxRate: pickNumber(v.dividendTaxRate, d.dividendTaxRate, 0, 0.05),
    }
  })
  const [liquidate, setLiquidate] = useState(() => loadLS<unknown>('sdca_liquidate', false) === true)
  const [exercise, setExercise] = useState(() => loadLS<unknown>('sdca_exercise', true) !== false)
  const [csvText, setCsvText] = useState(() => {
    const v = loadLS<unknown>('sdca_csv', '')
    return typeof v === 'string' ? v : ''
  })
  const [eventsText, setEventsText] = useState(() => {
    const v = loadLS<unknown>('sdca_events', '')
    return typeof v === 'string' ? v : ''
  })
  const [showAllLedger, setShowAllLedger] = useState(false)

  useEffect(() => { saveLS('sdca_mode', mode) }, [mode])
  useEffect(() => { saveLS('sdca_ticker', ticker) }, [ticker])
  useEffect(() => { saveLS('sdca_initial', initialAmount) }, [initialAmount])
  useEffect(() => { saveLS('sdca_amount', cashflowAmount) }, [cashflowAmount])
  useEffect(() => { saveLS('sdca_freq', freq) }, [freq])
  useEffect(() => { saveLS('sdca_years', years) }, [years])
  useEffect(() => { saveLS('sdca_costs', costs) }, [costs])
  useEffect(() => { saveLS('sdca_liquidate', liquidate) }, [liquidate])
  useEffect(() => { saveLS('sdca_exercise', exercise) }, [exercise])
  useEffect(() => { saveLS('sdca_csv', csvText) }, [csvText])
  useEffect(() => { saveLS('sdca_events', eventsText) }, [eventsText])

  const index = useStockIndex()
  const auto = useStockSeries(mode === 'auto' ? ticker : null)

  // Nếu mã đã lưu không còn trong danh sách thì rơi về mã đầu tiên.
  useEffect(() => {
    if (index.stocks.length > 0 && !index.stocks.some(s => s.ticker === ticker)) {
      setTicker(index.stocks[0]!.ticker)
    }
  }, [index.stocks, ticker])

  const manual = useMemo(() => {
    if (mode !== 'manual') return null
    const parsedPrices = parseCSV(csvText)
    const parsedEvents = parseStockEvents(eventsText)
    return { prices: parsedPrices.points, events: parsedEvents.events, eventErrors: parsedEvents.errors }
  }, [mode, csvText, eventsText])

  const allPrices = mode === 'auto' ? auto.prices : manual?.prices ?? null
  const events = mode === 'auto' ? [] : manual?.events ?? []

  const windowed = useMemo(() => {
    if (!allPrices || allPrices.length === 0) return null
    if (years === 0) return allPrices
    const last = new Date(allPrices[allPrices.length - 1]!.date)
    const from = new Date(Date.UTC(last.getUTCFullYear() - years, last.getUTCMonth(), last.getUTCDate()))
      .toISOString().slice(0, 10)
    const slice = allPrices.filter(p => p.date >= from)
    return slice.length > 1 ? slice : allPrices
  }, [allPrices, years])

  const sim = useMemo(() => {
    if (!windowed || windowed.length < 2 || (initialAmount <= 0 && cashflowAmount <= 0)) return null
    return simulateStockDCA(
      windowed,
      { initialAmount, cashflowAmount, cashflowFreq: freq },
      { costs, events, exerciseRights: exercise, liquidateAtEnd: liquidate },
    )
  }, [windowed, initialAmount, cashflowAmount, freq, costs, events, exercise, liquidate])

  const name = mode === 'auto'
    ? (index.stocks.find(s => s.ticker === ticker)?.ticker ?? ticker)
    : t('sdca.manualName')

  const view = useMemo(() => {
    if (!sim) return null
    const finalWithWithdrawn = sim.finalValue + sim.totalWithdrawn
    const row = {
      id: 'stock',
      name,
      color: '#2563EB',
      finalValue: sim.finalValue,
      totalInvested: sim.totalInvested,
      cagr: investorCagr(sim.cumulative, sim.totalInvested, finalWithWithdrawn),
      twrrNet: dcaCagr(sim.cumulative),
      twrrGross: dcaCagr(sim.cumulativeGross),
      totalCosts: sim.totalCosts,
      mwrr: dcaMWRR(sim.cashflows),
      maxDrawdown: dcaMaxDrawdown(sim.cumulative),
      avgDrawdown: avgDrawdown(sim.drawdown),
      longestDrawdownDays: longestDrawdownDays(sim.drawdown),
      stdev: annualizedStdevFromCumulative(sim.cumulative),
      profitFactor: dcaProfitFactor(sim.returns),
    }
    return {
      row,
      explainer: [{
        id: 'stock', name, color: row.color,
        cagr: row.cagr, twrr: row.twrrNet, twrrGross: row.twrrGross, mwrr: row.mwrr,
      }],
      chart: [{ name, color: row.color, values: sim.values, invested: sim.invested }],
    }
  }, [sim, name])

  const setCost = (key: keyof StockCostRates) => (rate: number) => setCosts(c => ({ ...c, [key]: rate }))
  const money = (v: number) => formatVND(v, language)
  const pctText = (v: number) => `${dec(v * 100, 2)}%`

  const spanYears = windowed && windowed.length > 1
    ? (new Date(windowed[windowed.length - 1]!.date).getTime() - new Date(windowed[0]!.date).getTime()) / (365.25 * 86400000)
    : 0
  const ledger = sim?.ledger ?? []
  const shownLedger = showAllLedger ? ledger : ledger.slice(-LEDGER_PREVIEW)
  const hasEvents = events.length > 0

  return (
    <div className="simulation-panel dca-panel sdca-panel">
      <div className="panel-header">
        <h2>{t('sdca.title')}</h2>
      </div>
      <p className="lsdca-subtitle">{t('sdca.intro')}</p>

      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('dca.params')}</h3>

        <div className="dca-param-row">
          <label className="dca-label">{t('sdca.source')}</label>
          <div className="dca-date-mode">
            <button className={`dca-mode-btn ${mode === 'auto' ? 'dca-mode-btn-active' : ''}`} onClick={() => setMode('auto')}>
              {t('sdca.source.auto')}
            </button>
            <button className={`dca-mode-btn ${mode === 'manual' ? 'dca-mode-btn-active' : ''}`} onClick={() => setMode('manual')}>
              {t('sdca.source.manual')}
            </button>
          </div>
        </div>

        {mode === 'auto' && (
          <div className="dca-param-row">
            <label className="dca-label">{t('sdca.ticker')}</label>
            <select className="dca-freq-select" value={ticker} onChange={e => setTicker(e.target.value)} disabled={index.stocks.length === 0}>
              {index.stocks.map(s => (
                <option key={s.ticker} value={s.ticker}>{s.ticker} · {s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="dca-param-row">
          <label className="dca-label">{t('dca.initialAmount')}</label>
          <div className="dca-amount-input">
            <MoneyInput value={initialAmount} onChange={setInitialAmount} min={0} />
            <span className="dca-currency">₫</span>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('sdca.cashflowAmount')}</label>
          <div className="dca-amount-input">
            <MoneyInput value={cashflowAmount} onChange={setCashflowAmount} min={0} />
            <span className="dca-currency">₫</span>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('dca.frequency')}</label>
          <select className="dca-freq-select" value={freq} onChange={e => setFreq(e.target.value as DCAFrequency)}>
            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('sdca.range')}</label>
          <div className="lsdca-horizon-buttons">
            {RANGE_OPTIONS.map(y => (
              <button
                key={y}
                className={`lsdca-horizon-btn ${years === y ? 'lsdca-horizon-btn-active' : ''}`}
                onClick={() => setYears(y)}
              >
                {y === 0 ? t('sdca.range.all') : t('adv.years', { n: y })}
              </button>
            ))}
          </div>
        </div>

        <h4 className="sdca-subhead">{t('sdca.costs')}</h4>
        <div className="sdca-costs">
          <PctField label={t('sdca.cost.buyFee')} value={costs.buyFeeRate} onChange={setCost('buyFeeRate')} hint={t('sdca.cost.buyFee.hint')} />
          <PctField label={t('sdca.cost.sellFee')} value={costs.sellFeeRate} onChange={setCost('sellFeeRate')} />
          <PctField label={t('sdca.cost.sellTax')} value={costs.sellTaxRate} onChange={setCost('sellTaxRate')} hint={t('sdca.cost.sellTax.hint')} />
          <PctField label={t('sdca.cost.spread')} value={costs.spreadRate} onChange={setCost('spreadRate')} hint={t('sdca.cost.spread.hint')} />
          <PctField label={t('sdca.cost.dividendTax')} value={costs.dividendTaxRate} onChange={setCost('dividendTaxRate')} hint={t('sdca.cost.dividendTax.hint')} />
        </div>

        <div className="sdca-checks">
          <label><input type="checkbox" checked={liquidate} onChange={e => setLiquidate(e.target.checked)} /> {t('sdca.liquidate')}</label>
          {mode === 'manual' && (
            <label><input type="checkbox" checked={exercise} onChange={e => setExercise(e.target.checked)} /> {t('sdca.exercise')}</label>
          )}
        </div>
      </div>

      {mode === 'auto' ? (
        <div className="adv-disclaimer" role="note">
          <IconWarning />
          <p>{t('sdca.autoNote')}</p>
        </div>
      ) : (
        <div className="dca-params-card">
          <h3 className="dca-section-title">{t('sdca.manual.title')}</h3>
          <p className="dca-note">{t('sdca.manual.help')}</p>
          <div className="sdca-manual-actions">
            <button
              className="lsdca-horizon-btn"
              onClick={() => {
                const s = buildSampleScenario()
                setCsvText(s.csv)
                setEventsText(s.events)
                setYears(0)
              }}
            >
              {t('sdca.manual.sample')}
            </button>
          </div>
          <label className="dca-label">{t('sdca.manual.pricesLabel')}</label>
          <textarea
            className="sdca-textarea"
            rows={6}
            spellCheck={false}
            placeholder={'date,price\n2024-01-02,50000\n2024-01-03,50400'}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
          />
          <label className="dca-label">{t('sdca.manual.eventsLabel')}</label>
          <textarea
            className="sdca-textarea"
            rows={5}
            spellCheck={false}
            placeholder={'cash 2024-06-20 2024-07-05 1000\nstock 2024-08-10 10%\nrights 2024-09-01 0.2 20000'}
            value={eventsText}
            onChange={e => setEventsText(e.target.value)}
          />
          {manual && manual.eventErrors.length > 0 && (
            <ul className="sdca-errors">
              {manual.eventErrors.map(e => (
                <li key={e.line}>{t('sdca.manual.lineError', { line: e.line, msg: t(`sdca.err.${e.message}` as TranslationKey) })}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === 'auto' && index.error && <p className="error-banner">{t('sdca.noData')}</p>}
      {mode === 'auto' && (index.loading || auto.loading) && <p className="loading-indicator">{t('app.loading')}</p>}
      {mode === 'auto' && auto.error && <p className="error-banner">{t('sdca.noData')}</p>}
      {mode === 'manual' && !sim && <p className="overlap-empty">{t('sdca.manual.needData')}</p>}

      {sim && view && (
        <div className="adv-results">
          {spanYears < 1 && <p className="dca-note">{t('sdca.shortPeriod')}</p>}

          <div className="adv-stats">
            <Tile label={t('sdca.tile.final')} value={money(sim.finalValue)} />
            <Tile label={t('sdca.tile.invested')} value={money(sim.totalInvested)} />
            <Tile
              label={t('sdca.tile.shares')}
              value={dec(sim.finalShares, 0)}
              sub={t('sdca.tile.lots', { n: Math.floor(sim.finalShares / LOT_SIZE), odd: sim.finalShares % LOT_SIZE })}
            />
            <Tile label={t('sdca.tile.cash')} value={money(sim.finalCash)} sub={t('sdca.tile.cashHint')} />
            <Tile
              label={t('sdca.tile.costs')}
              value={money(sim.totalCosts)}
              sub={sim.totalInvested > 0 ? t('sdca.tile.costsOfInvested', { pct: pctText(sim.totalCosts / sim.totalInvested) }) : undefined}
            />
          </div>

          <div className="sdca-breakdown">
            {t('sdca.breakdown', {
              brokerage: money(sim.costBreakdown.brokerage),
              tax: money(sim.costBreakdown.sellTax),
              spread: money(sim.costBreakdown.spread),
              divTax: money(sim.costBreakdown.dividendTax),
            })}
            {hasEvents && (
              <>
                {' '}
                {t('sdca.events.summary', {
                  div: money(sim.cashDividendsNet),
                  bonus: dec(sim.bonusShares, 0),
                  rights: dec(sim.rightsShares, 0),
                })}
              </>
            )}
          </div>

          <DCAStatsTable portfolios={[view.row]} />
          <PortfolioValueChart portfolios={view.chart} />
          <ReturnMetricsExplainer portfolios={view.explainer} />

          <section className="perf-table-container">
            <div className="chart-header"><h3>{t('sdca.ledger.title')}</h3></div>
            <div className="perf-table-wrap">
              <table className="perf-table sdca-ledger">
                <thead>
                  <tr>
                    <th>{t('sdca.ledger.date')}</th>
                    <th>{t('sdca.ledger.type')}</th>
                    <th>{t('sdca.ledger.qty')}</th>
                    <th>{t('sdca.ledger.price')}</th>
                    <th>{t('sdca.ledger.amount')}</th>
                    <th>{t('sdca.ledger.fee')}</th>
                    <th>{t('sdca.ledger.tax')}</th>
                    <th>{t('sdca.ledger.spread')}</th>
                    <th>{t('sdca.ledger.cash')}</th>
                    <th>{t('sdca.ledger.shares')}</th>
                  </tr>
                </thead>
                <tbody>
                  {shownLedger.map((e, i) => (
                    <tr key={`${e.date}-${e.type}-${i}`}>
                      <td>{e.date}</td>
                      <td>{t(LEDGER_LABEL[e.type])}</td>
                      <td>{e.qty === 0 ? '' : `${e.qty > 0 ? '+' : ''}${dec(e.qty, 0)}`}</td>
                      <td>{e.price === 0 ? '' : dec(e.price, 0)}</td>
                      <td>{e.amount === 0 ? '' : money(e.amount)}</td>
                      <td>{e.fee === 0 ? '' : money(e.fee)}</td>
                      <td>{e.tax === 0 ? '' : money(e.tax)}</td>
                      <td>{e.spread === 0 ? '' : money(e.spread)}</td>
                      <td>{money(e.cashAfter)}</td>
                      <td>{dec(e.sharesAfter, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ledger.length > LEDGER_PREVIEW && (
              <button className="lsdca-horizon-btn sdca-ledger-toggle" onClick={() => setShowAllLedger(v => !v)}>
                {showAllLedger ? t('sdca.ledger.showLess') : t('sdca.ledger.showAll', { n: ledger.length })}
              </button>
            )}
            <p className="adv-note">{t('sdca.ledger.note')}</p>
          </section>
        </div>
      )}
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="adv-stat">
      <div className="adv-stat-label">{label}</div>
      <div className="adv-stat-value">{value}</div>
      {sub && <div className="sdca-tile-sub">{sub}</div>}
    </div>
  )
}

export const StockDCAPanel = memo(StockDCAPanelImpl)
