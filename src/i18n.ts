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
