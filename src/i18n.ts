import { createElement, Fragment, type ReactNode } from 'react'
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

  // ── So sánh số tiền với món đồ đời thực (vndComparisonKey) ──
  'vndCompare.motorbike': { vi: 'một chiếc xe máy số phổ thông (Honda Wave, Wave Alpha)', en: 'a basic commuter motorbike (Honda Wave)' },
  'vndCompare.iphone': { vi: 'một chiếc iPhone mới', en: 'a brand-new iPhone' },
  'vndCompare.scooter': { vi: 'một chiếc xe tay ga phổ thông (Honda Vision, Air Blade)', en: 'a mainstream scooter (Honda Vision, Air Blade)' },
  'vndCompare.premiumScooter': { vi: 'một chiếc SH hoặc Vespa xịn', en: 'a Honda SH or a premium Vespa' },
  'vndCompare.bigBike': { vi: 'một chiếc mô tô phân khối lớn (Royal Enfield, Kawasaki Z-series)', en: 'a big-bore motorcycle (Royal Enfield, Kawasaki Z-series)' },
  'vndCompare.usedCar': { vi: 'một chiếc ô tô cũ cho gia đình', en: 'a used family car' },
  'vndCompare.newSedan': { vi: 'một chiếc Toyota Vios hoặc Honda City mới', en: 'a new Toyota Vios or Honda City' },
  'vndCompare.suv': { vi: 'một chiếc Mazda CX-5 hoặc Honda CR-V', en: 'a Mazda CX-5 or Honda CR-V' },
  'vndCompare.luxuryCar': { vi: 'một chiếc Mercedes C-Class hoặc BMW 3-Series', en: 'a Mercedes C-Class or BMW 3-Series' },
  'vndCompare.smallBusiness': { vi: 'vốn để mở một quán cà phê hoặc cửa hàng nhỏ', en: 'the capital to open a coffee shop or small store' },
  'vndCompare.earlyRetire': { vi: 'nghỉ hưu sớm với lãi gửi ngân hàng ~400 triệu/năm', en: 'early retirement on bank interest of ~400m VND a year' },
  'vndCompare.earlyRetireLong': { vi: 'nghỉ hưu sớm 15-20 năm', en: 'retiring 15–20 years early' },

  // ── Overlap tab ──
  'overlap.intro': {
    vi: 'So sánh danh mục cổ phiếu của hai quỹ: có bao nhiêu công ty trùng nhau, tỷ trọng trùng là bao nhiêu và quỹ nào đang sở hữu cổ phiếu/ngành nào nhiều hơn quỹ còn lại.',
    en: 'Compare the equity books of two funds: how many companies they hold in common, how much weight overlaps, and which stocks and sectors each one owns more of than the other.',
  },
  'overlap.scopeNote': {
    vi: 'So sánh trên danh mục cổ phiếu đầy đủ của hai quỹ, theo từng kỳ báo cáo.',
    en: 'Compared across each fund’s full equity book, one reporting period at a time.',
  },
  'overlap.period': { vi: 'Kỳ báo cáo', en: 'Reporting period' },
  'overlap.periodLatest': { vi: 'Mới nhất', en: 'Latest' },
  'overlap.periodLabel': { vi: 'Tháng {month}/{year}', en: '{month}/{year}' },
  'overlap.indexError': {
    vi: 'Chưa có dữ liệu holdings. Vui lòng tải lại sau.',
    en: 'No holdings data yet. Please try again later.',
  },
  'overlap.missingOne': { vi: 'Một trong hai quỹ chưa có dữ liệu holdings.', en: 'One of the two funds has no holdings data.' },
  'overlap.loadFailed': { vi: 'Không tải được dữ liệu holdings.', en: 'Could not load holdings data.' },
  'overlap.notEnough': { vi: 'Không đủ dữ liệu để tính overlap.', en: 'Not enough data to compute overlap.' },
  'overlap.sameFund': {
    vi: 'Hai quỹ đang giống nhau. Chọn hai quỹ khác nhau để so sánh.',
    en: 'Both selections are the same fund. Pick two different funds to compare.',
  },
  'overlap.sourceInfo': { vi: '{fund} lấy dữ liệu từ {source}', en: '{fund} sources its data from {source}' },
  'overlap.source.report': { vi: 'báo cáo tài chính của quỹ', en: 'the fund’s own financial reports' },
  'overlap.source.digiinvest': { vi: 'digiinvest.vn', en: 'digiinvest.vn' },
  'overlap.source.fmarket': { vi: 'fmarket', en: 'fmarket' },
  'overlap.periodMismatch': {
    vi: '{fundA} đang dùng thông tin {periodA}, {fundB} đang dùng thông tin {periodB} vì quỹ chưa được cập nhật tới kỳ đã chọn.',
    en: '{fundA} is showing {periodA} while {fundB} is showing {periodB}, because one of them has not reported for the period you picked.',
  },
  'overlap.stat.shared': { vi: 'Trùng nhau', en: 'Held in common' },
  'overlap.stat.sharedSub': { vi: 'công ty chung', en: 'companies in both' },
  'overlap.stat.weighted': { vi: 'Tỷ trọng trùng', en: 'Overlapping weight' },
  'overlap.stat.inFund': { vi: 'Cổ phiếu trùng trong {fund}', en: 'Shared stocks inside {fund}' },
  'overlap.stat.inFundSub': { vi: '% NAV {fund} nằm trong cổ phiếu trùng', en: '% of {fund}’s NAV sitting in shared stocks' },
  'overlap.portfolioOf': { vi: 'Danh mục tài sản {fund}', en: '{fund} portfolio' },
  'overlap.sharedStocks': { vi: 'Cổ phiếu bị trùng', en: 'Stocks held by both' },
  'overlap.overweight': { vi: 'Tỷ trọng cổ phiếu {fundA} hơn {fundB}', en: 'Where {fundA} holds more than {fundB}' },
  'overlap.underweight': { vi: 'Tỷ trọng cổ phiếu {fundA} nhỏ hơn {fundB}', en: 'Where {fundA} holds less than {fundB}' },
  'overlap.noOverweight': { vi: 'Không có cổ phiếu nào quỹ A nắm nhiều hơn quỹ B.', en: 'There is no stock the first fund holds more of than the second.' },
  'overlap.noUnderweight': { vi: 'Không có cổ phiếu nào quỹ A nắm ít hơn quỹ B.', en: 'There is no stock the first fund holds less of than the second.' },
  'overlap.col.stock': { vi: 'Cổ phiếu', en: 'Stock' },
  'overlap.col.code': { vi: 'Mã', en: 'Code' },
  'overlap.col.industry': { vi: 'Ngành', en: 'Sector' },
  'overlap.col.weight': { vi: 'Tỷ trọng', en: 'Weight' },
  'overlap.col.weightOf': { vi: 'Tỷ trọng {fund}', en: '{fund} weight' },
  'overlap.col.value': { vi: 'Giá trị', en: 'Value' },
  'overlap.col.diff': { vi: 'Chênh lệch', en: 'Difference' },
  'overlap.drift.title': { vi: 'Sector Drift', en: 'Sector drift' },
  'overlap.drift.help': {
    vi: 'Chênh lệch tỷ trọng ngành giữa quỹ A và quỹ B (A − B). Dương = quỹ A nắm nhiều hơn ở ngành này, âm = quỹ B nắm nhiều hơn.',
    en: 'The sector-weight gap between the first fund and the second (A − B). Positive means the first fund holds more of that sector; negative means the second does.',
  },
  'overlap.assetType.stock': { vi: 'Cổ phiếu', en: 'Equities' },
  'overlap.assetType.bond': { vi: 'Trái phiếu', en: 'Bonds' },
  'overlap.assetType.cash': { vi: 'Tiền mặt', en: 'Cash' },
  'overlap.assetType.other': { vi: 'Tài sản khác', en: 'Other assets' },
  'overlap.footnote': {
    vi: 'Danh mục gồm cổ phiếu, trái phiếu, tiền mặt và tài sản khác tại kỳ báo cáo {period}. Overlap chỉ đo trên cổ phiếu; trái phiếu, tiền mặt và tài sản khác được hiển thị để bạn thấy cấu trúc danh mục nhưng không tham gia tính trùng.',
    en: 'The portfolio covers equities, bonds, cash and other assets as of the {period} report. Overlap is measured on equities only; bonds, cash and other assets are shown so you can see the shape of the book, but they do not count toward the overlap figures.',
  },
  'overlap.footnote.latestPeriod': { vi: 'gần nhất', en: 'latest' },

  // ── Rebalancing tab ──
  'rebal.title': { vi: 'Độ Nhạy Tái Cân Bằng', en: 'Rebalancing Sensitivity' },
  'rebal.intro': {
    vi: 'Giả sử danh mục của bạn là 50% quỹ A, 50% quỹ B. Theo thời gian, giá 2 quỹ tăng khác nhau nên tỷ trọng thực tế sẽ lệch dần khỏi 50/50 (vd 58/42), và "tái cân bằng" là hành động bán bớt quỹ đang nhiều, mua thêm quỹ đang ít để đưa về lại đúng mục tiêu. Câu hỏi công cụ này trả lời: <b>tái cân bằng vào lúc nào thì tốt hơn?</b> Mỗi cách chọn "khi nào tái cân bằng" (vd: cứ mỗi quý một lần, hoặc chỉ khi lệch quá 5%) gọi là một <b>biến thể</b>. Công cụ tự động thử hàng trăm biến thể khác nhau trên cùng một danh mục, để xem chọn biến thể nào cũng cho kết quả gần giống nhau, hay có biến thể vượt trội hẳn.',
    en: 'Say your portfolio is 50% fund A and 50% fund B. The two funds grow at different rates, so the real weights drift away from 50/50 (58/42, say), and "rebalancing" means selling some of the one that grew and buying more of the one that lagged to get back to target. The question this tool answers: <b>when is the better moment to rebalance?</b> Each rule for "when to rebalance" — once a quarter, or only when a weight drifts more than 5% — is one <b>variant</b>. The tool runs hundreds of variants over the same portfolio, to show whether they all land in roughly the same place or one of them genuinely stands out.',
  },
  'rebal.dateRange': { vi: 'Khoảng thời gian', en: 'Time range' },
  'rebal.modeAll': { vi: 'Tất cả', en: 'All' },
  'rebal.modeYears': { vi: 'X năm qua', en: 'Last X years' },
  'rebal.numYears': { vi: 'Số năm', en: 'Number of years' },
  'rebal.fromTo': { vi: 'Từ ngày đến ngày', en: 'From / to date' },
  'rebal.schedules': { vi: 'Tần suất phân tích', en: 'Schedules to test' },
  'rebal.schedulesPlaceholder': { vi: 'Chọn tần suất...', en: 'Pick schedules...' },
  'rebal.schedulesNoOptions': { vi: 'Không còn tần suất nào', en: 'No schedules left' },
  'rebal.schedulesNote': {
    vi: 'Với mỗi tần suất, công cụ không chỉ thử đúng 1 cách mà thử luôn <b>mọi ngày có thể tái cân bằng trong kỳ</b>. Ví dụ "Hàng quý" không chỉ nghĩa là cân lại đúng ngày cuối quý, mà còn thử cân lại sớm hơn vài ngày, sớm hơn vài tuần... mỗi ngày thử là 1 biến thể riêng, để xem chọn đúng ngày trong kỳ có quan trọng không.',
    en: 'For each schedule the tool does not test just one rule — it tests <b>every day in the period on which you could rebalance</b>. "Quarterly" does not only mean the last day of the quarter; it also tries a few days earlier, a few weeks earlier, and so on. Each of those days is a separate variant, so you can see whether picking the right day within the period matters at all.',
  },
  'rebal.bands': { vi: 'Biến thể theo ngưỡng lệch', en: 'Drift-threshold variants' },
  'rebal.bandAbs': { vi: 'Lệch tuyệt đối', en: 'Absolute drift' },
  'rebal.bandAbsNote': {
    vi: 'Bỏ qua lịch cố định, chỉ tái cân bằng khi tỷ trọng một quỹ lệch khỏi mục tiêu quá X <b>điểm phần trăm</b>. Ví dụ mục tiêu 50%, ngưỡng 5%: chờ đến khi tỷ trọng vượt 55% hoặc tụt dưới 45% mới cân lại.',
    en: 'Ignore the calendar entirely and rebalance only when a fund’s weight drifts more than X <b>percentage points</b> from target. Target 50% with a 5% threshold means you wait until the weight passes 55% or drops below 45%.',
  },
  'rebal.bandRel': { vi: 'Lệch tương đối', en: 'Relative drift' },
  'rebal.bandRelNote': {
    vi: 'Giống lệch tuyệt đối, nhưng ngưỡng tính theo % <b>CỦA</b> tỷ trọng mục tiêu, không phải điểm phần trăm. Ví dụ mục tiêu 50%, ngưỡng 10%: 10% của 50% là 5 điểm %, nên cũng chờ đến khi vượt 55% hoặc tụt dưới 45%. Với quỹ có tỷ trọng mục tiêu nhỏ (vd 10%), 2 cách này sẽ ra ngưỡng rất khác nhau.',
    en: 'Same idea, but the threshold is a percentage <b>OF</b> the target weight rather than percentage points. Target 50% with a 10% threshold: 10% of 50% is 5 points, so again you wait for 55% or 45%. For a fund with a small target weight (10%, say) the two rules give very different thresholds.',
  },
  'rebal.sweepFrom': { vi: 'Từ', en: 'From' },
  'rebal.sweepStep': { vi: 'Bước', en: 'Step' },
  'rebal.sweepTo': { vi: 'Đến', en: 'To' },
  'rebal.fee': { vi: 'Phí giao dịch mỗi lần cân', en: 'Trading cost per rebalance' },
  'rebal.paramsNote': {
    vi: '* Không cần chọn ngày nếu muốn dùng toàn bộ lịch sử chung của các quỹ. Mô phỏng mua một lần, giá đã điều chỉnh cổ tức, chưa tính thuế. Phí giao dịch (nếu đặt lớn hơn 0%) trừ trên CẢ chiều mua lẫn bán của phần tài sản lệch tỷ trọng mỗi lần cân, và chỉ áp cho các lần tái cân bằng — không tính cho lần mua ban đầu.',
    en: '* Leave the dates empty to use the funds’ full shared history. The simulation buys once, uses dividend-adjusted prices, and ignores tax. The trading cost (when above 0%) is charged on BOTH the buy and the sell side of whatever has drifted, and only on rebalances — never on the initial purchase.',
  },
  'rebal.portfolio': { vi: 'Danh mục', en: 'Portfolio' },
  'rebal.portfolioName': { vi: 'Danh mục', en: 'Portfolio' },
  'rebal.needTwoFunds': { vi: '* Cần ít nhất 2 quỹ có tỷ trọng lớn hơn 0.', en: '* You need at least 2 funds with a weight above 0.' },
  'rebal.needVariantSource': {
    vi: '* Cần chọn ít nhất 1 tần suất phân tích hoặc bật 1 dải ngưỡng lệch.',
    en: '* Pick at least one schedule, or switch on one drift-threshold sweep.',
  },
  'rebal.run': { vi: 'Phân tích', en: 'Analyse' },
  'rebal.rerun': { vi: 'Phân tích lại', en: 'Re-run analysis' },
  'rebal.staleParams': {
    vi: 'Thông số đã thay đổi, bấm "Phân tích lại" để cập nhật kết quả.',
    en: 'Parameters changed — press "Re-run analysis" to update the results.',
  },
  'rebal.insufficientData': {
    vi: 'Không đủ dữ liệu để phân tích. Kiểm tra lại quỹ đã chọn hoặc khoảng thời gian.',
    en: 'Not enough data to analyse. Check the funds you picked, or the time range.',
  },
  'rebal.results': { vi: 'Kết quả', en: 'Results' },
  'rebal.resultsPeriod': {
    vi: 'Phân tích {n} biến thể tái cân bằng, từ {from} đến {to} ({years} năm)',
    en: 'Analysed {n} rebalancing variants, from {from} to {to} ({years} years)',
  },
  'rebal.stat.best': { vi: 'Biến thể tốt nhất', en: 'Best variant' },
  'rebal.stat.worst': { vi: 'Biến thể tệ nhất', en: 'Worst variant' },
  'rebal.stat.spread': { vi: 'Chênh lệch tốt nhất − tệ nhất', en: 'Best minus worst' },
  'rebal.stat.spreadSub': { vi: 'CAGR mỗi năm', en: 'CAGR per year' },
  'rebal.perYear': { vi: '{v}%/năm', en: '{v}%/yr' },
  'rebal.points': { vi: '{v} điểm %', en: '{v} pts' },
  'rebal.scatter.title': { vi: 'Mỗi chấm là một biến thể', en: 'Every dot is one variant' },
  'rebal.scatter.help': {
    vi: 'Trục ngang: mức sụt giảm tối đa của biến thể đó. Trục dọc: CAGR (lợi nhuận quy năm). Mỗi chấm là một biến thể (một cách chọn lịch tái cân bằng cụ thể).',
    en: 'Horizontal axis: that variant’s maximum drawdown. Vertical axis: its CAGR (annualised return). Each dot is one variant — one specific rebalancing rule.',
  },
  'rebal.scatter.note': {
    vi: 'Càng lên cao = lợi nhuận càng cao. Càng qua phải = từng mất giá càng sâu (rủi ro càng lớn). Nếu các chấm nằm co cụm gần nhau như bên dưới, nghĩa là chọn biến thể nào cũng cho kết quả gần giống nhau, không cần lăn tăn quá nhiều về lịch tái cân bằng.',
    en: 'Higher up means a better return. Further right means it fell harder along the way, so more risk. If the dots cluster tightly, every variant lands in much the same place and the rebalancing schedule is not worth agonising over.',
  },
  'rebal.scatter.xAxis': { vi: 'Sụt giảm tối đa (sâu hơn →)', en: 'Max drawdown (deeper →)' },
  'rebal.scatter.cagr': { vi: 'CAGR: {v}%/năm', en: 'CAGR: {v}%/yr' },
  'rebal.scatter.drawdown': { vi: 'Sụt giảm tối đa: -{v}%', en: 'Max drawdown: -{v}%' },
  'rebal.scatter.count': { vi: 'Số lần tái cân bằng: {v}', en: 'Rebalances: {v}' },
  'rebal.table.title': { vi: 'Thống kê theo lịch', en: 'Stats by schedule' },
  'rebal.table.help': {
    vi: 'Mỗi tần suất được chạy với mọi ngày có thể tái cân bằng trong kỳ. Cột CAGR hiện median, kèm khoảng [thấp nhất – cao nhất] giữa các ngày đó: khoảng này chính là phần "may rủi" do chọn đúng ngày nào để cân lại. Sharpe trong bảng là Sharpe "thuần", không trừ lãi suất phi rủi ro (risk-free).',
    en: 'Each schedule is run against every possible rebalancing day in the period. The CAGR column shows the median, with the [lowest – highest] range across those days: that range is the luck of picking one day over another. Sharpe here is the raw ratio, with no risk-free rate subtracted.',
  },
  'rebal.col.schedule': { vi: 'Lịch', en: 'Schedule' },
  'rebal.col.variants': { vi: 'Số biến thể', en: 'Variants' },
  'rebal.col.cagrMedian': { vi: 'CAGR (median)', en: 'CAGR (median)' },
  'rebal.col.cagrRange': { vi: 'CAGR [min – max]', en: 'CAGR [min – max]' },
  'rebal.col.maxDrawdown': { vi: 'Sụt giảm tối đa', en: 'Max drawdown' },
  'rebal.col.volatility': { vi: 'Biến động', en: 'Volatility' },
  'rebal.col.sharpe': { vi: 'Sharpe', en: 'Sharpe' },
  'rebal.col.rebalCount': { vi: 'Số lần cân lại', en: 'Rebalances' },
  'rebal.sched.daily': { vi: 'Hàng ngày', en: 'Daily' },
  'rebal.sched.weekly': { vi: 'Hàng tuần', en: 'Weekly' },
  'rebal.sched.monthly': { vi: 'Hàng tháng', en: 'Monthly' },
  'rebal.sched.bimonthly': { vi: 'Mỗi 2 tháng', en: 'Every 2 months' },
  'rebal.sched.quarterly': { vi: 'Hàng quý', en: 'Quarterly' },
  'rebal.sched.every4months': { vi: 'Mỗi 4 tháng', en: 'Every 4 months' },
  'rebal.sched.semiannual': { vi: 'Nửa năm', en: 'Every 6 months' },
  'rebal.sched.yearly': { vi: 'Hàng năm', en: 'Yearly' },
  'rebal.group.bandAbs': { vi: 'Ngưỡng lệch tuyệt đối', en: 'Absolute drift threshold' },
  'rebal.group.bandRel': { vi: 'Ngưỡng lệch tương đối', en: 'Relative drift threshold' },
  'rebal.group.none': { vi: 'Không tái cân bằng', en: 'Never rebalance' },
  'rebal.variant.lastDay': { vi: '{sched} (ngày cuối kỳ)', en: '{sched} (last day of period)' },
  'rebal.variant.offset': { vi: '{sched} (cách cuối kỳ {n} ngày)', en: '{sched} ({n} days before period end)' },
  'rebal.variant.bandAbs': { vi: 'Lệch tuyệt đối {v}%', en: 'Absolute drift {v}%' },
  'rebal.variant.bandRel': { vi: 'Lệch tương đối {v}%', en: 'Relative drift {v}%' },
  'rebal.narrative.spread': {
    vi: 'Chênh lệch CAGR giữa lịch tốt nhất ({best}, {bestCagr}%/năm) và tệ nhất ({worst}, {worstCagr}%/năm) là <b>{spread} điểm %</b> mỗi năm. ',
    en: 'The CAGR gap between the best schedule ({best}, {bestCagr}%/yr) and the worst ({worst}, {worstCagr}%/yr) is <b>{spread} points</b> a year. ',
  },
  'rebal.narrative.small': {
    vi: 'Chọn tần suất hay ngày cân lại nào cũng gần như không đổi kết quả, quan trọng hơn là giữ đúng tỷ trọng mục tiêu qua thời gian.',
    en: 'Which schedule or which day you rebalance on barely changes the outcome. What matters is holding the target weights over time at all.',
  },
  'rebal.narrative.large': {
    vi: 'Đừng vội chọn biến thể tốt nhất của quá khứ, thứ hạng có thể đổi trong tương lai (xem khoảng [min – max] ở bảng trên).',
    en: 'Do not rush to adopt whichever variant won in the past — the ranking can reshuffle (look at the [min – max] range in the table above).',
  },
  'rebal.narrative.noneHigher': {
    vi: ' Riêng <b>không tái cân bằng</b> đạt {cagr}%/năm, cao hơn median {gap} điểm %: tỷ trọng trôi dần về quỹ tăng mạnh nhất nên rủi ro tập trung cũng tăng theo.',
    en: ' <b>Never rebalancing</b> on its own returned {cagr}%/yr, {gap} points above the median — the weights drift toward whichever fund ran hardest, so concentration risk rises with the return.',
  },
  'rebal.narrative.noneLower': {
    vi: ' Riêng <b>không tái cân bằng</b> đạt {cagr}%/năm, thấp hơn median {gap} điểm %: tỷ trọng trôi dần về quỹ tăng mạnh nhất nên rủi ro tập trung cũng tăng theo.',
    en: ' <b>Never rebalancing</b> on its own returned {cagr}%/yr, {gap} points below the median — the weights still drift toward whichever fund ran hardest, so concentration risk rises either way.',
  },

  // ── Wall of Worry tab ──
  'wow.title': { vi: 'Wall of Worry', en: 'Wall of Worry' },
  'wow.loading': { vi: 'Đang tải dữ liệu {fund}...', en: 'Loading {fund} data...' },
  'wow.loadFailed': { vi: 'Không tải được dữ liệu {fund}.', en: 'Could not load {fund} data.' },
  'wow.curatedNote': {
    vi: '<b>Danh sách tuyển chọn thủ công.</b> {n} sự kiện được chọn lọc và gắn nguồn bằng tay, không tự động cập nhật theo tin tức. Sự kiện mới nhất trong danh sách: <b>{date}</b>. Biến động sau mốc đó chưa được đánh dấu.',
    en: '<b>Hand-curated list.</b> {n} events, each picked and sourced by hand — this does not update itself from the news. The most recent event on the list is <b>{date}</b>; anything after that is not marked yet.',
  },
  'wow.headline': {
    vi: 'Trong suốt hơn {years} năm, không năm nào thiếu tin xấu: chiến tranh, đại dịch, khủng hoảng trái phiếu, chủ tịch tập đoàn bị bắt... Vậy mà từ ngày niêm yết tháng 10/{firstYear}, giá <b>{fund}</b> đã tăng khoảng <b>{times} lần</b>, leo qua {events} bức tường lo âu được đánh dấu dưới đây.',
    en: 'Across more than {years} years, not one of them was short of bad news: wars, a pandemic, a bond-market crisis, chairmen arrested. And yet since listing in October {firstYear}, <b>{fund}</b> is up roughly <b>{times}×</b>, climbing the {events} walls of worry marked below.',
  },
  'wow.chartTitle': { vi: 'Giá {fund} và những bức tường lo âu', en: '{fund} price and its walls of worry' },
  'wow.shownCount': { vi: '{shown}/{total} sự kiện', en: '{shown}/{total} events' },
  'wow.logHelp': {
    vi: 'Chuyển sang trục logarithmic. Cùng một mức tăng phần trăm sẽ có cùng độ dốc, giúp so sánh biến động ở giai đoạn đầu và giai đoạn sau công bằng hơn.',
    en: 'Switch to a logarithmic axis. Equal percentage moves then have equal slope, which makes the early years and the later years comparable.',
  },
  'wow.chartHelp': {
    vi: 'Giá chứng chỉ quỹ E1VFVN30 (ETF mô phỏng chỉ số VN30) từ ngày niêm yết. Mỗi chấm là một sự kiện khiến nhà đầu tư lo ngại thị trường sẽ giảm, xem chi tiết ở danh sách bên dưới. Rê chuột lên biểu đồ để xem giá từng ngày.',
    en: 'The price of E1VFVN30 (an ETF tracking the VN30 index) since it listed. Each dot is an event that had investors expecting the market to fall; the list below has the details. Hover the chart for daily prices.',
  },
  'wow.category.world': { vi: 'Thế giới', en: 'World' },
  'wow.category.vn': { vi: 'Vĩ mô Việt Nam', en: 'Vietnam macro' },
  'wow.category.corp': { vi: 'Doanh nghiệp Việt Nam', en: 'Vietnamese corporates' },
  'wow.events': { vi: 'Sự kiện', en: 'Events' },
  'wow.showAll': { vi: 'Hiện tất cả', en: 'Show all' },
  'wow.hideAll': { vi: 'Ẩn tất cả', en: 'Hide all' },
  'wow.toggleEvent': { vi: 'Hiện/ẩn sự kiện này trên biểu đồ', en: 'Show or hide this event on the chart' },
  'wow.source': { vi: 'Nguồn ↗', en: 'Source ↗' },
  'wow.hiddenNote': {
    vi: '* Còn {n} sự kiện trước ngày {fund} niêm yết (10/2014) chưa hiển thị vì nằm ngoài vùng dữ liệu giá: {list}.',
    en: '* {n} events predate {fund}’s listing (October 2014) and fall outside the price data, so they are not shown: {list}.',
  },
  'wow.aboutTitle': { vi: 'Về Wall of Worry', en: 'About Wall of Worry' },
  'wow.about1': {
    vi: '"Climbing the wall of worry", leo lên bức tường lo âu, là một câu nói kinh điển trong giới đầu tư: giá cổ phiếu thường vẫn đi lên trong khi mặt báo toàn tin xấu. Năm nào cũng có ít nhất một lý do nghe rất hợp lý để đứng ngoài thị trường: chiến tranh, đại dịch, lạm phát, khủng hoảng ngân hàng... Nhưng nhìn lại lịch sử, thị trường đã leo qua tất cả những bức tường đó.',
    en: '"Climbing the wall of worry" is an old market saying: share prices tend to keep rising while the front pages are full of bad news. Every single year offers at least one perfectly sensible reason to stay out — war, a pandemic, inflation, a banking crisis. Looking back, the market climbed every one of those walls.',
  },
  'wow.about2': {
    vi: 'Biểu đồ trên vẽ giá chứng chỉ quỹ {fund}, ETF lâu đời nhất mô phỏng chỉ số VN30, từ ngày niêm yết tháng 10/2014 đến nay. Mỗi chấm là một sự kiện mà tại thời điểm xảy ra, nhiều nhà đầu tư tin rằng thị trường sẽ sụp đổ. Có sự kiện đến từ bên kia bán cầu, có sự kiện xảy ra ngay tại Việt Nam, từ vĩ mô đến những vụ án doanh nghiệp lớn.',
    en: 'The chart above plots {fund}, the oldest ETF tracking the VN30 index, from its October 2014 listing to today. Each dot marks a moment when plenty of investors believed the market was about to collapse. Some came from the other side of the world, some from Vietnam itself — macro shocks and corporate scandals alike.',
  },
  'wow.about3': {
    vi: 'Nói đi cũng phải nói lại: leo qua được không có nghĩa là leo nhanh. Bear market 2018-2019 kéo dài gần 2 năm. Cú sập 2022 cần hơn 3 năm để giá quay về đỉnh cũ. Thị trường Việt Nam là thị trường cận biên, từ bull sang bear diễn ra chóng vánh, và không ai đảm bảo lần tới sẽ giống những lần trước. Đã gọi là đầu tư thì sẽ luôn có rủi ro.',
    en: 'The other side of it: climbing over does not mean climbing quickly. The 2018–2019 bear market lasted almost two years. The 2022 crash took more than three years to get back to the old high. Vietnam is a frontier market — the turn from bull to bear is abrupt, and nobody guarantees the next one looks like the last. Investing carries risk, always.',
  },
  'wow.about4': {
    vi: 'Điều biểu đồ này muốn nói không phải là "cứ mua là thắng", mà là: tin xấu luôn tồn tại. Nếu chờ đến lúc không còn tin xấu nào mới đầu tư, có thể bạn sẽ chờ mãi mãi. Đó là lý do vì sao đầu tư đều đặn qua từng tháng, không cần đoán đỉnh đoán đáy thị trường, lại là cách tiếp cận phù hợp với phần lớn chúng ta.',
    en: 'The point of this chart is not "buy and you win". It is that bad news is always there. If you wait for a month with no bad news in it, you may wait forever. That is why investing steadily month after month, without trying to call tops and bottoms, suits most of us better.',
  },
  'wow.about5': {
    vi: 'Dữ liệu chỉ mang tính minh họa và giáo dục, không phải lời khuyên đầu tư.',
    en: 'This is illustrative and educational only, not investment advice.',
  },

  // ── Bitcoin tab ──
  'btc.title': { vi: 'Bitcoin', en: 'Bitcoin' },
  'btc.description': {
    vi: 'Chọn một quỹ làm nền tảng, hệ thống sẽ so sánh lợi nhuận tích lũy của danh mục gốc với các danh mục có pha trộn Bitcoin. Danh mục được tái cân bằng tỷ trọng định kỳ.',
    en: 'Pick a fund as your base, and the tool compares the cumulative return of that portfolio on its own against the same portfolio blended with Bitcoin. Weights are rebalanced on a schedule.',
  },
  'btc.baseFund': { vi: 'Quỹ nền tảng', en: 'Base fund' },
  'btc.investAmount': { vi: 'Số tiền đầu tư', en: 'Amount invested' },
  'btc.rebalance': { vi: 'Tái cân bằng', en: 'Rebalancing' },
  'btc.weights': { vi: 'Tỷ trọng Bitcoin trong danh mục', en: 'Bitcoin weight in the portfolio' },
  'btc.dateRange': { vi: 'Khoảng thời gian', en: 'Time range' },
  'btc.modeAll': { vi: 'Tất cả', en: 'All' },
  'btc.modeYears': { vi: 'X năm qua', en: 'Last X years' },
  'btc.numYears': { vi: 'Số năm', en: 'Number of years' },
  'btc.fromTo': { vi: 'Từ ngày đến ngày', en: 'From / to date' },
  'btc.run': { vi: 'Chạy mô phỏng', en: 'Run simulation' },
  'btc.rerun': { vi: 'Chạy lại mô phỏng', en: 'Re-run simulation' },
  'btc.staleParams': {
    vi: 'Thông số đã thay đổi, bấm "Chạy lại mô phỏng" để cập nhật biểu đồ.',
    en: 'Parameters changed — press "Re-run simulation" to update the charts.',
  },
  'btc.prompt': {
    vi: 'Bấm "Chạy mô phỏng" để tính toán và hiển thị biểu đồ.',
    en: 'Press "Run simulation" to compute the charts.',
  },
  'btc.insufficientData': {
    vi: 'Khoảng thời gian được chọn không đủ dữ liệu. Hãy chọn khoảng thời gian dài hơn hoặc nhấn "Tất cả".',
    en: 'There is not enough data over the range you picked. Choose a longer range, or press "All".',
  },
  'btc.simPeriod': { vi: 'Mô phỏng từ {from} đến {to}', en: 'Simulated from {from} to {to}' },
  'btc.roleDivider': { vi: 'Vai trò của Bitcoin trong danh mục', en: 'What Bitcoin does to the portfolio' },
  'btc.weightDivider': {
    vi: 'Phân tích chi tiết theo tỷ trọng Bitcoin (0%–10%)',
    en: 'Detail by Bitcoin weight (0%–10%)',
  },

  // ── Performance table (dùng chung: So Sánh, DCA, Bitcoin) ──
  'perf.title': { vi: 'Thành quả hoạt động', en: 'Performance' },
  'perf.help': {
    vi: 'Tổng hợp các chỉ số hiệu suất của từng danh mục. Giá trị in đậm là tốt nhất trong nhóm. Sharpe = CAGR ÷ Biến động (Rf = 0%).',
    en: 'Headline metrics for each portfolio. Bold values are the best in the group. Sharpe = CAGR ÷ volatility, with a risk-free rate of 0%.',
  },
  'perf.col.name': { vi: 'Danh mục', en: 'Portfolio' },
  'perf.col.cumReturn': { vi: 'Lợi nhuận tích lũy', en: 'Cumulative return' },
  'perf.col.cumReturnHelp': { vi: 'Tổng lợi nhuận tích lũy từ đầu kỳ đến cuối kỳ', en: 'Total return from the start of the period to the end' },
  'perf.col.cagr': { vi: 'Hiệu suất trung bình năm', en: 'Average annual return' },
  'perf.col.cagrHelp': { vi: 'Lợi nhuận trung bình mỗi năm, quy về gốc kép (CAGR)', en: 'Average yearly return, compounded (CAGR)' },
  'perf.col.stdev': { vi: 'Rủi ro biến động giá (quy năm)', en: 'Volatility (annualised)' },
  'perf.col.stdevHelp': {
    vi: 'Độ biến động giá quy năm: đo mức dao động của danh mục. Thấp hơn = ổn định hơn.',
    en: 'Annualised price volatility: how much the portfolio swings. Lower is steadier.',
  },
  'perf.col.sharpe': { vi: 'Tỷ số Sharpe (quy năm)', en: 'Sharpe ratio (annualised)' },
  'perf.col.sharpeHelp': {
    vi: 'Tỷ số Sharpe quy năm = CAGR ÷ Biến động (Rf = 0%). Cao hơn = hiệu quả sinh lời trên rủi ro tốt hơn.',
    en: 'Annualised Sharpe = CAGR ÷ volatility, risk-free rate 0%. Higher means better return for the risk taken.',
  },
  'perf.col.maxDD': { vi: 'Mức độ sụt giảm vốn lớn nhất', en: 'Maximum drawdown' },
  'perf.col.maxDDHelp': {
    vi: 'Mức sụt giảm vốn lớn nhất từ đỉnh đến đáy trong toàn bộ kỳ. Gần 0 hơn = ít rủi ro hơn.',
    en: 'The largest peak-to-trough fall over the whole period. Closer to zero is less risky.',
  },
  'perf.sharpeNA': {
    vi: 'Danh mục gần như không biến động nên không tính được tỷ số Sharpe: mẫu số bằng 0. Không phải hiệu quả vô hạn, mà là thước đo này không dùng được ở đây.',
    en: 'This portfolio barely moves, so Sharpe cannot be computed — the denominator is zero. That is not infinite efficiency; the measure simply does not apply here.',
  },
  'perf.takeaway.sweep': {
    vi: '<b>{name}</b> thắng cả 2 mặt: lợi nhuận cao nhất (<b>{cagr}/năm</b>) và hiệu quả rủi ro tốt nhất (Sharpe <b>{sharpe}</b>). Ít sụt giảm nhất là <b>{ddName}</b> ({dd}).',
    en: '<b>{name}</b> wins on both counts: the highest return (<b>{cagr}/yr</b>) and the best risk-adjusted efficiency (Sharpe <b>{sharpe}</b>). The shallowest drawdown belongs to <b>{ddName}</b> ({dd}).',
  },
  'perf.takeaway.split': {
    vi: 'Lợi nhuận cao nhất: <b>{cagrName}</b> (<b>{cagr}/năm</b>). Nhưng hiệu quả sinh lời trên rủi ro tốt nhất thuộc về <b>{sharpeName}</b> (Sharpe <b>{sharpe}</b>), ít sụt giảm nhất <b>{ddName}</b> ({dd}).',
    en: 'Highest return: <b>{cagrName}</b> (<b>{cagr}/yr</b>). But the best return for the risk taken goes to <b>{sharpeName}</b> (Sharpe <b>{sharpe}</b>), and the shallowest drawdown to <b>{ddName}</b> ({dd}).',
  },

  // ── Cumulative return chart (dùng chung) ──
  'cumret.title': { vi: 'Lợi nhuận tích lũy', en: 'Cumulative return' },
  'cumret.events': { vi: 'Sự kiện', en: 'Events' },
  'cumret.eventsHelp': {
    vi: 'Bật/tắt các mốc sự kiện quan trọng: Covid, đỉnh BTC, FTX, BTC ETF, và các kỳ bầu cử Mỹ. Nhãn giữa kỳ ghi viện nào đổi tay: CH là Cộng hoà, DC là Dân chủ. Mốc chính trị để màu xám vì chưa biết tốt hay xấu.',
    en: 'Toggle the key markers: Covid, the Bitcoin peak, FTX, the Bitcoin ETF and US elections. Midterm labels note which chamber changed hands — R for Republican, D for Democrat. Political markers are grey because it is not yet clear whether they were good or bad.',
  },
  'cumret.logHelp': {
    vi: 'Chuyển sang trục logarithmic. Hữu ích khi so sánh tài sản có mức tăng trưởng rất khác nhau (ví dụ: quỹ cổ phiếu vs Bitcoin)',
    en: 'Switch to a logarithmic axis. Useful when comparing assets whose growth differs wildly — an equity fund against Bitcoin, say.',
  },
  'cumret.help': {
    vi: 'Biểu đồ thể hiện hiệu suất tích lũy từ thời điểm bắt đầu (0%). Nếu đường ở mức 50% nghĩa là quỹ đã tăng 50% so với ban đầu. Bấm vào legend để làm mờ/hiện đường.',
    en: 'Cumulative performance from the start of the period (0%). A line at 50% means the fund is up 50% from where it began. Click a legend entry to dim or restore that line.',
  },

  // ── Dividend notice (dùng chung) ──
  'dividend.notice': {
    vi: 'Quỹ <b>{funds}</b> có chi trả cổ tức. Giá NAV trên biểu đồ đã được điều chỉnh để phản ánh giả định tái đầu tư cổ tức sau thuế TNCN 5%, nên hiệu suất hiển thị đã bao gồm phần lợi nhuận từ cổ tức. Chi tiết các đợt chi trả xem ở tab <b>Tích Lũy Định Kỳ (DCA)</b>.',
    en: '<b>{funds}</b> pays dividends. The NAV prices on these charts are adjusted to assume dividends are reinvested after the 5% personal income tax, so the performance shown already includes the dividend return. The individual payouts are listed in the <b>DCA</b> tab.',
  },

  // ── Tactical Allocation tab ──
  'tac.title': { vi: 'Chiến Thuật Phân Bổ', en: 'Tactical Allocation' },
  'tac.intro': {
    vi: 'Trả lời câu hỏi: <b>nếu chuyển đổi giữa 2 danh mục dựa trên tín hiệu từ một chỉ báo kỹ thuật (SMA, EMA, hoặc RSI), kết quả thực tế sẽ ra sao?</b> Chọn 1 quỹ hoặc chỉ số làm tín hiệu, không nhất thiết phải là quỹ bạn đang nắm giữ. Rồi chọn 2 danh mục A và B tuỳ ý. Tín hiệu chỉ về xu hướng tăng thì chuyển sang danh mục A, chỉ về xu hướng giảm thì chuyển sang danh mục B.',
    en: 'The question this answers: <b>if you switched between two portfolios on a technical signal (SMA, EMA or RSI), what would actually have happened?</b> Pick one fund or index as the signal — it does not have to be something you hold. Then build portfolios A and B however you like. When the signal turns up you move to A; when it turns down you move to B.',
  },
  'tac.dateRange': { vi: 'Khoảng thời gian', en: 'Time range' },
  'tac.modeAll': { vi: 'Tất cả', en: 'All' },
  'tac.modeYears': { vi: 'X năm qua', en: 'Last X years' },
  'tac.numYears': { vi: 'Số năm', en: 'Number of years' },
  'tac.fromTo': { vi: 'Từ ngày đến ngày', en: 'From / to date' },
  'tac.startValue': { vi: 'Số tiền đầu tư', en: 'Amount invested' },
  'tac.switchCost': { vi: 'Phí chuyển đổi', en: 'Switching cost' },
  'tac.switchCostNote': {
    vi: '* Mỗi lần đổi danh mục, phí này trừ thẳng trên giá trị đang có. Nhiều quỹ mở ở Việt Nam phạt phí nếu bán trước một mốc thời gian nhất định. Đặt 0% nếu quỹ bạn chọn không phạt.',
    en: '* Every switch takes this straight off the current value. Many Vietnamese open-ended funds charge a penalty for selling before a holding period is up. Set it to 0% if yours does not.',
  },
  'tac.signalSection': { vi: 'Tín hiệu', en: 'Signal' },
  'tac.signalFund': { vi: 'Quỹ/chỉ số làm tín hiệu', en: 'Signal fund or index' },
  'tac.savingsWarning': {
    vi: 'Tiết kiệm ngân hàng làm tín hiệu thì backtest sẽ đứng im một trạng thái từ đầu tới cuối. Lãi suất cố định nghĩa là không có ngày nào giảm, nên giá luôn nằm trên SMA và EMA, còn RSI luôn bằng 100. Kết quả chạy ra vẫn có biểu đồ, nhưng nó chỉ nói cho bạn biết danh mục A chạy thế nào, không phải chuyện chuyển đổi hai danh mục. Muốn thấy tín hiệu đổi qua đổi lại thì chọn một quỹ hoặc chỉ số có lên có xuống.',
    en: 'Use a bank savings rate as the signal and the backtest never changes state. A fixed rate means no down days at all, so the price is always above its SMA and EMA and RSI is pinned at 100. You will still get charts, but they only tell you how portfolio A did — not anything about switching. To see the signal flip, pick a fund or index that actually goes up and down.',
  },
  'tac.signalFrequency': { vi: 'Chốt tín hiệu', en: 'Check the signal' },
  'tac.freq.daily': { vi: 'Mỗi phiên', en: 'Every session' },
  'tac.freq.weekly': { vi: 'Cuối tuần', en: 'End of week' },
  'tac.freq.monthly': { vi: 'Cuối tháng', en: 'End of month' },
  'tac.freqNote1': {
    vi: '* Bao lâu bạn nhìn giá một lần để quyết định chuyển hay giữ. Đây là tham số ăn vào kết quả mạnh nhất của cả tab, mạnh hơn hẳn vùng đệm hay phí.',
    en: '* How often you look at the price to decide whether to switch or sit still. This is the single setting on this tab that moves the result most — far more than the buffer band or the fee.',
  },
  'tac.freqNote2': {
    vi: 'Thử trên E1VFVN30 với SMA200 và tiết kiệm 7%, cùng một bộ dữ liệu, chỉ đổi mỗi mục này: chốt cuối tháng cho 13,9%/năm với 11 lần chuyển, chốt mỗi phiên cho 8,2%/năm với 27 lần chuyển. Mua giữ luôn thì 11,5%/năm. Chốt thưa mỗi năm chỉ nhìn giá 12 lần, dao động trong tháng không cách nào làm nó đổi ý. Chốt dày thì ăn trọn từng cú bật giả một.',
    en: 'On E1VFVN30 with SMA200 and 7% savings, same data, changing nothing but this setting: checking monthly returns 13.9%/yr over 11 switches, checking every session returns 8.2%/yr over 27 switches. Buying and holding returns 11.5%/yr. Checking rarely means looking at the price 12 times a year, and intramonth noise cannot change your mind. Checking constantly means eating every false break.',
  },
  'tac.indicator': { vi: 'Chỉ báo', en: 'Indicator' },
  'tac.period': { vi: 'Số ngày', en: 'Period' },
  'tac.days': { vi: 'ngày', en: 'days' },
  'tac.rsiOversold': { vi: 'Mốc quá bán', en: 'Oversold level' },
  'tac.rsiOverbought': { vi: 'Mốc quá mua', en: 'Overbought level' },
  'tac.rsiNote': {
    vi: '* RSI xuống dưới mốc quá bán thì kỳ vọng hồi phục, chuyển sang danh mục A. RSI vượt lên trên mốc quá mua thì kỳ vọng điều chỉnh, chuyển sang danh mục B. Nằm giữa 2 mốc thì giữ nguyên trạng thái cũ. Chính khoảng cách giữa 2 mốc đã đóng vai trò vùng đệm chống nhấp nháy, không cần thêm tham số riêng. Lệnh chuyển luôn thực hiện vào phiên giao dịch KẾ TIẾP sau khi có tín hiệu, vì trong phiên đang xét thì bạn chưa nhìn thấy giá đóng cửa của chính nó.',
    en: '* RSI below the oversold level implies a bounce is coming, so you move to portfolio A. RSI above the overbought level implies a pullback, so you move to portfolio B. Between the two you stay put. The gap between them already acts as an anti-whipsaw buffer, so no separate setting is needed. Switches always execute on the NEXT session after the signal, because you cannot see a session’s closing price during that session.',
  },
  'tac.band': { vi: 'Vùng đệm', en: 'Buffer band' },
  'tac.bandNote': {
    vi: '* Giá dao động sát đường {indicator} thì tín hiệu dễ nhấp nháy, chuyển qua chuyển lại liên tục mà chẳng được gì. Vùng đệm chặn chuyện đó: chỉ đổi khi giá vượt hẳn ra khỏi vùng ± X% quanh đường {indicator}. Đặt 0% nếu muốn đổi ngay lúc giá cắt qua. Lệnh chuyển luôn thực hiện vào phiên giao dịch KẾ TIẾP sau khi có tín hiệu, vì trong phiên đang xét thì bạn chưa nhìn thấy giá đóng cửa của chính nó.',
    en: '* When the price hovers right at the {indicator} line the signal flickers, switching back and forth for nothing. The buffer band stops that: you only switch once the price clears ±X% around the {indicator}. Set it to 0% to switch the moment the price crosses. Switches always execute on the NEXT session after the signal, because you cannot see a session’s closing price during that session.',
  },
  'tac.portfoliosTitle': { vi: '2 danh mục chuyển đổi qua lại', en: 'The two portfolios you switch between' },
  'tac.portfolioA': { vi: 'Danh mục A', en: 'Portfolio A' },
  'tac.portfolioB': { vi: 'Danh mục B', en: 'Portfolio B' },
  'tac.ruleRSI': {
    vi: '* RSI xuống dưới mốc quá bán → chuyển sang <b>{nameA}</b>. Vượt lên trên mốc quá mua → chuyển sang <b>{nameB}</b>.',
    en: '* RSI drops below the oversold level → move to <b>{nameA}</b>. Rises above the overbought level → move to <b>{nameB}</b>.',
  },
  'tac.ruleMA': {
    vi: '* Giá tín hiệu cắt lên trên {indicator} → chuyển sang <b>{nameA}</b>. Cắt xuống dưới → chuyển sang <b>{nameB}</b>.',
    en: '* The signal price crosses above the {indicator} → move to <b>{nameA}</b>. Crosses below → move to <b>{nameB}</b>.',
  },
  'tac.run': { vi: 'Chạy mô phỏng', en: 'Run backtest' },
  'tac.rerun': { vi: 'Chạy lại', en: 'Re-run' },
  'tac.staleParams': {
    vi: 'Thông số đã thay đổi, bấm "Chạy lại" để cập nhật kết quả.',
    en: 'Parameters changed — press "Re-run" to update the results.',
  },
  'tac.insufficientData': {
    vi: 'Không đủ dữ liệu để mô phỏng. Kiểm tra lại quỹ đã chọn, hoặc cần nhiều lịch sử hơn để tính đủ {indicator} (~{months} tháng dữ liệu trước ngày bắt đầu).',
    en: 'Not enough data to backtest. Check the funds you picked, or you may need more history to compute {indicator} (about {months} months of data before the start date).',
  },
  'tac.effectiveStart': {
    vi: 'Bắt đầu hiệu lực từ {date} (trễ hơn ngày bạn chọn) vì cần đủ {period} phiên dữ liệu trước đó để tính {indicator}.',
    en: 'Effective start is {date}, later than the date you picked, because {indicator} needs {period} sessions of data before it.',
  },
  'tac.currentSignal': {
    vi: 'Dữ liệu tới <b>{date}</b>. Tín hiệu {indicator} của <b>{fund}</b> đang chỉ về ',
    en: 'Data runs to <b>{date}</b>. The {indicator} signal on <b>{fund}</b> currently points to ',
  },
  'tac.currentSignalTail': {
    vi: 'Nếu giữ kỷ luật, danh mục nên nắm giữ tài sản này.',
    en: 'Followed strictly, the portfolio should be holding this.',
  },
  'tac.chartRSI': { vi: 'RSI({period}) của {fund}', en: 'RSI({period}) of {fund}' },
  'tac.chartMA': { vi: 'Giá {fund} và đường {indicator}', en: '{fund} price and its {indicator}' },
  'tac.overbought': { vi: 'Quá mua', en: 'Overbought' },
  'tac.oversold': { vi: 'Quá bán', en: 'Oversold' },
  'tac.price': { vi: 'Giá', en: 'Price' },
  'tac.holding': { vi: 'Giai đoạn giữ {name}', en: 'Holding {name}' },
  'tac.valueChart': { vi: 'Giá trị tài sản', en: 'Portfolio value' },
  'tac.cumChart': { vi: 'Lợi nhuận tích lũy: Chiến thuật vs mua-giữ-luôn', en: 'Cumulative return: strategy vs buy and hold' },
  'tac.strategy': { vi: 'Chiến thuật {indicator}', en: '{indicator} strategy' },
  'tac.buyHold': { vi: 'Mua giữ luôn {name}', en: 'Buy and hold {name}' },
  'tac.statsTitle': { vi: 'Bảng thống kê', en: 'Summary table' },
  'tac.col.scenario': { vi: 'Kịch bản', en: 'Scenario' },
  'tac.col.finalValue': { vi: 'Giá trị cuối kỳ', en: 'Ending value' },
  'tac.col.maxDD': { vi: 'Sụt giảm tối đa', en: 'Max drawdown' },
  'tac.col.switches': { vi: 'Số lần chuyển', en: 'Switches' },
  'tac.switchesWithCost': { vi: '{n} (phí {cost})', en: '{n} (cost {cost})' },
  'tac.summary': {
    vi: 'Sau <b>{switches}</b> lần chuyển đổi, tổng phí <b>{cost}</b>, chiến thuật {indicator} kết thúc với <b>{final}</b>, tức {cagr} mỗi năm và sụt giảm tối đa {dd}. Mua giữ luôn {nameA} thì {aCagr} mỗi năm, sụt {aDD}. Mua giữ luôn {nameB} thì {bCagr} mỗi năm, sụt {bDD}. Đọc cả 3 con số cùng lúc. Lãi cao hơn không có nghĩa là tốt hơn, nếu sụt giảm cũng sâu hơn, hoặc nếu phần lớn lợi thế chỉ đến từ vài lần chuyển đổi may mắn.',
    en: 'After <b>{switches}</b> switches costing <b>{cost}</b> in total, the {indicator} strategy ends at <b>{final}</b> — {cagr} a year with a maximum drawdown of {dd}. Buying and holding {nameA} returns {aCagr} a year with a {aDD} drawdown; holding {nameB} returns {bCagr} a year with {bDD}. Read all three together. A higher return is not better if the drawdown is deeper too, or if most of the edge came from a couple of lucky switches.',
  },
  'tac.segmentsTitle': { vi: 'Phân tích từng giai đoạn', en: 'Segment by segment' },
  'tac.segmentsIntro1': {
    vi: 'Chiến thuật {indicator} hơn hay kém mua giữ luôn {nameA} bao nhiêu? Phần chênh đó không rải đều qua năm tháng. Nó dồn vào vài đoạn.',
    en: 'How much better or worse is the {indicator} strategy than simply holding {nameA}? That gap is not spread evenly across the years. It piles up in a handful of stretches.',
  },
  'tac.segmentsIntro2': {
    vi: 'Bảng dưới cắt cả chặng thành từng đoạn. Mỗi đoạn là một lần chiến thuật giữ nguyên một danh mục. Cột cuối cho biết đoạn đó đóng góp bao nhiêu: số dương thì kéo chiến thuật vượt lên, số âm thì kéo tụt lại. Nhân dồn hết các đoạn lại thì ra đúng chênh lệch cuối kỳ, không thiếu chỗ nào.',
    en: 'The table below cuts the whole run into segments, one for each unbroken stretch where the strategy held a single portfolio. The last column shows what that segment contributed: positive pulled the strategy ahead, negative dragged it back. Compound every segment together and you get exactly the final gap, with nothing unaccounted for.',
  },
  'tac.col.segment': { vi: 'Đoạn', en: 'Segment' },
  'tac.col.fromTo': { vi: 'Từ - Đến', en: 'From – To' },
  'tac.col.held': { vi: 'Danh mục giữ', en: 'Held' },
  'tac.col.sessions': { vi: 'Số phiên', en: 'Sessions' },
  'tac.col.contribution': { vi: 'Đóng góp', en: 'Contribution' },
  'tac.topSegmentConcentrated': {
    vi: 'Nhìn kỹ đoạn {from} → {to}, lúc đó chiến thuật đang giữ {name}. Riêng nó chiếm <b>{share}%</b> tổng phần đóng góp dương. Nghĩa là bạn tưởng mình đang xem kết quả của {n} lần quyết định. Thật ra gần như chỉ một. Một lần chuyển đúng lúc. Một lần thì chưa đủ để chắc chắn điều gì cả.',
    en: 'Look closely at {from} → {to}, when the strategy was holding {name}. That stretch alone accounts for <b>{share}%</b> of all the positive contribution. You think you are looking at the result of {n} decisions. Really it is almost one — one well-timed switch. One is not enough to conclude anything.',
  },
  'tac.topSegmentSpread': {
    vi: '* Đoạn đóng góp nhiều nhất là {from} → {to}, lúc đó giữ {name}, chiếm {share}% tổng phần đóng góp dương. Phần còn lại trải ra nhiều đoạn khác, không dồn hết vào một lần.',
    en: '* The biggest contributor was {from} → {to}, holding {name}, at {share}% of all positive contribution. The rest is spread across other segments rather than concentrated in one.',
  },
  'tac.logTitle': { vi: 'Nhật ký chuyển đổi', en: 'Switch log' },
  'tac.col.date': { vi: 'Ngày', en: 'Date' },
  'tac.col.from': { vi: 'Từ', en: 'From' },
  'tac.col.to': { vi: 'Sang', en: 'To' },
  'tac.col.fee': { vi: 'Phí', en: 'Cost' },
  'tac.disclaimerTitle': { vi: '⚠️ Đây KHÔNG phải khuyến nghị đầu tư.', en: '⚠️ This is NOT investment advice.' },
  'tac.disclaimer1': {
    vi: 'Mọi chỉ báo kỹ thuật đều đi sau thị trường. Xu hướng phải chạy một đoạn thì chỉ báo mới đổi theo. Lúc bạn nhìn thấy tín hiệu, giá đã đi mất một quãng rồi.',
    en: 'Every technical indicator lags the market. The trend has to run a while before the indicator follows. By the time you see the signal, the price has already moved.',
  },
  'tac.disclaimer2': {
    vi: 'Còn một cái bẫy nữa tên là whipsaw. Giá dập dềnh quanh ngưỡng, tín hiệu đổi qua đổi lại liên tục, lần nào cũng mất phí mà chẳng được gì.',
    en: 'There is a second trap called whipsaw: the price bobs around the threshold, the signal flips back and forth, and each flip costs you a fee for nothing.',
  },
  'tac.disclaimer3': {
    vi: 'Quá khứ không bảo đảm tương lai. Một chiến thuật thắng mua và giữ suốt 10 năm qua không có nghĩa nó thắng tiếp 10 năm tới.',
    en: 'The past guarantees nothing. A strategy that beat buy-and-hold for the last ten years may not beat it over the next ten.',
  },

  // ── Compare tab: charts & blocks ──
  'share.copy': { vi: '🔗 Copy link chia sẻ', en: '🔗 Copy share link' },
  'share.copied': { vi: '✓ Đã copy link!', en: '✓ Link copied' },

  'price.titleSingle': { vi: 'Giá tài sản', en: 'Asset price' },
  'price.titleMulti': { vi: 'Giá từng tài sản', en: 'Price of each asset' },
  'price.spreadAxis': { vi: 'Giãn trục', en: 'Zoom axis' },
  'price.spread': { vi: 'Chênh lệch', en: 'Spread' },
  'price.help': {
    vi: 'Giá thực tế của một đơn vị tài sản (chứng chỉ quỹ, lượng vàng, 1 BTC). Mỗi tài sản một trục riêng vì mệnh giá ban đầu và đơn vị của chúng khác nhau, đặt chung một trục sẽ gây hiểu nhầm. Muốn so sánh hiệu suất thì xem chart Lợi nhuận tích lũy bên dưới.',
    en: 'The actual price of one unit — a fund certificate, a tael of gold, one BTC. Each asset gets its own axis because their starting prices and units differ, and sharing one axis would mislead. To compare performance, use the cumulative return chart below.',
  },
  'price.buyPrice': { vi: 'Giá mua vào', en: 'Buy price' },
  'price.sellPrice': { vi: 'Giá bán ra', en: 'Sell price' },
  'price.spreadSeries': { vi: 'Chênh lệch (bán - mua)', en: 'Spread (sell − buy)' },
  'price.unit.gold': { vi: 'lượng', en: 'tael' },
  'price.indexPoints': { vi: '{v} điểm', en: '{v} pts' },

  'drawdown.title': { vi: 'Tỷ lệ sụt giảm so với đỉnh', en: 'Drawdown from peak' },
  'drawdown.help': {
    vi: 'Drawdown cho thấy mức giảm giá trị so với đỉnh cao nhất trước đó. Ví dụ: -20% nghĩa là quỹ đã giảm 20% từ đỉnh. Bấm vào legend để làm mờ/hiện đường.',
    en: 'Drawdown shows how far the value has fallen from its previous high. −20% means the fund is 20% below its peak. Click a legend entry to dim or restore a line.',
  },

  'yearly.title': { vi: 'Hiệu suất theo từng năm', en: 'Performance by calendar year' },
  'yearly.help': {
    vi: 'So sánh lợi nhuận các quỹ trong mỗi năm. Năm có dấu * là năm chưa đầy đủ dữ liệu. Bấm vào legend để làm mờ/hiện cột.',
    en: 'Each fund’s return within each calendar year. A year marked * is not a full year of data. Click a legend entry to dim or restore a bar.',
  },

  'heatmap.title': { vi: 'Lợi nhuận theo tháng (heatmap)', en: 'Monthly returns (heatmap)' },
  'heatmap.help': {
    vi: 'Mỗi ô là lợi nhuận của một tháng dương lịch. Xanh khi lời, đỏ khi lỗ, càng đậm càng mạnh. Bấm tên quỹ để đổi quỹ đang xem.',
    en: 'Each cell is one calendar month’s return. Green for a gain, red for a loss, darker for larger. Click a fund name to switch which fund you are looking at.',
  },
  'heatmap.noData': {
    vi: 'Không có dữ liệu tháng này: hoặc quỹ chưa ra đời, hoặc nằm ngoài khoảng thời gian đã chọn',
    en: 'No data for this month — either the fund did not exist yet, or it falls outside the range you picked',
  },
  'heatmap.partial': { vi: ' (tháng chưa trọn)', en: ' (partial month)' },
  'heatmap.loss': { vi: 'Lỗ', en: 'Loss' },
  'heatmap.gain': { vi: 'Lời', en: 'Gain' },
  'heatmap.scale': { vi: '(0–12%+ mỗi tháng)', en: '(0–12%+ per month)' },

  'corr.title': { vi: 'Tương quan lợi nhuận', en: 'Return correlation' },
  'corr.help': {
    vi: 'Hệ số tương quan Pearson trên chuỗi lợi nhuận đã căn cùng mốc ngày. 1 = đi hoàn toàn cùng nhịp, 0 = không liên quan, -1 = ngược nhịp hoàn toàn.',
    en: 'Pearson correlation over return series aligned to the same dates. 1 means they move exactly together, 0 means unrelated, −1 means exactly opposite.',
  },
  'corr.avgCol': { vi: 'TB', en: 'Avg' },
  'corr.summary': { vi: 'Tương quan trung bình giữa các cặp: <b>{avg}</b>. ', en: 'Average pairwise correlation: <b>{avg}</b>. ' },
  'corr.colNote': {
    vi: ' Cột <b>TB</b> là mức tương quan trung bình của từng tài sản với phần còn lại — số càng cao thì tài sản đó càng ít đóng góp vào đa dạng hoá.',
    en: ' The <b>Avg</b> column is each asset’s average correlation with all the others — the higher it is, the less that asset contributes to diversification.',
  },
  'corr.verdict.noData': { vi: 'Chưa đủ dữ liệu để đánh giá mức đa dạng hoá.', en: 'Not enough data to judge diversification yet.' },
  'corr.verdict.veryHigh': {
    vi: 'Các tài sản này gần như đi chung một nhịp. Ghép chúng lại hầu như không giảm được rủi ro — lúc thị trường sập thì sập cùng nhau.',
    en: 'These assets move almost in lockstep. Combining them barely reduces risk — when the market falls, they fall together.',
  },
  'corr.verdict.high': {
    vi: 'Tương quan cao. Có giảm rủi ro đôi chút, nhưng đừng kỳ vọng danh mục đứng vững khi thị trường chung đi xuống.',
    en: 'Correlation is high. There is a little risk reduction, but do not expect the portfolio to hold up when the broad market falls.',
  },
  'corr.verdict.moderate': {
    vi: 'Tương quan vừa phải. Ghép lại có tác dụng đa dạng hoá thật, dù vẫn cùng chịu ảnh hưởng của thị trường chung.',
    en: 'Correlation is moderate. Combining them genuinely diversifies, though they still share exposure to the broad market.',
  },
  'corr.verdict.low': {
    vi: 'Tương quan thấp. Đây là nhóm tài sản bổ trợ nhau tốt — khi cái này giảm, cái kia không nhất thiết giảm theo.',
    en: 'Correlation is low. These assets complement each other well — when one falls, the other need not follow.',
  },
  'corr.caveat': {
    vi: '<b>Lưu ý cách đo:</b> quỹ mở định giá NAV cuối ngày, còn ETF khớp lệnh liên tục trên sàn. Hai mốc định giá không trùng nhau nên tương quan đo được giữa quỹ mở và ETF thường <i>thấp hơn</i> mức đi cùng nhịp thật. Hãy đọc bảng này theo hướng so sánh tương đối giữa các cặp, đừng coi con số tuyệt đối là chính xác.',
    en: '<b>A caveat on measurement:</b> open-ended funds price NAV once at the close, while ETFs trade continuously. Because the two are priced at different moments, the measured correlation between a fund and an ETF is usually <i>lower</i> than how much they truly move together. Read this table as a relative comparison between pairs rather than treating the absolute numbers as exact.',
  },

  // ── Data quality block (dùng chung) ──
  'dq.warning': { vi: 'Chất lượng dữ liệu: có cảnh báo', en: 'Data quality: warnings' },
  'dq.ok': { vi: 'Dữ liệu đầy đủ', en: 'Data is complete' },
  'dq.updatedTo': { vi: 'Cập nhật tới {date}', en: 'Updated through {date}' },
  'dq.daysAgo': { vi: ' ({n} ngày trước)', en: ' ({n} days ago)' },
  'dq.gapsFound': { vi: '. Phát hiện khoảng thiếu giá.', en: '. Gaps in the price history were found.' },
  'dq.coverageIssue': { vi: ' Có quỹ không phủ hết khoảng bạn chọn.', en: ' Some funds do not cover the whole range you picked.' },
  'dq.noGaps': { vi: '. Không phát hiện lỗ hổng trong kỳ đang so sánh.', en: '. No gaps found over the period being compared.' },
  'dq.collapse': { vi: 'Thu gọn', en: 'Collapse' },
  'dq.expand': { vi: 'Xem chi tiết', en: 'See details' },
  'dq.intro': {
    vi: 'Mỗi quỹ có lịch sử dữ liệu khác nhau. Một số quỹ mới lập chỉ có vài năm, một số quỹ cũ có thể bị thiếu giá trong các đợt đặc biệt như COVID. Dashboard này công khai những giới hạn đó để bạn cẩn thận hơn khi đọc các con số bên dưới.',
    en: 'Every fund has a different data history. Newer funds only have a few years; older ones can be missing prices around unusual periods such as COVID. This dashboard states those limits openly so you read the numbers below with the right amount of caution.',
  },
  'dq.alignedRange': {
    vi: 'Khoảng so sánh thực tế đã được căn chỉnh theo giao điểm của tất cả các quỹ: <b>{from}</b> tới <b>{to}</b>. Mọi con số trong các block bên dưới đều tính trên khoảng này.',
    en: 'The actual comparison window is aligned to the overlap of every fund: <b>{from}</b> to <b>{to}</b>. Every number in the blocks below is computed over that window.',
  },
  'dq.issuesTitle': { vi: 'Chi tiết cảnh báo', en: 'Warning details' },
  'dq.gapTooltip': { vi: 'Thiếu ~{weeks} tuần: {from} → {to}', en: 'About {weeks} weeks missing: {from} → {to}' },
  'dq.pickedFrom': { vi: 'Bạn chọn từ {date}', en: 'You picked from {date}' },
  'dq.pickedTo': { vi: 'Bạn chọn tới {date}', en: 'You picked up to {date}' },
  'dq.startsLate': {
    vi: 'Quỹ bắt đầu từ <b>{start}</b>, muộn hơn ngày bạn chọn ({requested}). Khoảng trước đó không tính vào phép so sánh.',
    en: 'This fund starts on <b>{start}</b>, later than the date you picked ({requested}). Everything before that is excluded from the comparison.',
  },
  'dq.endsEarly': {
    vi: 'Dữ liệu chỉ tới <b>{end}</b>, sớm hơn ngày bạn chọn ({requested}). Khoảng sau đó không có giá.',
    en: 'Data only runs to <b>{end}</b>, earlier than the date you picked ({requested}). There are no prices after that.',
  },
  'dq.gap': {
    vi: 'Thiếu khoảng <b>{weeks} tuần</b> từ {from} tới {to}. Có thể do tạm ngưng giao dịch hoặc dữ liệu API thiếu.',
    en: 'About <b>{weeks} weeks</b> missing between {from} and {to}. Trading may have been suspended, or the API data is incomplete.',
  },

  // ── Rolling returns ──
  'roll.months6': { vi: '6 tháng', en: '6 months' },
  'roll.year1': { vi: '1 năm', en: '1 year' },
  'roll.years': { vi: '{n} năm', en: '{n} years' },
  'roll.monthsN': { vi: '{n} tháng', en: '{n} months' },
  'roll.noDataFor': { vi: 'Chưa đủ dữ liệu để tính chu kỳ {period}', en: 'Not enough data for a {period} window' },
  'roll.noDataMsg': {
    vi: 'Chưa đủ dữ liệu cho chu kỳ {period}. Hãy chọn chu kỳ ngắn hơn hoặc khoảng thời gian rộng hơn.',
    en: 'Not enough data for a {period} window. Pick a shorter window, or widen the date range.',
  },
  'roll.explain1': {
    vi: 'Lợi nhuận cuốn chiếu ra đời để làm nổi bật một chuyện: tần suất và biên độ của những chu kỳ sinh lời tốt nhất lẫn tệ nhất của một khoản đầu tư. Cách đo này mang lại cái nhìn toàn diện về lịch sử hiệu suất của quỹ, không bị các kết quả ngắn hạn gần nhất kéo lệch, như thời điểm chốt sổ cuối tháng hay cuối quý.',
    en: 'Rolling returns exist to expose one thing: how often, and how far, an investment’s best and worst stretches ran. It gives a complete picture of a fund’s history rather than one skewed by whatever happened most recently, or by where a month or quarter happened to end.',
  },
  'roll.explain2': {
    vi: 'Ví dụ, lợi nhuận cuốn chiếu 5 năm của năm 2015 là kết quả đo từ ngày 1/1/2011 đến ngày 31/12/2015. Tương tự, lợi nhuận cuốn chiếu 5 năm của năm 2016 là mức sinh lời bình quân hàng năm từ 2012 đến hết năm 2016.',
    en: 'For example, the 5-year rolling return for 2015 measures 1 January 2011 through 31 December 2015. The 5-year rolling return for 2016 is the average yearly return from 2012 through the end of 2016.',
  },
  'roll.explain3': {
    vi: 'Nhờ vậy, bạn hiểu rõ hơn hiệu quả thật của quỹ tại từng thời điểm. Một khoản đầu tư báo tỷ suất sinh lời 9%/năm suốt 10 năm chỉ có nghĩa: nếu bạn mua vào ngày 1/1 năm đầu và bán vào ngày 31/12 năm thứ 10, bạn nhận được mức lãi tương đương 9% mỗi năm. Nhưng bức tranh bên trong 10 năm đó có thể rất dữ dội.',
    en: 'That tells you far more about how a fund actually performed at each point in time. An investment reporting 9% a year over ten years only means this: had you bought on 1 January of year one and sold on 31 December of year ten, you would have earned the equivalent of 9% a year. What happened inside those ten years can be violent.',
  },
  'roll.explain4': {
    vi: 'Khoản đầu tư ấy có thể tăng vọt 35% vào năm thứ 4, rồi sụt 17% vào năm thứ 8. Trung bình vẫn là 9% mỗi năm, nhưng con số bình quân ấy che đậy đi rủi ro và sự trồi sụt thực tế của tài sản.',
    en: 'That same investment might have jumped 35% in year four and fallen 17% in year eight. The average is still 9% a year, but the average hides the real risk and the real swings.',
  },
  'roll.explain5': {
    vi: 'Thay vì đo máy móc từ ngày 1/1 đến 31/12, lợi nhuận cuốn chiếu trượt khung thời gian liên tục: từ 1/2 năm nay đến 31/1 năm sau, rồi từ 1/3 năm nay đến 28/2 năm sau, và cứ thế. Bằng cách trượt liên tục, lợi nhuận cuốn chiếu 10 năm phơi bày trọn vẹn những khoảng thời gian tỏa sáng rực rỡ nhất lẫn tồi tệ nhất của khoản đầu tư.',
    en: 'Instead of mechanically measuring 1 January to 31 December, rolling returns slide the window continuously: 1 February to 31 January, then 1 March to 28 February, and so on. Sliding like that, a 10-year rolling return lays bare both the investment’s brightest stretches and its worst.',
  },
  'roll.col.fund': { vi: 'Quỹ', en: 'Fund' },
  'roll.group.stats': { vi: 'Thống Kê Tỷ Suất Sinh Lợi (%)', en: 'Return statistics (%)' },
  'roll.group.distribution': { vi: 'Phân bổ lợi nhuận (% số lần xuất hiện)', en: 'Return distribution (% of windows)' },
  'roll.col.min': { vi: 'Thấp nhất', en: 'Lowest' },
  'roll.col.median': { vi: 'Trung vị', en: 'Median' },
  'roll.col.max': { vi: 'Cao nhất', en: 'Highest' },
  'roll.col.negative': { vi: 'Âm', en: 'Negative' },
  'roll.windows': { vi: '{n} cửa sổ · {ind} cửa sổ độc lập', en: '{n} windows · {ind} independent' },
  'roll.notEnough': { vi: 'Chưa đủ dữ liệu', en: 'Not enough data' },

  // Rolling return block (tab DCA)
  'rollBlock.title': { vi: 'Nếu bạn bắt đầu ở thời điểm khác thì sao?', en: 'What if you had started at a different time?' },
  'rollBlock.intro': {
    vi: 'Giả sử có rất nhiều người cùng đầu tư vào quỹ này nhưng mỗi người bắt đầu ở một tháng khác nhau và giữ đúng <b>{years} năm</b>. Kết quả của mỗi người sẽ khác nhau rất nhiều, có người trúng đỉnh, có người trúng đáy. Biểu đồ dưới đây cho thấy phân phối CAGR của tất cả các chu kỳ {years} năm trong lịch sử, và vị trí của bạn nằm ở đâu trong đó.',
    en: 'Imagine a crowd of people all investing in this fund, each starting in a different month and each holding for exactly <b>{years} years</b>. Their results would differ enormously — some bought the top, some the bottom. The chart below shows the CAGR distribution across every {years}-year window in the history, and where you land within it.',
  },
  'rollBlock.windowLabel': { vi: 'Chu kỳ:', en: 'Window:' },
  'rollBlock.rangeSelected': { vi: 'Khoảng thời gian đang chọn chỉ từ {from} tới {to}', en: 'The selected range only covers {from} to {to}' },
  'rollBlock.rangeShort': { vi: 'Khoảng thời gian đang chọn quá ngắn', en: 'The selected range is too short' },
  'rollBlock.tooShort': {
    vi: '{span}, chưa đủ để tính chu kỳ {years} năm (cần ít nhất {need} năm). Không phải quỹ thiếu dữ liệu, mà là khoảng xem ngắn. Kéo rộng khoảng thời gian ở phần Thông số rồi thử lại.',
    en: '{span}, which is not enough for a {years}-year window (you need at least {need} years). The fund is not missing data — the view is just narrow. Widen the date range in Parameters and try again.',
  },
  'rollBlock.binRange': { vi: '{min}% đến {max}%', en: '{min}% to {max}%' },
  'rollBlock.windowCount': { vi: '{n} chu kỳ {years} năm', en: '{n} windows of {years} years' },
  'rollBlock.tooltipCount': { vi: '{n} chu kỳ', en: '{n} windows' },
  'rollBlock.tooltipLabel': { vi: 'Số lượng', en: 'Count' },
  'rollBlock.stat.min': { vi: 'Thấp nhất', en: 'Lowest' },
  'rollBlock.stat.max': { vi: 'Cao nhất', en: 'Highest' },
  'rollBlock.yourCagr': { vi: 'CAGR thực tế của bạn trong kỳ này là <b>{cagr}</b>. ', en: 'Your actual CAGR over this period is <b>{cagr}</b>. ' },
  'rollBlock.negWarning': {
    vi: ' Nhưng phải nói thẳng: trong {n} chu kỳ {years} năm lịch sử, có <b>{neg}</b> chu kỳ cho CAGR âm. Thị trường không hứa hẹn có lãi kể cả khi bạn giữ dài hạn. Đó là rủi ro thật, không được quên.',
    en: ' But to put it plainly: of the {n} historical {years}-year windows, <b>{neg}</b> ended with a negative CAGR. The market promises no profit even over long holds. That is a real risk, and worth remembering.',
  },
  'rollBlock.pct.top10': {
    vi: 'Bạn đang ở top 10%, tốt hơn {pct}% các chu kỳ lịch sử. Bạn đã rất may mắn về thời điểm vào, đừng nhầm may mắn với kỹ năng.',
    en: 'You are in the top 10%, ahead of {pct}% of historical windows. Your entry timing was very lucky — do not mistake luck for skill.',
  },
  'rollBlock.pct.good': {
    vi: 'Bạn tốt hơn {pct}% các chu kỳ lịch sử, thời điểm vào của bạn khá thuận lợi.',
    en: 'You are ahead of {pct}% of historical windows; your entry timing was favourable.',
  },
  'rollBlock.pct.aboveMedian': {
    vi: 'Bạn đang nằm trên median, tốt hơn {pct}% các chu kỳ lịch sử. Một kết quả tử tế, không quá lung lay.',
    en: 'You are above the median, ahead of {pct}% of historical windows. A decent result, and not a precarious one.',
  },
  'rollBlock.pct.belowMedian': {
    vi: 'Bạn đang nằm dưới median, chỉ hơn {pct}% các chu kỳ lịch sử. Đừng vội phản bội chính mình bán ra. Giữ tiếp, trung bình sẽ kéo bạn về gần median.',
    en: 'You are below the median, ahead of only {pct}% of historical windows. Do not talk yourself into selling. Hold on, and the averages tend to pull you back toward the middle.',
  },
  'rollBlock.pct.bottom': {
    vi: 'Bạn đang ở đáy của phân phối (percentile {pct}). Thời điểm vào của bạn không thuận, nhưng đó không phải lỗi, không ai biết trước được. Điều quan trọng là tiếp tục nạp tiền đều đặn qua từng tháng, lịch sử cho thấy trung bình có xu hướng kéo về median khi giữ đủ lâu.',
    en: 'You are at the bottom of the distribution (percentile {pct}). Your entry timing was unlucky, but that is not a mistake — nobody knows in advance. What matters is continuing to contribute month after month; historically the averages pull back toward the median given enough time.',
  },

  // ── Compare story block ──
  'story.divider': { vi: 'Kể chuyện so sánh', en: 'Reading the comparison' },
  'story.title': { vi: 'Bây giờ, bảng số nói gì?', en: 'So what do the numbers say?' },
  'story.intro': {
    vi: 'Biểu đồ ở trên cho bạn cái nhìn tổng thể. Phần dưới đây trả lời 5 câu hỏi mà nhà đầu tư thực sự cần biết trước khi gửi tiền vào một quỹ. Khoảng thời gian đang so sánh: {from} tới {to}, tức là {years} năm.',
    en: 'The charts above give you the overview. What follows answers the five questions an investor actually needs settled before putting money into a fund. The period being compared: {from} to {to}, or {years} years.',
  },
  'story.q1': { vi: '1. Ai đang dẫn đầu?', en: '1. Who is ahead?' },
  'story.q1.intro': {
    vi: 'Nếu bạn đầu tư vào mỗi quỹ 100 triệu đồng ngay đầu kỳ và không đụng tới, hôm nay bạn sẽ có bao nhiêu?',
    en: 'If you had put 100 million dong into each fund at the start of the period and never touched it, what would you have today?',
  },
  'story.q1.tooltipLabel': { vi: 'Lợi nhuận cộng dồn', en: 'Cumulative return' },
  'story.q1.becomes': { vi: ' (thành {v})', en: ' (becomes {v})' },
  'story.q1.leader': {
    vi: 'Dẫn đầu là <b>{id}</b>. 100 triệu ban đầu giờ thành <b>{final}</b>, tức là lãi <b>{pct}</b>.',
    en: '<b>{id}</b> leads. The initial 100 million is now <b>{final}</b>, a gain of <b>{pct}</b>.',
  },
  'story.q1.laggard': {
    vi: ' Xếp cuối là <b>{id}</b> với <b>{final}</b>. Chênh lệch <b>{gap}</b> trên mỗi 100 triệu, tương đương {pts} điểm phần trăm.',
    en: ' <b>{id}</b> trails at <b>{final}</b> — a gap of <b>{gap}</b> per 100 million, or {pts} percentage points.',
  },
  'story.q1.caveat': {
    vi: ' Con số ấn tượng, nhưng "dẫn đầu" trong quá khứ chưa kể hết câu chuyện. Đọc tiếp 4 phần dưới để thấy bức tranh đầy đủ hơn.',
    en: ' An impressive number, but leading in the past does not tell the whole story. The four sections below fill it in.',
  },
  'story.q2': { vi: '2. Được bao nhiêu lãi cho mỗi đơn vị rủi ro?', en: '2. How much return per unit of risk?' },
  'story.q2.intro': {
    vi: 'Cùng một mức lãi hàng năm, quỹ nào có đường đi ít gập ghềnh hơn thì "chất lượng" hơn. Tỉ số CAGR chia cho volatility (biến động quy năm) cho bạn một con số gọn để so sánh: số càng lớn nghĩa là mỗi 1% rủi ro bạn gánh đang được đền đáp bằng càng nhiều lợi nhuận.',
    en: 'At the same annual return, the fund with the smoother path is the better one. CAGR divided by volatility gives you one compact number to compare: the higher it is, the more return you are being paid for each 1% of risk you carry.',
  },
  'story.col.fund': { vi: 'Quỹ', en: 'Fund' },
  'story.col.volatility': { vi: 'Biến động (σ)', en: 'Volatility (σ)' },
  'story.col.ratio': { vi: 'Tỉ số', en: 'Ratio' },
  'story.q2.best': {
    vi: '<b>{id}</b> đạt tỉ số <b>{ratio}</b>, tức là mỗi 1% biến động "đổi lấy" được {ratio}% lợi nhuận mỗi năm.',
    en: '<b>{id}</b> scores <b>{ratio}</b>, meaning each 1% of volatility buys {ratio}% of return a year.',
  },
  'story.q2.worst': { vi: ' Xếp cuối là <b>{id}</b> với <b>{ratio}</b>.', en: ' <b>{id}</b> comes last at <b>{ratio}</b>.' },
  'story.q2.caveat': {
    vi: ' Tỉ số này không phải tiêu chí duy nhất. Nhưng nếu hai quỹ lãi xấp xỉ nhau, quỹ có tỉ số cao hơn sẽ giúp bạn ngủ ngon hơn trên đường đi.',
    en: ' This ratio is not the only criterion. But between two funds returning much the same, the one with the higher ratio lets you sleep better along the way.',
  },
  'story.q3': { vi: '3. Nếu bạn giữ 12 tháng, xác suất có lãi là bao nhiêu?', en: '3. Hold for 12 months — what are the odds of a gain?' },
  'story.q3.intro': {
    vi: 'Giả sử bạn xét tất cả các khoảng 12 tháng liên tiếp trong lịch sử quỹ: trong bao nhiêu phần trăm số đó, bạn kết thúc với lợi nhuận dương? Đây là thước đo "mức độ tin cậy" dễ cảm nhận nhất cho nhà đầu tư giữ dài hạn.',
    en: 'Take every consecutive 12-month stretch in the fund’s history: in what share of them did you finish up? For a long-term holder this is the most intuitive measure of reliability there is.',
  },
  'story.q3.tooltipLabel': { vi: 'Rolling 12m dương', en: 'Positive 12m windows' },
  'story.q3.best': {
    vi: '<b>{id}</b> đạt {pct}% khoảng 12 tháng có lãi. Nói cách khác, cứ 10 lần bạn mua và giữ tròn năm, khoảng {n} lần kết thúc với tiền nhiều hơn lúc vào.',
    en: '<b>{id}</b> was up in {pct}% of its 12-month windows. Put another way: out of every 10 times you bought and held a full year, about {n} ended with more money than you started.',
  },
  'story.q3.worst': { vi: ' Thấp nhất là <b>{id}</b> với {pct}%.', en: ' <b>{id}</b> is lowest at {pct}%.' },
  'story.q3.caveat': {
    vi: ' Con số cao không đảm bảo tương lai sẽ giống, nhưng nó cho bạn biết trong quá khứ quỹ có thường xuyên đi lên trong vòng 1 năm hay không. Nếu bạn là nhà đầu tư mới, con số này quan trọng hơn CAGR.',
    en: ' A high figure guarantees nothing about the future, but it tells you how often this fund was up over a year in the past. If you are a new investor, that matters more than CAGR.',
  },
  'story.q4': { vi: '4. Khi bão đến, mất bao lâu để hồi phục?', en: '4. When the storm hits, how long is the recovery?' },
  'story.q4.intro': {
    vi: 'Đáy sâu nhất trong lịch sử là một con số. Nhưng đáng sợ hơn nhiều là câu hỏi: sau khi rơi xuống đó, bao lâu quỹ mới về lại đỉnh cũ? Đây là khoảng thời gian bạn phải sống với tài khoản âm.',
    en: 'The deepest drawdown is one number. The far more frightening question is what came after: how long until the fund got back to its old high? That is how long you have to live with an account in the red.',
  },
  'story.col.deepest': { vi: 'Đáy sâu nhất', en: 'Deepest drawdown' },
  'story.col.recovery': { vi: 'Thời gian hồi phục', en: 'Recovery time' },
  'story.notRecovered': { vi: 'Chưa hồi phục, đã {time}', en: 'Not recovered — {time} so far' },
  'story.q4.worst': { vi: '<b>{id}</b> từng rơi sâu nhất ở mức <b>{dd}</b>', en: '<b>{id}</b> fell furthest, to <b>{dd}</b>' },
  'story.q4.recovered': { vi: ' và cần <b>{time}</b> để về lại đỉnh cũ.', en: ', taking <b>{time}</b> to get back to its old high.' },
  'story.q4.stillUnder': {
    vi: ' và tới nay <b>vẫn chưa</b> về lại đỉnh cũ. Nghĩa là nếu bạn mua đúng đỉnh cũ đó, tới hôm nay tài khoản vẫn đang âm.',
    en: ' and <b>still has not</b> got back to it. Meaning that if you had bought at that old high, your account would still be down today.',
  },
  'story.q4.best': { vi: ' Đỡ nhất là <b>{id}</b> ({dd}{recovery}).', en: ' <b>{id}</b> held up best ({dd}{recovery}).' },
  'story.q4.bestRecovery': { vi: ', hồi trong {time}', en: ', recovered in {time}' },
  'story.q4.caveat': {
    vi: ' Trước khi quyết định, hãy tự hỏi: liệu bạn có chịu nổi mức lỗ tạm thời như vậy mà không bán tháo?',
    en: ' Before you decide, ask yourself honestly: could you sit through a paper loss that size without selling?',
  },
  'story.q5': { vi: '5. Tóm lại, quỹ nào hợp với bạn?', en: '5. So which fund suits you?' },
  'story.q5.intro': {
    vi: 'Không có quỹ "tốt nhất" cho mọi người. Chỉ có quỹ hợp với tính cách đầu tư và khung thời gian của bạn. Dựa trên CAGR và biến động trong kỳ đang so sánh, mỗi quỹ được gán một đặc tính.',
    en: 'There is no best fund for everyone — only the one that fits your temperament and time horizon. Based on CAGR and volatility over the period compared, each fund gets a character below.',
  },
  'story.card.efficient': { vi: 'Hiệu quả', en: 'Efficient' },
  'story.card.efficientTag': {
    vi: 'Lãi cao hơn trung bình mà biến động thấp hơn trung bình. Kiểu quỹ ai cũng muốn có trong danh mục.',
    en: 'Above-average return with below-average volatility. The kind of fund everyone wants in the portfolio.',
  },
  'story.card.aggressive': { vi: 'Tăng trưởng cao, đổi lại dao động mạnh', en: 'High growth, rougher ride' },
  'story.card.aggressiveTag': {
    vi: 'Lãi khá hơn nhóm nhưng đường đi gập ghềnh. Hợp với người trẻ, thu nhập ổn, có thể gồng 3-5 năm.',
    en: 'Better return than the group, but a bumpier path. Suits someone young with steady income who can hold for 3–5 years.',
  },
  'story.card.steady': { vi: 'Ổn định, ít rung lắc', en: 'Steady, low turbulence' },
  'story.card.steadyTag': {
    vi: 'Lãi chưa bằng nhóm dẫn đầu nhưng bù lại ít biến động. Hợp với người đã có gia đình, gần hưu, hoặc mới bước vào đầu tư.',
    en: 'Returns behind the leaders, but far less volatility in exchange. Suits people with families, near retirement, or just starting out.',
  },
  'story.card.review': { vi: 'Cần xem lại', en: 'Worth reviewing' },
  'story.card.reviewTag': {
    vi: 'Lãi dưới trung bình mà biến động lại cao hơn. Nếu không có lý do chiến lược rõ ràng để giữ, có thể cân nhắc thay thế.',
    en: 'Below-average return with above-average volatility. Without a clear strategic reason to hold it, a replacement is worth considering.',
  },
  'story.card.drawdown': { vi: 'Đáy', en: 'Drawdown' },
  'story.q5.closing': {
    vi: 'Một cách đọc nhanh. Nếu bạn còn trẻ, ngân sách đầu tư chỉ là một phần thu nhập, và bạn có thể nhắm mắt đi qua một đợt giảm 30%, quỹ "Tăng trưởng cao" thường đem lại kết quả tốt nhất trong dài hạn. Nếu bạn đang tiết kiệm cho một mục tiêu 3-5 năm (mua nhà, cho con đi học), quỹ "Ổn định" hoặc "Hiệu quả" phù hợp hơn. Cuối cùng, đừng chỉ nhìn một quỹ, hãy sang tab DCA để xem nếu bạn đều đặn nạp tiền mỗi tháng, kết quả thay đổi ra sao.',
    en: 'A quick way to read it. If you are young, investing only part of your income, and you can shut your eyes through a 30% fall, the "high growth" funds usually do best over the long run. If you are saving toward a 3–5 year goal — a house, school fees — "steady" or "efficient" fits better. And do not stop at one fund: go to the DCA tab to see how the picture changes when you contribute every month.',
  },
  'story.weeks': { vi: '{n} tuần', en: '{n} weeks' },
  'story.months': { vi: '{n} tháng', en: '{n} months' },
  'story.years': { vi: '{n} năm', en: '{n} years' },

  // ── Lump Sum vs DCA tab ──
  'lsdca.intro': {
    vi: 'So sánh hai chiến lược triển khai cùng một khoản vốn: đầu tư toàn bộ ngay từ đầu (Lump Sum) hay chia đều trong N tháng (DCA).',
    en: 'Two ways to deploy the same pot of money: put it all in at once (lump sum), or spread it evenly over N months (DCA).',
  },
  'lsdca.capital': { vi: 'Tổng vốn đầu tư', en: 'Total capital' },
  'lsdca.spreadOver': { vi: 'Trải DCA trong', en: 'Spread the DCA over' },
  'lsdca.months': { vi: '{n} tháng', en: '{n} months' },
  'lsdca.years': { vi: '{n} năm', en: '{n} years' },
  'lsdca.frequency': { vi: 'Tần suất DCA', en: 'DCA frequency' },
  'lsdca.freq.monthly': { vi: 'Hàng tháng', en: 'Monthly' },
  'lsdca.freq.weekly': { vi: 'Hàng tuần', en: 'Weekly' },
  'lsdca.idleCapital': { vi: 'Vốn chờ chưa đầu tư', en: 'Capital waiting to be invested' },
  'lsdca.idle.flat': { vi: 'Không sinh lãi', en: 'Earns nothing' },
  'lsdca.idle.savings': { vi: 'Lãi suất tiết kiệm', en: 'Bank savings rate' },
  'lsdca.idle.fund': { vi: 'Đầu tư vào quỹ khác', en: 'Parked in another fund' },
  'lsdca.savingsRate': { vi: 'Lãi suất tiết kiệm (%/năm)', en: 'Savings rate (% per year)' },
  'lsdca.parkFund': { vi: 'Quỹ đầu tư khi chờ', en: 'Fund to park it in' },
  'lsdca.parkPlaceholder': { vi: 'Chọn quỹ trái phiếu...', en: 'Pick a bond fund...' },
  'lsdca.addPortfolio': { vi: '+ Thêm Danh Mục', en: '+ Add portfolio' },
  'lsdca.run': { vi: 'Chạy Phân Tích', en: 'Run analysis' },
  'lsdca.staleParams': {
    vi: 'Thông số đã thay đổi, bấm "Chạy Phân Tích" để cập nhật kết quả.',
    en: 'Parameters changed — press "Run analysis" to update the results.',
  },
  'lsdca.prompt': {
    vi: '↑ Chọn quỹ, điều chỉnh thông số rồi bấm <b>Chạy Phân Tích</b> để xem kết quả so sánh',
    en: '↑ Pick a fund, set the parameters, then press <b>Run analysis</b> to see the comparison',
  },
  'lsdca.emptyState': { vi: 'Bấm "+ Thêm Danh Mục" để bắt đầu phân tích.', en: 'Press "+ Add portfolio" to start the analysis.' },
  'lsdca.insufficientData': {
    vi: 'Không đủ dữ liệu. Horizon dài hơn cửa sổ dữ liệu, hoặc quỹ chưa tải xong.',
    en: 'Not enough data. The horizon is longer than the data window, or the fund is still loading.',
  },
  'lsdca.scenarioCount': { vi: 'Phân tích <b>{n}</b> kịch bản rolling', en: 'Analysed <b>{n}</b> rolling scenarios' },
  'lsdca.lsWins': { vi: 'Lump Sum thắng', en: 'Lump sum wins' },
  'lsdca.scenariosOf': { vi: '({won}/{total} kịch bản)', en: '({won} of {total} scenarios)' },
  'lsdca.cagrToggleOn': {
    vi: 'Đang xem lời/năm (quy đổi). Nhấn để xem tổng lời/lỗ cả kỳ đầu tư',
    en: 'Showing annualised return. Click to see the total gain or loss over the whole period',
  },
  'lsdca.cagrToggleOff': {
    vi: 'Nhấn để xem lời/năm: nếu mức lãi sau {months}th này mà đều mỗi năm, thì được bao nhiêu %/năm?',
    en: 'Click to annualise: if the return over these {months} months were earned evenly each year, what would that be per year?',
  },
  'lsdca.cagrOn': { vi: '✓ Lời/năm', en: '✓ Per year' },
  'lsdca.cagrOff': { vi: 'Xem lời/năm', en: 'Show per year' },
  'lsdca.avgIntro': {
    vi: 'Trung bình sau <b>{months} tháng</b> đầu tư, tính qua <b>{n} kịch bản</b> lịch sử',
    en: 'On average after <b>{months} months</b> invested, across <b>{n}</b> historical scenarios',
  },
  'lsdca.avgPerYear': { vi: 'Lời TB (mỗi năm)', en: 'Avg return (per year)' },
  'lsdca.avgPeriod': { vi: 'Lời TB ({months}th)', en: 'Avg return ({months}m)' },
  'lsdca.medianPerYear': { vi: 'Trung vị (mỗi năm)', en: 'Median (per year)' },
  'lsdca.medianPeriod': { vi: 'Trung vị ({months}th)', en: 'Median ({months}m)' },
  'lsdca.gapLabel': { vi: 'LS vượt DCA bao nhiêu?', en: 'By how much does lump sum beat DCA?' },
  'lsdca.scenario.veryBad': { vi: 'Kịch bản rất xấu', en: 'Very bad case' },
  'lsdca.scenario.bad': { vi: 'Kịch bản xấu', en: 'Bad case' },
  'lsdca.scenario.typical': { vi: 'Kịch bản thường', en: 'Typical case' },
  'lsdca.scenario.good': { vi: 'Kịch bản tốt', en: 'Good case' },
  'lsdca.scenario.veryGood': { vi: 'Kịch bản rất tốt', en: 'Very good case' },
  'lsdca.heatmap.title': {
    vi: 'Xác suất chiến thắng của chiến lược Đầu tư toàn bộ vốn ngay từ đầu',
    en: 'How often investing the whole sum up front wins',
  },
  'lsdca.heatmap.meaning': {
    vi: 'Ý nghĩa: Con số trong ô là tỷ lệ % các kịch bản lịch sử mà việc giải ngân một lần hiệu quả hơn việc chia nhỏ vốn trong N tháng (tính trên cùng một thời hạn đầu tư).',
    en: 'What it means: each cell is the share of historical scenarios in which deploying everything at once beat spreading it over N months, measured over the same holding period.',
  },
  'lsdca.legend.dcaWins': { vi: '< 50%: DCA thắng nhiều hơn', en: '< 50%: DCA wins more often' },
  'lsdca.legend.lsEdge': { vi: '50–70%: LS nhỉnh hơn', en: '50–70%: lump sum has an edge' },
  'lsdca.legend.lsStrong': { vi: '≥ 70%: LS vượt trội', en: '≥ 70%: lump sum dominates' },
  'lsdca.compareWith': { vi: 'So sánh với quỹ khác:', en: 'Compare with another fund:' },
  'lsdca.noCompare': { vi: 'Không so sánh', en: 'No comparison' },
  'lsdca.comparePlaceholder': { vi: 'Chọn quỹ để so sánh heatmap...', en: 'Pick a fund to compare heatmaps...' },
  'lsdca.yAxisTitle': { vi: 'Thời gian nắm giữ', en: 'Holding period' },
  'lsdca.xAxisTitle': { vi: 'Thời gian DCA (tháng)', en: 'DCA period (months)' },
  'lsdca.noHistory': { vi: 'Không đủ dữ liệu lịch sử', en: 'Not enough history' },
  'lsdca.cellTooltip': {
    vi: 'Giữ {years} năm, DCA {months} tháng → LS thắng {rate}% ({wins}/{total} kịch bản chồng lấn, chỉ {independent} giai đoạn tách rời)',
    en: 'Held {years} years, DCA over {months} months → lump sum wins {rate}% ({wins} of {total} overlapping scenarios, from only {independent} separate episodes)',
  },
  'lsdca.cellWinRate': { vi: '{rate}% LS thắng', en: '{rate}% LS wins' },
  'lsdca.cellEpisodes': { vi: '{n} giai đoạn tách rời', en: '{n} separate episodes' },
  'lsdca.overlapNote': {
    vi: 'Mỗi ô ghi hai con số. Phân số bên trên là số kịch bản lịch sử, nhưng chúng chồng lấn nhau rất nặng: hai lần thử cách nhau một tháng thì đi qua gần như cùng một quãng thời gian. Dòng dưới cùng đếm số quãng thật sự không dùng chung ngày nào. Ô nào có dưới {min} giai đoạn tách rời thì bị làm mờ và có dấu ⚠. Khối bên dưới giải thích kỹ hơn kèm ví dụ.',
    en: 'Each cell shows two numbers. The fraction on top is the count of historical scenarios, but they overlap heavily: two trials starting a month apart cover almost the same stretch of time. The bottom line counts stretches that share no dates at all. Any cell with fewer than {min} separate episodes is dimmed and marked ⚠. The block below explains it with an example.',
  },
  'lsdca.explainerToggle': { vi: 'Cách đọc bảng này {arrow}', en: 'How to read this table {arrow}' },
  'lsdca.explainer1': {
    vi: 'Giả sử bạn có sẵn <b>100 triệu</b> và dự định đầu tư trong <b>2 năm</b>. Bạn đang cân nhắc giữa hai cách:',
    en: 'Say you have <b>100 million</b> on hand and plan to invest for <b>2 years</b>. You are weighing two approaches:',
  },
  'lsdca.explainerLumpSum': {
    vi: '<b>Đầu tư một lần:</b> Bỏ toàn bộ 100 triệu ngay hôm nay, giữ đến hết 2 năm rồi bán.',
    en: '<b>All at once:</b> put the whole 100 million in today, hold for the full 2 years, then sell.',
  },
  'lsdca.explainerDca': {
    vi: '<b>DCA 3 tháng:</b> Chia ra đầu tư đều mỗi tháng trong 3 tháng đầu (~33 triệu/tháng), sau đó giữ nguyên đến hết 2 năm rồi bán.',
    en: '<b>DCA over 3 months:</b> invest evenly across the first three months (about 33 million a month), then hold to the end of the 2 years and sell.',
  },
  'lsdca.explainer2': {
    vi: 'Ô <b>"2 năm / 3 tháng"</b> cho biết: nhìn lại toàn bộ lịch sử, có <b>60.4%</b> số lần mà cách đầu tư một lần mang lại kết quả tốt hơn.',
    en: 'The <b>"2 years / 3 months"</b> cell says: across the whole history, investing it all at once came out ahead <b>60.4%</b> of the time.',
  },
  'lsdca.explainer3': {
    vi: '💡 Con số càng cao → đầu tư một lần càng có lợi thế. DCA trải càng dài thì vốn ngồi chờ càng lâu, nên lợi thế của đầu tư một lần càng lớn (thể hiện qua màu xanh đậm hơn ở cột bên phải).',
    en: '💡 The higher the number, the bigger the edge for investing at once. The longer the DCA runs, the longer your capital sits idle, so that edge grows — which is why the right-hand columns are a deeper green.',
  },
  'lsdca.distTitle': {
    vi: 'LS vượt DCA bao nhiêu? Phân bố kết quả các kịch bản lịch sử',
    en: 'By how much does lump sum beat DCA? The spread across historical scenarios',
  },
  'lsdca.distLegend': { vi: 'Xanh = Lump Sum thắng &nbsp;|&nbsp; Đỏ = DCA thắng', en: 'Green = lump sum wins &nbsp;|&nbsp; red = DCA wins' },
  'lsdca.distTooltip': { vi: '{n} kịch bản', en: '{n} scenarios' },
  'lsdca.distTooltipLabel': { vi: 'Số lần', en: 'Count' },
  'lsdca.distTooltipGap': { vi: 'Chênh lệch: {label}', en: 'Gap: {label}' },
  'lsdca.perYear': { vi: '{v}/năm', en: '{v}/yr' },
  'lsdca.billionDong': { vi: '{v} tỷ đồng', en: '{v} bn dong' },
  'lsdca.millionDong': { vi: '{v} triệu đồng', en: '{v} m dong' },
  'lsdca.dong': { vi: '{v} đồng', en: '{v} dong' },
  'lsdca.paramsNote1': { vi: '* Phân tích tất cả các kịch bản rolling.', en: '* Analyses every rolling scenario.' },
  'lsdca.paramsNote2': {
    vi: '* Nếu bạn DCA từ lương mỗi tháng thì tab này không có ứng dụng với bạn. Nó chỉ áp dụng khi có sẵn một cục tiền lớn và đang phân vân nên đầu tư hết luôn hay rải dần.',
    en: '* If you DCA out of a monthly salary, this tab does not apply to you. It is for the case where you already have a lump sum and are deciding whether to deploy it all at once or spread it out.',
  },
  'lsdca.paramsNote3': {
    vi: '* Về lãi suất tiết kiệm: mỗi kỳ chỉ rút ra đúng phần chia đều để đầu tư, phần còn lại vẫn gửi tiết kiệm sinh lãi nhưng khoản lãi đó không mang vào đầu tư. Nhờ vậy tổng vốn LS và DCA luôn bằng nhau.',
    en: '* On the savings rate: each period withdraws exactly the scheduled instalment, and the remainder keeps earning interest — but that interest is not reinvested. That keeps the total capital deployed identical between lump sum and DCA.',
  },

  // ── Fund Analysis tab ──
  'fa.title': { vi: 'Phân Tích Quỹ', en: 'Fund Analysis' },
  'fa.fund': { vi: 'Quỹ', en: 'Fund' },
  'fa.noReports': { vi: 'Quỹ này chưa có dữ liệu báo cáo tài chính.', en: 'This fund has no financial report data yet.' },
  'fa.loadFailed': { vi: 'Không tải được dữ liệu báo cáo.', en: 'Could not load the report data.' },
  'fa.group.fullReports': { vi: 'Báo cáo tài chính đầy đủ ({n})', en: 'Full financial reports ({n})' },
  'fa.group.holdingsOnly': { vi: 'Phân tích theo danh mục ({n})', en: 'Holdings-based analysis ({n})' },
  'fa.latest': { vi: 'Mới nhất', en: 'Latest' },
  'fa.periodLabel': { vi: 'Tháng {month}/{year}', en: '{month}/{year}' },
  'fa.reportPeriod': { vi: 'Kỳ báo cáo', en: 'Reporting period' },
  'fa.sec.all': { vi: 'Tất cả', en: 'All' },
  'fa.sec.allocation': { vi: 'Cấu trúc & Phân bổ', en: 'Structure & allocation' },
  'fa.sec.perf': { vi: 'Hiệu suất & Rủi ro', en: 'Performance & risk' },
  'fa.sec.size': { vi: 'Quy mô & Dòng tiền', en: 'Size & flows' },
  'fa.sec.cost': { vi: 'Chi phí & Hiệu quả', en: 'Costs & efficiency' },
  'fa.sec.redFlags': { vi: 'Dấu vết nghi vấn (Red Flags)', en: 'Red flags' },

  'fa.asset.stock': { vi: 'Cổ phiếu', en: 'Equities' },
  'fa.asset.bond': { vi: 'Trái phiếu', en: 'Bonds' },
  'fa.asset.cash': { vi: 'Tiền mặt', en: 'Cash' },
  'fa.asset.other': { vi: 'Tài sản khác', en: 'Other assets' },
  'fa.asset.rest': { vi: 'Còn lại', en: 'Rest' },
  'fa.industry.other': { vi: 'Khác', en: 'Other' },

  'fa.series.realized': { vi: 'Thực hiện', en: 'Realized' },
  'fa.series.unrealized': { vi: 'Chưa thực hiện', en: 'Unrealized' },
  'fa.series.dividends': { vi: 'Cổ tức', en: 'Dividends' },
  'fa.series.interest': { vi: 'Lãi tiền gửi', en: 'Deposit interest' },
  'fa.series.mgmtFee': { vi: 'Phí quản lý', en: 'Management fee' },
  'fa.series.brokerageFee': { vi: 'Phí giao dịch', en: 'Brokerage fee' },
  'fa.series.totalCost': { vi: 'Tổng chi phí', en: 'Total costs' },
  'fa.series.subscription': { vi: 'Phát hành', en: 'Subscriptions' },
  'fa.series.redemption': { vi: 'Mua lại', en: 'Redemptions' },
  'fa.series.investment': { vi: 'Đầu tư', en: 'Investment' },
  'fa.series.flow': { vi: 'Dòng tiền', en: 'Flows' },

  'fa.totalAssets': { vi: 'Tổng tài sản', en: 'Total assets' },
  'fa.vsPeriod': { vi: 'So với kỳ {period}: {abs} ({pct})', en: 'Versus {period}: {abs} ({pct})' },
  'fa.navPerUnit': { vi: 'NAV/CCQ: <b>{v} đ</b>', en: 'NAV per unit: <b>{v} đ</b>' },
  'fa.periodSuffix': { vi: '(kỳ {period})', en: '({period})' },
  'fa.noPortfolioData': { vi: 'Không có dữ liệu danh mục kỳ này.', en: 'No portfolio data for this period.' },
  'fa.industryTitle': { vi: 'Phân bổ theo ngành nghề', en: 'Allocation by sector' },
  'fa.noIndustryData': { vi: 'Kỳ này không có dữ liệu ngành.', en: 'No sector data for this period.' },
  'fa.industryNote': {
    vi: 'Tỷ trọng cổ phiếu theo ngành, kỳ {period}. Nếu một hai ngành chiếm quá nửa, danh mục dễ bị kéo theo ngành đó.',
    en: 'Equity weight by sector for {period}. When one or two sectors are more than half the book, the portfolio moves with them.',
  },
  'fa.currentPeriod': { vi: 'đang chọn', en: 'the selected period' },
  'fa.top10Title': { vi: 'Top 10 cổ phiếu nắm giữ lớn nhất', en: 'Ten largest holdings' },
  'fa.weight': { vi: 'Tỷ trọng', en: 'Weight' },
  'fa.noStocks': { vi: 'Kỳ này không có cổ phiếu.', en: 'No equities held in this period.' },
  'fa.top10Note': {
    vi: 'Tỷ trọng trong NAV, kỳ {period}. Vài mã đứng đầu quyết định phần lớn hiệu suất cả danh mục.',
    en: 'Share of NAV for {period}. The top few names drive most of the portfolio’s performance.',
  },
  'fa.concentrationTitle': { vi: 'Mức độ tập trung danh mục (top 5)', en: 'Portfolio concentration (top 5)' },
  'fa.concentrationNote': {
    vi: 'Tổng tỷ trọng 5 cổ phiếu lớn nhất mỗi kỳ. Đường dốc lên liên tục nghĩa là quỹ đang mất dần tính đa dạng hóa.',
    en: 'Combined weight of the five largest holdings each period. A steadily rising line means the fund is becoming less diversified.',
  },
  'fa.portfolioTitle': { vi: 'Danh mục quỹ', en: 'Fund portfolio' },
  'fa.col.security': { vi: 'Chứng khoán', en: 'Security' },
  'fa.col.quantity': { vi: 'Khối lượng nắm giữ', en: 'Quantity held' },
  'fa.col.value': { vi: 'Tổng giá trị', en: 'Total value' },
  'fa.noStocksInPortfolio': { vi: 'Kỳ này không có cổ phiếu trong danh mục.', en: 'No equities in the portfolio for this period.' },

  'fa.navChartTitle': { vi: 'NAV/CCQ (giá quỹ) qua các tháng', en: 'NAV per unit over time' },
  'fa.navLabel': { vi: 'NAV/CCQ', en: 'NAV/unit' },
  'fa.navNote': {
    vi: 'Giá trị tài sản ròng trên mỗi chứng chỉ quỹ cuối kỳ (báo cáo 2219) — giá bạn mua/bán.',
    en: 'Net asset value per fund certificate at period end (report line 2219) — the price you buy and sell at.',
  },
  'fa.ddChartTitle': { vi: 'Mức sụt giảm từ đỉnh (drawdown)', en: 'Drawdown from peak' },
  'fa.ddLabel': { vi: 'Sụt giảm', en: 'Drawdown' },
  'fa.ddNote': {
    vi: 'Khoảng cách từ đỉnh cao nhất trước đó, tính trên NAV/CCQ. Đáy sâu nhất lịch sử:{deepest}. Cú sập càng sâu, càng cần nhiều thời gian hồi phục.',
    en: 'Distance below the previous high, measured on NAV per unit. Deepest on record:{deepest}. The deeper the fall, the longer the recovery.',
  },
  'fa.ddNotEnough': { vi: ' chưa đủ số liệu', en: ' not enough data' },
  'fa.profitChartTitle': { vi: 'Lợi nhuận quỹ theo tháng', en: 'Fund profit by month' },
  'fa.profitLabel': { vi: 'Lợi nhuận quỹ', en: 'Fund profit' },
  'fa.profitNote': {
    vi: 'Lợi nhuận của quỹ = thay đổi NAV do hoạt động đầu tư (2237) = thu nhập ròng + lãi/lỗ khi bán + lãi/lỗ theo giá thị trường (gồm cả phần cổ phiếu tăng/giảm chưa bán).',
    en: 'Fund profit = the NAV change from investing activity (2237) = net income + gains and losses on sales + mark-to-market gains and losses, including holdings not yet sold.',
  },
  'fa.navPctChartTitle': { vi: 'Lợi nhuận theo tháng (% NAV/CCQ)', en: 'Monthly return (% of NAV per unit)' },
  'fa.navPctLabel': { vi: 'Thay đổi NAV/CCQ', en: 'Change in NAV/unit' },
  'fa.navPctNote': {
    vi: 'Tỷ suất sinh lời mỗi tháng trên MỖI chứng chỉ (thay đổi % NAV/CCQ). Tính trên-đơn-vị nên đã tự loại ảnh hưởng dòng tiền. Xanh = lời, đỏ = lỗ.',
    en: 'Monthly return per certificate (the percentage change in NAV per unit). Measuring per unit strips out the effect of inflows and outflows. Green is a gain, red a loss.',
  },
  'fa.realizedChartTitle': { vi: 'Lãi/lỗ thực hiện (khi bán)', en: 'Realized gains and losses (on sale)' },
  'fa.realizedLabel': { vi: 'Lãi/lỗ thực hiện', en: 'Realized gain/loss' },
  'fa.realizedNote': {
    vi: 'Lãi/lỗ khi quỹ BÁN cổ phiếu trong tháng (2235). Xanh = lời, đỏ = lỗ. Chỉ là phần đã chốt bằng cách bán, chưa tính phần còn đang giữ.',
    en: 'Gains and losses when the fund SOLD shares during the month (2235). Green is a gain, red a loss. This is only what was locked in by selling — not what is still held.',
  },
  'fa.unrealizedChartTitle': { vi: 'Lãi/lỗ chưa thực hiện (theo giá thị trường)', en: 'Unrealized gains and losses (mark to market)' },
  'fa.unrealizedLabel': { vi: 'Lãi/lỗ chưa thực hiện', en: 'Unrealized gain/loss' },
  'fa.unrealizedNote': {
    vi: 'Lãi/lỗ do cổ phiếu lên/xuống giá khi quỹ VẪN ĐANG GIỮ (2236, chưa bán). Phần này làm giá quỹ (NAV/CCQ) biến động mạnh nhất. Xanh = lời, đỏ = lỗ.',
    en: 'Gains and losses from price moves on shares the fund STILL HOLDS (2236, not yet sold). This is what drives most of the movement in NAV per unit. Green is a gain, red a loss.',
  },

  // Fund Analysis — quy mô & dòng tiền
  'fa.sizeIntro': {
    vi: 'Hiệu quả THẬT của quỹ (NAV/CCQ) chỉ ~1,18x kể từ đỉnh 2022. Tổng tài sản tăng 3,5x chủ yếu do dòng tiền mới (số chứng chỉ ×3), không phải do đầu tư. Tổng tài sản của quỹ mở bằng giá nhân số lượng, nên nó tăng khi nhà đầu tư nạp tiền mới. Xem chart "Thay đổi tổng NAV" để biết mỗi tháng tăng trưởng đến từ đầu tư hay từ dòng tiền. Dòng tiền âm liên tục là tín hiệu nhà đầu tư mất niềm tin; tiền mặt cao thì quỹ đang phòng thủ.',
    en: 'The fund’s REAL performance (NAV per unit) is only about 1.18× since the 2022 peak. Total assets grew 3.5×, mostly on new money — the certificate count tripled — not on investment returns. An open-ended fund’s total assets are price times units, so they rise whenever investors put money in. Use the "Change in total NAV" chart to see whether a month’s growth came from investing or from flows. Sustained outflows signal investors losing confidence; a high cash balance means the fund is playing defence.',
  },
  'fa.aumTitle': { vi: 'Quy mô quỹ (AUM) qua các tháng', en: 'Fund size (AUM) over time' },
  'fa.aumLabel': { vi: 'AUM (tài sản ròng)', en: 'AUM (net assets)' },
  'fa.aumNote': {
    vi: 'Quy mô quỹ tính theo tài sản ròng (NAV cuối kỳ, mục 2243), đã trừ nợ phải trả.',
    en: 'Fund size measured as net assets (period-end NAV, line 2243), after liabilities.',
  },
  'fa.unitsTitle': { vi: 'Số chứng chỉ quỹ đang lưu hành', en: 'Fund certificates outstanding' },
  'fa.unitsValue': { vi: '{v} chứng chỉ', en: '{v} certificates' },
  'fa.unitsLabel': { vi: 'Lưu hành', en: 'Outstanding' },
  'fa.subChartTitle': { vi: 'Thay đổi NAV do phát hành CCQ (2239.3.1)', en: 'NAV change from issuing certificates (2239.3.1)' },
  'fa.subNote': {
    vi: 'Thay đổi giá trị tài sản ròng do phát hành thêm chứng chỉ quỹ (2239.3.1). Báo cáo chỉ tách riêng mục này từ 12/2020, các tháng trước để trống.',
    en: 'Change in net assets from issuing new certificates (2239.3.1). Reports only break this out separately from December 2020; earlier months are blank.',
  },
  'fa.redChartTitle': { vi: 'Thay đổi NAV do mua lại CCQ (2239.3.2)', en: 'NAV change from redeeming certificates (2239.3.2)' },
  'fa.redNote': {
    vi: 'Thay đổi giá trị tài sản ròng do quỹ mua lại chứng chỉ (2239.3.2), số âm là tiền rút ra. Phát hành trừ mua lại ra dòng tiền ròng của tháng.',
    en: 'Change in net assets from the fund buying back certificates (2239.3.2); negative means money withdrawn. Subscriptions minus redemptions gives the month’s net flow.',
  },
  'fa.netFlowTitle': { vi: 'Dòng tiền ròng (phát hành − mua lại CCQ)', en: 'Net flow (subscriptions − redemptions)' },
  'fa.netFlowLabel': { vi: 'Dòng tiền ròng', en: 'Net flow' },
  'fa.netFlowNote': {
    vi: 'Xanh = nhà đầu tư nạp thêm tiền, đỏ = rút vốn ra. Con số chính xác từ báo cáo (2239.3), bằng hiệu của hai chart phát hành và mua lại bên trên.',
    en: 'Green means investors put money in, red means they took it out. Taken exactly from the report (2239.3) — the difference between the two charts above.',
  },
  'fa.navSplitTitle': { vi: 'Thay đổi tổng NAV: đầu tư vs dòng tiền', en: 'Change in total NAV: investing vs flows' },
  'fa.legend.investment': { vi: 'Đầu tư (2237)', en: 'Investing (2237)' },
  'fa.legend.flow': { vi: 'Dòng tiền (2239.3)', en: 'Flows (2239.3)' },
  'fa.navSplitNote1': { vi: 'Mỗi tháng, tổng NAV được tính bằng:', en: 'Each month, total NAV is made up of:' },
  'fa.navSplitNote2': { vi: '1. Lợi nhuận đầu tư (2237): quỹ làm ra bao nhiêu tiền.', en: '1. Investment profit (2237): what the fund actually earned.' },
  'fa.navSplitNote3': { vi: '2. Dòng tiền (2239.3): nhà đầu tư nạp thêm hay rút ra.', en: '2. Flows (2239.3): what investors put in or took out.' },
  'fa.navSplitNote4': {
    vi: 'Chart này tách 2 thứ ra, để thấy quỹ lớn nhờ đâu. Lớn nhờ lợi nhuận là thật. Lớn nhờ tiền mới chưa nói lên chất lượng.',
    en: 'This chart separates the two, so you can see what the fund grew on. Growth from profit is real. Growth from new money says nothing about quality.',
  },
  'fa.navSplitNote5': {
    vi: 'DCDS từ cuối 2018: lợi nhuận đầu tư cộng dồn 713 tỷ, dòng tiền 4.722 tỷ. Tức 87% tăng trưởng đến từ tiền mới, chỉ 13% từ quỹ làm ra. Tổng NAV gấp 5,3 lần nhưng quỹ thật sự sinh lời chưa tới 1 lần.',
    en: 'DCDS since late 2018: 713bn dong of cumulative investment profit against 4,722bn of flows. That is 87% of the growth from new money and only 13% from what the fund earned. Total NAV is 5.3× larger, but the fund itself has not even doubled the money.',
  },
  'fa.navSplitNote6': {
    vi: 'Năm nay lại ngược, cũng đáng chú ý: 7 tháng đầu 2026 hút 895 tỷ tiền mới, nhưng lợi nhuận đầu tư âm 652 tỷ. Tiền mới vào nhiều vẫn không cứu được lỗ.',
    en: 'This year runs the other way, and is equally telling: the first seven months of 2026 drew in 895bn of new money while investment profit was minus 652bn. Plenty of new money still did not offset the losses.',
  },
  'fa.navSplitNote7': {
    vi: 'Quỹ phình to không có nghĩa là quỹ làm ra tiền. Muốn biết quỹ có giỏi không, phải nhìn NAV/CCQ, tức lợi nhuận trên từng chứng chỉ.',
    en: 'A fund getting bigger does not mean it is making money. To judge whether it is any good, look at NAV per unit — the return on each certificate.',
  },
  'fa.allocPctTitle': { vi: 'Tiền mặt / cổ phiếu (% tổng tài sản) qua các tháng', en: 'Cash and equities (% of total assets) over time' },
  'fa.allocPctNote': {
    vi: 'Tỷ trọng từng loại tài sản trong tổng tài sản (cộng lại đúng 100%). Tiền mặt cao trong downtrend là phòng thủ tốt, nhưng cao trong uptrend là bỏ lỡ cơ hội.',
    en: 'Each asset class as a share of total assets, adding to exactly 100%. High cash in a downtrend is good defence; high cash in an uptrend is a missed opportunity.',
  },
  'fa.cashTitle': { vi: 'Tiền mặt qua các tháng', en: 'Cash over time' },
  'fa.cashNote': {
    vi: 'Tiền mặt và tương đương tiền quỹ nắm giữ mỗi cuối kỳ (Cash at Bank + Cash Equivalents + Money market). Tăng vọt nghĩa là quỹ bán cổ phiếu và đang giữ tiền.',
    en: 'Cash and cash equivalents held at each period end (cash at bank, cash equivalents and money market). A spike means the fund sold shares and is sitting on the proceeds.',
  },
  'fa.depositTitle': { vi: 'Tiền gửi ngân hàng (2203)', en: 'Bank deposits (2203)' },
  'fa.depositLabel': { vi: 'Tiền gửi ngân hàng', en: 'Bank deposits' },
  'fa.depositNote': {
    vi: 'Tiền gửi ngân hàng (mục 2203) chiếm phần lớn trong tổng tiền mặt. Phần chênh với chart "Tiền mặt qua các tháng" là tương đương tiền và công cụ thị trường tiền tệ.',
    en: 'Bank deposits (line 2203) make up most of the total cash. The gap against the cash chart above is cash equivalents and money-market instruments.',
  },
  'fa.cashPctTitle': { vi: 'Tỷ lệ tiền mặt theo % AUM', en: 'Cash as a share of AUM' },
  'fa.cashPctLabel': { vi: 'Tiền mặt % AUM', en: 'Cash % of AUM' },
  'fa.cashPctNote': {
    vi: 'Tỷ lệ tiền mặt trên quy mô tài sản ròng (AUM). Cao nghĩa là quỹ giữ nhiều tiền mặt, phòng thủ hoặc chờ đợi cơ hội mua vào.',
    en: 'Cash relative to net assets. A high figure means the fund is holding a lot of cash — playing defence, or waiting for a chance to buy.',
  },
  'fa.investorsTitle': { vi: 'Số nhà đầu tư', en: 'Number of investors' },
  'fa.investorsValue': { vi: '{v} nhà đầu tư', en: '{v} investors' },
  'fa.investorsNote': {
    vi: 'Số nhà đầu tư cuối kỳ (22841). Tăng nhanh cùng số chứng chỉ lưu hành nghĩa là quỹ hút dòng tiền bán lẻ mạnh (07/2026: 74.212 nhà đầu tư).',
    en: 'Investors at period end (22841). Rising quickly alongside certificates outstanding means the fund is pulling in strong retail flows (July 2026: 74,212 investors).',
  },
  'fa.managerOwnTitle': { vi: 'Công ty quản lý & bên liên quan sở hữu (2282)', en: 'Manager and related-party ownership (2282)' },
  'fa.managerOwnLabel': { vi: 'Công ty quản lý + bên liên quan', en: 'Manager + related parties' },
  'fa.managerOwnNote': {
    vi: 'Tỷ lệ chứng chỉ do công ty quản lý quỹ và bên liên quan nắm giữ (2282). Con số nhảy theo thời điểm, không phải thước đo niềm tin: họ kiếm tiền bằng phí quản lý, không cần nắm nhiều chứng chỉ.',
    en: 'Share of certificates held by the management company and its related parties (2282). The figure jumps around and is not a confidence signal: they earn from management fees, not from holding units.',
  },
  'fa.top10InvTitle': { vi: 'Top 10 nhà đầu tư lớn nhất (2283)', en: 'Ten largest investors (2283)' },
  'fa.top10InvLabel': { vi: 'Top 10 nhà đầu tư', en: 'Top 10 investors' },
  'fa.top10InvNote': {
    vi: '10 nhà đầu tư lớn nhất nắm bao nhiêu phần trăm quỹ (2283). Tập trung cao nghĩa là vài tổ chức lớn chi phối; họ rút vốn sẽ ảnh hưởng mạnh tới quỹ.',
    en: 'What share of the fund the ten largest investors hold (2283). High concentration means a few institutions dominate — and their exit would hit the fund hard.',
  },
  'fa.foreignTitle': { vi: 'Nhà đầu tư nước ngoài (2284)', en: 'Foreign investors (2284)' },
  'fa.foreignLabel': { vi: 'Nhà đầu tư nước ngoài', en: 'Foreign investors' },
  'fa.foreignNote': {
    vi: 'Tỷ lệ chứng chỉ do nhà đầu tư nước ngoài nắm (2284). Giảm thường đi cùng thị trường điều chỉnh, khi vốn ngoại rút khỏi cổ phiếu Việt Nam.',
    en: 'Share of certificates held by foreign investors (2284). Declines usually coincide with market corrections, as foreign capital leaves Vietnamese equities.',
  },

  // Fund Analysis — chi phí & red flags
  'fa.costIntro': {
    vi: 'Phí là thứ duy nhất chắc chắn mất. Phí quản lý khoảng 1,95%/năm, tổng chi phí 2,1%/năm, lấy đi đều đặn bất kể thị trường ra sao. Turnover cao nghĩa là quỹ giao dịch nhiều, sinh phí cho công ty chứng khoán, chưa chắc sinh lời cho nhà đầu tư. Cổ tức nhận về theo mùa, thường dồn vào quý 2 và quý 3.',
    en: 'Fees are the one loss you are certain of. Management fees run about 1.95% a year and total costs 2.1%, taken steadily whatever the market does. High turnover means the fund trades a lot, which earns the brokers fees and does not necessarily earn you returns. Dividends arrive seasonally, mostly in Q2 and Q3.',
  },
  'fa.incomeTitle': { vi: 'Thu nhập: cổ tức + lãi tiền gửi', en: 'Income: dividends and deposit interest' },
  'fa.legend.dividends': { vi: 'Cổ tức (2221.1)', en: 'Dividends (2221.1)' },
  'fa.legend.interest': { vi: 'Lãi tiền gửi (2222)', en: 'Deposit interest (2222)' },
  'fa.incomeNote1': {
    vi: 'Tiền mặt quỹ thu vào: cổ tức (2221.1) + lãi tiền gửi (2222). Đây là thu nhập lãi từ tiền gửi, KHÔNG phải lợi nhuận quỹ. Cổ tức lớn hơn hẳn lãi tiền gửi vì quỹ là quỹ cổ phiếu.',
    en: 'Cash the fund takes in: dividends (2221.1) plus deposit interest (2222). This is income, NOT the fund’s profit. Dividends dwarf deposit interest because this is an equity fund.',
  },
  'fa.incomeNote2': {
    vi: 'Cổ tức dồn về theo mùa (Q2-Q3, sau ĐHĐCĐ). Đợt cao 05-07/2026 chủ yếu do cổ phiếu lớn chi trả: VIC ~11.000đ/CP (tháng 5, ~31 tỷ), BID ~2.000đ/CP (tháng 6, ~25 tỷ), ACB ~1.800đ/CP (tháng 7, ~17 tỷ). Suy luận từ tổng cổ tức chia số CP nắm giữ, không phải lỗi số liệu.',
    en: 'Dividends cluster seasonally in Q2–Q3, after the AGMs. The May–July 2026 peak came mostly from large holdings paying out: VIC at about 11,000₫ a share in May (~31bn), BID at about 2,000₫ in June (~25bn), ACB at about 1,800₫ in July (~17bn). These are inferred from total dividends divided by shares held — not a data error.',
  },
  'fa.costChartTitle': { vi: 'Chi phí: phí quản lý + giao dịch', en: 'Costs: management and brokerage fees' },
  'fa.legend.mgmtFee': { vi: 'Phí quản lý (2225)', en: 'Management fee (2225)' },
  'fa.legend.brokerageFee': { vi: 'Phí giao dịch (2231)', en: 'Brokerage fee (2231)' },
  'fa.costNote1': { vi: 'Chi phí là thứ duy nhất chắc chắn mất. Hai loại phí lớn:', en: 'Costs are the one loss you are certain of. Two big ones:' },
  'fa.costNote2': {
    vi: '1. Phí quản lý (2225): khoảng 1,95%/năm, trừ đều vào NAV mỗi ngày. Không tránh được, dù quỹ lời hay lỗ.',
    en: '1. Management fee (2225): about 1.95% a year, deducted from NAV every day. Unavoidable, whether the fund gains or loses.',
  },
  'fa.costNote3': {
    vi: '2. Phí giao dịch (2231): mỗi lần quỹ mua bán cổ phiếu là một lần trả tiền môi giới. Tỉ lệ thuận với turnover.',
    en: '2. Brokerage fee (2231): every time the fund buys or sells, it pays a broker. It scales with turnover.',
  },
  'fa.costNote4': {
    vi: 'Nhìn 2 cột cạnh nhau để so: phí giao dịch tiến gần phí quản lý nghĩa là quỹ đang chạy quá nhiều vòng. Quỹ chạy nhiều, môi giới vui, bạn chưa chắc vui.',
    en: 'Compare the two bars: brokerage approaching the management fee means the fund is churning. Lots of churn makes the broker happy; it does not necessarily make you happy.',
  },
  'fa.costNote5': {
    vi: 'DCDS 07/2026: phí giao dịch 6,06 tỷ, đã bằng 63% phí quản lý 9,66 tỷ. Hai năm 2022 và 2026 quỹ lỗ nặng mà phí vẫn trừ đều. Đó là bản chất của phí: nó không cần biết thị trường ra sao.',
    en: 'DCDS in July 2026: 6.06bn of brokerage against 9.66bn of management fee — 63% of it. In both 2022 and 2026 the fund lost heavily and the fees came out just the same. That is what fees are: indifferent to the market.',
  },
  'fa.costRatioTitle': { vi: 'Chi phí / NAV (%)', en: 'Costs as a share of NAV (%)' },
  'fa.legend.mgmtRatio': { vi: 'Phí quản lý/NAV (2265)', en: 'Management fee / NAV (2265)' },
  'fa.legend.totalRatio': { vi: 'Tổng chi phí/NAV (2269)', en: 'Total costs / NAV (2269)' },
  'fa.costRatioNote': {
    vi: 'Chi phí so với NAV bình quân, tính theo năm: phí quản lý ~1,95%, tổng chi phí ~2,1%. Đây là phần ăn mòn hàng năm của quỹ. 2022 nhích lên vì NAV giảm mạnh, không phải vì phí tăng.',
    en: 'Costs against average NAV, annualised: about 1.95% for the management fee and 2.1% in total. That is the yearly erosion. The 2022 uptick is because NAV fell sharply, not because fees rose.',
  },
  'fa.turnoverNote': {
    vi: 'Portfolio turnover rate — tỷ lệ danh mục được mua-bán trong kỳ (2270). 07/2026 đạt 683,99%, tức quỹ giao dịch gần 7 lần giá trị danh mục trong 12 tháng gần nhất. Cao nghĩa là quản lý chủ động xoay vòng; xem chart "Lãi/lỗ thực hiện" để thấy đợt bán lớn tương ứng.',
    en: 'Portfolio turnover — how much of the book was bought and sold over the period (2270). July 2026 hit 683.99%, meaning the fund traded nearly seven times the portfolio’s value over the trailing twelve months. A high figure means active rotation; the realized gains chart shows the corresponding sales.',
  },
  'fa.redFlagsIntro': {
    vi: 'Những con số này ít ai đọc, nhưng chúng nói về rủi ro thật. Quỹ mở về nguyên tắc không dùng đòn bẩy; nếu nợ phải trả tăng vọt, cần hỏi vì sao. Tiền thu từ bán chứng khoán chưa về nhiều nghĩa là dòng tiền đang kẹt ở khâu thanh toán. So AUM với dòng tiền: AUM tăng mà dòng tiền âm kéo dài là dấu hiệu đáng ngờ, có thể giá trị tài sản đang được định giá lại chứ không phải tiền thật vào.',
    en: 'Few people read these numbers, but they are where the real risk shows. Open-ended funds are not supposed to use leverage, so a jump in liabilities deserves a question. A large unsettled receivable from share sales means cash is stuck in settlement. And compare AUM against flows: AUM rising while flows stay negative is a warning — the asset values may be getting marked up rather than real money coming in.',
  },
  'fa.liabilitiesTitle': { vi: 'Nợ phải trả', en: 'Liabilities' },
  'fa.liabilitiesLabel': { vi: 'Nợ phải trả', en: 'Liabilities' },
  'fa.liabNote1': {
    vi: 'Quỹ mở Việt Nam theo nguyên tắc không đòn bẩy. Quỹ không vay nợ để đầu tư. Khoản "nợ phải trả" này là nợ hoạt động:',
    en: 'Vietnamese open-ended funds are by rule unleveraged; they do not borrow to invest. These "liabilities" are operating ones:',
  },
  'fa.liabNote2': { vi: '1. Tiền phải trả nhà đầu tư mua lại chứng chỉ.', en: '1. Money owed to investors redeeming certificates.' },
  'fa.liabNote3': { vi: '2. Phí quản lý, phí lưu ký chưa thanh toán.', en: '2. Unpaid management and custody fees.' },
  'fa.liabNote4': { vi: '3. Chi phí khác còn treo.', en: '3. Other outstanding expenses.' },
  'fa.liabNote5': {
    vi: 'Số này nhỏ là sạch. Nó phình lên vào tháng có đợt rút vốn lớn, rồi tự xẹp khi quỹ trả tiền xong. Chỉ lo khi nó tăng vọt bất thường mà không rõ lý do.',
    en: 'A small figure is clean. It swells in months with big redemptions and deflates once the fund pays out. Only worry if it spikes with no obvious reason.',
  },
  'fa.liabNote6': {
    vi: 'DCDS 07/2026 có 248 tỷ nợ, khoảng 4% tài sản. Thực ra con số này đang giảm: từ 517 tỷ hồi tháng 3 xuống 248 tỷ. Nghĩa là các đợt mua lại lớn đã được thanh toán dần. Không có gì bất thường.',
    en: 'DCDS in July 2026 carried 248bn of liabilities, about 4% of assets — and falling, down from 517bn in March. The large redemptions have been settling down. Nothing unusual.',
  },
  'fa.receivableTitle': { vi: 'Phải thu từ bán chứng khoán chưa về', en: 'Unsettled receivables from share sales' },
  'fa.receivableLabel': { vi: 'Phải thu bán CK', en: 'Sale receivables' },
  'fa.recvNote1': {
    vi: 'Bán cổ phiếu xong, tiền không về ngay. Phải chờ thanh toán vài ngày. Khoản đang chờ đó nằm ở đây (2208).',
    en: 'When the fund sells shares the cash does not arrive immediately; settlement takes a few days. What is in transit sits here (2208).',
  },
  'fa.recvNote2': { vi: 'Số này nhỏ là bình thường. Cao nghĩa là một trong hai chuyện:', en: 'A small figure is normal. A high one means one of two things:' },
  'fa.recvNote3': { vi: '1. Quỹ đang bán khối lượng lớn, tiền đang trên đường về.', en: '1. The fund is selling heavily and the cash is on its way.' },
  'fa.recvNote4': { vi: '2. Thanh toán bị kẹt, tiền mắc ở khâu trung gian.', en: '2. Settlement is stuck and the money is caught in the middle.' },
  'fa.recvNote5': {
    vi: 'Rủi ro thật nằm ở chuyện thứ 2: đối tác không trả tiền. Giao dịch càng to, mất càng đau.',
    en: 'The real risk is the second one: a counterparty that does not pay. The larger the trade, the more it hurts.',
  },
  'fa.recvNote6': {
    vi: 'DCDS tháng 7/2026 có 334 tỷ đang chờ về, cả năm dao động 178 tới 365 tỷ. Con số cao, nhưng lý do chính là quỹ bán mạnh trong thị trường giảm (lãi thực hiện âm 267 tỷ cùng tháng). Tiền về trễ không phải là thảm họa, chỉ là tín hiệu quỹ đang bán nhiều. Kết hợp với chart Lãi/lỗ thực hiện mới ra câu chuyện đầy đủ.',
    en: 'DCDS had 334bn in transit in July 2026, ranging from 178bn to 365bn across the year. That is high, but mostly because the fund was selling heavily into a falling market — realized losses were 267bn the same month. Slow settlement is not a disaster, just a sign of heavy selling. Read it alongside the realized gains chart for the full picture.',
  },
  'fa.aumFlowTitle': { vi: 'Độ lệch pha AUM và dòng tiền', en: 'AUM versus flows' },
  'fa.legend.aumLeft': { vi: 'AUM (trái)', en: 'AUM (left)' },
  'fa.legend.flowRight': { vi: 'Dòng tiền (phải)', en: 'Flows (right)' },
  'fa.aumFlowNote1': { vi: 'Mỗi tháng, AUM được tính bằng:', en: 'Each month, AUM is made up of:' },
  'fa.aumFlowNote2': { vi: '1. Tiền mới nhà đầu tư nạp vào hay rút ra (đường dòng tiền).', en: '1. Money investors put in or took out (the flows line).' },
  'fa.aumFlowNote3': { vi: '2. Lợi nhuận đầu tư, tức giá tài sản lên hay xuống.', en: '2. Investment profit — whether asset prices rose or fell.' },
  'fa.aumFlowNote4': { vi: 'Hai đường chạy ngược nhau là có chuyện:', en: 'When the two lines diverge, something is going on:' },
  'fa.aumFlowNote5': { vi: '1. AUM lên mà dòng tiền âm: tăng nhờ GIÁ tài sản, vốn đang chảy ra.', en: '1. AUM up while flows are negative: growth came from PRICES, and capital is leaving.' },
  'fa.aumFlowNote6': { vi: '2. AUM xuống mà dòng tiền dương: hút được vốn nhưng giá giảm mạnh hơn.', en: '2. AUM down while flows are positive: money is coming in, but prices are falling faster.' },
  'fa.aumFlowNote7': { vi: '3. Cả 2 cùng lên: khỏe. Cùng xuống: xấu.', en: '3. Both rising: healthy. Both falling: not.' },
  'fa.aumFlowNote8': { vi: 'DCDS năm nay đang ở mục 2:', en: 'DCDS this year is in case 2:' },
  'fa.aumFlowNote9': { vi: '1. Hút gần 838 tỷ tiền mới trong 7 tháng, chỉ một tháng rút nhẹ.', en: '1. Nearly 838bn of new money over seven months, with only one month of small outflows.' },
  'fa.aumFlowNote10': { vi: '2. Tổng tài sản vẫn tụt: 6.311 tỷ (tháng 2) → 5.723 tỷ (tháng 7).', en: '2. Total assets still fell: 6,311bn in February down to 5,723bn in July.' },
  'fa.aumFlowNote11': { vi: '3. Vì lợi nhuận đầu tư âm 652 tỷ, thị trường giảm 17% so với đỉnh.', en: '3. Because investment profit was minus 652bn, with the market 17% below its peak.' },
  'fa.aumFlowNote12': { vi: '4. Người mua ở đỉnh, một chứng chỉ giá 112 nghìn, giờ còn 93 nghìn.', en: '4. Anyone who bought at the top paid 112,000 a certificate; it is now 93,000.' },
  'fa.aumFlowNote13': {
    vi: 'Tiền vào nhiều không cứu được sự sụt giảm của tài sản. Hút vốn là chuyện của phân phối, làm ra tiền mới là chuyện của đầu tư. Chart này chỉ tách hai chuyện đó ra, để bạn không nhầm.',
    en: 'Inflows do not rescue falling assets. Raising money is a distribution achievement; making money is an investment one. This chart separates the two so you do not confuse them.',
  },

  // Fund Analysis — phân tích theo danh mục (quỹ chưa có báo cáo tài chính)
  'fh.scopeNote': {
    vi: '<b>Phân tích theo danh mục.</b> ',
    en: '<b>Holdings-based analysis.</b> ',
  },
  'fh.managedBy': { vi: 'Quỹ do <b>{house}</b> quản lý. ', en: 'Managed by <b>{house}</b>. ' },
  'fh.sourceNote': {
    vi: 'Dữ liệu danh mục từ {source}, hiệu suất tính từ chuỗi giá NAV/CCQ. Các phần cần báo cáo tài chính tháng (dòng tiền vào/ra, phí quản lý, vòng quay danh mục, số nhà đầu tư, red flags) chỉ có ở quỹ Dragon Capital — nơi báo cáo được công bố dưới dạng file bóc tách được.',
    en: 'Holdings data comes from {source}; performance is computed from the NAV-per-unit series. The sections that need monthly financial reports — flows, management fees, turnover, investor counts, red flags — exist only for Dragon Capital funds, whose reports are published in a machine-readable form.',
  },
  'fh.sourceTopTen': { vi: 'fmarket (chỉ top 10 khoản nắm giữ)', en: 'fmarket (top 10 holdings only)' },
  'fh.sourceFull': { vi: 'digiinvest (danh mục đầy đủ)', en: 'digiinvest (full portfolio)' },
  'fh.loadFailed': { vi: 'Không tải được dữ liệu danh mục của quỹ này.', en: 'Could not load this fund’s holdings data.' },
  'fh.navTitle': { vi: 'NAV/CCQ (giá quỹ)', en: 'NAV per unit' },
  'fh.noPriceSeries': { vi: 'Chưa có chuỗi giá cho quỹ này.', en: 'No price series for this fund yet.' },
  'fh.navNote': { vi: 'Giá trị tài sản ròng trên mỗi chứng chỉ quỹ — giá bạn mua/bán.', en: 'Net asset value per certificate — the price you buy and sell at.' },
  'fh.cagrSince': { vi: ' CAGR từ đầu: <b>{v}</b>.', en: ' CAGR since inception: <b>{v}</b>.' },
  'fh.noDrawdownData': { vi: 'Chưa đủ dữ liệu giá để tính drawdown.', en: 'Not enough price data to compute drawdown.' },
  'fh.ddNote': {
    vi: 'Khoảng cách từ đỉnh cao nhất trước đó. Đáy sâu nhất lịch sử:{deepest}.',
    en: 'Distance below the previous high. Deepest on record:{deepest}.',
  },
  'fh.noHoldings': { vi: 'Quỹ này chưa có dữ liệu danh mục.', en: 'This fund has no holdings data yet.' },
  'fh.allocTitle': { vi: 'Phân bổ tài sản', en: 'Asset allocation' },
  'fh.noAllocData': { vi: 'Kỳ này không có dữ liệu phân bổ.', en: 'No allocation data for this period.' },
  'fh.allocNote': { vi: 'Tỷ trọng theo loại tài sản, kỳ {period}.', en: 'Weight by asset class for {period}.' },
  'fh.topTenCaveat': {
    vi: ' Nguồn fmarket chỉ công bố top 10 nên tổng tỷ trọng không đủ 100%.',
    en: ' fmarket publishes only the top 10, so the weights do not add to 100%.',
  },
  'fh.portfolioTitle': { vi: 'Danh mục quỹ ({n} mã)', en: 'Fund portfolio ({n} holdings)' },
  'fh.col.type': { vi: 'Loại', en: 'Type' },
  'fh.noHoldingsPeriod': { vi: 'Kỳ này không có khoản nắm giữ nào.', en: 'No holdings recorded for this period.' },

  // Red flags: cỗ máy giao dịch
  'rf.status.ok': { vi: 'Bình thường', en: 'Normal' },
  'rf.status.watch': { vi: 'Cần chú ý', en: 'Worth watching' },
  'rf.status.danger': { vi: 'Nguy hiểm', en: 'Dangerous' },
  'rf.status.na': { vi: 'Thiếu dữ liệu', en: 'No data' },
  'rf.tradingMachine.title': { vi: 'Cỗ máy giao dịch', en: 'The trading machine' },
  'rf.tm.note1': { vi: 'Mỗi tháng, quỹ phải trả 2 loại phí:', en: 'Every month the fund pays two kinds of fee:' },
  'rf.tm.note2': { vi: '1. Phí quản lý (2225): tính theo % NAV, trừ đều mỗi ngày. Chắc chắn mất.', en: '1. Management fee (2225): a percentage of NAV, deducted daily. Certain to be paid.' },
  'rf.tm.note3': { vi: '2. Phí giao dịch (2231): mỗi lần mua bán cổ phiếu. Tỉ lệ với turnover.', en: '2. Brokerage fee (2231): charged on every trade. It scales with turnover.' },
  'rf.tm.note4': {
    vi: 'Turnover là quỹ xoay danh mục bao nhiêu lần trong 12 tháng. Xoay nhiều, phí giao dịch phình, đây là loại phí bạn không thấy trên bảng giá và nó sẽ trừ dần vào NAV, phản ánh lên giá chứng chỉ quỹ.',
    en: 'Turnover is how many times the fund rotates its portfolio over twelve months. More rotation means bigger brokerage fees — a cost that never appears on any price screen, but comes out of NAV and shows up in the certificate price.',
  },
  'rf.tm.note5': {
    vi: 'DCDS 07/2026: phí giao dịch 6,06 tỷ, bằng 63% phí quản lý 9,66 tỷ. Turnover 684%, tức xoay gần 7 lần danh mục trong một năm.',
    en: 'DCDS in July 2026: 6.06bn of brokerage, 63% of the 9.66bn management fee. Turnover of 684% — nearly seven full rotations of the portfolio in a year.',
  },
  'rf.tm.note6': {
    vi: 'Giao dịch nhiều chưa chắc là giao dịch giỏi. Quỹ xoay càng mạnh, công ty chứng khoán càng vui. Bạn có vui không, phải nhìn lãi/lỗ thực hiện mới biết.',
    en: 'Trading a lot is not the same as trading well. The more the fund rotates, the happier the broker. Whether you should be happy depends on the realized gains.',
  },
  'rf.brokerage': { vi: 'Phí môi giới', en: 'Brokerage' },
  'rf.legend.brokerage': { vi: 'Phí môi giới (2231)', en: 'Brokerage fee (2231)' },
  'rf.legend.mgmt': { vi: 'Phí quản lý (2225)', en: 'Management fee (2225)' },
  'rf.ratio': { vi: 'Phí MG/FM: <b>{v}</b>', en: 'Brokerage / management: <b>{v}</b>' },
  'rf.turnover12m': { vi: 'Turnover 12T: <b>{v}%</b>', en: '12-month turnover: <b>{v}%</b>' },
  'rf.periodLabel': { vi: 'Tháng {month}/{year}', en: '{month}/{year}' },

  // ── DCA stats table ──
  'dcaStats.title': { vi: 'Bảng thống kê', en: 'Statistics' },
  'dcaStats.help': {
    vi: 'Tổng hợp các chỉ số hiệu suất của từng danh mục trên cùng 1 hàng để dễ so sánh.',
    en: 'Each portfolio’s headline metrics on one row, so they are easy to compare.',
  },
  'dcaStats.col.portfolio': { vi: 'Danh mục', en: 'Portfolio' },
  'dcaStats.col.finalValue': { vi: 'Giá trị cuối kỳ', en: 'Ending value' },
  'dcaStats.help.finalValue': { vi: 'Giá trị danh mục tại thời điểm cuối kỳ backtest.', en: 'The portfolio’s value at the end of the backtest period.' },
  'dcaStats.col.invested': { vi: 'Tổng đầu tư', en: 'Total invested' },
  'dcaStats.help.invested': {
    vi: 'Tổng số tiền đã nạp vào danh mục (vốn ban đầu + tất cả các lần DCA).',
    en: 'Every dong paid into the portfolio: the initial capital plus every DCA contribution.',
  },
  'dcaStats.col.cumReturn': { vi: 'Lợi nhuận tích lũy', en: 'Cumulative return' },
  'dcaStats.help.cumReturn': {
    vi: 'Lợi nhuận tích lũy trong kỳ backtest (giá trị cuối kỳ ÷ tổng đầu tư − 1).',
    en: 'Cumulative return over the backtest: ending value ÷ total invested − 1.',
  },
  'dcaStats.help.cagr': {
    vi: 'Lợi nhuận tích lũy quy năm: (Giá trị cuối ÷ Tổng đầu tư)^(1/số năm) − 1. Cho biết nếu danh mục tăng đều mỗi năm thì mỗi năm lãi bao nhiêu %. Lưu ý: chỉ số này thường thấp hơn MWRR trong DCA vì giả định toàn bộ vốn đã hoạt động từ đầu.',
    en: 'The cumulative return annualised: (ending value ÷ total invested)^(1/years) − 1. It tells you the equal yearly return that lands on the same result. Note that for DCA this usually reads lower than MWRR, because it assumes all the capital was working from day one.',
  },
  'dcaStats.help.mwrr': {
    vi: 'Money-Weighted Rate of Return: lợi nhuận thực tế của nhà đầu tư, tính đến thời điểm và số tiền từng lần nạp (IRR). Chỉ số chính để đánh giá hiệu quả chiến lược DCA. Thường cao hơn CAGR vì nhận ra rằng phần lớn vốn DCA chỉ hoạt động trong thời gian ngắn hơn toàn kỳ.',
    en: 'Money-weighted rate of return: what the investor actually earned, counting the date and size of every contribution (the IRR). This is the main measure of a DCA strategy. It usually reads higher than CAGR because it recognises that most DCA capital was invested for less than the full period.',
  },
  'dcaStats.col.maxDD': { vi: 'Sụt giảm tối đa', en: 'Max drawdown' },
  'dcaStats.help.maxDD': {
    vi: 'Mức sụt giảm tối đa CỦA CHÍNH QUỸ (TWRR, đã tách khỏi ảnh hưởng dòng tiền DCA): mức giảm lớn nhất tính từ đỉnh giá quỹ. Đây là "bão thị trường thật", thường sâu hơn mức sụt giảm bạn thực sự trải nghiệm trên số dư tài khoản. Xem "Kiên trì qua bão" bên dưới để so sánh 2 con số.',
    en: 'The maximum drawdown OF THE FUND ITSELF (TWRR, separated from DCA cash flows): the largest fall from the fund’s peak price. This is the real market storm, usually deeper than what you actually experienced in your balance. See "Riding out the storm" below for the two side by side.',
  },
  'dcaStats.col.avgDD': { vi: 'Sụt giảm TB', en: 'Avg drawdown' },
  'dcaStats.help.avgDD': {
    vi: 'Trung bình mức sụt giảm CỦA CHÍNH QUỸ (TWRR) so với đỉnh, tính trên tất cả các ngày trong kỳ (ngày lập đỉnh mới tính là 0%). Đây là mức "chìm dưới đỉnh" của quỹ, không phải của số dư tài khoản bạn.',
    en: 'The average drawdown OF THE FUND ITSELF (TWRR) below its peak, across every day in the period (a day at a new high counts as 0%). This is how far below its peak the fund typically sat — not your account balance.',
  },
  'dcaStats.col.longestDD': { vi: 'Dưới đỉnh lâu nhất', en: 'Longest underwater' },
  'dcaStats.help.longestDD': {
    vi: 'Khoảng thời gian dài nhất GIÁ QUỸ (TWRR) nằm dưới đỉnh cũ, tính từ lúc lập đỉnh đến khi vượt lại đỉnh đó. Đây là khoảng thời gian thử thách sự kiên nhẫn nhất của nhà đầu tư.',
    en: 'The longest stretch the FUND PRICE (TWRR) spent below an old peak, from setting that peak to reclaiming it. This is the stretch that tests an investor’s patience most.',
  },
  'dcaStats.col.volatility': { vi: 'Biến động', en: 'Volatility' },
  'dcaStats.help.volatility': {
    vi: 'Độ lệch chuẩn quy năm của lợi nhuận quỹ (TWRR). Con số càng cao, giá trị danh mục dao động càng mạnh, hành trình càng "xóc".',
    en: 'The annualised standard deviation of the fund’s returns (TWRR). The higher it is, the more the portfolio value swings and the bumpier the ride.',
  },
  'dcaStats.help.profitFactor': {
    vi: 'Tổng lợi nhuận các phiên tăng ÷ tổng lỗ các phiên giảm. Lớn hơn 1 = tổng lời nhiều hơn tổng lỗ. Ví dụ: 1.5× nghĩa là cứ 1 đồng lỗ thì lời được 1.5 đồng.',
    en: 'Total gains on up sessions ÷ total losses on down sessions. Above 1 means gains outweigh losses. For example 1.5× means every dong of loss is matched by 1.5 dong of gain.',
  },
  'dcaStats.years': { vi: '{v} năm', en: '{v} yr' },
  'dcaStats.months': { vi: '{v} tháng', en: '{v} mo' },
  'dcaStats.days': { vi: '{v} ngày', en: '{v} days' },

  // ── DCA journey block ──
  'journey.headlineSingle': {
    vi: 'Trong suốt <b>{period}</b>, đều đặn mỗi tháng bạn để dành một khoản tiền để mua <b>{name}</b>. Tổng cộng đã đầu tư <b>{invested}</b>.',
    en: 'Over <b>{period}</b> you set money aside every month to buy <b>{name}</b>, investing <b>{invested}</b> in total.',
  },
  'journey.stat.invested': { vi: 'Tổng tiền đã đầu tư', en: 'Total invested' },
  'journey.stat.value': { vi: 'Tổng giá trị danh mục', en: 'Portfolio value' },
  'journey.stat.profit': { vi: 'Lợi nhuận', en: 'Profit' },
  'journey.takeaway.gain': {
    vi: '<b>Sau {period}, danh mục lời {pct}% tương đương {profit}</b>, bằng <b>{comparison}</b>. Đó là khoản sinh ra nhờ bạn đầu tư đều đặn qua từng tháng, không cần đoán đỉnh đoán đáy thị trường.',
    en: '<b>After {period} the portfolio is up {pct}%, or {profit}</b> — the price of <b>{comparison}</b>. That came from contributing month after month, without calling a single top or bottom.',
  },
  'journey.takeaway.gainNoComparison': {
    vi: '<b>Sau {period}, danh mục lời {pct}% tương đương {profit}</b>. Đó là khoản sinh ra nhờ bạn đầu tư đều đặn qua từng tháng, không cần đoán đỉnh đoán đáy thị trường.',
    en: '<b>After {period} the portfolio is up {pct}%, or {profit}</b>. That came from contributing month after month, without calling a single top or bottom.',
  },
  'journey.takeaway.loss': {
    vi: 'Sau <b>{period}</b>, danh mục vẫn đang lỗ <b>{pct}%</b>. Thị trường chứng khoán Việt Nam là thị trường cận biên, từ bull sang bear diễn ra chóng vánh. Giai đoạn đầu DCA không suôn sẻ là điều bình thường. Có thể bạn đang rơi vào vùng trũng tương tự 2018-2019 hoặc sau COVID 3/2020. Thử chọn khoảng thời gian dài hơn để thấy bức tranh đầy đủ hơn.',
    en: 'After <b>{period}</b> the portfolio is still down <b>{pct}%</b>. Vietnam is a frontier market and the turn from bull to bear is abrupt. A rough opening stretch of DCA is normal — you may be in a trough like 2018–2019 or the one after COVID in March 2020. Try a longer time range to see the fuller picture.',
  },
  'journey.headlineMulti': {
    vi: 'Cùng một lịch nạp tiền, cùng trải qua <b>{period}</b>, nhưng <b>{n} danh mục</b> lại cho kết quả rất khác nhau.',
    en: 'Same contribution schedule, same <b>{period}</b>, and yet the <b>{n} portfolios</b> land in very different places.',
  },
  'journey.rankLine': { vi: 'Nạp {invested}, lời', en: 'Put in {invested}, gained' },
  'journey.gap': {
    vi: 'Chênh lệch giữa <b>{winner}</b> và <b>{loser}</b> là ',
    en: 'The gap between <b>{winner}</b> and <b>{loser}</b> is ',
  },
  'journey.gapComparison': { vi: ', bằng <b>{thing}</b>', en: ' — the price of <b>{thing}</b>' },
  'journey.gapTail': {
    vi: ' Cùng số tiền, cùng khoảng thời gian, nhưng chọn quỹ khác nhau thì kết cục cũng khác nhau. Đó là lý do vì sao lựa chọn quỹ lại quan trọng đến vậy.',
    en: ' Same money, same period, different fund, different outcome. That is why the choice of fund matters as much as it does.',
  },
  'journey.eoy.title': { vi: 'Hiệu suất danh mục của bạn từng năm', en: 'Your portfolio’s performance by year' },
  'journey.eoy.intro': {
    vi: 'Bảng này tính hiệu suất <b>có tính đến dòng tiền bạn thực sự nạp</b> (Modified Dietz method), không phải hiệu suất "nếu đầu tư 1 lần từ đầu" của bản thân quỹ. Tiền nạp càng sớm trong năm càng được tính trọng số cao (có nhiều thời gian sinh lời hơn), tiền nạp cuối năm gần như chưa kịp sinh lời. Nhờ vậy con số này phản ánh đúng trải nghiệm DCA thực tế của bạn, thay vì chỉ đo giá quỹ tăng/giảm bao nhiêu. Cột "Giá trị" là số dư danh mục tại điểm cuối năm đó (đã gồm mọi lần nạp tính đến lúc đó).',
    en: 'This table measures performance <b>counting the money you actually contributed</b> (the Modified Dietz method), not the fund’s own "if you had invested once at the start" return. Money contributed early in the year carries a higher weight because it had more time to earn; money contributed in December has barely earned anything. That makes the figure reflect your real DCA experience rather than just the fund’s price move. The "Value" column is the portfolio balance at that year end, including every contribution up to that point.',
  },
  'journey.eoy.year': { vi: 'Năm', en: 'Year' },
  'journey.eoy.gap': { vi: 'Chênh lệch', en: 'Gap' },
  'journey.eoy.return': { vi: 'Lợi nhuận', en: 'Return' },
  'journey.eoy.value': { vi: 'Giá trị', en: 'Value' },
  'journey.eoy.points': { vi: '{v} điểm %', en: '{v} pts' },
  'journey.eoy.footnote': {
    vi: '* Năm chưa đủ dữ liệu trọn năm (năm đầu hoặc năm cuối của khoảng so sánh).',
    en: '* A year without a full year of data (the first or last year of the comparison range).',
  },
  'journey.eoy.gapFootnote': {
    vi: ' "Chênh lệch" = lợi nhuận danh mục thứ 2 trừ danh mục thứ 1, tính bằng điểm phần trăm.',
    en: ' "Gap" is the second portfolio’s return minus the first’s, in percentage points.',
  },
  'journey.period.days': { vi: '{n} ngày', en: '{n} days' },
  'journey.period.months': { vi: '{n} tháng', en: '{n} months' },
  'journey.period.years': { vi: '{n} năm', en: '{n} years' },
  'journey.period.yearsMonths': { vi: '{y} năm {m} tháng', en: '{y} years {m} months' },

  // ── DCA ratio chart ──
  'ratio.title': { vi: 'Danh mục nào đang dẫn trước?', en: 'Which portfolio is ahead?' },
  'ratio.help': {
    vi: 'Tỷ số giá trị giữa 2 danh mục theo thời gian. Đường đi lên nghĩa là danh mục thứ nhất đang tăng nhanh hơn (hoặc giảm chậm hơn) danh mục thứ hai, kể cả khi cả hai cùng tăng hay cùng giảm.',
    en: 'The ratio of the two portfolios’ values over time. A rising line means the first is growing faster (or falling more slowly) than the second — even when both are rising or both falling.',
  },
  'ratio.intro': {
    vi: 'Hai đường giá trị chồng lên nhau rất khó nhìn ra giai đoạn nào danh mục nào mạnh hơn. Biểu đồ này lấy giá trị ',
    en: 'Two value lines on top of each other make it hard to see which portfolio was stronger when. This chart divides the value of ',
  },
  'ratio.introTail': {
    vi: ': đường đi lên là danh mục thứ nhất đang mạnh hơn trong giai đoạn đó, đi xuống là ngược lại.',
    en: ': the line rises when the first is the stronger of the two over that stretch, and falls when it is the other way round.',
  },
  'ratio.vs': { vi: 'so với', en: 'versus' },
  'ratio.seriesName': { vi: 'Tỷ số giá trị', en: 'Value ratio' },
  'ratio.winsLabel': { vi: '{name} thắng', en: '{name} ahead' },
  'ratio.narrative1': {
    vi: 'Nhìn suốt cả giai đoạn, <b>{nameA}</b> chiến thắng {pctA}% thời gian, <b>{nameB}</b> chiến thắng {pctB}% thời gian còn lại.',
    en: 'Across the whole period <b>{nameA}</b> was ahead {pctA}% of the time and <b>{nameB}</b> the remaining {pctB}%.',
  },
  'ratio.narrative2': {
    vi: 'Giai đoạn chiến thắng dài nhất thuộc về <b>{name}</b>, kéo dài liên tục khoảng {duration} (từ {from} đến {to}).',
    en: 'The longest unbroken run belongs to <b>{name}</b>, lasting about {duration} (from {from} to {to}).',
  },
  'ratio.narrative3': {
    vi: 'Hiện tại <b>{name}</b> đang chiến thắng, giữ vững từ {from} đến nay.',
    en: 'Right now <b>{name}</b> is ahead, and has been since {from}.',
  },
  'ratio.narrative4': {
    vi: 'Không có gì đảm bảo thứ tự này sẽ giữ nguyên. Thị trường cận biên như Việt Nam có thể đổi ngôi chóng vánh, nên đừng neo quá chặt vào con số dẫn đầu hiện tại.',
    en: 'Nothing guarantees this order holds. A frontier market like Vietnam can swap places quickly, so do not anchor too hard on whoever is leading today.',
  },
  'ratio.days': { vi: '{n} ngày', en: '{n} days' },
  'ratio.months': { vi: '{n} tháng', en: '{n} months' },
  'ratio.years': { vi: '{n} năm', en: '{n} years' },

  // ── DCA return explainer (CAGR vs MWRR) ──
  'explainer.title': { vi: 'Vì sao có 2 con số lợi nhuận khác nhau (CAGR vs MWRR)?', en: 'Why are there two different return figures (CAGR vs MWRR)?' },
  'explainer.intro': {
    vi: 'Nhiều nhà đầu tư nhìn thấy 2 con số lợi nhuận chênh lệch nhau và bối rối: <i>"Tôi đã đầu tư tổng cộng 108 triệu đồng... nếu mà tăng trưởng 30%/năm thì không thể nào tôi chỉ có 168 triệu được. Quá vô lý!"</i> Thật ra cả hai đều đúng, chỉ là đo khác nhau.',
    en: 'Plenty of investors see two different return figures and get confused: <i>"I put in 108 million in total… if it grew 30% a year there is no way I would only have 168 million. That makes no sense!"</i> In fact both figures are right; they measure different things.',
  },
  'explainer.perYear': { vi: '{v}%/năm', en: '{v}%/yr' },
  'explainer.cagrAnswers': {
    vi: 'Trả lời: <i>"Toàn bộ số tiền tôi đã đầu tư đã tăng trưởng bao nhiêu phần trăm mỗi năm?"</i> Giả định tất cả vốn đã hoạt động từ ngày đầu tiên.',
    en: 'It answers: <i>"By what percentage per year did everything I invested grow?"</i> It assumes all the capital was working from day one.',
  },
  'explainer.mwrrAnswers': {
    vi: 'Trả lời: <i>"Từng khoản tôi nạp vào tăng trưởng trung bình bao nhiêu phần trăm mỗi năm?"</i> Chiết khấu từng dòng tiền theo thời gian thực tế nắm giữ.',
    en: 'It answers: <i>"On average, by what percentage per year did each contribution grow?"</i> It discounts every cash flow by how long it was actually held.',
  },
  'explainer.analogyTitle': { vi: '🌱 Ví dụ "cây giống"', en: '🌱 The "saplings" analogy' },
  'explainer.analogy1': {
    vi: 'Mỗi tháng bạn dành ra một khoản tiền để mua cây giống về trồng. Hãy xem mỗi cái cây là một khoản đầu tư.',
    en: 'Each month you set aside some money to buy saplings and plant them. Think of every tree as one investment.',
  },
  'explainer.analogy2': {
    vi: 'Sau ba năm, bạn bán hết số cây đang có. Tổng số tiền bán được xem như là doanh thu từ khoản đầu tư. Câu hỏi đặt ra là: <i>"Làm sao bạn biết khoản đầu tư này tốt tới đâu?"</i>',
    en: 'After three years you sell every tree you have. The total is the proceeds of the investment. The question is: <i>how do you tell how good that investment was?</i>',
  },
  'explainer.analogyCagr': {
    vi: '<b>CAGR</b> coi như bạn có đủ tiền từ đầu để mua tất cả cây trong ngày đầu tiên. Chia lợi nhuận cuối cùng cho tổng vốn, quy về hằng năm.',
    en: '<b>CAGR</b> pretends you had enough money on day one to buy every tree at once. It divides the final gain by total capital and annualises.',
  },
  'explainer.analogyMwrr': {
    vi: '<b>MWRR</b> tính tăng trưởng của <i>từng cái cây riêng biệt</i>. Cây trồng lâu có nhiều thời gian sinh trưởng sẽ mang về nhiều tiền hơn cây mới mua.',
    en: '<b>MWRR</b> measures the growth of <i>each tree separately</i>. A tree planted long ago had more time to grow and brings in more than one bought recently.',
  },
  'explainer.dcaPoint': {
    vi: 'Với DCA, khoản tiền bạn nạp tháng đầu tiên đã nắm giữ nhiều năm, nhưng khoản tiền tháng trước chỉ mới nắm giữ vài tuần. MWRR nhận ra điều này nên ',
    en: 'With DCA, the money you contributed in the first month has been held for years, while last month’s has been held for weeks. MWRR recognises that, so it ',
  },
  'explainer.mwrrHigher': {
    vi: 'thường cao hơn CAGR. Trong ví dụ của bạn, MWRR cao hơn CAGR <b>{gap}%/năm</b>.',
    en: 'usually reads above CAGR. In your case MWRR is <b>{gap}%/yr</b> higher than CAGR.',
  },
  'explainer.mwrrGap': {
    vi: 'chênh lệch với CAGR khoảng <b>{gap}%/năm</b>.',
    en: 'differs from CAGR by about <b>{gap}%/yr</b>.',
  },
  'explainer.whichToUse': {
    vi: '<b>Nên nhìn con số nào?</b> Nếu bạn muốn biết tiền của mình thực tế đã tăng trưởng ra sao, <b>MWRR là chỉ số chính cho chiến lược DCA</b>. Nhưng nếu bạn quen so sánh với các hình thức đầu tư khác (gửi tiết kiệm, trái phiếu) thì CAGR vẫn hữu ích. Nó trả lời câu hỏi đơn giản hơn: <i>"toàn bộ số tiền tôi đã đầu tư tăng bao nhiêu phần trăm mỗi năm?"</i>',
    en: '<b>Which should you look at?</b> If you want to know how your money actually grew, <b>MWRR is the main measure for a DCA strategy</b>. But if you are used to comparing against other options — bank savings, bonds — CAGR is still useful. It answers the simpler question: <i>by what percentage per year did everything I invested grow?</i>',
  },

  // ── Dividend block ──
  'div.divider': { vi: 'Cổ tức & tái đầu tư', en: 'Dividends & reinvestment' },
  'div.intro': {
    vi: 'Trong kỳ DCA này, quỹ <b>{funds}</b> đã chi trả cổ tức. Dashboard đã điều chỉnh giá để phản ánh giả định tái đầu tư sau thuế TNCN, nên hiệu suất bạn thấy ở mọi biểu đồ đã bao gồm phần lợi nhuận từ cổ tức.',
    en: '<b>{funds}</b> paid dividends during this DCA period. Prices are adjusted to assume reinvestment after personal income tax, so the performance on every chart already includes the dividend return.',
  },
  'div.fundHeading': { vi: 'Quỹ <b>{fund}</b> — {n} đợt chi trả trong kỳ', en: '<b>{fund}</b> — {n} payouts in the period' },
  'div.afterTax': { vi: '(đã trừ thuế TNCN)', en: '(after personal income tax)' },
  'div.col.exDate': { vi: 'Ngày chốt quyền', en: 'Ex-date' },
  'div.col.payDate': { vi: 'Ngày nhận tiền', en: 'Pay date' },
  'div.col.grossPerUnit': { vi: 'Cổ tức/ccq (gross)', en: 'Dividend/unit (gross)' },
  'div.col.netPerUnit': { vi: 'Cổ tức/ccq (net)', en: 'Dividend/unit (net)' },
  'div.portfolioName': { vi: 'Danh mục: {name}', en: 'Portfolio: {name}' },
  'div.col.exShort': { vi: 'Ngày chốt', en: 'Ex-date' },
  'div.col.payShort': { vi: 'Ngày nhận', en: 'Paid' },
  'div.col.perUnit': { vi: 'Cổ tức/ccq', en: 'Dividend/unit' },
  'div.col.unitsHeld': { vi: 'CCQ đang nắm', en: 'Units held' },
  'div.col.grossCash': { vi: 'Tiền mặt trước thuế', en: 'Cash before tax' },
  'div.col.tax': { vi: 'Thuế TNCN', en: 'Income tax' },
  'div.col.netCash': { vi: 'Tiền mặt thực nhận', en: 'Cash received' },
  'div.col.reinvested': { vi: 'Mua thêm', en: 'Reinvested' },
  'div.total': { vi: 'Tổng', en: 'Total' },
  'div.navNote': {
    vi: '<b>Giải thích giá NAV.</b> Giá NAV trên fmarket giảm đúng bằng giá trị cổ tức vào ngày chốt quyền. Đây là raw NAV (giá thô), không phải chuỗi giá đã được điều chỉnh cho cổ tức. Một số nền tảng tự tính lại lịch sử giá để xóa cú giảm điểm do cổ tức, cho ra chuỗi "tổng hiệu suất" đã bao gồm giả định tái đầu tư cổ tức. Nhưng trên Fmarket (hay website của quỹ) thì không làm việc này mà họ chỉ cung cấp raw NAV. Dữ liệu giá trên dashboard đã được điều chỉnh dựa trên các đợt chia cổ tức để đảm bảo tính nhất quán. Hệ số điều chỉnh được tính toán dựa trên giá trước ngày chốt quyền và giá trị cổ tức thực nhận (sau thuế TNCN).',
    en: '<b>About the NAV price.</b> The NAV shown on fmarket drops by exactly the dividend amount on the ex-date. That is the raw NAV, not a dividend-adjusted series. Some platforms rewrite price history to remove that drop, producing a total-return series that assumes dividends were reinvested; fmarket and the fund websites do not — they publish raw NAV only. The prices in this dashboard are adjusted for each payout so the series stays consistent, with the adjustment factor computed from the price before the ex-date and the dividend actually received after tax.',
  },

  // ── Gold lot warning ──
  'gold.warnTitle': { vi: 'Có kỳ không đủ tiền mua vàng ngay', en: 'Some periods cannot buy gold immediately' },
  'gold.warnSub': {
    vi: '{n} trường hợp có số tiền một kỳ/ban đầu thấp hơn giá 1 lô vàng nhỏ nhất (0,5 chỉ), tính ở cuối giai đoạn mô phỏng.',
    en: '{n} cases where the per-period or initial amount is below the price of the smallest gold lot (0.5 chỉ), measured at the end of the simulation.',
  },
  'gold.okTitle': { vi: 'Mỗi kỳ đều đủ tiền mua vàng ngay', en: 'Every period can buy gold immediately' },
  'gold.okSub': {
    vi: 'Số tiền nạp mỗi kỳ (và ban đầu, nếu có) vào phần vàng đều đủ mua ít nhất 1 lô 0,5 chỉ ngay trong kỳ đó.',
    en: 'Every contribution to the gold sleeve — and the initial amount, if any — buys at least one 0.5 chỉ lot within that period.',
  },
  'gold.intro1': {
    vi: 'Vàng miếng/nhẫn SJC không chia nhỏ vô hạn như quỹ mở hay cổ phiếu — ngoài đời bạn chỉ mua được theo lô cố định, nhỏ nhất là <b>0,5 chỉ</b> (1 lượng = 10 chỉ). ',
    en: 'SJC gold bars and rings are not infinitely divisible the way fund units or shares are — in practice you buy fixed lots, the smallest being <b>0.5 chỉ</b> (1 lượng = 10 chỉ). ',
  },
  'gold.intro2': {
    vi: 'Mô phỏng trong dashboard giả định mỗi kỳ đều mua được đúng lượng vàng tương ứng với số tiền đầu tư, kể cả khi số đó chưa đủ 1 lô.',
    en: 'The simulation assumes each period buys exactly the quantity of gold the money is worth, even when that is less than one lot.',
  },
  'gold.intro3': {
    vi: 'Ngoài đời, nếu tiền của một kỳ chưa đủ mua 1 lô, kỳ đó bạn chưa mua được vàng ngay — phải gộp thêm vài kỳ mới đủ tiền mua 1 lần. Cả hành trình bạn vẫn tích lũy được vàng, chỉ là mua thưa hơn (vài kỳ mới mua 1 lần) thay vì đều đặn mỗi kỳ như mô phỏng đang giả định. Giá vàng tăng theo thời gian nên đây thường là vấn đề của <b>hiện tại/gần đây</b>, không nhất thiết đúng cho toàn bộ giai đoạn mô phỏng.',
    en: 'In reality, if a period’s money does not cover a lot, you cannot buy gold that period — you save up across a few periods and buy once. You still accumulate gold over the whole journey, just in less frequent purchases than the simulation assumes. Gold prices rise over time, so this is usually a <b>recent</b> problem rather than one that held across the whole simulated period.',
  },
  'gold.issuesTitle': { vi: 'Chi tiết cảnh báo', en: 'Warning details' },
  'gold.issuePeriodic': {
    vi: 'Mỗi kỳ nạp vào phần vàng của danh mục này là <b>{amount}</b>, thấp hơn giá 1 lô 0,5 chỉ tại {date} (khoảng <b>{lotPrice}</b>) — nghĩa là kỳ đó bạn chưa mua được vàng ngay.',
    en: 'Each contribution to this portfolio’s gold sleeve is <b>{amount}</b>, below the price of a 0.5 chỉ lot on {date} (about <b>{lotPrice}</b>) — so you could not buy gold in that period.',
  },
  'gold.issueInitial': {
    vi: 'Số tiền đầu tư ban đầu vào phần vàng của danh mục này là <b>{amount}</b>, thấp hơn giá 1 lô 0,5 chỉ tại {date} (khoảng <b>{lotPrice}</b>) — nghĩa là bạn chưa mua được vàng ngay từ đầu.',
    en: 'The initial amount into this portfolio’s gold sleeve is <b>{amount}</b>, below the price of a 0.5 chỉ lot on {date} (about <b>{lotPrice}</b>) — so you could not buy gold at the start.',
  },
  'gold.wasEnough': {
    vi: 'Số tiền này từng đủ mua ngay trong kỳ ở giai đoạn đầu mô phỏng, chỉ mới không đủ nữa kể từ khoảng <b>{since}</b> do giá vàng tăng.',
    en: 'This amount was enough to buy within the period earlier in the simulation; it only stopped being enough around <b>{since}</b>, as gold prices rose.',
  },
  'gold.neverEnough': {
    vi: 'Trong suốt giai đoạn mô phỏng ({from} → {to}), số tiền này chưa từng đủ mua ngay trong kỳ.',
    en: 'Across the whole simulated period ({from} → {to}), this amount was never enough to buy within the period.',
  },
  'gold.periodsNeeded': {
    vi: 'Ngoài đời bạn cần gộp ít nhất <b>{n} kỳ</b> mới đủ tiền mua 1 lần, ở giá hiện tại.',
    en: 'In practice you would need to save up at least <b>{n} periods</b> to buy once, at today’s price.',
  },
  'gold.timesNeeded': {
    vi: 'Ngoài đời bạn cần gộp ít nhất <b>{n} lần</b> mới đủ tiền mua 1 lần, ở giá hiện tại.',
    en: 'In practice you would need at least <b>{n} contributions</b> to buy once, at today’s price.',
  },

  // ── Bank comparison block ──
  'bank.title': { vi: 'So với gửi tiết kiệm ngân hàng thì sao?', en: 'How does it compare to a bank deposit?' },
  'bank.rateLabel': { vi: 'Lãi suất giả định:', en: 'Assumed rate:' },
  'bank.rateHelp': { vi: 'Lãi suất tiết kiệm có kỳ hạn giả định, compound hàng năm', en: 'Assumed term-deposit rate, compounded annually' },
  'bank.intro': {
    vi: 'Giả sử cùng lịch nạp tiền đó, nhưng thay vì mua quỹ, bạn đem gửi tiết kiệm ngân hàng với lãi suất <b>{rate}%/năm</b> ghép lãi hàng năm. Kết quả sẽ như thế nào?',
    en: 'Suppose you kept the same contribution schedule but put the money into a bank deposit at <b>{rate}% a year</b>, compounded annually. How would it turn out?',
  },
  'bank.deposit': { vi: '🏦 Gửi ngân hàng', en: '🏦 Bank deposit' },
  'bank.dcaAhead': { vi: 'DCA hơn', en: 'DCA ahead' },
  'bank.bankAhead': { vi: 'Ngân hàng hơn', en: 'Bank ahead' },
  'bank.allWin': {
    vi: 'Tất cả <b>{n}</b> danh mục đều cho kết quả tốt hơn gửi tiết kiệm. Dẫn đầu là <b>{best}</b>, hơn ngân hàng <b>+{diff}</b>. Trong giai đoạn này, việc chấp nhận rủi ro của quỹ đã được đền đáp xứng đáng.',
    en: 'All <b>{n}</b> portfolios beat the bank deposit. <b>{best}</b> leads, ahead by <b>+{diff}</b>. Over this period, taking the fund’s risk paid off.',
  },
  'bank.allLose': {
    vi: 'Tất cả <b>{n}</b> danh mục đều thua gửi tiết kiệm trong giai đoạn này. Thị trường Việt Nam là thị trường cận biên, từ bull sang bear diễn ra chóng vánh, rất dễ rơi vào giai đoạn không thuận lợi như 2018-2019 hoặc sau COVID 3/2020. Gửi tiết kiệm đảm bảo lợi nhuận như mong đợi, còn quỹ thì không. Thử chọn khoảng thời gian dài hơn để xem bức tranh đầy đủ hơn.',
    en: 'All <b>{n}</b> portfolios lost to the bank deposit over this period. Vietnam is a frontier market where the turn from bull to bear is abrupt, and it is easy to land on an unkind stretch like 2018–2019 or the months after COVID in March 2020. A deposit delivers what it promises; a fund does not. Try a longer time range for the fuller picture.',
  },
  'bank.mixed': {
    vi: '<b>{winners}/{total}</b> danh mục có kết quả tốt hơn gửi tiết kiệm. <b>{best}</b> dẫn đầu với <b>+{diff}</b>. Những danh mục còn lại chưa đủ bù đắp rủi ro mà bạn đã chấp nhận. Không phải quỹ nào cũng phù hợp, đó là lý do vì sao phải chọn kỹ.',
    en: '<b>{winners}</b> of <b>{total}</b> portfolios beat the bank deposit. <b>{best}</b> leads with <b>+{diff}</b>. The rest did not compensate for the risk you took. Not every fund is a fit, which is exactly why the choice matters.',
  },

  // ── Methodology tab (khung; nội dung ở src/components/methodology/) ──
  'method.tocLabel': { vi: 'Mục lục', en: 'Table of contents' },
  'method.onThisPage': { vi: 'Trong trang này', en: 'On this page' },

  // ── Calculator tab ──
  'calc.title': { vi: 'Máy tính nhanh', en: 'Quick calculators' },
  'calc.navLabel': { vi: 'Chọn máy tính', en: 'Choose a calculator' },
  'calc.params': { vi: 'Thông số', en: 'Parameters' },
  'calc.results': { vi: 'Kết quả', en: 'Results' },
  'calc.afterYears': { vi: 'Sau {n} năm', en: 'After {n} years' },
  'calc.unit.perYear': { vi: '%/năm', en: '%/yr' },
  'calc.unit.years': { vi: 'năm', en: 'years' },
  'calc.axis.start': { vi: 'Bắt đầu', en: 'Start' },
  'calc.axis.year': { vi: '{n}n', en: '{n}y' },
  'calc.tooltip.yearN': { vi: 'Năm thứ {n}', en: 'Year {n}' },

  // Registry: nhãn và mô tả từng máy tính
  'calc.compound.label': { vi: 'Lãi kép', en: 'Compound interest' },
  'calc.compound.desc': {
    vi: 'Vốn ban đầu và tiền góp thêm mỗi tháng sinh ra bao nhiêu sau N năm',
    en: 'What an initial sum plus monthly top-ups becomes after N years',
  },
  'calc.cagr.label': { vi: 'Quy đổi CAGR', en: 'CAGR converter' },
  'calc.cagr.desc': {
    vi: 'Từ hai mốc giá trị ra lợi nhuận kép mỗi năm',
    en: 'Turn a start and end value into a compound annual return',
  },
  'calc.fee.label': { vi: 'Phí quỹ ăn mòn', en: 'Fee erosion' },
  'calc.fee.desc': {
    vi: 'Phí thu mỗi năm lấy mất bao nhiêu tài sản sau N năm',
    en: 'How much an annual fee takes out of your assets over N years',
  },

  // Máy tính lãi kép
  'calc.compound.principal': { vi: 'Vốn ban đầu', en: 'Initial capital' },
  'calc.compound.rate': { vi: 'Lợi nhuận mỗi năm', en: 'Annual return' },
  'calc.compound.years': { vi: 'Số năm đầu tư', en: 'Years invested' },
  'calc.compound.monthly': { vi: 'Góp thêm mỗi tháng', en: 'Monthly top-up' },
  'calc.compound.monthlyHint': {
    vi: 'Để 0 nếu chỉ bỏ vốn một lần rồi để yên',
    en: 'Leave at 0 for a one-off lump sum you never add to',
  },
  'calc.compound.finalValue': { vi: 'Giá trị cuối kỳ', en: 'Ending value' },
  'calc.compound.contributions': { vi: 'Tổng tiền bạn đầu tư', en: 'Total you put in' },
  'calc.compound.interest': { vi: 'Phần lãi kép sinh ra', en: 'Compound interest earned' },
  'calc.compound.takeaway': {
    vi: 'Bạn đầu tư <b>{invested}</b>, sau {years} năm còn lại <b>{final}</b>, tức là gấp <b>{multiple} lần</b>. Phần chênh {interest} không phải do bạn nạp thêm đồng nào{comparison}.',
    en: 'You put in <b>{invested}</b>; after {years} years you are left with <b>{final}</b>, or <b>{multiple}×</b> your money. The {interest} difference came from nothing you contributed{comparison}.',
  },
  'calc.compound.comparison': { vi: ', đủ mua {thing}', en: ' — enough for {thing}' },
  'calc.compound.chartTitle': { vi: 'Tăng trưởng tài sản', en: 'Wealth growth' },
  'calc.compound.chartHelp': {
    vi: 'Mảng xám phía dưới là tiền chính bạn đầu tư, gồm vốn ban đầu và tiền góp thêm hàng tháng. Mảng cam phía trên là phần lãi kép sinh ra. Càng về sau mảng cam càng dày, đó là lúc tiền tự đẻ ra tiền nhiều hơn phần bạn nạp vào.',
    en: 'The grey band underneath is the money you put in yourself: the initial capital plus every monthly top-up. The orange band on top is the compound interest it threw off. The orange band thickens over time — that is the point where your money earns more than you contribute.',
  },
  'calc.compound.legendContrib': { vi: 'Tiền bạn đầu tư', en: 'Money you put in' },
  'calc.compound.legendInterest': { vi: 'Lãi kép sinh ra', en: 'Compound interest' },
  'calc.compound.tooltipContrib': { vi: 'Tiền bạn đầu tư: {v}', en: 'Money you put in: {v}' },
  'calc.compound.tooltipInterest': { vi: 'Lãi kép sinh ra: {v}', en: 'Compound interest: {v}' },
  'calc.compound.tooltipTotal': { vi: 'Tổng: {v}', en: 'Total: {v}' },
  'calc.compound.tooltipShare': { vi: 'Lãi chiếm {pct}% danh mục', en: 'Interest is {pct}% of the portfolio' },
  'calc.compound.crossover': {
    vi: 'Từ năm thứ <b>{year}</b> trở đi, phần lãi dày hơn phần vốn bạn đầu tư. Trước mốc đó tiền lớn chậm tới mức dễ nản. Lãi kép trả công cho người ngồi yên được lâu, không trả công cho người nạp nhiều.',
    en: 'From year <b>{year}</b> onward the interest band is thicker than the capital you put in. Before that point growth is slow enough to be discouraging. Compounding pays people who sit still for a long time, not people who contribute the most.',
  },

  // Máy tính quy đổi CAGR
  'calc.cagr.startValue': { vi: 'Giá trị lúc đầu', en: 'Starting value' },
  'calc.cagr.endValue': { vi: 'Giá trị lúc sau', en: 'Ending value' },
  'calc.cagr.years': { vi: 'Số năm nắm giữ', en: 'Years held' },
  'calc.cagr.result': { vi: 'Lợi nhuận kép mỗi năm (CAGR)', en: 'Compound annual return (CAGR)' },
  'calc.cagr.totalReturn': { vi: 'Tổng lời lỗ cả kỳ', en: 'Total gain / loss over the period' },
  'calc.cagr.absolute': { vi: 'Chênh lệch tuyệt đối', en: 'Absolute difference' },
  'calc.cagr.needPositive': {
    vi: 'Nhập giá trị lúc đầu lớn hơn 0 thì mới quy đổi ra CAGR được.',
    en: 'Enter a starting value above 0 to convert it into a CAGR.',
  },
  'calc.cagr.takeawayGain': {
    vi: 'Trong {years} năm, khoản này lời tổng cộng <b>{total}</b>. Chia đều ra thì mỗi năm lời <b>{cagr}</b>.',
    en: 'Over {years} years this gained <b>{total}</b> in total. Spread evenly, that is <b>{cagr}</b> a year.',
  },
  'calc.cagr.takeawayLoss': {
    vi: 'Trong {years} năm, khoản này lỗ tổng cộng <b>{total}</b>. Chia đều ra thì mỗi năm lỗ <b>{cagr}</b>.',
    en: 'Over {years} years this lost <b>{total}</b> in total. Spread evenly, that is <b>{cagr}</b> a year.',
  },
  'calc.cagr.note': {
    vi: 'CAGR là con số làm phẳng. Nó trả lời câu hỏi mỗi năm lời đều đặn bao nhiêu thì ra đúng kết quả đó, chứ không phải năm nào cũng lời chừng ấy. Hai danh mục cùng CAGR {cagr} có thể đi hai con đường hoàn toàn khác nhau: một cái lên từ từ, một cái lên dựng đứng rồi sập một nửa. Muốn thấy đoạn đường thì phải nhìn biểu đồ, không nhìn một con số.',
    en: 'CAGR is a smoothing number. It answers what steady yearly return would land on the same result — not what any single year actually did. Two portfolios with the same {cagr} CAGR can take completely different paths: one grinds upward, the other spikes and then halves. To see the path you have to look at the chart, not at one number.',
  },

  // Máy tính phí quỹ ăn mòn
  'calc.fee.principal': { vi: 'Vốn đầu tư', en: 'Amount invested' },
  'calc.fee.growth': { vi: 'Quỹ lời mỗi năm', en: 'Fund return per year' },
  'calc.fee.feeRate': { vi: 'Phí quỹ mỗi năm', en: 'Fund fee per year' },
  'calc.fee.feeHint': {
    vi: 'Quỹ mở VN thường thu 1,5% đến 2,5%/năm',
    en: 'Vietnamese open-ended funds typically charge 1.5%–2.5% a year',
  },
  'calc.fee.years': { vi: 'Số năm nắm giữ', en: 'Years held' },
  'calc.fee.noFee': { vi: 'Nếu không mất phí', en: 'If there were no fee' },
  'calc.fee.withFee': { vi: 'Thực nhận sau phí', en: 'What you actually keep' },
  'calc.fee.lost': { vi: 'Phí lấy mất', en: 'Taken by fees' },
  'calc.fee.erosionPct': { vi: 'Tỷ lệ ăn mòn', en: 'Erosion rate' },
  'calc.fee.takeaway': {
    vi: 'Phí {fee} mỗi năm nghe nhỏ. Nhưng sau {years} năm nó lấy mất <b>{lost}</b>, tức <b>{pct}</b> phần tài sản đáng lẽ bạn có{comparison}.',
    en: 'A {fee} annual fee sounds small. But over {years} years it takes <b>{lost}</b> — <b>{pct}</b> of the wealth you would otherwise have{comparison}.',
  },
  'calc.fee.comparison': { vi: ', bằng {thing}', en: ', the price of {thing}' },
  'calc.fee.note': {
    vi: 'Phí quỹ thu trên tài sản ròng mỗi năm, không phải trừ vào phần lời. Vì vậy tỷ lệ ăn mòn không đổi dù quỹ lời nhiều hay lời ít, cũng không đổi dù bạn bỏ vào 100 triệu hay 10 tỷ. Chỉ có hai thứ quyết định: mức phí và số năm bạn nắm giữ. Đây cũng là lý do vì sao chênh lệch 0,5% phí giữa hai quỹ nhìn thì không đáng gì, nhưng giữ 20 năm thì thành một khoản lớn.',
    en: 'Fund fees are charged on net assets every year, not deducted from the gain. So the erosion rate is the same whether the fund does well or badly, and the same whether you invest 100 million or 10 billion. Only two things move it: the fee level and how long you hold. That is also why a 0.5% fee gap between two funds looks like nothing but turns into a large sum over 20 years.',
  },
  'calc.fee.chartTitle': { vi: 'Khoảng phí nới rộng qua từng năm', en: 'The fee gap widens year by year' },
  'calc.fee.chartHelp': {
    vi: 'Đường xám phía trên là tài sản bạn có nếu không mất đồng phí nào. Đường xanh phía dưới là số thực nhận sau khi trừ phí. Khoảng đỏ giữa hai đường là phần phí lấy đi. Khoảng này rộng ra nhanh dần chứ không đều, vì phí năm nào cũng thu trên phần tài sản đã bị bào mòn từ những năm trước.',
    en: 'The grey line on top is what you would have if you paid no fee at all. The green line below is what you actually keep after fees. The red band between them is what the fee takes. It widens at an accelerating rate, because every year the fee is charged on assets already eroded by earlier years.',
  },
  'calc.fee.legendNoFee': { vi: 'Nếu không mất phí', en: 'If there were no fee' },
  'calc.fee.legendWithFee': { vi: 'Thực nhận sau phí', en: 'Kept after fees' },
  'calc.fee.legendLost': { vi: 'Phần phí lấy mất', en: 'Taken by fees' },
  'calc.fee.tooltipNoFee': { vi: 'Nếu không mất phí: {v}', en: 'Without fees: {v}' },
  'calc.fee.tooltipWithFee': { vi: 'Thực nhận: {v}', en: 'Kept: {v}' },
  'calc.fee.tooltipLost': { vi: 'Phí lấy mất: {v} ({pct}%)', en: 'Taken by fees: {v} ({pct}%)' },
  'calc.fee.chartNote': {
    vi: 'Tới năm thứ {midYear}, phí mới lấy {midLost}. Nửa chặng còn lại nó lấy thêm {restLost}, gần gấp {multiple} lần nửa đầu. Phí không ăn đều mỗi năm một ít, nó ăn trên khoản tài sản đã lớn lên.',
    en: 'By year {midYear} the fee has only taken {midLost}. Over the second half it takes another {restLost} — roughly {multiple}× the first half. Fees do not nibble a fixed amount each year; they eat into an asset base that keeps growing.',
  },

} as const

export type TranslationKey = keyof typeof DICT

function translate(key: TranslationKey, lang: Language, vars?: Record<string, string | number>): string {
  let text: string = DICT[key][lang]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      // split/join thay cho replace: một key có thể xuất hiện nhiều lần trong câu
      text = text.split(`{${k}}`).join(String(v))
    }
  }
  return text
}

/**
 * Dựng chuỗi đã dịch thành ReactNode, cho phép đánh dấu <b>...</b> ngay trong
 * câu tiếng Việt/tiếng Anh.
 *
 * Nhiều đoạn văn trong app in đậm đúng con số nằm giữa câu. Nếu cắt câu thành
 * nhiều key rồi ghép lại trong JSX thì thứ tự từ bị khoá theo tiếng Việt, dịch
 * sang tiếng Anh là sai ngữ pháp. Giữ nguyên cả câu trong từ điển và để người
 * dịch tự đặt <b> ở đâu tuỳ ngôn ngữ thì thoát được chuyện đó.
 *
 * Cố ý chỉ nhận đúng hai thẻ <b> và <i>, không phải HTML thật: nội dung đến từ
 * từ điển tĩnh trong repo nên không có chuyện chèn markup từ bên ngoài.
 */
export function renderRich(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /<(b|i)>([\s\S]*?)<\/\1>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(createElement(m[1] === 'i' ? 'em' : 'strong', { key: parts.length }, m[2]))
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return createElement(Fragment, null, ...parts)
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

/** Như useT() nhưng trả ReactNode, hiểu đánh dấu <b>...</b> trong câu dịch. */
export function useTRich(): (key: TranslationKey, vars?: Record<string, string | number>) => ReactNode {
  const { language } = useLanguage()
  return (key, vars) => renderRich(translate(key, language, vars))
}

/**
 * Định dạng số thập phân theo ngôn ngữ đang chọn: tiếng Việt dùng dấu phẩy
 * (12,5), tiếng Anh dùng dấu chấm (12.5).
 *
 * Chỉ lo phần thập phân. Tiền tệ vẫn giữ nguyên định dạng VND ở vndFormat.ts vì
 * đơn vị là đồng dù đọc bằng ngôn ngữ nào.
 */
export function useDecimal(): (value: number, digits?: number) => string {
  const { language } = useLanguage()
  return (value, digits = 2) => {
    const text = value.toFixed(digits)
    return language === 'vi' ? text.replace('.', ',') : text
  }
}
