import { useLanguage, type Language } from './hooks/useLanguage'

/**
 * Từ điển song ngữ VI/EN. Phạm vi hiện tại: khung app (header, tab nav,
 * footer, loading/error), bộ lọc & chọn quỹ, KPI, chọn khoảng thời gian, và
 * tab Theo Dõi — tức phần "khung" xuất hiện ở mọi tab cộng nội dung tab So
 * Sánh/Theo Dõi. Nội dung riêng của các tab khác (DCA, Bitcoin, Chiến Thuật,
 * Minh Bạch Hoá...) vẫn tiếng Việt, có thể mở rộng dần theo cùng khuôn mẫu:
 * thêm key vào DICT, gọi t('key') ở component cần dịch.
 */
const DICT = {
  // ── Tab labels ──
  'tab.compare': { vi: 'So Sánh', en: 'Compare' },
  'tab.watchlist': { vi: 'Theo Dõi', en: 'Watchlist' },
  'tab.dca': { vi: 'DCA', en: 'DCA' },
  'tab.lsdca': { vi: 'LS vs DCA', en: 'Lump Sum vs DCA' },
  'tab.fundanalysis': { vi: 'Phân Tích Quỹ', en: 'Fund Analysis' },
  'tab.overlap': { vi: 'Overlap', en: 'Overlap' },
  'tab.rebalance': { vi: 'Tái Cân Bằng', en: 'Rebalancing' },
  'tab.tactical': { vi: 'Chiến Thuật Phân Bổ', en: 'Tactical Allocation' },
  'tab.bitcoin': { vi: 'Bitcoin', en: 'Bitcoin' },
  'tab.wallofworry': { vi: 'Wall of Worry', en: 'Wall of Worry' },
  'tab.calculator': { vi: 'Máy Tính', en: 'Calculator' },
  'tab.methodology': { vi: 'Minh Bạch Hoá', en: 'Methodology' },

  // ── Tab headings (h1) ──
  'heading.compare': { vi: 'So Sánh Quỹ Mở và ETF Việt Nam', en: 'Compare Vietnamese Funds and ETFs' },
  'heading.watchlist': { vi: 'Danh Sách Quỹ Theo Dõi', en: 'Watchlist' },
  'heading.dca': { vi: 'Mô Phỏng DCA Quỹ Đầu Tư Việt Nam', en: 'DCA Simulation for Vietnamese Funds' },
  'heading.lsdca': { vi: 'Lump Sum và DCA: So Sánh Đầu Tư Một Lần', en: 'Lump Sum vs DCA' },
  'heading.fundanalysis': { vi: 'Phân Tích Quỹ Đầu Tư Việt Nam', en: 'Vietnamese Fund Analysis' },
  'heading.overlap': { vi: 'So Sánh Danh Mục Quỹ Đầu Tư', en: 'Portfolio Overlap Comparison' },
  'heading.rebalance': { vi: 'Mô Phỏng Tái Cân Bằng Danh Mục', en: 'Portfolio Rebalancing Simulation' },
  'heading.tactical': { vi: 'Phân Bổ Chiến Thuật', en: 'Tactical Allocation' },
  'heading.bitcoin': { vi: 'Bitcoin và Quỹ Đầu Tư', en: 'Bitcoin and Investment Funds' },
  'heading.wallofworry': { vi: 'Wall of Worry: Những Nỗi Lo Thị Trường', en: 'Wall of Worry' },
  'heading.calculator': { vi: 'Máy Tính Đầu Tư và Lãi Kép', en: 'Investment & Compound Interest Calculator' },
  'heading.methodology': { vi: 'Phương Pháp và Dữ Liệu', en: 'Methodology & Data' },

  // ── App shell ──
  'app.loading': { vi: 'Đang tải dữ liệu...', en: 'Loading data...' },
  'app.error': { vi: 'Lỗi tải dữ liệu', en: 'Failed to load data' },
  'app.footer.dataSource': { vi: 'Dữ liệu từ fmarket.vn & vnstock. Cập nhật hàng ngày.', en: 'Data from fmarket.vn & vnstock. Updated daily.' },
  'app.footer.by': { vi: 'by Minh Phu Dinh', en: 'by Minh Phu Dinh' },
  'app.theme.toLight': { vi: 'Chuyển sang giao diện sáng', en: 'Switch to light mode' },
  'app.theme.toDark': { vi: 'Chuyển sang giao diện tối', en: 'Switch to dark mode' },
  'app.language.toggle': { vi: 'Switch to English', en: 'Chuyển sang Tiếng Việt' },
  'app.nav.label': { vi: 'Danh mục các tab', en: 'Section navigation' },

  // ── Fund category filter ──
  'category.all': { vi: 'Tất cả', en: 'All' },
  'category.mutual_fund': { vi: 'Cổ phiếu', en: 'Equity' },
  'category.bond': { vi: 'Trái phiếu', en: 'Bond' },
  'category.balanced': { vi: 'Cân bằng', en: 'Balanced' },
  'category.etf': { vi: 'ETF', en: 'ETF' },
  'category.index': { vi: 'Chỉ số', en: 'Index' },
  'category.crypto': { vi: 'Crypto', en: 'Crypto' },
  'category.gold': { vi: 'Vàng', en: 'Gold' },

  // ── Fund selector ──
  'fundSelector.searchPlaceholder': { vi: 'Tìm quỹ...', en: 'Search funds...' },
  'fundSelector.noOptions': { vi: 'Không tìm thấy', en: 'No matches found' },
  'fundSelector.addFund': { vi: '+ Thêm quỹ so sánh', en: '+ Add fund to compare' },
  'fundSelector.removeFund': { vi: 'Xoá quỹ', en: 'Remove fund' },
  'fundSelector.comparisonPeriod': { vi: 'So sánh từ {from} đến {to}', en: 'Comparing from {from} to {to}' },
  'fundSelector.savingsGroup': { vi: 'Tài sản khác', en: 'Other assets' },
  'fundSelector.addToWatchlist': { vi: 'Thêm vào danh sách theo dõi', en: 'Add to watchlist' },
  'fundSelector.removeFromWatchlist': { vi: 'Bỏ khỏi danh sách theo dõi', en: 'Remove from watchlist' },

  // ── Date range picker ──
  'dateRange.7d': { vi: '7 ngày', en: '7d' },
  'dateRange.1m': { vi: '1 tháng', en: '1m' },
  'dateRange.3m': { vi: '3 tháng', en: '3m' },
  'dateRange.6m': { vi: '6 tháng', en: '6m' },
  'dateRange.1y': { vi: '1 năm', en: '1y' },
  'dateRange.3y': { vi: '3 năm', en: '3y' },
  'dateRange.5y': { vi: '5 năm', en: '5y' },
  'dateRange.ytd': { vi: 'YTD', en: 'YTD' },
  'dateRange.all': { vi: 'Tất cả', en: 'All' },
  'dateRange.from': { vi: 'Từ ngày', en: 'From date' },
  'dateRange.to': { vi: 'Đến ngày', en: 'To date' },

  // ── KPI cards ──
  'kpi.cagr': { vi: 'CAGR', en: 'CAGR' },
  'kpi.cagrTwrr': { vi: 'CAGR (TWRR)', en: 'CAGR (TWRR)' },
  'kpi.maxDrawdown': { vi: 'Sụt giảm tối đa', en: 'Max Drawdown' },
  'kpi.rollingAvg': { vi: 'TB Rolling 12T', en: 'Avg 12M Rolling' },
  'kpi.winRate': { vi: 'Tỷ lệ thắng (năm)', en: 'Win Rate (yearly)' },
  'kpi.tooltip.cagr': { vi: 'Lợi nhuận bình quân hằng năm (CAGR): tốc độ tăng trưởng trung bình mỗi năm nếu giữ quỹ trong suốt khoảng thời gian.', en: 'Compound Annual Growth Rate: the average yearly growth rate if held for the entire period.' },
  'kpi.tooltip.cagrTwrr': { vi: 'CAGR (TWRR): tốc độ tăng trưởng trung bình mỗi năm của quỹ, bỏ qua dòng tiền DCA. Đây là hiệu suất thuần của quỹ, không phải lợi nhuận thực tế trên tiền bạn đầu tư.', en: 'CAGR (TWRR): the fund’s average yearly growth rate, ignoring DCA cash flows. This is the fund’s raw performance, not your actual return on invested money.' },
  'kpi.tooltip.maxDrawdown': { vi: 'Mức sụt giảm tối đa: mức giảm lớn nhất tính từ đỉnh, cho thấy rủi ro lớn nhất khi đầu tư.', en: 'The largest peak-to-trough decline, showing the worst-case risk of holding this asset.' },
  'kpi.tooltip.maxDrawdownTwrr': { vi: 'Mức sụt giảm tối đa (TWRR): mức giảm lớn nhất tính từ đỉnh dựa trên hiệu suất thuần của quỹ.', en: 'Max Drawdown (TWRR): the largest peak-to-trough decline based on the fund’s raw performance.' },
  'kpi.tooltip.rollingAvg': { vi: 'Trung bình lợi nhuận quy năm theo chu kỳ 12 tháng: hiệu suất trung bình nếu giữ quỹ bất kỳ 12 tháng liên tục nào.', en: 'Average annualized return over any rolling 12-month window.' },
  'kpi.tooltip.rollingAvgTwrr': { vi: 'TB Rolling 12T (TWRR): hiệu suất trung bình quy năm nếu giữ quỹ bất kỳ 12 tháng liên tục nào, bỏ qua dòng tiền DCA.', en: 'Avg 12M Rolling (TWRR): average annualized return over any rolling 12-month window, ignoring DCA cash flows.' },
  'kpi.tooltip.winRate': { vi: 'Tỷ lệ thắng: phần trăm số năm đầy đủ mà quỹ có lợi nhuận cao nhất trong nhóm so sánh.', en: 'Win rate: the percentage of full years this asset had the highest return among those compared.' },

  // ── Compare tab ──
  'compare.title': { vi: 'So Sánh Các Quỹ', en: 'Compare Funds' },
  'compare.loadingFunds': { vi: 'Đang tải dữ liệu quỹ...', en: 'Loading fund data...' },

  // ── DCA tab ──
  'dca.title': { vi: 'Tích Lũy Định Kỳ (DCA)', en: 'Dollar-Cost Averaging (DCA)' },
  'dca.params': { vi: 'Thông số', en: 'Parameters' },
  'dca.timeRange': { vi: 'Khoảng thời gian', en: 'Time range' },
  'dca.modeAll': { vi: 'Tất cả', en: 'All' },
  'dca.modeYears': { vi: 'X năm qua', en: 'Last X years' },
  'dca.numYears': { vi: 'Số năm', en: 'Number of years' },
  'dca.dateRange': { vi: 'Từ ngày đến ngày', en: 'From / to date' },
  'dca.initialAmount': { vi: 'Số tiền đầu tiên', en: 'Initial amount' },
  'dca.cashflowTitle': { vi: 'Dòng Tiền DCA', en: 'DCA cash flow' },
  'dca.cashflowHint': {
    vi: 'Để 0 nếu chỉ muốn mô phỏng đầu tư 1 lần. Nhập số tiền nếu muốn lên kế hoạch DCA định kỳ.',
    en: 'Leave at 0 to simulate a one-off investment. Enter an amount to plan recurring DCA.',
  },
  'dca.recurringAmount': { vi: 'Số tiền đầu tư định kỳ', en: 'Recurring amount' },
  'dca.frequency': { vi: 'Tần suất đầu tư', en: 'Investment frequency' },
  'dca.priceDateNote': {
    vi: '* Thời gian đầu, các quỹ cập nhật thông tin giá vào các ngày khác nhau. Trong trường hợp này, hệ thống sẽ tự chọn giá vào ngày giao dịch cuối cùng trong tuần.',
    en: '* In the early years funds published prices on different days. Where that happens, the last trading day of the week is used.',
  },
  'dca.portfolios': { vi: 'Danh mục', en: 'Portfolios' },
  'dca.addPortfolio': { vi: '+ Thêm Danh Mục', en: '+ Add portfolio' },
  'dca.run': { vi: 'Chạy DCA', en: 'Run DCA' },
  'dca.rerun': { vi: 'Chạy lại DCA', en: 'Re-run DCA' },
  'dca.staleParams': {
    vi: 'Thông số đã thay đổi, bấm "Chạy lại DCA" để cập nhật biểu đồ.',
    en: 'Parameters changed — press "Re-run DCA" to update the charts.',
  },
  'dca.loading': { vi: 'Đang tải dữ liệu...', en: 'Loading data...' },
  'dca.insufficientData': {
    vi: 'Không đủ dữ liệu để tính toán. Hãy chọn khoảng thời gian dài hơn hoặc chọn "Tất cả".',
    en: 'Not enough data to compute. Choose a longer time range, or select "All".',
  },
  'dca.emptyState': {
    vi: 'Bấm "Thêm Danh Mục" để bắt đầu mô phỏng DCA.',
    en: 'Press "Add portfolio" to start a DCA simulation.',
  },
  'dca.section.all': { vi: 'Tất cả', en: 'All' },
  'dca.section.perf': { vi: 'Hiệu suất đầu tư', en: 'Performance' },
  'dca.section.journey': { vi: 'Hành trình của bạn', en: 'Your journey' },
  'dca.section.risk': { vi: 'Rủi ro & biến động', en: 'Risk & volatility' },
  'dca.section.endgame': { vi: 'Endgame', en: 'Endgame' },
  'dca.freq.daily': { vi: 'Hàng ngày', en: 'Daily' },
  'dca.freq.weekly': { vi: '1 tuần', en: 'Weekly' },
  'dca.freq.biweekly': { vi: '2 tuần', en: 'Every 2 weeks' },
  'dca.freq.monthly': { vi: '1 tháng', en: 'Monthly' },
  'dca.freq.quarterly': { vi: '1 quý', en: 'Quarterly' },
  'dca.freq.semiannual': { vi: '6 tháng', en: 'Every 6 months' },
  'dca.freq.yearly': { vi: '1 năm', en: 'Yearly' },

  // ── Portfolio card (dùng chung: DCA, Tái Cân Bằng, Chiến Thuật) ──
  'portfolio.removePortfolio': { vi: 'Xoá danh mục', en: 'Remove portfolio' },
  'portfolio.addFund': { vi: 'Thêm quỹ', en: 'Add fund' },
  'portfolio.equalWeights': { vi: 'Chia đều tỷ trọng', en: 'Split weights evenly' },
  'portfolio.searchFund': { vi: 'Tìm quỹ...', en: 'Search funds...' },
  'portfolio.removeFund': { vi: 'Xoá', en: 'Remove' },
  'portfolio.rebal.monthly': { vi: 'Hàng tháng', en: 'Monthly' },
  'portfolio.rebal.quarterly': { vi: 'Hàng quý', en: 'Quarterly' },
  'portfolio.rebal.yearly': { vi: 'Hàng năm', en: 'Yearly' },

  // ── Savings rate input ──
  'savings.perYear': { vi: '%/năm', en: '%/yr' },
  'savings.tooltip': { vi: 'Lãi suất tiết kiệm giả định, %/năm', en: 'Assumed savings interest rate, % per year' },

  // ── Watchlist tab ──
  'watchlist.title': { vi: 'Theo Dõi', en: 'Watchlist' },
  'watchlist.addSectionTitle': { vi: 'Thêm quỹ vào danh sách theo dõi', en: 'Add a fund to your watchlist' },
  'watchlist.searchPlaceholder': { vi: 'Tìm quỹ...', en: 'Search funds...' },
  'watchlist.noOptionsLoading': { vi: 'Đang tải...', en: 'Loading...' },
  'watchlist.noOptionsAllWatched': { vi: 'Đã theo dõi hết quỹ', en: 'All funds already watched' },
  'watchlist.empty': { vi: 'Chưa có quỹ nào trong danh sách theo dõi. Tìm và thêm quỹ ở ô phía trên, hoặc bấm ngôi sao ☆ cạnh mỗi quỹ trong tab So Sánh.', en: 'Your watchlist is empty. Search and add a fund above, or click the ☆ star next to any fund in the Compare tab.' },
  'watchlist.compareButton': { vi: 'So sánh {n} quỹ đang theo dõi', en: 'Compare {n} watched funds' },
  'watchlist.compareLimitNote': { vi: 'Chỉ lấy {n} quỹ đầu (giới hạn so sánh)', en: 'Only the first {n} funds are used (comparison limit)' },
  'watchlist.loading': { vi: 'Đang tải dữ liệu...', en: 'Loading data...' },
  'watchlist.removeFromWatchlist': { vi: 'Bỏ khỏi danh sách theo dõi', en: 'Remove from watchlist' },
  'watchlist.stat.latestPrice': { vi: 'Giá mới nhất', en: 'Latest price' },
  'watchlist.stat.oneYear': { vi: '1 năm', en: '1 year' },
  'watchlist.stat.cagrSinceInception': { vi: 'CAGR từ đầu', en: 'CAGR since inception' },
  'watchlist.stat.maxDrawdown': { vi: 'Sụt giảm tối đa', en: 'Max drawdown' },
  'watchlist.viewInCompare': { vi: 'Xem trong So Sánh →', en: 'View in Compare →' },
} as const

export type TranslationKey = keyof typeof DICT

function translate(key: TranslationKey, lang: Language, vars?: Record<string, string | number>): string {
  let text: string = DICT[key][lang]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, String(v))
    }
  }
  return text
}

/** Dịch một chuỗi tĩnh không qua hook, dùng ở nơi không phải component (vd
 *  App.tsx dựng danh sách tab ngoài JSX). Ưu tiên dùng useT() trong component. */
export function translateStatic(key: TranslationKey, lang: Language, vars?: Record<string, string | number>): string {
  return translate(key, lang, vars)
}

export function useT(): (key: TranslationKey, vars?: Record<string, string | number>) => string {
  const { language } = useLanguage()
  return (key, vars) => translate(key, language, vars)
}
