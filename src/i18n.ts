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
 * Cố ý chỉ nhận đúng một thẻ <b>, không phải HTML thật: nội dung đến từ từ điển
 * tĩnh trong repo nên không có chuyện chèn markup từ bên ngoài.
 */
export function renderRich(text: string): ReactNode {
  const parts: ReactNode[] = []
  const re = /<b>([\s\S]*?)<\/b>/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(createElement('strong', { key: parts.length }, m[1]))
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
