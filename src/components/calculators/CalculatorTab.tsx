import type { CalculatorId } from '../../types'
import { CALCULATORS, findCalculator } from './CalculatorRegistry'
import { useT } from '../../i18n'

/**
 * Container cho tab "Máy tính".
 *
 * Nhiệm vụ duy nhất: hiện thanh điều hướng và render đúng máy tính đang chọn.
 * Mọi tính toán nằm trong từng component con, container không biết gì về nội dung
 * bên trong. Nhờ vậy khi tách route riêng thì bỏ hẳn container này đi cũng được.
 */
interface CalculatorTabProps {
  calcId?: CalculatorId
  onSelect: (id: CalculatorId) => void
}

export function CalculatorTab({ calcId, onSelect }: CalculatorTabProps) {
  const t = useT()
  const active = findCalculator(calcId)
  const ActiveCalculator = active.component

  return (
    <div className="calc-tab">
      <div className="calc-intro">
        <h2 className="calc-title">{t('calc.title')}</h2>
      </div>

      <nav className="calc-nav" aria-label={t('calc.navLabel')}>
        {CALCULATORS.map(calc => (
          <button
            key={calc.id}
            type="button"
            className={`calc-nav-btn ${calc.id === active.id ? 'calc-nav-btn--active' : ''}`}
            aria-current={calc.id === active.id ? 'page' : undefined}
            onClick={() => onSelect(calc.id)}
          >
            <span className="calc-nav-label">{t(calc.labelKey)}</span>
            <span className="calc-nav-desc">{t(calc.descriptionKey)}</span>
          </button>
        ))}
      </nav>

      <ActiveCalculator />
    </div>
  )
}
