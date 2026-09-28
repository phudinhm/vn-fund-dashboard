import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { FundMeta } from '../types'
import { MoneyInput } from './MoneyInput'
import { useFundSeriesMap } from '../hooks/useFundData'
import { useLanguage } from '../hooks/useLanguage'
import { useDecimal, useT, useTRich } from '../i18n'
import { loadLS, saveLS } from '../utils/localStorage'
import { formatVND } from '../utils/vndFormat'
import { fundDisplayName } from '../utils/fundName'
import { assetDisplayName, isSavingsAssetId } from '../utils/savingsAsset'
import { MIN_DRAWDOWN_EPISODES } from '../utils/lsVsDca'
import {
  ADVISOR_CASH_RATE,
  HORIZON_YEARS_OPTIONS,
  RISK_PARAMS,
  RISK_PROFILES,
  STAGING_MONTHS_OPTIONS,
  adviseFromSimulation,
  advisorFundIds,
  isRiskProfile,
  simulateAdvisor,
  type DeployAdvice,
  type DeployOption,
  type PortfolioEvaluation,
  type RiskProfile,
  type SampleQuality,
} from '../utils/advisor'
import { IconCompass, IconWarning } from './icons'

interface Props {
  funds: FundMeta[]
}

const DEFAULT_AMOUNT = 100_000_000

function pickOption(value: unknown, options: number[], fallback: number): number {
  return typeof value === 'number' && options.includes(value) ? value : fallback
}

/**
 * Tab "Gợi Ý Đầu Tư": nhập số tiền, ra danh mục và cách xuống tiền.
 *
 * Toàn bộ số liệu đến từ mô phỏng lịch sử ở utils/advisor.ts, không có dự báo.
 * Phần nặng (chạy mô phỏng cho mọi danh mục) chỉ chạy lại khi đổi kỳ giữ hoặc
 * số tháng chia đợt. Đổi số tiền hay khẩu vị rủi ro chỉ tính lại phần rẻ, vì
 * tăng trưởng tính theo tỷ lệ vốn nên không phụ thuộc số tiền.
 */
function AdvisorPanelImpl({ funds }: Props) {
  const t = useT()
  const tr = useTRich()
  const dec = useDecimal()
  const { language } = useLanguage()

  const [amount, setAmount] = useState(() => {
    const v = loadLS<unknown>('adv_amount', DEFAULT_AMOUNT)
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : DEFAULT_AMOUNT
  })
  const [horizon, setHorizon] = useState(() => pickOption(loadLS<unknown>('adv_horizon', 3), HORIZON_YEARS_OPTIONS, 3))
  const [staging, setStaging] = useState(() => pickOption(loadLS<unknown>('adv_staging', 6), STAGING_MONTHS_OPTIONS, 6))
  const [risk, setRisk] = useState<RiskProfile>(() => {
    const v = loadLS<unknown>('adv_risk', 'balanced')
    return isRiskProfile(v) ? v : 'balanced'
  })

  useEffect(() => { saveLS('adv_amount', amount) }, [amount])
  useEffect(() => { saveLS('adv_horizon', horizon) }, [horizon])
  useEffect(() => { saveLS('adv_staging', staging) }, [staging])
  useEffect(() => { saveLS('adv_risk', risk) }, [risk])

  const fundIds = useMemo(() => advisorFundIds(), [])
  const { data, loading, errors } = useFundSeriesMap(fundIds)

  // Chạy mô phỏng nặng ở giá trị "hoãn": ô nhập và nút bấm vẫn mượt trong lúc tính.
  const deferredHorizon = useDeferredValue(horizon)
  const deferredStaging = useDeferredValue(staging)
  const computing = deferredHorizon !== horizon || deferredStaging !== staging

  const ready = !loading && errors.size === 0 && fundIds.every(id => data.has(id))
  const sim = useMemo(
    () => ready
      ? simulateAdvisor({ prices: data, horizonYears: deferredHorizon, stagingMonths: deferredStaging })
      : null,
    [ready, data, deferredHorizon, deferredStaging],
  )
  const advice = useMemo(() => adviseFromSimulation(sim, risk), [sim, risk])

  const spanYears = advice.commonStart && advice.commonEnd
    ? Math.round((new Date(advice.commonEnd).getTime() - new Date(advice.commonStart).getTime()) / (365.25 * 86400000))
    : null

  const pct = (x: number) => `${x >= 0 ? '+' : '−'}${dec(Math.abs(x) * 100, 1)}%`
  const plainPct = (x: number) => `${dec(x * 100, 1)}%`
  const money = (x: number) => formatVND(x)
  const fundLabel = (id: string) => {
    if (isSavingsAssetId(id)) return assetDisplayName(id, language)
    const meta = funds.find(f => f.id === id)
    return meta ? fundDisplayName(meta, language) : id
  }

  const riskParams = RISK_PARAMS[risk]
  const best = advice.best
  const deploy = advice.deploy

  return (
    <div className="adv-panel">
      <p className="lsdca-subtitle">{t('adv.intro')}</p>

      <div className="adv-disclaimer" role="note">
        <IconWarning />
        <p>{tr('adv.disclaimer', { years: spanYears ?? 10 })}</p>
      </div>

      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('adv.params')}</h3>

        <div className="dca-param-row">
          <label className="dca-label">{t('adv.amount')}</label>
          <div className="dca-amount-input-wrap">
            <div className="dca-amount-input">
              <MoneyInput value={amount} onChange={setAmount} min={1_000_000} />
              <span className="dca-currency">₫</span>
            </div>
            <span className="lsdca-capital-hint">= {money(amount)}</span>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('adv.horizon')}</label>
          <div className="lsdca-horizon-buttons">
            {HORIZON_YEARS_OPTIONS.map(y => (
              <button
                key={y}
                className={`lsdca-horizon-btn ${horizon === y ? 'lsdca-horizon-btn-active' : ''}`}
                onClick={() => setHorizon(y)}
              >
                {t('adv.years', { n: y })}
              </button>
            ))}
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('adv.risk')}</label>
          <div className="adv-risk-col">
            <div className="lsdca-horizon-buttons">
              {RISK_PROFILES.map(r => (
                <button
                  key={r}
                  className={`lsdca-horizon-btn ${risk === r ? 'lsdca-horizon-btn-active' : ''}`}
                  onClick={() => setRisk(r)}
                >
                  {t(`adv.risk.${r}`)}
                </button>
              ))}
            </div>
            <span className="lsdca-capital-hint">
              {t('adv.risk.hint', {
                dd: Math.round(riskParams.maxDrawdown * 100),
                typical: Math.round((1 - riskParams.tailWeight) * 100),
                bad: Math.round(riskParams.tailWeight * 100),
              })}
            </span>
          </div>
        </div>

        <div className="dca-param-row">
          <label className="dca-label">{t('adv.staging')}</label>
          <div className="lsdca-horizon-buttons">
            {STAGING_MONTHS_OPTIONS.map(m => (
              <button
                key={m}
                className={`lsdca-horizon-btn ${staging === m ? 'lsdca-horizon-btn-active' : ''}`}
                onClick={() => setStaging(m)}
              >
                {t('adv.months', { n: m })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errors.size > 0 && (
        <p className="error-banner">{t('adv.error', { ids: [...errors.keys()].join(', ') })}</p>
      )}
      {errors.size === 0 && !ready && <p className="loading-indicator">{t('adv.loading')}</p>}
      {ready && computing && <p className="loading-indicator">{t('adv.computing')}</p>}

      {ready && !computing && advice.status === 'insufficient-data' && (
        <p className="overlap-empty">{t('adv.insufficient', { n: horizon })}</p>
      )}

      {ready && advice.status === 'ok' && best && deploy && (
        <div className={computing ? 'adv-results adv-results--stale' : 'adv-results'}>
          <section className="adv-hero">
            <div className="adv-hero-eyebrow">
              <IconCompass />
              {t('adv.rec.eyebrow', { amount: money(amount) })}
            </div>
            <h2 className="adv-hero-title">{t(best.candidate.nameKey)}</h2>
            <p className="adv-hero-why">
              {t('adv.rec.why', { dd: Math.round(riskParams.maxDrawdown * 100), n: horizon })}
            </p>

            <div className="adv-stats">
              <Stat label={t('adv.stat.typical')} value={pct(best.medianAnnualized)} tone={best.medianAnnualized >= 0 ? 'pos' : 'neg'} />
              <Stat label={t('adv.stat.bad')} value={pct(best.p10Annualized)} tone={best.p10Annualized >= 0 ? 'pos' : 'neg'} />
              <Stat label={t('adv.stat.worstDd')} value={`−${plainPct(best.maxDrawdown)}`} tone="neg" />
              <Stat
                label={t('adv.stat.now')}
                value={best.currentDrawdown > -0.005 ? t('adv.stat.atPeak') : pct(best.currentDrawdown)}
              />
              <Stat label={t('adv.stat.loss')} value={plainPct(best.lossRate)} />
            </div>

            <span className={`adv-quality adv-quality--${best.quality}`}>
              {t(qualityKey(best.quality), { n: best.independentWindows })}
            </span>

            <h4 className="adv-subtitle">{t('adv.alloc.title')}</h4>
            <ul className="adv-alloc">
              {best.candidate.slots.map(slot => (
                <li key={slot.fundId} className="adv-alloc-row">
                  <div className="adv-alloc-name">{fundLabel(slot.fundId)}</div>
                  <div className="adv-alloc-bar" aria-hidden="true">
                    <span style={{ width: `${slot.weight}%` }} />
                  </div>
                  <div className="adv-alloc-amount">
                    <strong>{money(amount * slot.weight / 100)}</strong>
                    <span>{slot.weight}%</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <DeployCard
            deploy={deploy}
            amount={amount}
            staging={deferredStaging}
            money={money}
            plainPct={plainPct}
          />

          <RankTable
            evaluations={advice.evaluations}
            bestId={best.candidate.id}
            pct={pct}
            plainPct={plainPct}
          />

          <div className="adv-notes">
            <h4 className="adv-subtitle">{t('adv.notes.title')}</h4>
            <ul>
              <li>{t('adv.notes.window', {
                from: advice.commonStart ?? '', to: advice.commonEnd ?? '', years: spanYears ?? '',
              })}</li>
              <li>{t('adv.notes.rules', { rate: dec(ADVISOR_CASH_RATE * 100, 0) })}</li>
              <li>{t('adv.notes.past')}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function qualityKey(q: SampleQuality) {
  return q === 'ok' ? 'adv.quality.ok' : q === 'thin' ? 'adv.quality.thin' : 'adv.quality.insufficient'
}

function DeployCard({ deploy, amount, staging, money, plainPct }: {
  deploy: DeployAdvice
  amount: number
  staging: number
  money: (x: number) => string
  plainPct: (x: number) => string
}) {
  const t = useT()
  const f = deploy.best.lumpFraction
  const headline = f === 1
    ? t('adv.deploy.lump')
    : f === 0
      ? t('adv.deploy.dca', { n: staging })
      : t('adv.deploy.partial', { now: money(amount * f), pct: Math.round(f * 100), n: staging })
  const whyKey = f === 1 ? 'adv.deploy.why.lump' : f === 0 ? 'adv.deploy.why.dca' : 'adv.deploy.why.partial'
  const band = deploy.currentBandKey ? t(deploy.currentBandKey) : ''

  return (
    <section className="perf-table-container adv-deploy">
      <div className="chart-header">
        <h3>{t('adv.deploy.title')}</h3>
      </div>

      <div className="adv-deploy-headline">{headline}</div>
      {f < 1 && (
        <div className="adv-deploy-sub">
          {t('adv.deploy.tranche', { amount: money(amount * (1 - f) / staging), n: staging })}
        </div>
      )}
      <p className="adv-deploy-why">{t(whyKey)}</p>
      <p className="adv-deploy-basis">
        {deploy.basis === 'similar'
          ? t('adv.deploy.basis.similar', { n: deploy.basisEpisodes, band })
          : t('adv.deploy.basis.all', { band, min: MIN_DRAWDOWN_EPISODES, n: deploy.basisEpisodes })}
        {' '}
        {t('adv.deploy.lsWin', { pct: Math.round(deploy.lsWinRate * 100) })}
      </p>

      <div className="perf-table-wrap">
        <table className="perf-table">
          <thead>
            <tr>
              <th>{t('adv.opt.plan')}</th>
              <th>{t('adv.opt.typical')}</th>
              <th>{t('adv.opt.bad')}</th>
              <th>{t('adv.opt.loss')}</th>
            </tr>
          </thead>
          <tbody>
            {deploy.options.map(o => (
              <tr key={o.lumpFraction} className={o === deploy.best ? 'adv-row-best' : undefined}>
                <td>
                  {optionLabel(o, staging, t)}
                  {o === deploy.best && <span className="adv-pick">{t('adv.opt.pick')}</span>}
                </td>
                <td>{money(amount * o.medianGrowth)}</td>
                <td>{money(amount * o.p10Growth)}</td>
                <td>{plainPct(o.lossRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="adv-note">{t('adv.opt.note')}</p>
    </section>
  )
}

function optionLabel(o: DeployOption, staging: number, t: ReturnType<typeof useT>): string {
  if (o.lumpFraction === 1) return t('adv.opt.lump')
  if (o.lumpFraction === 0) return t('adv.opt.dca', { n: staging })
  return t('adv.opt.mix', {
    pct: Math.round(o.lumpFraction * 100),
    rest: Math.round((1 - o.lumpFraction) * 100),
  })
}

function RankTable({ evaluations, bestId, pct, plainPct }: {
  evaluations: PortfolioEvaluation[]
  bestId: string
  pct: (x: number) => string
  plainPct: (x: number) => string
}) {
  const t = useT()
  return (
    <section className="perf-table-container">
      <div className="chart-header">
        <h3>{t('adv.rank.title')}</h3>
      </div>
      <div className="perf-table-wrap">
        <table className="perf-table">
          <thead>
            <tr>
              <th>{t('adv.rank.name')}</th>
              <th>{t('adv.rank.typical')}</th>
              <th>{t('adv.rank.bad')}</th>
              <th>{t('adv.rank.dd')}</th>
              <th>{t('adv.rank.now')}</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map(e => (
              <tr
                key={e.candidate.id}
                className={
                  e.candidate.id === bestId ? 'adv-row-best' : e.eligible ? undefined : 'adv-row-out'
                }
              >
                <td>
                  {t(e.candidate.nameKey)}
                  {e.candidate.id === bestId && <span className="adv-pick">{t('adv.rank.pick')}</span>}
                  {!e.eligible && <span className="adv-out">{t('adv.rank.tooRisky')}</span>}
                </td>
                <td>{pct(e.medianAnnualized)}</td>
                <td>{pct(e.p10Annualized)}</td>
                <td>−{plainPct(e.maxDrawdown)}</td>
                <td>{e.currentDrawdown > -0.005 ? t('adv.stat.atPeak') : pct(e.currentDrawdown)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="adv-note">{t('adv.rank.note')}</p>
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="adv-stat">
      <div className="adv-stat-label">{label}</div>
      <div className={`adv-stat-value${tone ? ` adv-stat-value--${tone}` : ''}`}>{value}</div>
    </div>
  )
}

export const AdvisorPanel = memo(AdvisorPanelImpl)
