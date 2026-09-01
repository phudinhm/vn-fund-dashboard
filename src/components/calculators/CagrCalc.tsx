import { useState, useMemo } from 'react'
import { cagrFromValues } from '../../utils/calculators'
import { formatVNDFull } from '../../utils/vndFormat'
import { MoneyField, YearsField, ResultRow } from './CalcFields'
import { useT, useTRich, useDecimal } from '../../i18n'

/**
 * Quy đổi hai mốc giá trị thành lợi nhuận kép mỗi năm (CAGR).
 *
 * Self-contained, không đọc state chung. Xem ghi chú ở CompoundInterestCalc.
 */
export function CagrCalc() {
  const t = useT()
  const tr = useTRich()
  const dec = useDecimal()
  const [startValue, setStartValue] = useState(100_000_000)
  const [endValue, setEndValue] = useState(200_000_000)
  const [years, setYears] = useState(5)

  const cagr = useMemo(() => cagrFromValues({ startValue, endValue, years }), [startValue, endValue, years])

  const tongLoiNhuan = startValue > 0 ? endValue / startValue - 1 : 0
  const pct = (x: number) => dec(x * 100) + '%'
  const dangLo = endValue < startValue

  return (
    <div className="calc-body">
      <div className="dca-params-card">
        <h3 className="dca-section-title">{t('calc.params')}</h3>

        <MoneyField label={t('calc.cagr.startValue')} value={startValue} onChange={setStartValue} />
        <MoneyField label={t('calc.cagr.endValue')} value={endValue} onChange={setEndValue} />
        <YearsField label={t('calc.cagr.years')} value={years} onChange={setYears} />
      </div>

      <div className="calc-result-card">
        <h3 className="dca-section-title">{t('calc.results')}</h3>

        <ResultRow
          label={t('calc.cagr.result')}
          value={pct(cagr)}
          primary
          tone={dangLo ? 'bad' : 'good'}
        />
        <ResultRow label={t('calc.cagr.totalReturn')} value={pct(tongLoiNhuan)} tone={dangLo ? 'bad' : 'good'} />
        <ResultRow label={t('calc.cagr.absolute')} value={formatVNDFull(endValue - startValue)} tone={dangLo ? 'bad' : 'good'} />

        {startValue <= 0 ? (
          <p className="calc-takeaway">{t('calc.cagr.needPositive')}</p>
        ) : (
          <p className="calc-takeaway">
            {tr(dangLo ? 'calc.cagr.takeawayLoss' : 'calc.cagr.takeawayGain', {
              years,
              total: pct(Math.abs(tongLoiNhuan)),
              cagr: pct(Math.abs(cagr)),
            })}
          </p>
        )}

        <p className="calc-note">{t('calc.cagr.note', { cagr: pct(Math.abs(cagr)) })}</p>
      </div>
    </div>
  )
}
