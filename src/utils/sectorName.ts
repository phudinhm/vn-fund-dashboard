import { getLanguage, type Language } from '../hooks/useLanguage'

/**
 * Dịch tên ngành trong dữ liệu holdings sang tiếng Anh.
 *
 * Tên ngành đến từ CSV (fmarket / digiinvest / báo cáo quỹ), không phải chuỗi
 * UI, nên không nằm trong i18n.ts. Nhưng nó hiện khắp tab Overlap và Phân Tích
 * Quỹ, để nguyên tiếng Việt thì bản tiếng Anh đọc rất chắp vá.
 *
 * Nguồn đặt tên không thống nhất: cùng một ngành có tới ba cách viết ("BĐS",
 * "Bất động sản"), và có cả bản viết tắt lẫn viết đầy đủ ("SX Nhựa - Hóa chất"
 * vs "Sản xuất Nhựa - Hóa chất"). Bảng dưới gom hết các biến thể đang có trong
 * dữ liệu về cùng một nhãn tiếng Anh.
 *
 * Tên lạ (nguồn thêm ngành mới) trả về nguyên văn thay vì rỗng: thà đọc thấy
 * tiếng Việt còn hơn mất thông tin.
 */
const SECTOR_EN: Record<string, string> = {
  'Ngân hàng': 'Banking',
  'Bán lẻ': 'Retail',
  'Chứng khoán': 'Securities',
  'Xây dựng': 'Construction',
  'Vật liệu': 'Materials',
  'Vật liệu xây dựng': 'Building materials',
  'BĐS': 'Real estate',
  'Bất động sản': 'Real estate',
  'Hạ tầng': 'Infrastructure',
  'Thực phẩm': 'Food',
  'Thực phẩm - Đồ uống': 'Food & beverage',
  'Đồ uống': 'Beverages',
  'Dầu khí': 'Oil & gas',
  'Công nghệ': 'Technology',
  'Công nghệ và thông tin': 'Technology & IT',
  'Bảo hiểm': 'Insurance',
  'Ô tô': 'Automotive',
  'Tiện ích': 'Utilities',
  'Điện': 'Power',
  'Dịch vụ': 'Services',
  'Bán buôn': 'Wholesale',
  'Sản xuất': 'Manufacturing',
  'Vận tải': 'Transport',
  'Vận tải - kho bãi': 'Transport & warehousing',
  'Vận tải - Kho bãi': 'Transport & warehousing',
  'Logistics': 'Logistics',
  'SX Nhựa - Hóa chất': 'Plastics & chemicals',
  'Sản xuất Nhựa - Hóa chất': 'Plastics & chemicals',
  'Nguyên vật liệu/hóa chất': 'Raw materials & chemicals',
  'Khai khoáng': 'Mining',
  'SX Phụ trợ': 'Supporting industries',
  'Sản xuất Phụ trợ': 'Supporting industries',
  'Chế biến Thủy sản': 'Seafood processing',
  'Chế biến thủy sản': 'Seafood processing',
  'Dệt may': 'Textiles & garments',
  'Viễn thông': 'Telecoms',
  'Thiết bị điện': 'Electrical equipment',
  'SX Hàng gia dụng': 'Household goods',
  'Sản xuất Hàng gia dụng': 'Household goods',
  'Dược phẩm': 'Pharmaceuticals',
  'Sản phẩm cao su': 'Rubber products',
  'SX Thiết bị - máy móc': 'Equipment & machinery',
  'Sản xuất Thiết bị': 'Equipment manufacturing',
  'Chăm sóc sức khỏe': 'Healthcare',
  'Dịch vụ tư vấn - hỗ trợ': 'Consulting & support services',
  'Tiêu dùng': 'Consumer',
  'Dịch vụ lưu trú': 'Accommodation',
  'Dịch vụ lưu trú - ăn uống - giải trí': 'Hospitality & leisure',
  'Du lịch': 'Travel',
  'Nông - Lâm - Ngư': 'Agriculture, forestry & fisheries',
  'Tài chính khác': 'Other financials',
  'Khác': 'Other',
}

/** Tên ngành theo ngôn ngữ đang chọn; tên chưa có trong bảng giữ nguyên văn. */
export function sectorName(vi: string, lang: Language = getLanguage()): string {
  if (lang === 'vi') return vi
  return SECTOR_EN[vi.trim()] ?? vi
}
