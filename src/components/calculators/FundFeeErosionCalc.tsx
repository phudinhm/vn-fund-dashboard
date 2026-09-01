import { useState, useMemo } from 'react'
import { fundFeeErosion, fundFeeErosionSeries } from '../../utils/calculators'
import { formatVNDFull, vndComparisonKey } from '../../utils/vndFormat'
import { MoneyField, PercentField, YearsField, ResultRow } from './CalcFields'
import { FundFeeErosionChart } from './FundFeeErosionChart'
import { useT, useTRich, useDecimal } from '../../i18n'

/**
 * Phí quỹ ăn mòn bao nhiêu tài sản sau N năm.
 *
 * Self-contained, không đọc state chung. Xem ghi chú ở CompoundInterestCalc.
 */
export function FundFeeErosionCalc() {
  const t = useT()
  const tr = useTRich()
  const dec = useDecimal()
  const [principal, setPrincipal] = useState(100_000_000)
  const [growthRate, setGrowthRate] = useState(0.10)
  const [feeRate, setFeeRate] = useState(0.02)
  const [years, setYears] = useState(20)

  const result = useMemo(
    () => fundFeeErosion({ principal, growthRate, feeRate, years }),
    [principal, growthRate, feeRate, years],
  )

  const series = useMemo(
    () => fundFeeErosionSeries({ principal, growthRate, feeRate, years }),
    [principal, growthRate, feeRate, years],
  )

  const mat = result.finalValueNoFee - result.finalValueWithFee
  const vatSoSanhKey = vndComparisonKey(mat)
  const pct = (x: number) => dec(x * 100) + '%'

  return (
    <div className="calc-body">
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>

        <MoneyField label={t('calc.fee.principal')} value={principal} onChange={setPrincipal} />
        <PercentField label={t('calc.fee.growth')} value={growthRate} onChange={setGrowthRate} max={50} />
        <PercentField
          label={t('calc.fee.feeRate')}
          value={feeRate}
          onChange={setFeeRate}
          step={0.1}
          max={10}
          hint={t('calc.fee.feeHint')}
        />
        <YearsField label={t('calc.fee.years')} value={years} onChange={setYears} />
      </div>

      <div className="calc-result-card">
        <h3 className="dca-section-title">{t('calc.afterYears', { n: years })}</h3>

        <ResultRow label={t('calc.fee.noFee')} value={formatVNDFull(result.finalValueNoFee)} />
        <ResultRow label={t('calc.fee.withFee')} value={formatVNDFull(result.finalValueWithFee)} primary />
        <ResultRow label={t('calc.fee.lost')} value={formatVNDFull(mat)} tone="bad" />
        <ResultRow label={t('calc.fee.erosionPct')} value={pct(result.erosionPct)} tone="bad" />

        <p className="calc-takeaway">
          {tr('calc.fee.takeaway', {
            fee: pct(feeRate),
            years,
            lost: formatVNDFull(mat),
            pct: pct(result.erosionPct),
            comparison: vatSoSanhKey ? t('calc.fee.comparison', { thing: t(vatSoSanhKey) }) : '',
          })}
        </p>

        <FundFeeErosionChart series={series} />

        <p className="calc-note">{t('calc.fee.note')}</p>
      </div>
    </div>
  )
}
