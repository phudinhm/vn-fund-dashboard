/**
 * English content of the "Methodology" tab.
 *
 * Every formula here mirrors the real function in src/utils/dca.ts,
 * drawdownStats.ts and calculations.ts. When a formula changes in code, update
 * both this file and MethodologyVi.tsx to match.
 */
import { Formula, Where, SeenAt, Example, Section } from './MethodologyParts'

export const SECTION_LABELS_EN = [
  '0. Where the data comes from',
  '1. How the DCA simulation runs',
  '2. Four ways to measure return',
  '3. Measuring risk',
  '4. Behavioural scenarios',
  '5. Projecting forward (Endgame)',
]

export function MethodologyEn() {
  return (
    <>
      {/* ─────────────────────────── 0. DATA ─────────────────────────── */}
      <Section id="m-data" title="0. Where the data comes from">
        <p>
          Open-ended fund prices come from <strong>fmarket.vn</strong> (NAV for each
          trading day). ETF and Bitcoin prices come from <strong>vnstock</strong> and
          CoinGecko. Gold prices come from sjc.com.vn. All of it updates automatically
          every day.
        </p>
        <p>
          For funds that pay dividends (DCDE, for instance), historical prices are{' '}
          <strong>adjusted for dividends after tax</strong> at load time, using Yahoo-style
          adjustment factors. Performance therefore already assumes dividends are
          reinvested — you do not have to add anything yourself.
        </p>
        <p>
          Funds publish NAV on different days, especially the older ones. Before computing
          anything the dashboard aligns everything onto a <strong>common date grid</strong>:
          where a fund has no price for a day, the most recent earlier price is carried
          forward. When comparing several funds, the period starts on the latest date at
          which every fund has data.
        </p>
        <SeenAt where="Where you see it, in the Compare tab">the "Data quality" panel, which states each fund’s data range and any gaps.</SeenAt>

        <h4 className="method-sub">0.1. Bank savings: not fetched from anywhere</h4>
        <p>
          Bank savings is unlike every other asset in the list. It has no NAV and no source
          to fetch. You enter a fixed interest rate (6% a year by default), the dashboard
          generates a compound-interest price series in your browser, and then treats that
          series exactly like a fund’s NAV:
        </p>
        <Formula>Price(t) = 100 × (1 + rate)<sup>days elapsed / 365.25</sup></Formula>
        <p>
          The series behaves like a fund certificate. Each contribution buys "units" at that
          day’s price. It mixes by weight. It rebalances on whatever schedule you pick.
          Money contributed in a given month starts earning from that month, rather than
          being lumped together and credited once at year end.
        </p>
        <p>
          A limit worth knowing: real bank rates move year to year — 4% one year, 8% the
          next. The number you enter here is <strong>fixed for the whole backtest</strong>,
          whether that is 10 years or 20. This is not historical rate data. The "assumed
          fixed rate" label in the fund dropdown says exactly that.
        </p>
        <p>
          There are two places the dashboard deliberately does NOT show savings, because
          showing it would teach the wrong thing:
        </p>
        <ul className="method-list">
          <li>
            <strong>The "Asset price" chart (Compare tab).</strong> That series based at 100
            is a generated index, not the real price of any unit of anything. Putting it
            beside a fund certificate or a tael of gold would imply savings has a "unit
            price" too.
          </li>
          <li>
            <strong>The Sharpe ratio (Bitcoin tab).</strong> Sharpe is return divided by
            volatility. Savings has zero volatility, and dividing by zero does not give
            "infinite efficiency" — it is undefined, so the cell is left blank. Sharpe exists
            to compare two risky assets; applying it to a riskless one is using the wrong
            ruler.
          </li>
        </ul>
        <Example label="A worked example">
          <p>Savings at an assumed 6% a year:</p>
          <ul>
            <li>Start date: price = 100.</li>
            <li>After exactly 1 year: price = 100 × 1.06<sup>1</sup> = <strong>106</strong>.</li>
            <li>After exactly 2 years: price = 100 × 1.06<sup>2</sup> = <strong>112.36</strong>.</li>
          </ul>
          <p>
            Mix 60% savings at 6% with 40% of an ETF in the same portfolio and the savings
            portion rises steadily while the ETF portion moves with the market as usual. The
            result is a TWRR line that climbs less steeply but is also less bumpy.
          </p>
        </Example>
        <SeenAt where="Where you see it, across 4 tabs">the "Bank savings (fixed rate, you set it)" option in the fund pickers on the DCA, Compare, Rebalancing and Bitcoin tabs, with a rate input beside it.</SeenAt>
      </Section>

      {/* ─────────────────────────── 1. SIMULATION ─────────────────────────── */}
      <Section id="m-sim" title="1. How the DCA simulation runs">
        <p>
          Dollar-cost averaging is simulated as a loop over each trading day. The inputs are
          what you entered: the initial amount, the recurring amount, the contribution
          frequency (daily, weekly, monthly…), the portfolio and its weights, and the
          rebalancing schedule.
        </p>
        <p>Each day, the loop does three things in order:</p>
        <ol className="method-list">
          <li>
            <strong>Measure the market return first.</strong> Value the portfolio at today’s
            prices, compare it to yesterday’s closing value, and take that as the day’s
            return. This happens <em>before</em> new money is added, so that "the market
            moved" is kept separate from "you contributed".
          </li>
          <li>
            <strong>Contribute, if it is a contribution day.</strong> Buy more certificates
            at that day’s NAV, split by portfolio weight. The unit count rises.
          </li>
          <li>
            <strong>Rebalance, if it is a rebalancing day.</strong> Sell down whatever is
            over its target weight, buy whatever is under, and return the portfolio to its
            target weights.
          </li>
        </ol>
        <p>
          The output is four time series: <strong>portfolio value</strong> (including
          contributions), <strong>total invested</strong>, <strong>cash flows</strong> (each
          contribution is a negative number), and the <strong>cumulative TWRR series</strong>
          {' '}(explained in section 2). Every table and chart on the DCA tab is rebuilt from
          those four.
        </p>
        <p>
          The simulation assumes you can buy exactly the amount you entered each period, and
          ignores trading fees and tax (except the dividend tax already deducted during price
          adjustment). For gold there is a separate warning if the per-period amount is not
          enough to buy one real-world lot.
        </p>
      </Section>

      {/* ─────────────────────────── 2. RETURNS ─────────────────────────── */}
      <Section id="m-returns" title="2. Four ways to measure return">
        <p>
          The same DCA portfolio can produce several different return figures, and each one
          answers a different question.
        </p>

        <h4 className="method-sub">2.1. Cumulative return</h4>
        <p>The question: what percentage has every dong invested made so far?</p>
        <Formula>Cumulative return = Ending value / Total invested − 1</Formula>
        <p>
          The simplest calculation there is. But it is not annualised, and it does not
          distinguish money that has been in the market longer. Someone who has been
          contributing for 10 years and someone who started 2 years ago can land on the same
          number while telling completely different stories.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "Cumulative return" column in the stats table, and the "Return" tile under "Your journey".</SeenAt>

        <h4 className="method-sub">2.2. Investor CAGR</h4>
        <p>The question: expressed as an equal return each year, what is it?</p>
        <Formula>CAGR = (Ending value / Total invested)<sup>1 / years</sup> − 1</Formula>
        <p>
          This annualises the return, but it is <strong>only correct if all the capital was
          in the market from day one</strong>. With DCA it was not. Most of the money went in
          recently and has barely had time to compound.
        </p>
        <p>
          So investor CAGR usually comes out <em>lower</em> than the MWRR below. It is handy
          for a quick comparison, but it is not the fairest measure of a DCA plan.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "CAGR" column in the stats table.</SeenAt>

        <h4 className="method-sub">2.3. MWRR (money-weighted return)</h4>
        <p>
          The question: counting the exact timing and size of every contribution, what did
          you actually earn per year? This is the fairest measure for DCA.
        </p>
        <p>
          MWRR is the internal rate of return. The dashboard looks for the annual rate r at
          which discounting every cash flow back to the present sums to zero:
        </p>
        <Formula>Find r such that: Σ CF<sub>i</sub> / (1 + r)<sup>t<sub>i</sub></sup> = 0</Formula>
        <Where>
          CF<sub>i</sub> is the i-th cash flow: negative when you contribute, positive on the
          final day and equal to the portfolio value then. t<sub>i</sub> is the number of
          years since the first contribution. The equation has no closed-form solution, so
          the dashboard solves it numerically with Newton-Raphson.
        </Where>
        <p>
          MWRR accounts for the fact that money contributed late has had less time to
          compound, so it is not dragged down the way investor CAGR is. That is why, for
          DCA, MWRR is usually the higher of the two.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "MWRR" column in the stats table, and the "MWRR" column in the panic-selling and buy-the-dip scenario tables.</SeenAt>

        <Example label="A worked example">
          <p>
            Suppose you contribute 100 million at the start, another 100 million exactly a
            year later, and after 2 years the portfolio is worth 231 million. Three different
            numbers come out:
          </p>
          <ul>
            <li>Cumulative return = 231 / 200 − 1 = <strong>+15.5%</strong></li>
            <li>Investor CAGR = (231 / 200)<sup>1/2</sup> − 1 = <strong>+7.47% a year</strong></li>
            <li>
              MWRR: solve −100 − 100/(1+r) + 231/(1+r)<sup>2</sup> = 0, giving r ={' '}
              <strong>+10% a year</strong>
            </li>
          </ul>
          <p>
            MWRR (10%) beats investor CAGR (7.47%) because the 100 million contributed in the
            second year only had one year to compound, and MWRR counts that correctly.
            Investor CAGR assumes all 200 million ran for the full 2 years, which drags it
            down.
          </p>
        </Example>

        <h4 className="method-sub">2.4. TWRR (time-weighted return)</h4>
        <p>
          The question: how did the portfolio itself perform, regardless of how much you
          contributed and when? TWRR is separated entirely from cash flows — it measures the
          fund’s performance, not your wallet’s.
        </p>
        <p>
          The method: measure the market return each day (before any new money goes in), then
          chain the days together:
        </p>
        <Formula>
          TWRR = (1 + r<sub>1</sub>)(1 + r<sub>2</sub>)…(1 + r<sub>n</sub>) − 1
        </Formula>
        <Where>
          r<sub>day</sub> = (today’s portfolio value, measured before new money is added) /
          (yesterday’s closing value) − 1.
        </Where>
        <p>
          Because contributions are added <em>after</em> the return is measured, how much you
          put in never skews TWRR. This is the number used to compare funds against each
          other, and to compute the "real market storm" drawdown in section 3.
        </p>
        <Example label="A worked example">
          <p>A portfolio over two days:</p>
          <ul>
            <li>Day 0: contribute 100, value 100.</li>
            <li>
              Day 1: the market rises, value (before contributing) = 110, so r<sub>1</sub> =
              +10%. Then contribute another 100, closing value = 210.
            </li>
            <li>Day 2: the market falls, value = 189, so r<sub>2</sub> = 189/210 − 1 = −10%.</li>
          </ul>
          <p>
            TWRR = (1 + 0.10)(1 − 0.10) − 1 = <strong>−1%</strong>. Exactly what the market
            did — up 10%, then down 10% — with nothing to do with the extra 100 you put in
            partway. Your account balance, meanwhile, went 100 → 210 → 189, which is a
            different story altogether.
          </p>
        </Example>

        <h4 className="method-sub">2.5. Side by side</h4>
        <div className="method-table-wrap">
          <table className="method-table">
            <thead>
              <tr>
                <th>Measure</th>
                <th>Answers</th>
                <th>Counts cash flows?</th>
                <th>Annualised?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cumulative return</td>
                <td>What % has each dong made?</td>
                <td>Yes (all lumped together)</td>
                <td>No</td>
              </tr>
              <tr>
                <td>Investor CAGR</td>
                <td>What is that per year, evenly?</td>
                <td>No (treats it as one contribution up front)</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>MWRR</td>
                <td>What did you actually compound at?</td>
                <td>Yes (each one at its own date)</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>TWRR</td>
                <td>How did the fund itself do?</td>
                <td>No (fully separated from flows)</td>
                <td>Yes (once converted to CAGR)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="method-sub">2.6. Yearly performance (Modified Dietz)</h4>
        <p>
          The "Your portfolio’s performance by year" table does not use TWRR. It uses
          Modified Dietz, to reflect what your DCA actually experienced within each year.
          Money contributed early in the year carries a higher weight, because it had more
          time to earn; money contributed in December has barely earned anything.
        </p>
        <Formula>
          R = (EV − BV − net contributions) / (BV + Σ contribution<sub>i</sub> × (1 − t<sub>i</sub>/T))
        </Formula>
        <Where>
          EV is the year-end value, BV the year-start value, net contributions the total paid
          in during the year, t<sub>i</sub> the number of days from the start of the period to
          the i-th contribution, and T the total days in that year. This is the standard GIPS
          formula for short periods: stable results without the iterative solving MWRR needs.
        </Where>
        <SeenAt where="Where you see it, in the DCA tab">the "Your portfolio’s performance by year" table under "Performance".</SeenAt>
      </Section>

      {/* ─────────────────────────── 3. RISK ─────────────────────────── */}
      <Section id="m-risk" title="3. Measuring risk">
        <h4 className="method-sub">3.1. Drawdown: why there are two lines</h4>
        <p>
          Drawdown is how far the value has fallen below its highest point so far. The
          "Riding out the storm" section has two charts that look alike but measure different
          things:
        </p>
        <Formula>Drawdown = Current value / Highest value so far − 1</Formula>
        <ul className="method-list">
          <li>
            <strong>How far did the fund fall?</strong> Uses the TWRR series, separated from
            cash flows. This is the fund’s real market storm, and it is usually the deeper of
            the two.
          </li>
          <li>
            <strong>How far did your balance fall?</strong> Uses your wallet’s actual value,
            contributions included. This is what you see when you open the fund app.
          </li>
        </ul>
        <p>
          Your balance usually falls less far than the fund does, because every contribution
          made during the storm slows the peak from rising and softens the trough. That is
          precisely the part DCA rescues. In DCDS’s history, for example, the fund price once
          fell about −69.5% while the account balance at its worst was around −52.2%.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the two charts "How far did the fund fall?" and "How far did your balance fall?" under "Riding out the storm".</SeenAt>

        <h4 className="method-sub">3.2. Deepest, average and longest drawdown</h4>
        <p>
          All three of these are computed on the TWRR drawdown series — the fund’s own
          decline, not the decline you actually saw in your balance (see 3.1 for why the two
          differ).
        </p>
        <ul className="method-list">
          <li>
            <strong>Maximum drawdown:</strong> the deepest single decline in the series, from
            an old peak down to the lowest point reached.
          </li>
          <li>
            <strong>Average drawdown:</strong> the average of every day’s drawdown across the
            period (a day at a new high counts as 0%). This tells you how far below the peak
            you typically sat, not just the worst case.
          </li>
          <li>
            <strong>Longest underwater:</strong> the longest stretch from setting a peak to
            reclaiming it. A stretch that has not recovered is counted through to the most
            recent data.
          </li>
        </ul>
        <SeenAt where="Where you see it, in the DCA tab">the "Max / average drawdown" and "Longest underwater" columns in the stats table, and the "Largest drawdowns" table.</SeenAt>

        <h4 className="method-sub">3.3. Volatility (annualised standard deviation)</h4>
        <p>
          How much the returns swing. The higher the number, the bumpier the ride.
        </p>
        <Formula>Volatility = Standard deviation of per-session returns × √(sessions per year)</Formula>
        <Where>
          sessions per year is inferred from the actual data density (total points divided by
          total years), <strong>not fixed at 252</strong>. Fixing it at 252 would misstate
          assets that trade at weekends too, such as Bitcoin at roughly 365 sessions a year,
          understating their volatility. Inferring it from the real density works whether the
          data is an open-ended fund, an ETF or Bitcoin.
        </Where>
        <SeenAt where="Where you see it, in the DCA tab">the "Volatility" column in the stats table.</SeenAt>

        <h4 className="method-sub">3.4. Profit factor</h4>
        <p>The question: taking every session together, how do total gains compare to total losses?</p>
        <Formula>Profit factor = Σ(gains on up sessions) / |Σ(losses on down sessions)|</Formula>
        <p>
          Above 1 means total gains exceed total losses. A figure of 1.5 means every dong of
          loss is matched by 1.5 dong of gain. Computed on per-session TWRR returns.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "Profit factor" column in the stats table.</SeenAt>
      </Section>

      {/* ─────────────────────────── 4. BEHAVIOUR ─────────────────────────── */}
      <Section id="m-behavior" title="4. Behavioural scenarios">
        <h4 className="method-sub">4.1. Panicking and stopping, and "opportunity cost"</h4>
        <p>
          This scenario re-runs the same portfolio, except that whenever the fund is more
          than a set amount below its peak (−15% or −25%, say), it assumes fear got the
          better of you and you skipped that contribution. The skipped money is treated as
          cash: it neither earns nor loses.
        </p>
        <p>
          You cannot compare ending values directly, because the panicking version skipped
          contributions and therefore invested less in total. Comparing them head-on would
          inflate the gap with money that was simply never invested, rather than invested
          badly. So the dashboard adds the skipped cash back before comparing:
        </p>
        <Formula>
          Opportunity cost = Value (contributing steadily) − [ Value (panicking) + cash never contributed ]
        </Formula>
        <p>
          What is left is the real damage from buying at the wrong times and losing the
          compounding, separated from simply having less capital. Panic usually loses for a
          specific reason: the contributions made during the deepest falls buy at the lowest
          prices, and those are exactly the units that gain the most on the way back up.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "What if you panicked and stopped when you saw red?" table and chart.</SeenAt>

        <h4 className="method-sub">4.2. Buying more when you see red</h4>
        <p>
          The mirror image: whenever the fund falls past the threshold, this assumes you
          deliberately put in extra — buying more while it is cheap. Because this invests{' '}
          <em>more</em> capital rather than less, the table has no "opportunity cost" column.
        </p>
        <p>
          Here the fairest measure is <strong>MWRR</strong>, not raw percentage return.
          Percentage return is per dong invested but does not distinguish money that went in
          early from money that went in late, while MWRR counts exactly how many years each
          dong had to compound. Comparing two different contribution schedules requires MWRR
          to avoid a skewed answer.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "And if you bought more when you saw red?" table.</SeenAt>

        <h4 className="method-sub">4.3. Rolling returns: where do you sit?</h4>
        <p>
          The question: if a great many people bought this fund, each starting in a different
          month and each holding for exactly N years, where would your result fall among
          them?
        </p>
        <p>
          The dashboard takes every consecutive N-year window in the history, computes a
          TWRR-style CAGR for each, and builds a distribution. It then computes the CAGR of{' '}
          <strong>your most recent N years</strong> and places it in that distribution to get
          a percentile.
        </p>
        <Where>
          The crucial part: your CAGR has to be computed with the <strong>same formula and
          the same window length</strong> as the distribution it is compared against. Taking
          a whole-period CAGR and comparing it to a distribution of N-year windows compares
          two different things and produces a meaningless rank.
        </Where>
        <SeenAt where="Where you see it, in the DCA tab">the "What if you had started at a different time?" section, with its distribution chart and the line placing your actual CAGR within it.</SeenAt>

        <h4 className="method-sub">4.4. The same 100 million, entered at different times</h4>
        <p>
          This is the real-money, real-dates version of "how much does entering early or late
          matter". For each starting point — 10 years, 5 years, 3 years, 1 year and 6 months
          ago — it assumes a single 100 million purchase at that day’s NAV, held to today:
        </p>
        <Formula>Value today = 100 million × (NAV today / NAV at entry)</Formula>
        <p>
          NAV is dividend-adjusted, so the figure already includes reinvested dividends. This
          is not a probability distribution — it is the specific number you would be looking
          at in your account.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "The same 100 million, entered at different times" table.</SeenAt>
      </Section>

      {/* ─────────────────────────── 5. THE FUTURE ─────────────────────────── */}
      <Section id="m-future" title="5. Projecting forward (Endgame)">
        <h4 className="method-sub">5.1. Projecting on the asset’s own CAGR</h4>
        <p>
          The Endgame section projects forward by assuming you keep contributing steadily and
          the portfolio compounds at some baseline rate. That baseline is the{' '}
          <strong>asset’s own TWRR-style CAGR</strong> — the fund’s TWRR growth annualised
          over real calendar time:
        </p>
        <Formula>Asset CAGR = (1 + whole-period TWRR growth)<sup>1 / years</sup> − 1</Formula>
        <p>
          An important choice: the projection does <strong>not</strong> use "ending value
          divided by total invested", because that figure is artificially depressed — most
          DCA capital went in recently and has not had time to compound. Using it as the
          baseline would project far too low. The asset’s own CAGR reflects its actual
          long-run earning power.
        </p>
        <p>
          This is not a forecast. Nobody knows the market in advance. It is only the
          extrapolation of "if the future repeats the average return of the past".
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the "Endgame" section and its projection chart.</SeenAt>

        <h4 className="method-sub">5.2. Monte Carlo</h4>
        <p>
          Rather than a single line at the average rate, Monte Carlo draws thousands of
          possible futures, so you can see how wide the range of outcomes really is.
        </p>
        <p>
          The method takes the fund’s monthly return history, cuts it into blocks of 12
          consecutive months (keeping the order within each block), shuffles the blocks at
          random and stitches them into one future. Repeat 1,000 times, each run still
          contributing on your DCA schedule.
        </p>
        <p>
          The result is a distribution by month (the p10, p25, p50, p75 and p90 levels).
          Because the samples come from the fund’s own real history, that range already
          contains bad stretches like the 2018–2019 bear market and COVID in March 2020.
        </p>
        <SeenAt where="Where you see it, in the DCA tab">the Monte Carlo chart in the "Endgame" section.</SeenAt>
      </Section>

      <footer className="method-footer">
        <p>
          Every formula on this page reflects the code that is actually running. If you find
          a number that is not explained here, or suspect something is computed wrongly, say
          so.
        </p>
        <p>Data from fmarket.vn &amp; vnstock. Updated daily.</p>
      </footer>
    </>
  )
}
