/**
 * English content of the "Key concepts" block on the DCA tab.
 *
 * Same reasoning as the Methodology tab (see MethodologyParts.tsx): this is an
 * explainer with formulas, worked numbers and comparison tables, so two
 * parallel documents stay easier to read and to keep in sync than dozens of
 * fragmented dictionary keys.
 */
export function GlossaryEn() {
  return (
    <>
      {/* ── Intro ── */}
      <p>
        The DCA tab shows <strong>three headline figures</strong> in its summary card:
        cumulative return, CAGR and MWRR. They measure different things and serve
        different purposes. What follows explains each one, simplest first.
      </p>

      <hr className="dca-glossary-divider" />

      {/* ── 1. Cumulative return ── */}
      <h3>① Cumulative return</h3>
      <p>
        The simplest figure of the three: the total percentage gain or loss against
        the capital you put in.
      </p>
      <div className="dca-glossary-formula">
        Cumulative return = Ending value ÷ Total invested &minus; 1
      </div>
      <p>
        For example: you invested 41 million in total and the portfolio is now worth
        56 million → cumulative return = 56 ÷ 41 &minus; 1 = <strong>+36.6%</strong>.
      </p>
      <p>
        This answers <em>"how much have I made in total?"</em> but says nothing about
        the yearly rate, which makes it hard to compare periods of different lengths.
      </p>

      <hr className="dca-glossary-divider" />

      {/* ── 2. CAGR ── */}
      <h3>② CAGR: the cumulative return, annualised</h3>
      <p>
        CAGR (compound annual growth rate) takes the cumulative return above and
        annualises it: if the portfolio grew by the same fixed rate every year, what
        would that rate be?
      </p>
      <div className="dca-glossary-formula">
        CAGR = (Ending value ÷ Total invested)<sup>1/n</sup> &minus; 1
      </div>
      <p>
        For example: 56 million ÷ 41 million over 3 years → CAGR = 1.366<sup>1/3</sup>{' '}
        &minus; 1 = <strong>+11.1% a year</strong>. It captures the force of compounding
        and lets you compare portfolios held for different lengths of time.
      </p>
      <blockquote className="dca-glossary-note">
        <strong>Note:</strong> the CAGR on this tab is computed from the investor’s
        point of view — total capital invested against the ending value. It is{' '}
        <em>not</em> the fund’s own CAGR (TWRR), which ignores DCA contributions
        entirely.
      </blockquote>

      <hr className="dca-glossary-divider" />

      {/* ── 3. MWRR ── */}
      <h3>③ MWRR: the one that matters for DCA</h3>
      <p>
        MWRR (money-weighted rate of return) is your actual return as an investor,
        counting the <strong>date and size</strong> of every contribution.
        Mathematically it is the internal rate of return of the whole cash-flow
        stream.
      </p>
      <p>
        It answers the question that matters most for DCA:{' '}
        <em>"how well is my recurring contribution strategy actually doing, per year?"</em>
      </p>

      <h4>Why is MWRR usually higher than CAGR in a DCA plan?</h4>
      <p>
        This is <strong>entirely normal</strong> when the market rises steadily, and it
        comes from how each measure understands "time invested":
      </p>
      <ul>
        <li>
          <strong>CAGR assumes something false:</strong> the formula implicitly treats{' '}
          <em>all the capital as having been at work for the full n years</em>. But the
          contribution you made in month 30 only worked for the final six months, not
          three years. CAGR penalises you for an assumption that is not true, so it
          reads lower.
        </li>
        <li>
          <strong>MWRR gets it right:</strong> it knows each contribution only works
          from the day it went in. To produce the same ending value out of those
          shorter stints, the real rate has to be higher.
        </li>
      </ul>
      <div className="dca-glossary-table-wrap">
        <table className="dca-glossary-table">
          <thead>
            <tr>
              <th>Contribution</th>
              <th>Actually invested for</th>
              <th>CAGR assumes</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>5M at the start</td><td>3 years</td><td>3 years ✓</td></tr>
            <tr><td>1M in month 6</td><td>2 years 6 months</td><td>3 years ✗</td></tr>
            <tr><td>1M in month 18</td><td>1 year 6 months</td><td>3 years ✗</td></tr>
            <tr><td>1M in month 35</td><td>1 month</td><td>3 years ✗</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The real average time invested is around 1.5 years, not 3. MWRR counts that
        correctly, which is why it comes out above CAGR.
      </p>
      <blockquote className="dca-glossary-note">
        <strong>The relationship can invert:</strong> if you put a large amount in
        right before a sharp fall (<em>buying the top</em>), MWRR will read{' '}
        <strong>below</strong> CAGR — correctly reflecting the damage your timing did.
      </blockquote>

      <hr className="dca-glossary-divider" />

      {/* ── 4. Which one ── */}
      <h3>④ Which figure should you use?</h3>
      <div className="dca-glossary-table-wrap">
        <table className="dca-glossary-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>The figure to use</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>How much have I made in total against what I put in?</td>
              <td><strong>Cumulative return</strong></td>
            </tr>
            <tr>
              <td>Expressed per year, what is that?</td>
              <td><strong>CAGR</strong></td>
            </tr>
            <tr>
              <td>How well is my DCA strategy actually doing?</td>
              <td><strong>MWRR</strong> ✓ recommended</td>
            </tr>
          </tbody>
        </table>
      </div>
      <blockquote className="dca-glossary-note">
        For a DCA strategy, treat <strong>MWRR as the headline figure</strong>. CAGR
        and the cumulative return are supporting numbers that fill in the picture.
      </blockquote>
    </>
  )
}
