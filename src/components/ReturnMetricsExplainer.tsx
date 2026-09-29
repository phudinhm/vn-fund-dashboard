/**
 * ReturnMetricsExplainer: MỘT khối giải thích duy nhất cho cả 3 con số lợi nhuận
 * (CAGR, TWRR, MWRR) ở tab DCA quỹ và DCA cổ phiếu.
 *
 * Thay cho hai khối cũ: "Vì sao có 2 con số" (chỉ CAGR vs MWRR, thiếu TWRR dù
 * bảng thống kê có TWRR) và "Giải Thích Khái Niệm" (định nghĩa và công thức ở
 * cuối trang). Gộp lại để người đọc không phải nhảy giữa hai chỗ nói chồng
 * chéo nhau: định nghĩa, công thức và ví dụ cây giống nằm cùng một nơi, kèm số
 * thật của danh mục đang xem.
 *
 * Cùng lý do với tab Minh Bạch Hoá: đây là bài giải thích có công thức và ví dụ
 * số nên giữ hai bản song song (Vi/En) dễ đọc và dễ giữ đồng bộ hơn là cắt thành
 * mấy chục key rời. Số minh hoạ trong hai bản PHẢI khớp nhau.
 */
import { useState, memo, type ReactNode } from 'react'
import { useT } from '../i18n'
import { useLanguage } from '../hooks/useLanguage'
import { IconIdea } from './icons'

export interface ExplainerPortfolio {
  id: string
  name: string
  color: string
  /** CAGR nhà đầu tư (giá trị cuối ÷ tổng đầu tư, quy năm). Null khi kỳ chưa đủ 1 năm. */
  cagr: number | null
  /** TWRR quy năm SAU phí. Null khi kỳ chưa đủ 1 năm. */
  twrr: number | null
  /** TWRR quy năm TRƯỚC phí. Null khi kỳ chưa đủ 1 năm. */
  twrrGross: number | null
  /** MWRR (IRR quy năm). Null khi kỳ chưa đủ 1 năm. */
  mwrr: number | null
}

interface Props {
  portfolios: ExplainerPortfolio[]
}

function pct(v: number | null): string {
  if (v === null) return '—'
  const x = v * 100
  return `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(2)}%`
}

/** Danh mục minh hoạ: cái có đủ số và chênh lệch giữa 3 con số lớn nhất, để khác biệt hiện rõ. */
function pickExample(portfolios: ExplainerPortfolio[]): ExplainerPortfolio | null {
  const spread = (p: ExplainerPortfolio) => {
    const xs = [p.cagr, p.twrr, p.mwrr].filter((v): v is number => v !== null)
    return xs.length === 3 ? Math.max(...xs) - Math.min(...xs) : -1
  }
  const full = portfolios.filter(p => spread(p) >= 0).sort((a, b) => spread(b) - spread(a))
  return full[0] ?? null
}

function ReturnMetricsExplainerImpl({ portfolios }: Props) {
  const t = useT()
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)

  if (portfolios.length === 0) return null
  const example = pickExample(portfolios)
  const vi = language === 'vi'

  return (
    <div className={`dca-explainer-block${open ? ' dca-explainer-block--open' : ''}`}>
      <button className="dca-explainer-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="dca-explainer-icon"><IconIdea /></span>
        <span className="dca-explainer-toggle-text">{t('rme.title')}</span>
        <span className="dca-explainer-chevron">{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="dca-explainer-body dca-glossary-content">
          <p className="dca-explainer-intro">
            {vi ? (
              <>
                Cùng một danh mục nhưng có ba con số khác nhau, và người mới hay bối rối:{' '}
                <i>"Tôi đã đầu tư tổng cộng 108 triệu... nếu tăng 30%/năm thì không thể nào chỉ có 168 triệu. Quá vô lý!"</i>{' '}
                Thật ra cả ba đều đúng, chỉ là mỗi con số trả lời một câu hỏi khác.
              </>
            ) : (
              <>
                One portfolio, three different numbers, and newcomers often get confused:{' '}
                <i>"I put in 108 million in total… if it grew 30% a year there is no way I would only have 168 million. That makes no sense!"</i>{' '}
                In fact all three are right; each answers a different question.
              </>
            )}
          </p>

          <MetricCards example={example} vi={vi} />

          <hr className="dca-glossary-divider" />
          {vi ? <BodyVi /> : <BodyEn />}
        </div>
      )}
    </div>
  )
}

function MetricCards({ example, vi }: { example: ExplainerPortfolio | null; vi: boolean }) {
  const t = useT()
  if (!example) {
    return <p className="dca-glossary-note">{t('rme.noYearYet')}</p>
  }
  const card = (name: string, value: number | null, question: ReactNode, highlight?: boolean) => (
    <div className={`dca-explainer-metric${highlight ? ' dca-explainer-metric--highlight' : ''}`}>
      <div className="dca-explainer-metric-name">{name}</div>
      <div className="dca-explainer-metric-val">{value === null ? '—' : `${pct(value)}${vi ? '/năm' : '/yr'}`}</div>
      <div className="dca-explainer-metric-desc">{question}</div>
    </div>
  )
  return (
    <>
      <p className="rme-example-label">
        {t('rme.exampleOf')} <b>{example.name}</b>
      </p>
      <div className="rme-cards">
        {card('CAGR', example.cagr, vi
          ? <>Tổng tiền tôi bỏ ra đã tăng bao nhiêu mỗi năm, <i>nếu coi như có đủ vốn từ ngày đầu</i>?</>
          : <>By how much per year did everything I put in grow, <i>pretending I had it all from day one</i>?</>)}
        {card('TWRR', example.twrr, vi
          ? <>Bản thân danh mục sinh lời bao nhiêu mỗi năm, <i>bất kể tôi nạp bao nhiêu, khi nào</i>?</>
          : <>How much did the portfolio itself earn per year, <i>whatever I contributed and whenever</i>?</>, true)}
        {card('MWRR', example.mwrr, vi
          ? <>Đồng tiền của tôi, nạp đúng lúc tôi nạp, thực sự sinh lời bao nhiêu mỗi năm?</>
          : <>What did <i>my</i> money, deposited exactly when I deposited it, actually earn per year?</>)}
      </div>
      {example.twrrGross !== null && example.twrr !== null && (
        <p className="rme-fee-line">
          {vi ? (
            <>
              TWRR trước phí là <b>{pct(example.twrrGross)}/năm</b>, sau phí là <b>{pct(example.twrr)}/năm</b>:
              phí, thuế và chênh lệch mua-bán ăn mất <b>{((example.twrrGross - example.twrr) * 100).toFixed(2)} điểm %</b> mỗi năm.
            </>
          ) : (
            <>
              TWRR before fees is <b>{pct(example.twrrGross)}/yr</b>, after fees <b>{pct(example.twrr)}/yr</b>:
              fees, taxes and the bid-ask spread cost <b>{((example.twrrGross - example.twrr) * 100).toFixed(2)} percentage points</b> a year.
            </>
          )}
        </p>
      )}
    </>
  )
}

function BodyVi() {
  return (
    <>
      <h3>① CAGR: tổng vốn bỏ ra tăng bao nhiêu mỗi năm</h3>
      <p>
        CAGR (Compound Annual Growth Rate) lấy lợi nhuận tích lũy và "quy năm" nó: nếu danh mục tăng đều mỗi năm với một
        tỷ lệ cố định thì tỷ lệ đó là bao nhiêu. Trong tab này CAGR tính từ góc nhìn nhà đầu tư, tức tổng vốn đã bỏ ra so với
        giá trị cuối kỳ.
      </p>
      <div className="dca-glossary-formula">CAGR = (Giá trị cuối ÷ Tổng đầu tư)<sup>1/n</sup> − 1</div>
      <p>
        Ví dụ: bỏ ra tổng cộng 41 triệu, sau 3 năm còn 56 triệu → 56 ÷ 41 = 1,366; 1,366<sup>1/3</sup> − 1 ≈ <b>+11,0%/năm</b>.
      </p>
      <p>
        <b>Điểm yếu:</b> công thức ngầm coi <i>toàn bộ vốn đã hoạt động suốt n năm</i>. Với DCA, khoản nạp tháng thứ 35 mới
        nằm trong danh mục đúng 1 tháng, nên CAGR bị kéo thấp.
      </p>

      <h3>② TWRR: hiệu suất của chính danh mục</h3>
      <p>
        TWRR (Time-Weighted Rate of Return) đo danh mục tăng bao nhiêu <b>bất kể bạn nạp hay rút bao nhiêu và vào lúc nào</b>.
        Mỗi ngày tính riêng một lợi suất rồi nhân các ngày lại với nhau. Tiền nạp và tiền rút là dòng tiền của bạn, không phải
        lãi lỗ, nên bị tách hẳn khỏi kết quả.
      </p>
      <div className="dca-glossary-formula">
        Lợi suất ngày = (V₀ ÷ V hôm qua) × (V₁ ÷ (V₀ + Nạp − Rút)) − 1<br />
        TWRR = Π (1 + lợi suất ngày) − 1, rồi quy năm
      </div>
      <ul>
        <li><b>V₀</b>: giá trị tài khoản hôm nay theo giá thị trường, <i>trước</i> mọi giao dịch hôm nay.</li>
        <li><b>V₁</b>: giá trị tài khoản hôm nay <i>sau</i> giao dịch và sau mọi chi phí.</li>
        <li>
          Thừa số thứ nhất là biến động thị trường. Thừa số thứ hai chỉ khác 1 khi có chi phí, và đó là chỗ phí được trừ.
        </li>
      </ul>
      <p>
        Ví dụ thị trường: ngày 1 tăng +10%, ngày 2 giảm −5% → (1,10 × 0,95) − 1 = <b>+4,5%</b>, dù ngày 2 bạn có nạp thêm gấp
        mười lần số vốn cũ. Nạp thêm không làm TWRR tốt lên hay xấu đi.
      </p>
      <h4>Sau phí và trước phí</h4>
      <p>
        Phí mua, phí bán, thuế và chênh lệch giá mua-bán được <b>trừ thẳng vào lợi nhuận ngay ngày phát sinh</b>, không nằm
        âm thầm trong giá vốn. Ví dụ nạp 5.100.000 đ, mua 100 cổ phiếu, phí 0,15% = 7.500 đ → TWRR ngày đầu là
        −7.500 ÷ 5.100.000 = <b>−0,147%</b>, không phải 0.
      </p>
      <ul>
        <li><b>TWRR trước phí</b> chỉ gồm biến động giá và cổ tức.</li>
        <li><b>TWRR sau phí</b> là con số bạn thực sự giữ. Khoảng cách giữa hai cột chính là phần phí ăn mòn theo thời gian.</li>
      </ul>

      <h3>③ MWRR: đồng tiền của bạn sinh lời bao nhiêu</h3>
      <p>
        MWRR (Money-Weighted Rate of Return) là tỷ suất sinh lời thực tế của nhà đầu tư, có tính <b>thời điểm và số tiền</b> của
        từng lần nạp. Về toán học đó là IRR của toàn bộ dòng tiền: lãi suất r làm giá trị hiện tại của tiền nạp và tiền nhận
        cuối kỳ bằng nhau.
      </p>
      <div className="dca-glossary-formula">Σ Dòng tiền<sub>t</sub> ÷ (1 + r)<sup>t</sup> = 0, nạp là số âm, giá trị cuối kỳ là số dương</div>
      <div className="dca-glossary-table-wrap">
        <table className="dca-glossary-table">
          <thead>
            <tr><th>Khoản đầu tư</th><th>Thời gian thực tế hoạt động</th><th>CAGR giả định</th></tr>
          </thead>
          <tbody>
            <tr><td>5M ban đầu</td><td>3 năm</td><td>3 năm ✓</td></tr>
            <tr><td>1M tháng 6</td><td>2 năm 6 tháng</td><td>3 năm ✗</td></tr>
            <tr><td>1M tháng 18</td><td>1 năm 6 tháng</td><td>3 năm ✗</td></tr>
            <tr><td>1M tháng 35</td><td>1 tháng</td><td>3 năm ✗</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Thời gian hoạt động trung bình thực tế chỉ khoảng 1,5 năm, không phải 3. MWRR biết điều đó nên thường{' '}
        <b>cao hơn CAGR</b> khi thị trường tăng. Nó cũng có thể đảo chiều: nạp một khoản lớn ngay trước khi thị trường sụt mạnh
        thì MWRR <b>thấp hơn</b>, và đó là thiệt hại thật do thời điểm nạp gây ra.
      </p>

      <h3>Ví dụ "cây giống"</h3>
      <p>
        Mỗi tháng bạn dành một khoản tiền mua cây giống về trồng. Sau ba năm bạn bán hết số cây đang có. Làm sao biết vụ đầu tư
        này tốt tới đâu?
      </p>
      <ul>
        <li>
          <b>CAGR</b> coi như bạn đủ tiền mua tất cả cây ngay ngày đầu: chia lãi cuối cùng cho tổng vốn rồi quy về năm. Cây
          mới trồng hôm qua cũng bị tính là đã lớn ba năm.
        </li>
        <li>
          <b>TWRR</b> hỏi <i>giống cây này lớn nhanh cỡ nào</i>, bất kể bạn mua bao nhiêu cây và mua khi nào. Tiền công trồng
          và tiền hàng (phí) bị trừ ngay lúc trả. Đây là thước đo để so hai loại giống với nhau.
        </li>
        <li>
          <b>MWRR</b> tính tăng trưởng của <i>từng cây riêng biệt</i>: cây trồng lâu có nhiều thời gian sinh trưởng nên mang về
          nhiều tiền hơn cây mới mua. Đây là thước đo cho vườn của <i>bạn</i>, gồm cả may rủi về lúc mua.
        </li>
      </ul>

      <h3>Ba con số lệch nhau thì nói lên điều gì</h3>
      <ul>
        <li><b>MWRR &gt; CAGR</b>: rất bình thường với DCA khi thị trường tăng, vì phần lớn vốn mới nạp gần đây.</li>
        <li><b>MWRR &gt; TWRR</b>: bạn nạp nhiều đúng lúc giá thấp (vận may về thời điểm). <b>MWRR &lt; TWRR</b>: bạn nạp nhiều ngay trước lúc thị trường xấu.</li>
        <li><b>TWRR sau phí &lt; TWRR trước phí</b>: phần chênh là chi phí giao dịch và thuế. Phí càng cao, nạp càng nhiều lần nhỏ thì khoảng cách càng lớn.</li>
      </ul>

      <h3>Vì sao có ô để trống</h3>
      <p>
        Khi kỳ mô phỏng <b>chưa đủ 1 năm</b>, các cột CAGR, TWRR và MWRR để trống thay vì hiện %/năm. Quy vài tháng lên cả năm
        chỉ là nội suy: 3 tháng lãi 5% sẽ thành "21,6%/năm" nhưng không ai đảm bảo 9 tháng sau còn lặp lại.
      </p>

      <h3>Nên nhìn con số nào?</h3>
      <div className="dca-glossary-table-wrap">
        <table className="dca-glossary-table">
          <thead>
            <tr><th>Câu hỏi</th><th>Chỉ số phù hợp</th></tr>
          </thead>
          <tbody>
            <tr><td>Danh mục / quỹ / cổ phiếu này tốt đến đâu, so với cái khác?</td><td><b>TWRR sau phí</b></td></tr>
            <tr><td>Phí đang ăn mất bao nhiêu mỗi năm?</td><td><b>TWRR trước phí − TWRR sau phí</b></td></tr>
            <tr><td>Chiến lược nạp tiền của <i>tôi</i> thực sự hiệu quả bao nhiêu?</td><td><b>MWRR</b></td></tr>
            <tr><td>So nhanh với gửi tiết kiệm, trái phiếu</td><td><b>CAGR</b></td></tr>
          </tbody>
        </table>
      </div>
      <blockquote className="dca-glossary-note">
        Để đánh giá <b>khoản đầu tư</b> hãy nhìn TWRR sau phí. Để đánh giá <b>cách nạp tiền của bạn</b> hãy nhìn MWRR. CAGR là con
        số bổ trợ dễ hiểu nhưng dễ gây hiểu lầm nhất trong DCA.
      </blockquote>
    </>
  )
}

function BodyEn() {
  return (
    <>
      <h3>① CAGR: how fast the total you put in grew</h3>
      <p>
        CAGR (Compound Annual Growth Rate) takes the cumulative return and "annualises" it: the equal yearly rate that would
        land on the same result. In this tab CAGR is taken from the investor's view, i.e. total capital paid in versus the
        ending value.
      </p>
      <div className="dca-glossary-formula">CAGR = (Ending value ÷ Total invested)<sup>1/n</sup> − 1</div>
      <p>
        Example: you paid in 41 million in total and after 3 years hold 56 million → 56 ÷ 41 = 1.366; 1.366<sup>1/3</sup> − 1 ≈{' '}
        <b>+11.0%/yr</b>.
      </p>
      <p>
        <b>Weakness:</b> the formula quietly assumes <i>all the capital was working for the full n years</i>. With DCA, the
        contribution of month 35 has only been in the portfolio for a month, so CAGR reads low.
      </p>

      <h3>② TWRR: the performance of the portfolio itself</h3>
      <p>
        TWRR (Time-Weighted Rate of Return) measures how much the portfolio grew <b>regardless of how much you added or
        withdrew, and when</b>. It computes one return per day and compounds them. Deposits and withdrawals are your cash
        flows, not gains or losses, so they are removed from the result entirely.
      </p>
      <div className="dca-glossary-formula">
        Daily return = (V₀ ÷ V yesterday) × (V₁ ÷ (V₀ + Deposits − Withdrawals)) − 1<br />
        TWRR = Π (1 + daily return) − 1, then annualised
      </div>
      <ul>
        <li><b>V₀</b>: today's account value at market prices, <i>before</i> any of today's transactions.</li>
        <li><b>V₁</b>: today's account value <i>after</i> the transactions and after every cost.</li>
        <li>
          The first factor is the market move. The second differs from 1 only when there are costs, which is where fees are
          charged.
        </li>
      </ul>
      <p>
        Market example: day 1 +10%, day 2 −5% → (1.10 × 0.95) − 1 = <b>+4.5%</b>, even if on day 2 you deposited ten times your
        old balance. Adding money neither improves nor hurts TWRR.
      </p>
      <h4>After fees and before fees</h4>
      <p>
        Buy fees, sell fees, taxes and the bid-ask spread are <b>charged straight to the return on the day they occur</b>, not
        left buried in the cost basis. Example: deposit 5,100,000, buy 100 shares, 0.15% fee = 7,500 → day-one TWRR is
        −7,500 ÷ 5,100,000 = <b>−0.147%</b>, not 0.
      </p>
      <ul>
        <li><b>TWRR before fees</b> contains only price moves and dividends.</li>
        <li><b>TWRR after fees</b> is what you actually keep. The gap between the two columns is the drag from costs over time.</li>
      </ul>

      <h3>③ MWRR: what your money earned</h3>
      <p>
        MWRR (Money-Weighted Rate of Return) is the investor's real return, counting the <b>date and size</b> of every
        contribution. Mathematically it is the IRR of the whole cash-flow series: the rate r that makes the present value of
        the deposits equal the present value of the ending balance.
      </p>
      <div className="dca-glossary-formula">Σ Cash flow<sub>t</sub> ÷ (1 + r)<sup>t</sup> = 0, deposits negative, ending value positive</div>
      <div className="dca-glossary-table-wrap">
        <table className="dca-glossary-table">
          <thead>
            <tr><th>Investment</th><th>Time actually invested</th><th>CAGR assumes</th></tr>
          </thead>
          <tbody>
            <tr><td>5M initial</td><td>3 years</td><td>3 years ✓</td></tr>
            <tr><td>1M in month 6</td><td>2 years 6 months</td><td>3 years ✗</td></tr>
            <tr><td>1M in month 18</td><td>1 year 6 months</td><td>3 years ✗</td></tr>
            <tr><td>1M in month 35</td><td>1 month</td><td>3 years ✗</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The average time in the market is really about 1.5 years, not 3. MWRR knows that, so in a rising market it usually
        reads <b>higher than CAGR</b>. It can flip too: put a large sum in just before a sharp fall and MWRR reads{' '}
        <b>lower</b>, which is the real damage your timing caused.
      </p>

      <h3>The "saplings" analogy</h3>
      <p>
        Each month you set aside some money to buy saplings and plant them. After three years you sell every tree you have.
        How do you tell how good the venture was?
      </p>
      <ul>
        <li>
          <b>CAGR</b> pretends you had enough money on day one to buy every tree at once: divide the final gain by total capital
          and annualise. A tree planted yesterday is treated as if it had grown for three years.
        </li>
        <li>
          <b>TWRR</b> asks <i>how fast does this variety grow</i>, regardless of how many trees you bought and when. Planting
          labour and the price of the stock (fees) are deducted the moment you pay them. This is the yardstick for comparing
          two varieties.
        </li>
        <li>
          <b>MWRR</b> measures the growth of <i>each tree separately</i>: a tree planted long ago had more time to grow and
          brings in more than one bought recently. This is the yardstick for <i>your</i> orchard, luck of timing included.
        </li>
      </ul>

      <h3>What it means when the three disagree</h3>
      <ul>
        <li><b>MWRR &gt; CAGR</b>: perfectly normal for DCA in a rising market, because most of the money went in recently.</li>
        <li><b>MWRR &gt; TWRR</b>: you happened to add more when prices were low. <b>MWRR &lt; TWRR</b>: you added more just before things went bad.</li>
        <li><b>TWRR after fees &lt; TWRR before fees</b>: the gap is trading costs and taxes. The higher the fees and the more small contributions, the wider it gets.</li>
      </ul>

      <h3>Why some cells are blank</h3>
      <p>
        When the simulated period is <b>shorter than one year</b>, the CAGR, TWRR and MWRR columns are left blank instead of
        showing a %/yr. Scaling a few months up to a year is extrapolation: 5% in 3 months would read "21.6%/yr", with no
        guarantee the next 9 months repeat it.
      </p>

      <h3>Which one to look at?</h3>
      <div className="dca-glossary-table-wrap">
        <table className="dca-glossary-table">
          <thead>
            <tr><th>Question</th><th>Right measure</th></tr>
          </thead>
          <tbody>
            <tr><td>How good is this portfolio / fund / stock compared with another?</td><td><b>TWRR after fees</b></td></tr>
            <tr><td>How much are fees costing me each year?</td><td><b>TWRR before fees − TWRR after fees</b></td></tr>
            <tr><td>How well did <i>my</i> contribution schedule actually work?</td><td><b>MWRR</b></td></tr>
            <tr><td>A quick comparison with bank savings or bonds</td><td><b>CAGR</b></td></tr>
          </tbody>
        </table>
      </div>
      <blockquote className="dca-glossary-note">
        To judge the <b>investment</b>, read TWRR after fees. To judge <b>how you paid money in</b>, read MWRR. CAGR is the
        easiest to grasp but the easiest to misread in DCA.
      </blockquote>
    </>
  )
}

export const ReturnMetricsExplainer = memo(ReturnMetricsExplainerImpl)
