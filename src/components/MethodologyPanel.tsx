import { memo } from 'react'
import { SECTION_IDS } from './methodology/MethodologyParts'
import { MethodologyVi, SECTION_LABELS_VI } from './methodology/MethodologyVi'
import { MethodologyEn, SECTION_LABELS_EN } from './methodology/MethodologyEn'
import { useT } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

/**
 * Tab "Minh Bạch Hoá": tài liệu giải thích chính xác cách dashboard tính từng
 * con số, bắt đầu từ tab DCA. Nội dung tĩnh, ví dụ số dùng số minh hoạ cố định
 * (không kéo từ trạng thái mô phỏng) để luôn khớp với code và không bao giờ vỡ
 * khi dữ liệu đổi.
 *
 * Nội dung nằm ở MethodologyVi/MethodologyEn — hai tài liệu song song thay vì
 * một mớ key rời trong i18n.ts (xem ghi chú ở MethodologyParts.tsx). Component
 * này chỉ lo phần khung: tiêu đề, mục lục và chọn ngôn ngữ.
 */
function MethodologyPanelImpl() {
  const t = useT()
  const { language } = useLanguage()
  const labels = language === 'vi' ? SECTION_LABELS_VI : SECTION_LABELS_EN

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="methodology-panel">
      <header className="method-header">
        <h2>{t('heading.methodology')}</h2>
      </header>

      <nav className="method-toc" aria-label={t('method.tocLabel')}>
        <div className="method-toc-title">{t('method.onThisPage')}</div>
        <ul>
          {SECTION_IDS.map((id, i) => (
            <li key={id}>
              <button type="button" onClick={() => scrollToId(id)}>{labels[i]}</button>
            </li>
          ))}
        </ul>
      </nav>

      {language === 'vi' ? <MethodologyVi /> : <MethodologyEn />}
    </div>
  )
}

export const MethodologyPanel = memo(MethodologyPanelImpl)
