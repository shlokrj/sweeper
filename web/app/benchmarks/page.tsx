import type { CSSProperties } from "react";
import { SiteNav } from "../components/site-nav";
import { pixelDust } from "../components/pixel-texture";

const benchmarkRows = [
  ["random", "0.0%", "4.8", "uniform valid move"],
  ["local heuristic", "33.0%", "10.9", "clue count"],
  ["symbolic", "87.6%", "19.2", "constraint proof"],
  ["exact", "86.2%", "18.6", "frontier enumeration"],
  ["hybrid", "90.6%", "19.7", "symbolic + exact"],
  ["strategy CNN", "88.8%", "19.2", "strategy channels"],
  ["strategy CNN hybrid", "91.0%", "19.7", "model rank + proof"],
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
        <p>500 beginner boards, 9 × 9, 10 mines. Every agent sees the same seeds from 20000 through 20499.</p>
      </section>

      <section className="benchmark-highlight corner-ticks" style={highlightStyle} aria-label="Best observed result">
        <div>
          <span>best win rate</span>
          <strong>91.0%</strong>
        </div>
        <p>Strategy CNN hybrid on the held-out 10-mine board set.</p>
      </section>

      <section className="strategy-study" aria-labelledby="strategy-study-title">
        <div className="strategy-study-copy">
          <span>intermediate extension</span>
          <h2 id="strategy-study-title">The harder board check.</h2>
          <p>The same control and strategy models also ran on 16 × 16 boards with 40 mines. The strategy model adds three playbook-derived channels.</p>
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
        <p className="strategy-method">Lower is better for Brier score and expected calibration error. This separate test uses 500 held-out intermediate boards.</p>
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
