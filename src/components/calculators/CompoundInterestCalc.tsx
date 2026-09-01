import { useState, useMemo } from 'react'
import { compoundInterest, compoundInterestSeries } from '../../utils/calculators'
import { formatVNDFull, vndComparisonKey } from '../../utils/vndFormat'
import { MoneyField, PercentField, YearsField, ResultRow } from './CalcFields'
import { CompoundInterestChart } from './CompoundInterestChart'
import { useT, useTRich, useDecimal } from '../../i18n'

/**
 * Máy tính lãi kép, có tuỳ chọn góp thêm hàng tháng.
 *
 * Self-contained: không đọc funds, portfolio hay bất kỳ state chung nào. Nhờ vậy
 * sau này tách ra route riêng (`/may-tinh-lai-kep`) thì bê nguyên xi, không phải
 * gỡ phụ thuộc.
 *
 * Mọi ô đều có sẵn số mặc định. Form trống thì người ta đóng tab luôn, còn có sẵn
 * số thì họ sửa.
 */
export function CompoundInterestCalc() {
  const t = useT()
  const tr = useTRich()
  const dec = useDecimal()
  const [principal, setPrincipal] = useState(100_000_000)
  const [annualRate, setAnnualRate] = useState(0.08)
  const [years, setYears] = useState(20)
  const [monthlyContribution, setMonthlyContribution] = useState(0)

  const result = useMemo(
    () => compoundInterest({ principal, annualRate, years, monthlyContribution }),
    [principal, annualRate, years, monthlyContribution],
  )

  const series = useMemo(
    () => compoundInterestSeries({ principal, annualRate, years, monthlyContribution }),
    [principal, annualRate, years, monthlyContribution],
  )

  const nhanBaoNhieuLan = result.contributions > 0 ? result.finalValue / result.contributions : 0
  const vatSoSanhKey = vndComparisonKey(result.interestEarned)

  return (
    <div className="calc-body">
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>

        <MoneyField label={t('calc.compound.principal')} value={principal} onChange={setPrincipal} />
        <PercentField label={t('calc.compound.rate')} value={annualRate} onChange={setAnnualRate} max={50} />
        <YearsField label={t('calc.compound.years')} value={years} onChange={setYears} />
        <MoneyField
          label={t('calc.compound.monthly')}
          value={monthlyContribution}
          onChange={setMonthlyContribution}
          hint={t('calc.compound.monthlyHint')}
        />
      </div>

      <div className="calc-result-card">
        <h3 className="dca-section-title">{t('calc.afterYears', { n: years })}</h3>

        <ResultRow label={t('calc.compound.finalValue')} value={formatVNDFull(result.finalValue)} primary tone="good" />
        <ResultRow label={t('calc.compound.contributions')} value={formatVNDFull(result.contributions)} />
        <ResultRow label={t('calc.compound.interest')} value={formatVNDFull(result.interestEarned)} tone="good" />

        <p className="calc-takeaway">
          {tr('calc.compound.takeaway', {
            invested: formatVNDFull(result.contributions),
            years,
            final: formatVNDFull(result.finalValue),
            multiple: dec(nhanBaoNhieuLan),
            interest: formatVNDFull(result.interestEarned),
            comparison: vatSoSanhKey ? t('calc.compound.comparison', { thing: t(vatSoSanhKey) }) : '',
          })}
        </p>

        <CompoundInterestChart series={series} />
      </div>
    </div>
  )
}
