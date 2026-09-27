import type { FundMeta } from '../types'
import { getLanguage, type Language } from '../hooks/useLanguage'

/**
 * Tên hiển thị của quỹ theo ngôn ngữ đang chọn.
 *
 * name_en là dịch tay (xem types.ts), không phải mọi quỹ đều có — quỹ mới do
 * audit workflow tự thêm vào fund_metadata.json chưa kịp dịch. Rơi về
 * name_vi trong trường hợp đó, còn hơn hiện rỗng.
 */
export function fundDisplayName(meta: FundMeta, lang: Language = getLanguage()): string {
  if (lang === 'en' && meta.name_en) return meta.name_en
  return meta.name_vi
}
