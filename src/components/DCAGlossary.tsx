import { useState } from 'react'
import { GlossaryVi } from './glossary/GlossaryVi'
import { GlossaryEn } from './glossary/GlossaryEn'
import { useT } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'

/**
 * Khối "Giải Thích Khái Niệm" ở cuối tab DCA.
 *
 * Nội dung nằm ở GlossaryVi/GlossaryEn — hai tài liệu song song, xem ghi chú
 * trong hai file đó. Component này chỉ lo nút mở/đóng.
 */
export function DCAGlossary() {
  const [open, setOpen] = useState(false)
  const t = useT()
  const { language } = useLanguage()

  return (
    <div className="dca-glossary">
      <button
        className="dca-glossary-toggle"
        onClick={() => setOpen(!open)}
      >
        {t('glossary.toggle', { arrow: open ? '▲' : '▼' })}
      </button>

      {open && (
        <div className="dca-glossary-content">
          {language === 'vi' ? <GlossaryVi /> : <GlossaryEn />}
        </div>
      )}
    </div>
  )
}
