import type { CSSProperties } from "react";
import { SiteNav } from "../components/site-nav";
import { pixelDust } from "../components/pixel-texture";

const benchmarkRows = [
  ["random", "0.0%", "6.0", "uniform valid move"],
  ["local heuristic", "0.2%", "9.4", "clue count"],
  ["symbolic", "68.2%", "65.5", "constraint proof"],
  ["exact", "1.0%", "14.1", "frontier enumeration"],
  ["hybrid", "72.8%", "69.7", "symbolic + exact"],
  ["strategy CNN", "71.2%", "68.1", "strategy channels"],
  ["strategy CNN hybrid", "75.4%", "71.4", "model rank + proof"],
];

const ablationRows = [
  ["CNN win rate", "66.0%", "71.2%", "+5.2 pp"],
  ["CNN hybrid win rate", "74.8%", "75.4%", "+0.6 pp"],
  ["Brier score", "0.000259", "0.000201", "−22.4%"],
  ["Expected calibration error", "0.001483", "0.000468", "−68.4%"],
];

const highlightStyle = { "--board-dust": pixelDust(160, 18, 17, 0.4) } as CSSProperties;

export default function BenchmarksPage() {
  return (
    <main className="site-page inner-page">
      <SiteNav active="benchmarks" />
      <section className="inner-heading benchmark-heading">
        <h1>Benchmarks</h1>
        <p>500 intermediate boards, 16 × 16, 40 mines. Every agent sees the same seeds from 70000 through 70499.</p>
      </section>

      <section className="benchmark-highlight corner-ticks" style={highlightStyle} aria-label="Best observed result">
        <div>
          <span>best win rate</span>
          <strong>75.4%</strong>
        </div>
        <p>Strategy CNN hybrid on the held-out intermediate board set.</p>
      </section>

      <section className="strategy-study" aria-labelledby="strategy-study-title">
        <div className="strategy-study-copy">
          <span>strategy channel ablation</span>
          <h2 id="strategy-study-title">Same data, clearer estimates.</h2>
          <p>The control and strategy models use the same intermediate training data. The strategy model adds three playbook-derived channels.</p>
        </div>
        <div className="strategy-matrix" role="table" aria-label="Control and strategy model comparison">
          <div className="strategy-matrix-row strategy-matrix-head" role="row">
            <span role="columnheader">metric</span><span role="columnheader">control</span><span role="columnheader">strategy</span><span role="columnheader">change</span>
          </div>
          {ablationRows.map(([metric, control, strategy, change]) => (
            <div className="strategy-matrix-row" key={metric} role="row">
              <span role="cell">{metric}</span><span role="cell">{control}</span><span role="cell">{strategy}</span><strong role="cell">{change}</strong>
            </div>
          ))}
        </div>
        <p className="strategy-method">Lower is better for Brier score and expected calibration error. All values use the same held-out evaluation split.</p>
      </section>

      <section className="benchmark-table-wrap" aria-label="Agent benchmark results">
        <div className="benchmark-table" role="table" aria-label="Agent benchmark results">
          <div className="benchmark-row benchmark-head" role="row">
            <span role="columnheader">agent</span><span role="columnheader">win rate</span><span role="columnheader">avg moves</span><span role="columnheader">decision rule</span>
          </div>
          {benchmarkRows.map(([agent, winRate, moves, rule], index) => (
            <div
              className={`benchmark-row ${index >= 5 ? "benchmark-model" : ""}`}
              key={agent}
              role="row"
              style={{ "--row-delay": `${(index + 1) * 55}ms`, "--rate": winRate } as CSSProperties}
            >
              <span role="cell">{agent}</span>
              <span className="benchmark-rate" role="cell"><strong>{winRate}</strong><i className="win-bar" aria-hidden="true" /></span>
              <span role="cell">{moves}</span>
              <span role="cell">{rule}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
