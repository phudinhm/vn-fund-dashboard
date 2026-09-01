/**
 * Wall of Worry: các sự kiện khiến nhà đầu tư tin rằng thị trường sẽ giảm.
 *
 * Ý tưởng từ wallofworry.co: "markets climb a wall of worry". Giá cổ phiếu
 * thường vẫn đi lên trong khi mặt báo toàn tin xấu. Đánh dấu các sự kiện
 * này lên biểu đồ giá để thấy thị trường đã leo qua từng bức tường lo âu
 * như thế nào.
 *
 * 3 nhóm sự kiện:
 *   - world: bất ổn vĩ mô thế giới (chiến tranh, Fed, khủng hoảng ngân hàng...)
 *   - vn:    vĩ mô Việt Nam (chính sách, phong tỏa COVID, thiên tai, thuế quan...)
 *   - corp:  vi mô doanh nghiệp lớn Việt Nam (bầu Kiên, FLC, Vạn Thịnh Phát...)
 *
 * Mỗi sự kiện BẮT BUỘC có sourceUrl dẫn về bài báo chính thống hoặc Wikipedia.
 *
 * Tên và mô tả sự kiện để song ngữ ngay tại chỗ (kiểu Localized) thay vì đẩy
 * vào i18n.ts: 42 sự kiện × 3 chuỗi sẽ nhấn chìm từ điển UI, mà nội dung thì
 * chỉ tab này dùng. Nguồn tham khảo giữ nguyên tiếng Việt vì bài báo là tiếng
 * Việt — dịch tên nguồn chỉ làm người đọc khó đối chiếu.
 *
 * Danh sách chứa cả sự kiện TRƯỚC ngày quỹ trên biểu đồ niêm yết (vd Thông tư
 * 13 năm 2010, trước khi E1VFVN30 chào sàn 10/2014). Các sự kiện ngoài vùng
 * dữ liệu sẽ tự ẩn khỏi biểu đồ và danh sách, chỉ hiện lại nếu sau này biểu
 * đồ dùng chuỗi giá dài hơn.
 *
 * Muốn thêm sự kiện mới: thêm 1 object vào mảng WOW_EVENTS bên dưới,
 * giữ đúng thứ tự thời gian tăng dần.
 */
import type { Language } from '../hooks/useLanguage'
import type { TranslationKey } from '../i18n'

export type WowCategory = 'world' | 'vn' | 'corp'

/** Chuỗi song ngữ. Đọc bằng pickLang() ở chỗ render. */
export interface Localized {
  vi: string
  en: string
}

export function pickLang(text: Localized, lang: Language): string {
  return text[lang]
}

export interface WowEvent {
  date: string             // YYYY-MM-DD
  label: Localized         // tên hiển thị trong danh sách
  shortLabel?: Localized   // tên rút gọn hiển thị trên biểu đồ (mặc định dùng label)
  description: Localized   // mô tả 1-2 câu
  category: WowCategory
  sourceUrl: string        // bài báo chính thống / Wikipedia về sự kiện (nguồn chính)
  extraSources?: { label: string; url: string }[]  // nguồn bổ sung khi có nhiều báo cùng đưa tin
}

export const WOW_CATEGORY_META: Record<WowCategory, { nameKey: TranslationKey; color: string }> = {
  world: { nameKey: 'wow.category.world', color: '#2563eb' },
  vn: { nameKey: 'wow.category.vn', color: '#d97706' },
  corp: { nameKey: 'wow.category.corp', color: '#dc2626' },
}

export const WOW_EVENTS: WowEvent[] = [
  {
    date: '2010-05-20',
    label: {
      vi: 'Thông tư 13 siết an toàn vốn ngân hàng',
      en: 'Circular 13 tightens bank capital rules',
    },
    shortLabel: { vi: 'Thông tư 13', en: 'Circular 13' },
    description: {
      vi: 'NHNN nâng hệ số an toàn vốn CAR từ 8% lên 9%, giới hạn cho vay tối đa 80% vốn huy động. Nỗi lo ngân hàng phải bán bớt tài sản đè nặng thị trường suốt quý 3/2010.',
      en: 'The central bank raised the capital adequacy ratio from 8% to 9% and capped lending at 80% of deposits. Fear that banks would have to dump assets weighed on the market through Q3 2010.',
    },
    category: 'vn',
    sourceUrl: 'https://cafef.vn/thi-truong-chung-khoan/tac-dong-cua-thong-tu-13-voi-cac-nhtm-va-thi-truong-chung-khoan-20100821120220564.chn',
  },
  {
    date: '2011-08-20',
    label: { vi: 'S&P hạ bậc tín nhiệm Việt Nam', en: 'S&P downgrades Vietnam' },
    description: {
      vi: 'S&P hạ xếp hạng tín nhiệm nội tệ của Việt Nam từ BB xuống BB- với triển vọng tiêu cực, giữa giai đoạn lạm phát cao và căng thẳng thanh khoản hệ thống ngân hàng.',
      en: 'S&P cut Vietnam’s local-currency rating from BB to BB- with a negative outlook, in the middle of high inflation and a liquidity squeeze across the banking system.',
    },
    category: 'vn',
    sourceUrl: 'https://vnexpress.net/viet-nam-bi-s-p-ha-bac-tin-nhiem-2714423.html',
  },
  {
    date: '2012-08-20',
    label: { vi: 'Bầu Kiên bị bắt', en: 'ACB founder Nguyen Duc Kien arrested' },
    description: {
      vi: 'Ông Nguyễn Đức Kiên, người sáng lập ACB, bị bắt tối 20/8. Phiên kế tiếp VN-Index mất hơn 4%, cổ phiếu ngân hàng bán sàn hàng loạt.',
      en: 'Nguyen Duc Kien, a founder of ACB, was arrested on the evening of 20 August. The VN-Index lost more than 4% the next session and bank stocks hit the floor across the board.',
    },
    category: 'corp',
    sourceUrl: 'https://vneconomy.vn/thong-tin-bau-kien-bi-bat-nhung-phan-ung-ban-dau.htm',
  },
  {
    date: '2013-12-10',
    label: { vi: 'Đàm phán TPP không đạt thỏa thuận', en: 'TPP talks end without a deal' },
    shortLabel: { vi: 'TPP bế tắc', en: 'TPP deadlock' },
    description: {
      vi: 'Hội nghị bộ trưởng TPP tại Singapore kết thúc mà không đạt thỏa thuận. Kỳ vọng của thị trường vào hiệp định mà Việt Nam được cho là hưởng lợi lớn nhất bị trì hoãn thêm.',
      en: 'The TPP ministerial meeting in Singapore closed without agreement, pushing back market hopes for the trade pact Vietnam was expected to gain the most from.',
    },
    category: 'world',
    sourceUrl: 'https://www.vietnamplus.vn/hoi-nghi-bo-truong-tpp-ket-thuc-ma-khong-dat-thoa-thuan-post234366.amp',
  },
  {
    date: '2014-05-02',
    label: { vi: 'Trung Quốc hạ đặt giàn khoan HD-981', en: 'China moves oil rig HD-981 into Vietnamese waters' },
    shortLabel: { vi: 'Giàn khoan HD-981', en: 'HD-981 oil rig' },
    description: {
      vi: 'Giàn khoan Hải Dương 981 được hạ đặt trái phép trong vùng đặc quyền kinh tế Việt Nam. Phiên 8/5 VN-Index giảm gần 6%, phiên giảm mạnh nhất trong hơn một thập kỷ.',
      en: 'The Haiyang Shiyou 981 rig was placed illegally inside Vietnam’s exclusive economic zone. On 8 May the VN-Index fell almost 6%, its worst session in over a decade.',
    },
    category: 'vn',
    sourceUrl: 'https://vi.wikipedia.org/wiki/V%E1%BB%A5_h%E1%BA%A1_gi%C3%A0n_khoan_H%E1%BA%A3i_D%C6%B0%C6%A1ng_981',
  },
  {
    date: '2014-12-08',
    label: { vi: 'Giá dầu sụp đổ', en: 'Oil price collapse' },
    description: {
      vi: 'Giá dầu Brent rơi từ trên 100 USD xuống dưới 60 USD trong nửa cuối 2014. Nhóm cổ phiếu dầu khí kéo cả thị trường giảm mạnh trong tháng 12.',
      en: 'Brent crude fell from above $100 to under $60 over the second half of 2014. Oil and gas stocks dragged the whole market down through December.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/2010s_oil_glut',
  },
  {
    date: '2015-04-25',
    label: { vi: 'NHNN mua OceanBank giá 0 đồng', en: 'Central bank buys OceanBank for zero dong' },
    shortLabel: { vi: 'OceanBank 0 đồng', en: 'OceanBank for 0₫' },
    description: {
      vi: 'OceanBank trở thành ngân hàng thứ hai bị mua lại bắt buộc với giá 0 đồng, dấy lên lo ngại về sức khỏe thật của hệ thống ngân hàng.',
      en: 'OceanBank became the second bank taken over compulsorily for zero dong, raising questions about the real health of the banking system.',
    },
    category: 'corp',
    sourceUrl: 'https://tuoitre.vn/ngan-hang-nha-nuoc-mua-oceanbank-gia-0-dong-738767.htm',
  },
  {
    date: '2015-08-11',
    label: { vi: 'Trung Quốc phá giá nhân dân tệ', en: 'China devalues the yuan' },
    description: {
      vi: 'Trung Quốc bất ngờ phá giá nhân dân tệ 3 ngày liên tiếp. Việt Nam phải nới biên độ tỷ giá, chứng khoán toàn cầu bán tháo.',
      en: 'China devalued the yuan three days running. Vietnam had to widen its exchange-rate band and global equities sold off.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/2015%E2%80%932016_Chinese_stock_market_turbulence',
  },
  {
    date: '2016-01-04',
    label: { vi: 'Chứng khoán Trung Quốc ngắt mạch', en: 'Chinese stocks trip the circuit breaker' },
    description: {
      vi: 'Thị trường Trung Quốc kích hoạt ngắt mạch 2 lần ngay tuần giao dịch đầu năm, mở màn đợt bán tháo toàn cầu đầu 2016.',
      en: 'Chinese markets triggered their circuit breaker twice in the first trading week of the year, opening the global sell-off of early 2016.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/2015%E2%80%932016_Chinese_stock_market_turbulence',
  },
  {
    date: '2016-04-06',
    label: { vi: 'Formosa: cá chết miền Trung', en: 'Formosa disaster: mass fish deaths' },
    description: {
      vi: 'Sự cố môi trường Formosa khiến cá chết hàng loạt ở 4 tỉnh miền Trung, tâm lý xã hội bất ổn kéo dài nhiều tháng.',
      en: 'The Formosa spill killed fish along four central provinces and left public sentiment unsettled for months.',
    },
    category: 'vn',
    sourceUrl: 'https://en.wikipedia.org/wiki/2016_Vietnam_marine_life_disaster',
  },
  {
    date: '2016-06-24',
    label: { vi: 'Brexit', en: 'Brexit' },
    description: {
      vi: 'Anh trưng cầu dân ý rời EU. VN-Index có lúc mất hơn 5% ngay trong phiên rồi hồi phần lớn về cuối ngày.',
      en: 'Britain voted to leave the EU. The VN-Index was down more than 5% intraday before recovering most of it by the close.',
    },
    category: 'world',
    sourceUrl: 'https://vi.wikipedia.org/wiki/Brexit',
  },
  {
    date: '2016-11-09',
    label: { vi: 'Trump đắc cử tổng thống Mỹ', en: 'Trump wins the US presidency' },
    description: {
      vi: 'Kết quả bầu cử Mỹ ngoài mọi dự đoán. VN-Index giảm gần 3% trong phiên. Thị trường Mỹ sau đó lập đỉnh mới chỉ sau vài tuần.',
      en: 'The US election result defied every forecast. The VN-Index fell nearly 3% that session; US markets went on to set new highs within weeks.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/2016_United_States_presidential_election',
  },
  {
    date: '2016-12-09',
    label: { vi: 'Bắt ông Trần Phương Bình', en: 'DongABank’s Tran Phuong Binh arrested' },
    shortLabel: { vi: 'Bắt ông Trần Phương Bình', en: 'Tran Phuong Binh arrested' },
    description: {
      vi: 'Cựu Tổng giám đốc kiêm Phó chủ tịch HĐQT Ngân hàng Đông Á (DongABank) bị khởi tố, bắt tạm giam vì cố ý làm trái quy định quản lý kinh tế và vi phạm quy định cho vay.',
      en: 'DongABank’s former CEO and deputy chairman was charged and detained for deliberately breaching economic-management rules and lending regulations.',
    },
    category: 'corp',
    sourceUrl: 'https://vi.wikipedia.org/wiki/Tr%E1%BA%A7n_Ph%C6%B0%C6%A1ng_B%C3%ACnh',
  },
  {
    date: '2017-08-09',
    label: { vi: 'Tin đồn ông Trần Bắc Hà bị bắt', en: 'Rumour that BIDV’s Tran Bac Ha was arrested' },
    shortLabel: { vi: 'Tin đồn Trần Bắc Hà', en: 'Tran Bac Ha rumour' },
    description: {
      vi: 'Tin đồn cựu chủ tịch BIDV bị bắt lan nhanh khiến VN-Index giảm mạnh nhất trong nhiều tháng, vốn hóa bốc hơi khoảng 2 tỷ USD trong một phiên. Tin đồn sau đó bị bác bỏ.',
      en: 'A rumour that BIDV’s former chairman had been arrested spread fast, giving the VN-Index its worst session in months and wiping out about $2bn of market cap in a day. The rumour was later denied.',
    },
    category: 'corp',
    sourceUrl: 'https://tuoitre.vn/plo/dang-sau-cu-soc-thoi-bay-2-ti-usd-chung-khoan-post448970.html',
  },
  {
    date: '2017-12-08',
    label: { vi: 'Bắt tạm giam ông Đinh La Thăng', en: 'Dinh La Thang detained' },
    shortLabel: { vi: 'Bắt ông Đinh La Thăng', en: 'Dinh La Thang arrested' },
    description: {
      vi: 'Ông Đinh La Thăng bị khởi tố, bắt tạm giam vì sai phạm thời kỳ lãnh đạo PVN. Lần đầu tiên một cựu ủy viên Bộ Chính trị bị bắt.',
      en: 'Dinh La Thang was charged and detained over wrongdoing during his time leading PetroVietnam — the first arrest of a former Politburo member.',
    },
    category: 'corp',
    sourceUrl: 'https://tuoitre.vn/khoi-to-bat-tam-giam-ong-dinh-la-thang-2017120816342809.htm',
  },
  {
    date: '2018-02-05',
    label: { vi: 'Bán tháo toàn cầu, VIX tăng sốc', en: 'Global sell-off as the VIX spikes' },
    description: {
      vi: 'Chỉ số sợ hãi VIX tăng vọt, Dow Jones có phiên mất hơn 1.100 điểm. VN-Index khi đó vừa chạm vùng đỉnh lịch sử 2007.',
      en: 'The VIX fear gauge spiked and the Dow lost more than 1,100 points in a session. The VN-Index had just reached its 2007 record zone.',
    },
    category: 'world',
    sourceUrl: 'https://dantri.com.vn/kinh-doanh/dow-jones-giam-manh-nhat-moi-thoi-dai-xoa-di-moi-thanh-tuu-trong-nam-nay-20180206085956167.htm',
  },
  {
    date: '2018-07-06',
    label: { vi: 'Chiến tranh thương mại Mỹ-Trung', en: 'US–China trade war begins' },
    description: {
      vi: 'Mỹ chính thức áp thuế lên hàng Trung Quốc. VN-Index đã giảm hơn 25% từ đỉnh tháng 4/2018, mở đầu bear market 2018-2019.',
      en: 'The US formally imposed tariffs on Chinese goods. The VN-Index was already down over 25% from its April 2018 peak, opening the 2018–2019 bear market.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/China%E2%80%93United_States_trade_war',
  },
  {
    date: '2018-11-29',
    label: { vi: 'Chính thức bắt ông Trần Bắc Hà', en: 'Tran Bac Ha formally arrested' },
    shortLabel: { vi: 'Bắt ông Trần Bắc Hà', en: 'Tran Bac Ha arrested' },
    description: {
      vi: 'Hơn một năm sau tin đồn, cựu chủ tịch BIDV chính thức bị bắt vì sai phạm tại BIDV, giữa lúc thị trường vẫn chưa gượng dậy sau bear market 2018.',
      en: 'More than a year after the rumour, BIDV’s former chairman was actually arrested over misconduct at the bank — while the market was still recovering from the 2018 bear market.',
    },
    category: 'corp',
    sourceUrl: 'https://cafef.vn/nhin-lai-su-nghiep-cua-ong-tran-bac-ha-tu-ong-trum-tai-chinh-den-ngay-vuong-vong-lao-ly-voi-loat-sai-pham-nghiem-trong-va-qua-doi-luc-bi-tam-giam-20190718151216984.chn',
  },
  {
    date: '2020-03-11',
    label: { vi: 'WHO công bố đại dịch COVID-19', en: 'WHO declares COVID-19 a pandemic' },
    shortLabel: { vi: 'Đại dịch COVID-19', en: 'COVID-19 pandemic' },
    description: {
      vi: 'Thị trường toàn cầu rơi tự do. VN-Index mất khoảng 1/3 giá trị chỉ trong quý 1/2020, rồi bắt đầu một trong những nhịp hồi mạnh nhất lịch sử.',
      en: 'Global markets went into free fall. The VN-Index lost about a third of its value in Q1 2020 alone, then began one of the strongest rallies in its history.',
    },
    category: 'world',
    sourceUrl: 'https://vi.wikipedia.org/wiki/%C4%90%E1%BA%A1i_d%E1%BB%8Bch_COVID-19',
  },
  {
    date: '2021-01-28',
    label: {
      vi: 'Phiên giảm mạnh nhất lịch sử 20 năm, làn sóng COVID thứ 2',
      en: 'Worst session in 20 years as the second COVID wave lands',
    },
    shortLabel: { vi: 'Làn sóng COVID thứ 2', en: 'Second COVID wave' },
    description: {
      vi: 'VN-Index giảm 73,23 điểm (-6,67%) xuống 1.023,94 điểm, tại thời điểm đó là phiên giảm mạnh nhất kể từ khi thị trường vận hành hơn 20 năm, mạnh hơn cả khủng hoảng tài chính 2008 và thương chiến Mỹ-Trung 2018. Hơn 500 mã giảm sàn, toàn bộ rổ VN30 trắng bên mua. Nguyên nhân: Bộ Y tế công bố ca lây nhiễm cộng đồng mới tại Hải Dương và Quảng Ninh, mở đầu làn sóng COVID thứ 2.',
      en: 'The VN-Index fell 73.23 points (-6.67%) to 1,023.94 — at the time the worst session in the market’s 20-year history, worse than the 2008 financial crisis or the 2018 trade war. Over 500 stocks hit the floor and the entire VN30 basket had no bids. The trigger: the health ministry announced new community transmission in Hai Duong and Quang Ninh, starting the second COVID wave.',
    },
    category: 'vn',
    sourceUrl: 'https://tuoitre.vn/ban-thao-co-phieu-sau-tin-covid-19-chung-khoan-viet-giam-manh-nhat-the-gioi-2021012816275227.htm',
  },
  {
    date: '2021-07-09',
    label: { vi: 'Phong tỏa TP.HCM, làn sóng Delta', en: 'Ho Chi Minh City lockdown, Delta wave' },
    shortLabel: { vi: 'Phong tỏa TP.HCM (Delta)', en: 'HCMC lockdown (Delta)' },
    description: {
      vi: 'TP.HCM giãn cách theo Chỉ thị 16, cả nước gồng mình qua làn sóng Delta. Vậy mà thị trường vẫn tăng suốt nửa cuối 2021 và lập đỉnh lịch sử đầu 2022.',
      en: 'Ho Chi Minh City went into Directive 16 lockdown and the country ground through the Delta wave. The market still rose through the second half of 2021 and set a record high in early 2022.',
    },
    category: 'vn',
    sourceUrl: 'https://tuoitre.vn/tp-hcm-gian-cach-toan-thanh-pho-theo-chi-thi-16-trong-15-ngay-tu-0h-9-7-20210707181657126.htm',
  },
  {
    date: '2022-02-24',
    label: { vi: 'Nga tấn công Ukraine', en: 'Russia invades Ukraine' },
    description: {
      vi: 'Chiến tranh lớn nhất châu Âu từ 1945 nổ ra. Giá dầu, phân bón, lương thực toàn cầu tăng vọt.',
      en: 'The largest war in Europe since 1945 broke out. Global oil, fertiliser and food prices surged.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/Russian_invasion_of_Ukraine',
  },
  {
    date: '2022-03-29',
    label: { vi: 'Chủ tịch FLC bị bắt', en: 'FLC chairman arrested' },
    description: {
      vi: 'Ông Trịnh Văn Quyết bị bắt vì thao túng chứng khoán sau vụ bán chui 74,8 triệu cổ phiếu FLC hồi tháng 1/2022.',
      en: 'Trinh Van Quyet was arrested for market manipulation after secretly dumping 74.8 million FLC shares in January 2022.',
    },
    category: 'corp',
    sourceUrl: 'https://vnexpress.net/chu-tich-flc-trinh-van-quyet-bi-bat-4444881.html',
  },
  {
    date: '2022-04-05',
    label: { vi: 'Tân Hoàng Minh hủy 9 lô trái phiếu', en: 'Tan Hoang Minh cancels nine bond issues' },
    shortLabel: { vi: 'Tân Hoàng Minh hủy trái phiếu', en: 'Tan Hoang Minh bonds cancelled' },
    description: {
      vi: 'Chủ tịch Tân Hoàng Minh bị bắt, 9 lô trái phiếu hơn 10.000 tỷ bị hủy. Niềm tin vào trái phiếu doanh nghiệp bất động sản bắt đầu sụp đổ.',
      en: 'Tan Hoang Minh’s chairman was arrested and nine bond issues worth over 10 trillion dong were cancelled. Confidence in property-developer bonds began to collapse.',
    },
    category: 'corp',
    sourceUrl: 'https://vnexpress.net/chu-tich-tap-doan-tan-hoang-minh-bi-bat-4446517.html',
  },
  {
    date: '2022-06-15',
    label: { vi: 'Fed tăng lãi mạnh nhất từ 1994', en: 'Fed’s biggest hike since 1994' },
    description: {
      vi: 'Lạm phát Mỹ chạm 9%, Fed tăng 0,75 điểm % một lần. Kỷ nguyên tiền rẻ kết thúc, chứng khoán toàn cầu chìm trong bear market 2022.',
      en: 'US inflation touched 9% and the Fed raised rates 0.75 points in one go. The era of cheap money ended and global equities sank into the 2022 bear market.',
    },
    category: 'world',
    sourceUrl: 'https://www.federalreserve.gov/newsevents/pressreleases/monetary20220615a.htm',
  },
  {
    date: '2022-10-08',
    label: { vi: 'Vạn Thịnh Phát, rút tiền hàng loạt tại SCB', en: 'Van Thinh Phat scandal and the run on SCB' },
    shortLabel: { vi: 'Vạn Thịnh Phát & SCB', en: 'Van Thinh Phat & SCB' },
    description: {
      vi: 'Bà Trương Mỹ Lan bị bắt, người dân xếp hàng rút tiền tại SCB. Trái phiếu doanh nghiệp đóng băng, VN-Index thủng 900 điểm tháng 11/2022, mất hơn 40% từ đỉnh.',
      en: 'Truong My Lan was arrested and depositors queued to withdraw from SCB. The corporate bond market froze, and the VN-Index broke below 900 in November 2022, more than 40% off its peak.',
    },
    category: 'corp',
    sourceUrl: 'https://vnexpress.net/chu-tich-tap-doan-van-thinh-phat-truong-my-lan-bi-bat-4520410.html',
  },
  {
    date: '2023-03-13',
    label: { vi: 'SVB sụp đổ, Credit Suisse bị giải cứu', en: 'SVB collapses, Credit Suisse rescued' },
    shortLabel: { vi: 'SVB & Credit Suisse', en: 'SVB & Credit Suisse' },
    description: {
      vi: 'Silicon Valley Bank là vụ phá sản ngân hàng lớn thứ 2 lịch sử Mỹ. Ít ngày sau, Credit Suisse 167 năm tuổi phải bán mình cho UBS.',
      en: 'Silicon Valley Bank was the second-largest bank failure in US history. Days later the 167-year-old Credit Suisse had to sell itself to UBS.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/Collapse_of_Silicon_Valley_Bank',
  },
  {
    date: '2023-10-07',
    label: { vi: 'Xung đột Israel-Hamas', en: 'Israel–Hamas war' },
    description: {
      vi: 'Chiến sự Trung Đông bùng phát giữa lúc tỷ giá và lãi suất trong nước căng thẳng. VN-Index điều chỉnh mạnh trong quý 4/2023.',
      en: 'War broke out in the Middle East while the exchange rate and domestic interest rates were already under strain. The VN-Index corrected sharply in Q4 2023.',
    },
    category: 'world',
    sourceUrl: 'https://en.wikipedia.org/wiki/October_7_attacks',
  },
  {
    date: '2024-04-15',
    label: {
      vi: 'Hơn 150 mã giảm sàn, VN-Index mất 60 điểm',
      en: 'Over 150 stocks limit-down as the VN-Index sheds 60 points',
    },
    shortLabel: { vi: 'Fed trì hoãn hạ lãi suất', en: 'Fed delays rate cuts' },
    description: {
      vi: 'VN-Index giảm 60 điểm (4,7%), phiên giảm sâu nhất kể từ 18/8/2023. Toàn thị trường 886 mã giảm, hơn 150 mã giảm sàn. Nguyên nhân: CPI Mỹ tăng cao khiến kỳ vọng Fed hạ lãi suất bị trì hoãn, USD mạnh lên, tỷ giá trong nước căng thẳng, khối ngoại bán ròng liên tục.',
      en: 'The VN-Index fell 60 points (4.7%), its deepest drop since 18 August 2023, with 886 decliners and over 150 stocks limit-down. The cause: hot US CPI pushed back expectations of Fed cuts, the dollar strengthened, the domestic exchange rate came under pressure and foreign investors sold relentlessly.',
    },
    category: 'world',
    sourceUrl: 'https://vietnambiz.vn/vi-sao-chung-khoan-viet-nam-bat-ngo-lao-doc-voi-hang-tram-ma-giam-san-2024415153614115.htm',
  },
  {
    date: '2024-08-05',
    label: {
      vi: 'Hoảng loạn khắp châu Á, VN-Index thủng 1.200 điểm',
      en: 'Panic across Asia; VN-Index breaks below 1,200',
    },
    shortLabel: { vi: 'Yên Nhật tăng giá, carry trade sập', en: 'Yen surge unwinds the carry trade' },
    description: {
      vi: 'Nikkei giảm 13,47%, Kospi giảm 8,77% sau khi BOJ tăng lãi suất cuối tháng 7 khiến dòng vốn carry trade bằng yen đảo chiều ồ ạt. VN-Index giảm 48 điểm, thủng mốc 1.200, toàn thị trường 845 mã đỏ với 127 mã giảm sàn. Căng thẳng Iran-Israel leo thang cùng lúc làm trầm trọng thêm tâm lý.',
      en: 'The Nikkei fell 13.47% and the Kospi 8.77% after the Bank of Japan’s late-July hike sent yen carry trades unwinding en masse. The VN-Index dropped 48 points through the 1,200 line, with 845 decliners and 127 limit-down. Escalating Iran–Israel tension made the mood worse.',
    },
    category: 'world',
    sourceUrl: 'https://vneconomy.vn/hoang-loan-khap-chau-a-vn-index-thung-1-200-diem-co-san-la-liet-da-den-luc-vao-viec.htm',
  },
  {
    date: '2024-09-07',
    label: { vi: 'Siêu bão Yagi', en: 'Super Typhoon Yagi' },
    description: {
      vi: 'Cơn bão mạnh nhất 30 năm đổ bộ miền Bắc, thiệt hại ước tính hơn 3 tỷ USD, ảnh hưởng nặng đến sản xuất và bảo hiểm.',
      en: 'The strongest storm in 30 years hit the north, causing an estimated $3bn in damage and hitting manufacturing and insurers hard.',
    },
    category: 'vn',
    sourceUrl: 'https://vi.wikipedia.org/wiki/B%C3%A3o_Yagi_(2024)',
  },
  {
    date: '2025-01-27',
    label: {
      vi: 'DeepSeek chấn động Nvidia, bốc hơi gần 600 tỷ USD',
      en: 'DeepSeek shocks Nvidia, wiping out nearly $600bn',
    },
    shortLabel: { vi: 'DeepSeek chấn động Nvidia', en: 'DeepSeek shocks Nvidia' },
    description: {
      vi: 'Startup Trung Quốc DeepSeek ra mắt mô hình AI R1 hiệu năng tương đương nhưng chi phí huấn luyện chỉ khoảng 5,6 triệu USD, đánh thẳng vào luận điểm "hào lũy công nghệ" của Nvidia. Cổ phiếu Nvidia giảm 17% trong một phiên, kỷ lục mất giá lớn nhất lịch sử chứng khoán Mỹ của một công ty đơn lẻ.',
      en: 'Chinese startup DeepSeek released its R1 model with comparable performance for a reported training cost of around $5.6m, striking directly at Nvidia’s technology-moat story. Nvidia fell 17% in a session — the largest single-company market-cap loss in US stock market history.',
    },
    category: 'world',
    sourceUrl: 'https://www.cnbc.com/2025/01/27/nvidia-sheds-almost-600-billion-in-market-cap-biggest-drop-ever.html',
  },
  {
    date: '2025-04-02',
    label: { vi: 'Mỹ công bố thuế đối ứng 46% với Việt Nam', en: 'US announces a 46% reciprocal tariff on Vietnam' },
    shortLabel: { vi: 'Thuế đối ứng 46%', en: '46% reciprocal tariff' },
    description: {
      vi: 'Mức thuế cao ngoài mọi dự đoán. VN-Index có chuỗi phiên giảm mạnh nhất lịch sử, riêng phiên 3/4/2025 mất gần 88 điểm.',
      en: 'The rate was far above any forecast. The VN-Index had its steepest losing streak on record, dropping almost 88 points on 3 April 2025 alone.',
    },
    category: 'vn',
    sourceUrl: 'https://vnexpress.net/ong-trump-ky-sac-lenh-ap-thue-doi-ung-voi-hang-chuc-nen-kinh-te-4869288.html',
  },
  {
    date: '2025-08-21',
    label: {
      vi: 'Vingroup: đế chế nợ vay, so sánh với Evergrande',
      en: 'Vingroup’s debt-driven empire draws Evergrande comparisons',
    },
    shortLabel: { vi: 'Vingroup nợ 31 tỷ USD', en: 'Vingroup’s $31bn debt' },
    description: {
      vi: 'Asia Times công bố phân tích: Vingroup gánh 31 tỷ USD nợ vay, chiếm 86% tổng tài sản, phải trả lãi khoảng 3,2 triệu USD mỗi ngày, nợ tăng thêm 4,7 tỷ USD chỉ trong nửa đầu 2025. Bài viết so sánh mô hình dùng lợi nhuận bất động sản tài trợ cho các mảng chưa có lãi (như VinFast) với Evergrande, đặt câu hỏi liệu Vingroup có trở thành rủi ro "quá lớn để sụp đổ" mà nhà nước buộc phải cứu nếu có biến.',
      en: 'Asia Times published an analysis: Vingroup carries $31bn of debt, 86% of total assets, paying around $3.2m of interest a day, with debt up $4.7bn in the first half of 2025 alone. The piece compared its model of funding loss-making arms like VinFast out of property profits to Evergrande, and asked whether Vingroup has become a "too big to fail" risk the state would have to rescue.',
    },
    category: 'corp',
    sourceUrl: 'https://asiatimes.com/2025/08/vingroups-debt-driven-empire-on-shaky-global-ground/',
    extraSources: [
      { label: 'The Vietnamese Magazine', url: 'https://thevietnamese.org/2025/08/a-debt-driven-empire-vingroup-operates-with-86-of-assets-on-loan/' },
    ],
  },
  {
    date: '2025-10-20',
    label: {
      vi: 'Phiên giảm mạnh nhất lịch sử: VN-Index mất hơn 94 điểm',
      en: 'Record session loss: VN-Index down more than 94 points',
    },
    shortLabel: { vi: 'Thanh tra trái phiếu doanh nghiệp', en: 'Corporate bond inspection' },
    description: {
      vi: 'VN-Index giảm hơn 94 điểm, phiên giảm mạnh nhất lịch sử tại thời điểm đó. 108 mã giảm sàn, 325/326 mã trên HoSE giảm giá. Ngòi nổ là kết luận thanh tra của Chính phủ về hoạt động phát hành trái phiếu doanh nghiệp, nhưng mức độ giảm bị giới phân tích đánh giá là do tâm lý hoảng loạn bán theo đám đông nhiều hơn là vấn đề nền tảng.',
      en: 'The VN-Index fell more than 94 points, the worst session on record at the time: 108 stocks limit-down and 325 of 326 HoSE names lower. The trigger was a government inspection finding on corporate bond issuance, though analysts put the scale of the drop down to herd panic rather than anything fundamental.',
    },
    category: 'vn',
    sourceUrl: 'https://cafef.vn/dang-sau-cu-lao-doc-manh-nhat-lich-su-chung-khoan-vua-xay-ra-188251020231143711.chn',
  },
  {
    date: '2025-12-19',
    label: {
      vi: 'Vingroup khởi công đồng loạt 11 công trình trọng điểm quốc gia',
      en: 'Vingroup breaks ground on 11 national key projects at once',
    },
    shortLabel: { vi: 'Vingroup khởi công 11 công trình', en: 'Vingroup starts 11 projects' },
    description: {
      vi: 'Sáng 19/12, Vingroup đồng loạt khởi công 11 dự án lớn khắp cả nước (đô thị Olympic, Hạ Long Xanh, đường sắt Bến Thành - Cần Giờ, nhà máy điện gió, thép...), tổng vốn đầu tư ước hơn 3,4 triệu tỷ đồng. Quy mô hạ tầng trọng điểm quốc gia dồn vào một tập đoàn tư nhân duy nhất khiến nhiều nhà đầu tư lo ngại về mức độ tập trung quyền lực kinh tế.',
      en: 'On the morning of 19 December, Vingroup simultaneously broke ground on 11 major projects nationwide (the Olympic urban area, Ha Long Xanh, the Ben Thanh–Can Gio railway, wind power and steel plants), with total investment estimated above 3.4 quadrillion dong. Concentrating that much national infrastructure in one private group left many investors uneasy about the concentration of economic power.',
    },
    category: 'corp',
    sourceUrl: 'https://tuoitre.vn/vingroup-dong-loat-khoi-cong-khai-truong-11-du-an-lon-tren-ca-nuoc-20251220100321195.htm',
    extraSources: [
      { label: 'Dân Trí', url: 'https://dantri.com.vn/kinh-doanh/tap-doan-cua-ty-phu-pham-nhat-vuong-dong-loat-khoi-cong-11-du-an-20251219101108366.htm' },
      { label: 'VnExpress', url: 'https://vnexpress.net/vingroup-trien-khai-dong-loat-11-du-an-trong-diem-tren-ca-nuoc-4996001.html' },
      { label: 'Vingroup', url: 'https://vingroup.net/tin-tuc-su-kien/bai-viet/3750/vingroup-dong-loat-khoi-dong-khai-truong-11-cong-trinh-trong-diem-tren-toan-quoc' },
    ],
  },
  {
    date: '2026-02-28',
    label: { vi: 'Mỹ và Israel không kích Iran', en: 'US and Israel strike Iran' },
    shortLabel: { vi: 'Mỹ-Israel không kích Iran', en: 'US–Israel strikes on Iran' },
    description: {
      vi: 'Mỹ và Israel mở ba đợt không kích vào Iran rạng sáng 28/2. Xung đột lan rộng khắp Trung Đông trong nhiều tuần trước khi có thỏa thuận ngừng bắn.',
      en: 'The US and Israel launched three waves of air strikes on Iran in the early hours of 28 February. The conflict spread across the Middle East for weeks before a ceasefire was agreed.',
    },
    category: 'world',
    sourceUrl: 'https://vnexpress.net/7-ngay-ruc-lua-rung-chuyen-trung-dong-5047534.html',
  },
  {
    date: '2026-03-09',
    label: {
      vi: 'Giá dầu vượt 100 USD/thùng, VN-Index lập kỷ lục giảm mới',
      en: 'Oil tops $100 a barrel; VN-Index sets a new record loss',
    },
    shortLabel: { vi: 'Dầu vượt 100 USD, kỷ lục giảm mới', en: 'Oil above $100, new record drop' },
    description: {
      vi: 'Giá dầu thế giới vượt mốc 100 USD/thùng lần đầu tiên sau gần 4 năm giữa căng thẳng địa chính trị và gián đoạn chuỗi cung ứng năng lượng. VN-Index giảm kỷ lục 115 điểm xuống 1.652 điểm, hơn 300 mã giảm sàn, vượt qua kỷ lục giảm điểm hồi tháng 10/2025. Thị trường Hàn Quốc, Nhật Bản cũng giảm mạnh cùng lúc.',
      en: 'Crude passed $100 a barrel for the first time in nearly four years amid geopolitical tension and energy supply disruption. The VN-Index fell a record 115 points to 1,652 with over 300 stocks limit-down, surpassing the October 2025 record. Korean and Japanese markets fell sharply at the same time.',
    },
    category: 'world',
    sourceUrl: 'https://dantri.com.vn/kinh-doanh/hon-300-co-phieu-nam-san-chung-khoan-viet-giam-ky-luc-115-diem-20260309104533885.htm',
  },
  {
    date: '2026-05-26',
    label: {
      vi: 'VN-Index phân hóa "hình chữ K", một mình Vingroup gánh chỉ số',
      en: 'A "K-shaped" market: Vingroup alone carries the index',
    },
    shortLabel: { vi: 'Phân hóa "hình chữ K"', en: '"K-shaped" divergence' },
    description: {
      vi: 'VN-Index tăng mạnh nhưng gần như toàn bộ động lực đến từ nhóm Vingroup, phần lớn cổ phiếu còn lại chỉ đi ngang hoặc tích lũy. Thanh khoản giảm từ 30.169 tỷ đồng/phiên (quý 1) xuống 21.701 tỷ đồng/phiên (tháng 4), dấu hiệu dòng tiền thận trọng dần với một rally quá hẹp.',
      en: 'The VN-Index rose strongly, but nearly all of the push came from Vingroup names while most other stocks went sideways. Turnover fell from 30,169bn dong a session in Q1 to 21,701bn in April — a sign money was growing wary of a rally this narrow.',
    },
    category: 'vn',
    sourceUrl: 'https://cafef.vn/vn-index-tang-manh-nhung-phan-hoa-hinh-chu-k-chuyen-gia-chi-ten-5-nhom-nganh-dang-chu-y-nua-cuoi-nam-2026-188260526102054296.chn',
  },
  {
    date: '2026-07-02',
    label: {
      vi: 'NHNN loại nợ Vingroup, Sun Group, Masterise khỏi room tín dụng',
      en: 'Central bank exempts Vingroup, Sun Group and Masterise loans from credit caps',
    },
    shortLabel: { vi: 'Vingroup được ưu ái room tín dụng', en: 'Credit-cap exemption for big groups' },
    description: {
      vi: 'Ngân hàng Nhà nước công bố cơ chế loại nợ vay của 18 dự án trọng điểm quốc gia - dẫn đầu bởi Vingroup, Sun Group, Masterise - khỏi cách tính room tín dụng ngân hàng, cho phép các tập đoàn này vay thêm mà không bị tính vào hạn mức chung. Doanh nghiệp nhỏ hơn phải cạnh tranh trong phần room còn lại, dấy lên câu hỏi về sự ưu ái dành cho nhóm doanh nghiệp lớn.',
      en: 'The State Bank announced that lending to 18 national key projects — led by Vingroup, Sun Group and Masterise — would be excluded from banks’ credit-growth caps, letting those groups borrow more without counting against the general limit. Smaller firms compete for what is left, raising questions about preferential treatment for the largest conglomerates.',
    },
    category: 'vn',
    sourceUrl: 'https://dantri.com.vn/kinh-doanh/nhnn-noi-ve-co-che-von-dac-biet-cho-vingroup-sun-group-masterise-20260702101105038.htm',
  },
  {
    date: '2026-07-15',
    label: {
      vi: 'Dự thảo Thông tư thay thế Thông tư số 22/2019/TT-NHNN',
      en: 'Draft circular to replace Circular 22/2019/TT-NHNN',
    },
    shortLabel: { vi: 'Dự thảo siết vốn ngân hàng', en: 'Draft bank capital tightening' },
    description: {
      vi: 'NHNN họp bàn dự thảo thay thế Thông tư 22/2019 - quy định giới hạn, tỷ lệ an toàn quan trọng bậc nhất ngành ngân hàng - nhằm siết chuẩn theo Basel III. Mới chỉ là dự thảo xin ý kiến, chưa ban hành, nhưng giới đầu tư lo ngại yêu cầu vốn và quản trị rủi ro chặt hơn sẽ ảnh hưởng lợi nhuận và khả năng cho vay của nhóm cổ phiếu ngân hàng.',
      en: 'The State Bank discussed a draft to replace Circular 22/2019 — the sector’s most important limits and safety-ratio rules — tightening standards toward Basel III. It is still only a consultation draft, but investors worry that stiffer capital and risk-management requirements would hit bank stocks’ profits and lending capacity.',
    },
    category: 'vn',
    sourceUrl: 'https://cafef.vn/ngan-hang-nha-nuoc-ban-viec-thay-the-thong-tu-quan-trong-bac-nhat-nganh-ngan-hang-188260719092130966.chn',
  },
  {
    date: '2026-07-24',
    label: {
      vi: 'Mỹ áp thuế bổ sung 10 tới 12,5% với 60 đối tác thương mại',
      en: 'US adds 10–12.5% tariffs on 60 trading partners',
    },
    shortLabel: { vi: 'Thuế bổ sung 12,5%', en: '12.5% additional tariff' },
    description: {
      vi: 'USTR áp thuế bổ sung với 60 nền kinh tế vì vấn đề lao động cưỡng bức, hiệu lực ngay từ 0 giờ 01 ngày 24/7/2026 giờ miền Đông Mỹ. Việt Nam nằm nhóm chịu mức cao nhất là 12,5%, trong khi Canada, Ấn Độ, Mexico chỉ chịu 10%. Biện pháp kéo dài 4 năm nếu không gia hạn. Đây là cú thuế thứ hai từ Mỹ sau mức đối ứng 46% hồi tháng 4/2025.',
      en: 'The USTR imposed additional tariffs on 60 economies over forced labour, effective 00:01 US Eastern on 24 July 2026. Vietnam fell in the top band at 12.5%, while Canada, India and Mexico faced 10%. The measure runs four years unless extended. It is the second tariff blow from the US after the 46% reciprocal rate of April 2025.',
    },
    category: 'vn',
    sourceUrl: 'https://baodautu.vn/my-ap-thue-quan-tu-10---125-voi-60-doi-tac-thuong-mai-d651615.html',
  },
]
