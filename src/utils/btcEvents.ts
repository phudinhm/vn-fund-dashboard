/**
 * Các sự kiện quan trọng trong lịch sử giá Bitcoin + thị trường toàn cầu,
 * dùng làm annotation trên biểu đồ cumulative return.
 *
 * Mục đích: giúp nhà đầu tư retail Việt Nam gắn biến động trên biểu đồ với
 * sự kiện đời thực mà họ có thể nhớ. "Tháng 11/2022 FTX sập, đó là vùng
 * đường BTC rơi mạnh" trực quan hơn nhiều so với "đây là drawdown -30%".
 */

import type { Localized } from './wallOfWorryEvents'

export interface BtcEvent {
  date: string             // YYYY-MM-DD
  label: Localized         // short label shown on chart
  description?: Localized  // optional tooltip detail
  color: string
  /**
   * Hàng hiển thị nhãn, 0 là hàng dưới sát biểu đồ, số càng lớn càng lên cao.
   * Dùng để các mốc gần nhau khỏi đè chữ lên nhau. Bầu cử tháng 11 và nhậm chức
   * tháng 1 chỉ cách hai tháng rưỡi, trên biểu đồ 12 năm là dính liền. Nhãn dài
   * còn đè xa hơn nữa vì chữ trải sang hai bên vạch.
   */
  labelRow?: 0 | 1 | 2
}

/**
 * Màu riêng cho mốc chính trị, cố ý không dùng đỏ hay xanh lá như các sự kiện
 * thị trường. Đỏ và xanh trên biểu đồ này mang nghĩa xấu và tốt, mà một kỳ tổng
 * thống thì chưa biết tốt hay xấu cho tới khi giá chạy xong. Đảng nào thì đọc ở
 * nhãn, không đọc ở màu.
 */
const POLITICAL_COLOR = '#64748b'

export const BTC_EVENTS: BtcEvent[] = [
  {
    date: '2014-11-04',
    label: { vi: 'Giữa kỳ 2014: CH cả 2 viện', en: '2014 midterms: GOP takes both chambers' },
    description: { vi: 'Bầu cử giữa kỳ Mỹ. Cộng hoà giành Thượng viện và giữ Hạ viện, nắm cả hai viện trong hai năm cuối nhiệm kỳ Obama (Dân chủ).', en: 'US midterm elections. The Republicans took the Senate and held the House, controlling both chambers for the last two years of Obama\'s (Democratic) term.' },
    color: POLITICAL_COLOR,
  },
  {
    date: '2016-11-08',
    label: { vi: 'Bầu cử 2016', en: '2016 election' },
    description: { vi: 'Bầu cử tổng thống Mỹ. Kết quả ngã ngũ ngay trong đêm, rạng sáng 9/11 đã rõ Trump thắng. Thị trường phản ứng ngay đêm đó, hơn hai tháng trước ngày nhậm chức.', en: 'US presidential election. It was settled overnight: by the early hours of 9 November, Trump had won. Markets reacted that same night, more than two months before inauguration.' },
    color: POLITICAL_COLOR,
    labelRow: 1,
  },
  {
    date: '2017-01-20',
    label: { vi: 'Trump nhậm chức', en: 'Trump inaugurated' },
    description: { vi: 'Donald Trump nhậm chức tổng thống thứ 45 (Cộng hoà). Trước đó biểu đồ đang nằm trong nhiệm kỳ Obama (Dân chủ), phần này không có mốc vì dữ liệu BTC chỉ bắt đầu từ 9/2014.', en: 'Donald Trump sworn in as the 45th president (Republican). The chart before this point sits inside Obama\'s (Democratic) term, unmarked because the BTC data only begins in September 2014.' },
    color: POLITICAL_COLOR,
  },
  {
    date: '2018-11-06',
    label: { vi: 'Giữa kỳ 2018: Hạ về DC', en: '2018 midterms: House to the Democrats' },
    description: { vi: 'Bầu cử giữa kỳ Mỹ. Dân chủ giành Hạ viện, Cộng hoà giữ Thượng viện. Quyền lực chia đôi trong nửa sau nhiệm kỳ Trump.', en: 'US midterm elections. The Democrats took the House, the Republicans held the Senate. Power split for the second half of Trump\'s term.' },
    color: POLITICAL_COLOR,
  },
  {
    date: '2020-03-16',
    label: { vi: 'Covid', en: 'Covid' },
    description: { vi: 'Covid-19 crash: thị trường toàn cầu rơi mạnh, BTC giảm ~50% trong 2 ngày.', en: 'The Covid-19 crash: global markets fell hard and BTC lost about 50% in two days.' },
    color: '#dc2626',
  },
  {
    date: '2020-11-03',
    label: { vi: 'Bầu cử 2020', en: '2020 election' },
    description: { vi: 'Bầu cử tổng thống Mỹ. Khác hai lần kia, kết quả không ngã ngũ trong đêm. Phải tới 7/11 các hãng tin mới xác nhận Biden thắng, tức bốn ngày không ai biết chắc. Đây là đoạn đáng xem nhất nếu muốn biết bất định chính trị tác động tới giá ra sao.', en: 'US presidential election. Unlike the other two, this one was not settled overnight: the networks only called it for Biden on 7 November, four days in which nobody knew. This is the stretch to look at if you want to see what political uncertainty does to the price.' },
    color: POLITICAL_COLOR,
    labelRow: 1,
  },
  {
    date: '2021-01-20',
    label: { vi: 'Biden nhậm chức', en: 'Biden inaugurated' },
    description: { vi: 'Joe Biden nhậm chức tổng thống thứ 46 (Dân chủ).', en: 'Joe Biden sworn in as the 46th president (Democrat).' },
    color: POLITICAL_COLOR,
  },
  {
    date: '2021-11-10',
    label: { vi: 'BTC đỉnh', en: 'BTC peak' },
    description: { vi: 'Bitcoin đạt đỉnh lịch sử ~69,000 USD, bắt đầu crypto winter.', en: 'Bitcoin hit an all-time high near $69,000 and the crypto winter began.' },
    color: '#16a34a',
    labelRow: 1,
  },
  {
    date: '2022-11-08',
    label: { vi: 'Giữa kỳ 2022: Hạ về CH', en: '2022 midterms: House to the GOP' },
    description: { vi: 'Bầu cử giữa kỳ Mỹ. Cộng hoà giành Hạ viện sát nút, Dân chủ giữ Thượng viện. "Làn sóng đỏ" mà nhiều người dự đoán đã không xảy ra. Lưu ý: mốc này cách vụ FTX sập đúng một ngày, hai vạch gần như trùng nhau trên biểu đồ, và phần giá rơi sau đó là do FTX chứ không phải do bầu cử.', en: 'US midterm elections. The Republicans narrowly took the House, the Democrats held the Senate; the widely predicted "red wave" never came. Note that this falls one day before the FTX collapse — the two markers almost touch on the chart, and the fall that follows is FTX, not the election.' },
    color: POLITICAL_COLOR,
    labelRow: 2,
  },
  {
    date: '2022-11-09',
    label: { vi: 'FTX sập', en: 'FTX collapse' },
    description: { vi: 'Sàn FTX phá sản, kéo theo làn sóng thanh lý. BTC rơi xuống ~16,000 USD.', en: 'The FTX exchange went bankrupt, triggering a wave of liquidations. BTC fell to around $16,000.' },
    color: '#dc2626',
  },
  {
    date: '2024-01-11',
    label: { vi: 'BTC ETF', en: 'BTC ETF' },
    description: { vi: 'SEC Mỹ phê duyệt ETF Bitcoin giao ngay, mở đường vốn tổ chức vào thị trường.', en: 'The US SEC approved spot Bitcoin ETFs, opening the door to institutional money.' },
    color: '#2563eb',
  },
  {
    date: '2024-11-05',
    label: { vi: 'Bầu cử 2024', en: '2024 election' },
    description: { vi: 'Bầu cử tổng thống Mỹ. Kết quả rõ ngay rạng sáng 6/11, Trump thắng nhiệm kỳ hai.', en: 'US presidential election. Called in the early hours of 6 November: Trump won a second term.' },
    color: POLITICAL_COLOR,
    labelRow: 1,
  },
  {
    date: '2025-01-20',
    label: { vi: 'Trump nhậm chức', en: 'Trump inaugurated' },
    description: { vi: 'Donald Trump nhậm chức tổng thống thứ 47 (Cộng hoà), nhiệm kỳ hai.', en: 'Donald Trump sworn in as the 47th president (Republican), his second term.' },
    color: POLITICAL_COLOR,
  },
]
