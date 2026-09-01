/**
 * DcaConsistencyBlock: "Nếu bạn hoảng loạn dừng nạp khi thấy đỏ?"
 *
 * Re-simulates DCA với biến thể hành vi: dừng nạp khi TWRR drawdown sụt sâu quá ngưỡng.
 * So sánh 3 kịch bản: (i) nạp đều đặn bất chấp, (ii) dừng khi DD < -15%, (iii) dừng khi DD < -25%.
 *
 * Mental model: retail VN điển hình không miss tháng ngẫu nhiên. Họ đóng băng lệnh nạp
 * đúng lúc thị trường giảm sâu, rồi chần chừ không dám nạp lại cho đến khi hồi phục.
 * Block này đo đạc cái giá thực của tâm lý đó, bằng chính dữ liệu lịch sử quỹ của user.
 *
 * Lưu ý: TWRR drawdown invariant với cashflow schedule, nên việc tính DD dựa trên giá
 * quỹ mà không phụ thuộc kịch bản nạp là hợp lệ.
 */
import { useState, useMemo, memo } from 'react'
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart,
} from 'recharts'
import type { PricePoint, RebalanceFrequency } from '../types'
import { simulateDCA, dcaMWRR, type DCASlot, type DCAFrequency } from '../utils/dca'
import { formatVND } from '../utils/vndFormat'
import { MoneyInput } from './MoneyInput'
import { useT, useTRich, type TranslationKey } from '../i18n'

export interface ConsistencyPortfolio {
  id: string
  name: string
  color: string
  totalInvested: number
  finalValue: number
  valueSeries: { date: string; value: number }[]
  simulationInputs: {
    filteredPrices: Map<string, PricePoint[]>
    slots: DCASlot[]
    params: { initialAmount: number; cashflowAmount: number; cashflowFreq: DCAFrequency }
    rebalFreq: RebalanceFrequency
    purchasePrices: Map<string, PricePoint[]>
  } | null
}

interface Props {
  portfolios: ConsistencyPortfolio[]
}

function DcaConsistencyBlockImpl({ portfolios }: Props) {
  const t = useT()
  const tr = useTRich()
  const valid = portfolios.filter(p => p.simulationInputs !== null && p.valueSeries.length > 0)
  const [extraAmount, setExtraAmount] = useState(() => valid[0]?.simulationInputs?.params.cashflowAmount ?? 0)
  if (portfolios.length === 0 || valid.length === 0) return null

  return (
    <div className="dca-consist-block">
      <h3 className="dca-consist-title">{t('consist.panicTitle')}</h3>
      <p className="dca-consist-sub">
        {tr('consist.panicIntro')}
      </p>

      {valid.map((p, index) => (
        <ConsistencyForPortfolio
          key={p.id}
          portfolio={p}
          extraAmount={extraAmount}
          onExtraAmountChange={setExtraAmount}
          showTakeaways={index === 0}
        />
      ))}
    </div>
  )
}

export const DcaConsistencyBlock = memo(DcaConsistencyBlockImpl)

function ConsistencyForPortfolio({ portfolio, extraAmount, onExtraAmountChange, showTakeaways }: {
  portfolio: ConsistencyPortfolio
  extraAmount: number
  onExtraAmountChange: (v: number) => void
  showTakeaways: boolean
}) {
  const t = useT()
  const tr = useTRich()
  const scenarios = useMemo(() => {
    const inputs = portfolio.simulationInputs!
    const baseline = runBaseline(inputs)
    const panic15 = runPanicStop(inputs, -0.15)
    const panic25 = runPanicStop(inputs, -0.25)
    return { baseline, panic15, panic25 }
  }, [portfolio])

  const boostScenarios = useMemo(() => {
    const inputs = portfolio.simulationInputs!
    const boost15 = runBoostBuy(inputs, -0.15, extraAmount)
    const boost25 = runBoostBuy(inputs, -0.25, extraAmount)
    return { boost15, boost25 }
  }, [portfolio, extraAmount])

  const chartData = useMemo(() => {
    type Row = { date: string; base?: number; p15?: number; p25?: number }
    const byDate = new Map<string, Row>()
    for (const pt of scenarios.baseline.valueSeries) {
      byDate.set(pt.date, { date: pt.date, base: pt.value })
    }
    for (const pt of scenarios.panic15.valueSeries) {
      const r = byDate.get(pt.date) ?? { date: pt.date }
      r.p15 = pt.value
      byDate.set(pt.date, r)
    }
    for (const pt of scenarios.panic25.valueSeries) {
      const r = byDate.get(pt.date) ?? { date: pt.date }
      r.p25 = pt.value
      byDate.set(pt.date, r)
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [scenarios])

  const boostChartData = useMemo(() => {
    type Row = { date: string; base?: number; b15?: number; b25?: number }
    const byDate = new Map<string, Row>()
    for (const pt of scenarios.baseline.valueSeries) {
      byDate.set(pt.date, { date: pt.date, base: pt.value })
    }
    for (const pt of boostScenarios.boost15.valueSeries) {
      const r = byDate.get(pt.date) ?? { date: pt.date }
      r.b15 = pt.value
      byDate.set(pt.date, r)
    }
    for (const pt of boostScenarios.boost25.valueSeries) {
      const r = byDate.get(pt.date) ?? { date: pt.date }
      r.b25 = pt.value
      byDate.set(pt.date, r)
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [scenarios.baseline.valueSeries, boostScenarios])

  const baseProfit = scenarios.baseline.finalValue - scenarios.baseline.totalInvested
  const p15Profit = scenarios.panic15.finalValue - scenarios.panic15.totalInvested
  const p25Profit = scenarios.panic25.finalValue - scenarios.panic25.totalInvested

  // "Chi phí cơ hội" — KHÔNG phải so trực tiếp giá trị cuối, vì panic bỏ nạp
  // nên vốn ít hơn hẳn, làm chênh lệch bị thổi phồng bởi phần "chưa đầu tư"
  // chứ không phải do đầu tư kém. Giả định số tiền bị bỏ nạp vẫn nằm trong
  // túi bạn dưới dạng tiền mặt (không sinh lời, không mất) — cộng nó lại vào
  // giá trị cuối của kịch bản panic rồi mới so với baseline, để ra đúng phần
  // thiệt hại do mua sai thời điểm + mất lãi kép, tách khỏi việc có ít vốn hơn.
  const gap15 = scenarios.baseline.finalValue - (scenarios.panic15.finalValue + scenarios.panic15.skippedCash)
  const gap25 = scenarios.baseline.finalValue - (scenarios.panic25.finalValue + scenarios.panic25.skippedCash)

  // % lợi nhuận tích lũy (giá trị cuối ÷ đã đầu tư − 1) — cùng công thức với
  // cột "Lợi nhuận tích lũy" ở Bảng thống kê, để 2 nơi nhất quán với nhau.
  const baseReturn = scenarios.baseline.totalInvested > 0
    ? scenarios.baseline.finalValue / scenarios.baseline.totalInvested - 1 : null
  const p15Return = scenarios.panic15.totalInvested > 0
    ? scenarios.panic15.finalValue / scenarios.panic15.totalInvested - 1 : null
  const p25Return = scenarios.panic25.totalInvested > 0
    ? scenarios.panic25.finalValue / scenarios.panic25.totalInvested - 1 : null

  const boost15Profit = boostScenarios.boost15.finalValue - boostScenarios.boost15.totalInvested
  const boost25Profit = boostScenarios.boost25.finalValue - boostScenarios.boost25.totalInvested
  const boost15Return = boostScenarios.boost15.totalInvested > 0
    ? boostScenarios.boost15.finalValue / boostScenarios.boost15.totalInvested - 1 : null
  const boost25Return = boostScenarios.boost25.totalInvested > 0
    ? boostScenarios.boost25.finalValue / boostScenarios.boost25.totalInvested - 1 : null

  // MWRR (IRR theo dòng tiền) — khác % Lợi nhuận ở chỗ tính đúng số năm
  // mỗi đồng đã có để sinh lời, không để "tiền vào sớm hay muộn" làm lệch kết
  // quả khi các kịch bản có tổng vốn và lịch nạp khác nhau.
  const baseMWRR = scenarios.baseline.mwrr
  const p15MWRR = scenarios.panic15.mwrr
  const p25MWRR = scenarios.panic25.mwrr
  const boost15MWRR = boostScenarios.boost15.mwrr
  const boost25MWRR = boostScenarios.boost25.mwrr

  return (
    <div className="dca-consist-card">
      <div className="dca-consist-card-header">
        <span style={{ color: portfolio.color, fontWeight: 700 }}>{portfolio.name}</span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthYearShort}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={formatMillions}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={56}
          />
          <Tooltip
            labelFormatter={formatDateFull}
            formatter={(v: number, name: string) => {
              const key = labelKeyFor(name)
              return [formatVND(Math.round(v)), key ? t(key) : name]
            }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Line type="monotone" dataKey="base" name="base" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="p15" name="p15" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
          <Line type="monotone" dataKey="p25" name="p25" stroke="#dc2626" strokeWidth={1.5} dot={false} strokeDasharray="2 2" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="dca-consist-chart-legend">
        <LegendItem color="#111827" dash="" label={t('consist.legend.steady')} />
        <LegendItem color="#f97316" dash="4 2" label={t('consist.legend.stop15')} />
        <LegendItem color="#dc2626" dash="2 2" label={t('consist.legend.stop25')} />
      </div>

      <table className="dca-consist-table">
        <thead>
          <tr>
            <th>{t('consist.col.scenario')}</th>
            <th>{t('consist.col.invested')}</th>
            <th>{t('consist.col.finalValue')}</th>
            <th>{t('consist.col.netProfit')}</th>
            <th>{t('consist.col.returnPct')}</th>
            <th>
              MWRR
              <span
                className="dca-info-icon"
                title={t('consist.help.mwrr')}
              >?</span>
            </th>
            <th>
              {t('consist.col.opportunityCost')}
              <span
                className="dca-info-icon"
                title={t('consist.help.opportunityCost')}
              >?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="dca-consist-row--baseline">
            <td><strong>{t('consist.row.steady')}</strong></td>
            <td>{formatVND(scenarios.baseline.totalInvested)}</td>
            <td>{formatVND(Math.round(scenarios.baseline.finalValue))}</td>
            <td>{formatVND(Math.round(baseProfit))}</td>
            <td className={signClass(baseReturn)}>{formatSignedPercent(baseReturn)}</td>
            <td className={signClass(baseMWRR)}>{formatSignedPercent(baseMWRR)}</td>
            <td>baseline</td>
          </tr>
          <tr>
            <td>
              Panic -15%{' '}
              <span className="dca-consist-skip">
                {t('consist.skipSub', { n: scenarios.panic15.skippedCount, cash: formatVND(scenarios.panic15.skippedCash) })}
              </span>
            </td>
            <td>{formatVND(scenarios.panic15.totalInvested)}</td>
            <td>{formatVND(Math.round(scenarios.panic15.finalValue))}</td>
            <td>{formatVND(Math.round(p15Profit))}</td>
            <td className={signClass(p15Return)}>{formatSignedPercent(p15Return)}</td>
            <td className={signClass(p15MWRR)}>{formatSignedPercent(p15MWRR)}</td>
            <td className={gap15 > 0 ? 'dca-consist-gap--neg' : 'dca-consist-gap--pos'}>
              {formatGap(gap15)}
            </td>
          </tr>
          <tr>
            <td>
              Panic -25%{' '}
              <span className="dca-consist-skip">
                {t('consist.skipSub', { n: scenarios.panic25.skippedCount, cash: formatVND(scenarios.panic25.skippedCash) })}
              </span>
            </td>
            <td>{formatVND(scenarios.panic25.totalInvested)}</td>
            <td>{formatVND(Math.round(scenarios.panic25.finalValue))}</td>
            <td>{formatVND(Math.round(p25Profit))}</td>
            <td className={signClass(p25Return)}>{formatSignedPercent(p25Return)}</td>
            <td className={signClass(p25MWRR)}>{formatSignedPercent(p25MWRR)}</td>
            <td className={gap25 > 0 ? 'dca-consist-gap--neg' : 'dca-consist-gap--pos'}>
              {formatGap(gap25)}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="dca-note">
        * "Chi phí cơ hội" đã cộng lại phần tiền bị bỏ nạp (giả định giữ làm tiền mặt, không
        {t('consist.tableNote')}
      </p>

      {showTakeaways && (
        <ConsistencyTakeaway
          baseFinal={scenarios.baseline.finalValue}
          gap15={gap15}
          gap25={gap25}
          skipped15={scenarios.panic15.skippedCount}
          skipped25={scenarios.panic25.skippedCount}
          skippedCash15={scenarios.panic15.skippedCash}
        />
      )}

      <h4 className="dca-consist-subtitle">{t('consist.boostTitle')}</h4>

      <div className="dca-consist-boost-control">
        <label>{t('consist.boostLabel')}</label>
        <div className="dca-amount-input">
          <MoneyInput value={extraAmount} onChange={onExtraAmountChange} min={0} />
          <span className="dca-currency">₫</span>
        </div>
      </div>

      <p className="dca-consist-sub">
        {tr('consist.boostIntro', { extra: formatVND(extraAmount) })}
      </p>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={boostChartData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthYearShort}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={formatMillions}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            width={56}
          />
          <Tooltip
            labelFormatter={formatDateFull}
            formatter={(v: number, name: string) => {
              const key = labelKeyFor(name)
              return [formatVND(Math.round(v)), key ? t(key) : name]
            }}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Line type="monotone" dataKey="base" name="base" stroke="#111827" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="b15" name="b15" stroke="#0891b2" strokeWidth={1.5} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
          <Line type="monotone" dataKey="b25" name="b25" stroke="#7c3aed" strokeWidth={1.5} dot={false} strokeDasharray="2 2" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="dca-consist-chart-legend">
        <LegendItem color="#111827" dash="" label={t('consist.legend.steady')} />
        <LegendItem color="#0891b2" dash="4 2" label={t('consist.legend.boost15')} />
        <LegendItem color="#7c3aed" dash="2 2" label={t('consist.legend.boost25')} />
      </div>

      <table className="dca-consist-table">
        <thead>
          <tr>
            <th>{t('consist.col.scenario')}</th>
            <th>{t('consist.col.invested')}</th>
            <th>{t('consist.col.finalValue')}</th>
            <th>{t('consist.col.netProfit')}</th>
            <th>{t('consist.col.returnPct')}</th>
            <th>
              MWRR
              <span
                className="dca-info-icon"
                title={t('consist.help.mwrr')}
              >?</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="dca-consist-row--baseline">
            <td><strong>{t('consist.row.steady')}</strong></td>
            <td>{formatVND(scenarios.baseline.totalInvested)}</td>
            <td>{formatVND(Math.round(scenarios.baseline.finalValue))}</td>
            <td>{formatVND(Math.round(baseProfit))}</td>
            <td className={signClass(baseReturn)}>{formatSignedPercent(baseReturn)}</td>
            <td className={signClass(baseMWRR)}>{formatSignedPercent(baseMWRR)}</td>
          </tr>
          <tr>
            <td>
              {t('consist.boostRow15')}{' '}
              <span className="dca-consist-skip">
                {t('consist.boostSub', { n: boostScenarios.boost15.boostedCount, extra: formatVND(boostScenarios.boost15.extraInvested) })}
              </span>
            </td>
            <td>{formatVND(boostScenarios.boost15.totalInvested)}</td>
            <td>{formatVND(Math.round(boostScenarios.boost15.finalValue))}</td>
            <td>{formatVND(Math.round(boost15Profit))}</td>
            <td className={signClass(boost15Return)}>{formatSignedPercent(boost15Return)}</td>
            <td className={signClass(boost15MWRR)}>{formatSignedPercent(boost15MWRR)}</td>
          </tr>
          <tr>
            <td>
              {t('consist.boostRow25')}{' '}
              <span className="dca-consist-skip">
                {t('consist.boostSub', { n: boostScenarios.boost25.boostedCount, extra: formatVND(boostScenarios.boost25.extraInvested) })}
              </span>
            </td>
            <td>{formatVND(boostScenarios.boost25.totalInvested)}</td>
            <td>{formatVND(Math.round(boostScenarios.boost25.finalValue))}</td>
            <td>{formatVND(Math.round(boost25Profit))}</td>
            <td className={signClass(boost25Return)}>{formatSignedPercent(boost25Return)}</td>
            <td className={signClass(boost25MWRR)}>{formatSignedPercent(boost25MWRR)}</td>
          </tr>
        </tbody>
      </table>

      <p className="dca-note">
        * Bảng này không có cột "chi phí cơ hội" như bảng trên, vì tăng tiền đầu tư NHIỀU vốn hơn
        {t('consist.boostTableNote')}
      </p>

      {showTakeaways && (
        <BoostTakeaway
          baseMWRR={baseMWRR}
          boost15MWRR={boost15MWRR}
          boost25MWRR={boost25MWRR}
          boost15Extra={boostScenarios.boost15.extraInvested}
          boost25Extra={boostScenarios.boost25.extraInvested}
          boosted15={boostScenarios.boost15.boostedCount}
          boosted25={boostScenarios.boost25.boostedCount}
          extraAmount={extraAmount}
        />
      )}
    </div>
  )
}

function LegendItem({ color, dash, label }: { color: string; dash: string; label: string }) {
  return (
    <div className="dca-consist-legend-item">
      <svg width="22" height="10">
        <line x1="0" y1="5" x2="22" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dash || undefined} />
      </svg>
      <span>{label}</span>
    </div>
  )
}

function ConsistencyTakeaway({
  baseFinal, gap15, gap25, skipped15, skipped25, skippedCash15,
}: {
  baseFinal: number
  gap15: number
  gap25: number
  skipped15: number
  skipped25: number
  skippedCash15: number
}) {
  const t = useT()
  const tr = useTRich()
  // Case 1: Panic không skip lần nào, có thể do thị trường êm ả, hoặc do quỹ vẫn giảm sâu
  // nhưng gọn trong khoảng ngắn giữa 2 lần nạp, không lần kiểm tra hàng tháng nào rơi đúng
  // lúc (hook skipContributionWhen chỉ check tại contribution date, không phải mỗi ngày).
  if (skipped15 === 0 && skipped25 === 0) {
    return (
      <div className="dca-consist-takeaway">
        {t('consist.noTrigger')}
      </div>
    )
  }

  // Case 2: Panic ăn baseline (hiếm, xảy ra trong bear dài)
  // gap âm nghĩa là panic thắng (tránh mua thêm ở vùng giảm)
  if (gap25 < 0 && Math.abs(gap25) > baseFinal * 0.02) {
    return (
      <div className="dca-consist-takeaway">
        <p>
          {tr('consist.panicWon1', { gap: formatVND(Math.abs(Math.round(gap25))) })}
        </p>
        <p>
          {t('consist.panicWon2')}
        </p>
      </div>
    )
  }

  // Case 3: Panic thua baseline (trường hợp phổ biến nhất)
  return (
    <div className="dca-consist-takeaway">
      <p>
        {t('consist.panicCost1')}
      </p>
      <p>
        {tr('consist.panicCost2', {
          cash15: formatVND(skippedCash15),
          gap15: formatVND(Math.round(gap15)),
          gap25: formatVND(Math.round(gap25)),
        })}
      </p>
      <p>
        {t('consist.panicCost3')}
      </p>
      {gap25 > 0 && gap15 > 0 && Math.abs(gap15 - gap25) > 0 && (
        <p>
          {tr('consist.panicCostNote', {
            n25: skipped25,
            loss25: formatVND(Math.round(gap25)),
            n15: skipped15,
            loss15: formatVND(Math.round(gap15)),
          })}
        </p>
      )}
    </div>
  )
}

function BoostTakeaway({
  baseMWRR, boost15MWRR, boost25MWRR, boost15Extra, boost25Extra, boosted15, boosted25, extraAmount,
}: {
  baseMWRR: number | null
  boost15MWRR: number | null
  boost25MWRR: number | null
  boost15Extra: number
  boost25Extra: number
  boosted15: number
  boosted25: number
  extraAmount: number
}) {
  const t = useT()
  const tr = useTRich()
  if (extraAmount <= 0) {
    return (
      <div className="dca-consist-takeaway">
        {t('consist.boostPrompt')}
      </div>
    )
  }

  if (boosted15 === 0 && boosted25 === 0) {
    return (
      <div className="dca-consist-takeaway">
        {t('consist.boostNoTrigger')}
      </div>
    )
  }

  const useB25 = boost25MWRR !== null && (boost15MWRR === null || boost25MWRR >= boost15MWRR)
  const bestMWRR = useB25 ? boost25MWRR : boost15MWRR
  const bestLabel = useB25 ? '-25%' : '-15%'
  const bestExtra = useB25 ? boost25Extra : boost15Extra
  const bestCount = useB25 ? boosted25 : boosted15
  const better = bestMWRR !== null && baseMWRR !== null && bestMWRR >= baseMWRR

  return (
    <div className="dca-consist-takeaway">
      <p>
        {tr('consist.boostTakeaway1', {
          threshold: bestLabel,
          count: bestCount,
          extra: formatVND(bestExtra),
          verdict: t(better ? 'consist.verdictBetter' : 'consist.verdictWorse'),
          best: formatSignedPercent(bestMWRR),
          base: formatSignedPercent(baseMWRR),
        })}
      </p>
      <p>
        {tr('consist.boostTakeaway2', { n15: boosted15, n25: boosted25 })}
      </p>
      <p>
        {t('consist.boostTakeaway3')}
      </p>
    </div>
  )
}

/**
 * MWRR (Money-Weighted Rate of Return, IRR theo dòng tiền) cho MỘT kịch
 * bản. simulateDCA() đã tự nối sẵn dòng tiền dương ở ngày cuối cùng bằng đúng
 * giá trị danh mục vào result.cashflows (xem allCashflows trong dca.ts), nên
 * ở đây chỉ cần đưa thẳng cashflows đó vào dcaMWRR(), không nối thêm lần nữa.
 * Nối thêm lần nữa sẽ đếm trùng giá trị cuối kỳ, đẩy MWRR lên sai gấp mấy lần.
 */
function computeMWRR(cashflows: { date: string; amount: number }[]): number | null {
  if (cashflows.length === 0) return null
  return dcaMWRR(cashflows)
}

/** Chạy DCA đều đặn bình thường (không skip, không boost) — dùng làm baseline
 * cho các phép so sánh trong block này, tính lại tại chỗ để có luôn cashflows
 * phục vụ MWRR (khác với chỉ đọc totalInvested/finalValue/valueSeries từ props). */
function runBaseline(inputs: NonNullable<ConsistencyPortfolio['simulationInputs']>): {
  totalInvested: number
  finalValue: number
  valueSeries: { date: string; value: number }[]
  mwrr: number | null
} {
  const result = simulateDCA(
    inputs.filteredPrices,
    inputs.slots,
    inputs.params,
    inputs.rebalFreq,
    { purchasePrices: inputs.purchasePrices },
  )
  return {
    totalInvested: result.totalInvested,
    finalValue: result.finalValue,
    valueSeries: result.values,
    mwrr: computeMWRR(result.cashflows),
  }
}

/**
 * Re-run DCA với skip predicate: bỏ nạp khi TWRR drawdown hiện tại <= threshold.
 * Returns summary stats + value series + count of skipped contributions.
 */
function runPanicStop(
  inputs: NonNullable<ConsistencyPortfolio['simulationInputs']>,
  threshold: number,
): {
  totalInvested: number
  finalValue: number
  valueSeries: { date: string; value: number }[]
  skippedCount: number
  /** Tiền bị bỏ nạp, giả định vẫn giữ làm tiền mặt (không sinh lời) — dùng để
   * tính "chi phí cơ hội" công bằng thay vì so thẳng giá trị cuối. */
  skippedCash: number
  mwrr: number | null
} {
  let skippedCount = 0
  const result = simulateDCA(
    inputs.filteredPrices,
    inputs.slots,
    inputs.params,
    inputs.rebalFreq,
    {
      skipContributionWhen: (_date, dd) => {
        if (dd <= threshold) {
          skippedCount++
          return true
        }
        return false
      },
      purchasePrices: inputs.purchasePrices,
    },
  )
  return {
    totalInvested: result.totalInvested,
    finalValue: result.finalValue,
    valueSeries: result.values,
    skippedCount,
    skippedCash: skippedCount * inputs.params.cashflowAmount,
    mwrr: computeMWRR(result.cashflows),
  }
}

/**
 * Ngược với runPanicStop: KHÔNG bỏ nạp, mà TĂNG THÊM tiền nạp khi TWRR
 * drawdown hiện tại <= threshold (mua thêm khi giảm sâu, "buy the dip").
 */
function runBoostBuy(
  inputs: NonNullable<ConsistencyPortfolio['simulationInputs']>,
  threshold: number,
  extraAmount: number,
): {
  totalInvested: number
  finalValue: number
  valueSeries: { date: string; value: number }[]
  boostedCount: number
  extraInvested: number
  mwrr: number | null
} {
  let boostedCount = 0
  const result = simulateDCA(
    inputs.filteredPrices,
    inputs.slots,
    inputs.params,
    inputs.rebalFreq,
    {
      contributionAmountOverride: (_date, dd) => {
        if (dd <= threshold) {
          boostedCount++
          return inputs.params.cashflowAmount + extraAmount
        }
        return inputs.params.cashflowAmount
      },
      purchasePrices: inputs.purchasePrices,
    },
  )
  return {
    totalInvested: result.totalInvested,
    finalValue: result.finalValue,
    valueSeries: result.values,
    boostedCount,
    extraInvested: boostedCount * extraAmount,
    mwrr: computeMWRR(result.cashflows),
  }
}

function labelKeyFor(key: string): TranslationKey | null {
  if (key === 'base') return 'consist.row.steady'
  if (key === 'p15') return 'consist.panic15'
  if (key === 'p25') return 'consist.panic25'
  if (key === 'b15') return 'consist.boostRow15'
  if (key === 'b25') return 'consist.boostRow25'
  return null
}

function formatGap(gap: number): string {
  if (Math.abs(gap) < 1) return '0'
  if (gap > 0) return `-${formatVND(Math.round(gap))}`
  return `+${formatVND(Math.abs(Math.round(gap)))}`
}

function signClass(v: number | null): string {
  if (v === null) return ''
  return v >= 0 ? 'dca-profit' : 'dca-loss'
}

function formatSignedPercent(v: number | null): string {
  if (v === null) return '—'
  const pct = v * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%'
}

function formatMillions(v: number): string {
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B'
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(0) + 'M'
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'K'
  return v.toString()
}

function formatMonthYearShort(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[1]!}/${parts[0]!.slice(2)}`
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  return `${parts[2]!}/${parts[1]!}/${parts[0]!}`
}
