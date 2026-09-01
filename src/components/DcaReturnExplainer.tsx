/**
 * DcaReturnExplainer: giải thích vì sao có 2 con số lợi nhuận khác nhau (CAGR vs MWRR).
 *
 * Retail VN hay nhìn thấy 2 con số chênh lệch nhau 5-10% và bối rối.
 * Dùng ẩn dụ "cây giống" trực tiếp từ blog minhphudinh (cam-nang-dca-toan-tap phần 2)
 * để giải thích: CAGR giả định toàn bộ tiền có từ đầu, MWRR chiết khấu từng dòng tiền.
 *
 * Default collapsed, user nào tò mò thì mở.
 */
import { useState, memo } from 'react'
import { useT, useTRich } from '../i18n'

interface ExplainerPortfolio {
  id: string
  name: string
  color: string
  cagr: number | null
  mwrr: number | null
}

interface Props {
  portfolios: ExplainerPortfolio[]
}

function DcaReturnExplainerImpl({ portfolios }: Props) {
  const t = useT()
  const tr = useTRich()
  const [open, setOpen] = useState(false)

  // Nếu không có portfolio nào có đủ 2 chỉ số thì không render
  const valid = portfolios.filter(p => p.cagr !== null && p.mwrr !== null)
  if (valid.length === 0) return null

  // Pick portfolio có gap lớn nhất giữa CAGR vs MWRR để làm ví dụ minh họa
  const example = [...valid].sort(
    (a, b) => Math.abs((b.mwrr! - b.cagr!)) - Math.abs((a.mwrr! - a.cagr!)),
  )[0]!

  const cagrPct = (example.cagr! * 100).toFixed(2)
  const mwrrPct = (example.mwrr! * 100).toFixed(2)
  const gap = (example.mwrr! - example.cagr!) * 100
  const gapAbs = Math.abs(gap).toFixed(2)
  const mwrrHigher = gap > 0

  return (
    <div className={`dca-explainer-block${open ? ' dca-explainer-block--open' : ''}`}>
      <button
        className="dca-explainer-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="dca-explainer-icon">💡</span>
        <span className="dca-explainer-toggle-text">
          {t('explainer.title')}
        </span>
        <span className="dca-explainer-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="dca-explainer-body">
          <p className="dca-explainer-intro">
            {tr('explainer.intro')}
          </p>

          <div className="dca-explainer-compare">
            <div className="dca-explainer-metric">
              <div className="dca-explainer-metric-name">CAGR</div>
              <div className="dca-explainer-metric-val">{t('explainer.perYear', { v: cagrPct })}</div>
              <div className="dca-explainer-metric-desc">
                {tr('explainer.cagrAnswers')}
              </div>
            </div>

            <div className="dca-explainer-vs">vs</div>

            <div className="dca-explainer-metric dca-explainer-metric--highlight">
              <div className="dca-explainer-metric-name">MWRR</div>
              <div className="dca-explainer-metric-val">{t('explainer.perYear', { v: mwrrPct })}</div>
              <div className="dca-explainer-metric-desc">
                {tr('explainer.mwrrAnswers')}
              </div>
            </div>
          </div>

          <div className="dca-explainer-analogy">
            <h4 className="dca-explainer-analogy-title">{t('explainer.analogyTitle')}</h4>
            <p>
              {t('explainer.analogy1')}
            </p>
            <p>
              {tr('explainer.analogy2')}
            </p>
            <ul className="dca-explainer-bullets">
              <li>
                {tr('explainer.analogyCagr')}
              </li>
              <li>
                {tr('explainer.analogyMwrr')}
              </li>
            </ul>
            <p>
              {t('explainer.dcaPoint')}
              {mwrrHigher ? (
                tr('explainer.mwrrHigher', { gap: gapAbs })
              ) : (
                tr('explainer.mwrrGap', { gap: gapAbs })
              )}
            </p>
          </div>

          <div className="dca-explainer-conclusion">
            {tr('explainer.whichToUse')}
          </div>
        </div>
      )}
    </div>
  )
}

export const DcaReturnExplainer = memo(DcaReturnExplainerImpl)
