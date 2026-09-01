/**
 * DividendNotice: banner nhỏ xuất hiện khi quỹ được chọn có chia cổ tức.
 *
 * Mục đích: cho user biết giá NAV trên biểu đồ KHÔNG phải raw NAV từ fmarket
 * mà đã được điều chỉnh để phản ánh giả định tái đầu tư cổ tức sau thuế.
 * Nếu user thắc mắc "sao số khác fmarket", banner này là câu trả lời đầu tiên.
 *
 * Dùng ở các tab: So Sánh, LS vs DCA, Bitcoin.
 * Tab DCA đã có "Cổ tức & tái đầu tư" block riêng nên không cần.
 */
import { useEffect, useState } from 'react'
import { loadDividends } from '../utils/dividendAdjust'
import { useTRich } from '../i18n'

interface Props {
  /** Danh sách fundId đang được chọn (hiển thị trên biểu đồ) */
  fundIds: string[]
}

export function DividendNotice({ fundIds }: Props) {
  const tr = useTRich()
  const [dividendFunds, setDividendFunds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    loadDividends()
      .then(map => {
        if (cancelled) return
        const s = new Set<string>()
        for (const [fundId, events] of map.entries()) {
          if (events.length > 0) s.add(fundId)
        }
        setDividendFunds(s)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [])

  const matched = fundIds.filter(id => dividendFunds.has(id))
  if (matched.length === 0) return null

  return (
    <div className="dividend-notice">
      <span className="dividend-notice-icon">💵</span>
      <div className="dividend-notice-body">
        {tr('dividend.notice', { funds: matched.join(', ') })}
      </div>
    </div>
  )
}
