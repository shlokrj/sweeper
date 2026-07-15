import type { CSSProperties } from "react";
import { SiteNav } from "../components/site-nav";
import { pixelDust } from "../components/pixel-texture";

const benchmarkRows = [
  ["random", "0.0%", "4.8", "uniform valid move"],
  ["local heuristic", "33.0%", "10.9", "clue count"],
  ["symbolic", "87.6%", "19.2", "constraint proof"],
  ["exact", "86.2%", "18.6", "frontier enumeration"],
  ["hybrid", "90.6%", "19.7", "symbolic + exact"],
  ["CNN", "88.6%", "19.2", "symmetry-augmented"],
  ["CNN hybrid", "90.6%", "19.6", "model rank + proof"],
];

const highlightStyle = { "--board-dust": pixelDust(132, 12, 17) } as CSSProperties;

export default function BenchmarksPage() {
  return (
    <main className="site-page inner-page">
      <SiteNav active="benchmarks" />
      <section className="inner-heading benchmark-heading">
        <h1>Benchmarks</h1>
        <p>500 beginner boards, 9 × 9, 10 mines. Every agent sees the same seeds from 20000 through 20499.</p>
      </section>

      <section className="benchmark-highlight" style={highlightStyle} aria-label="Best observed result">
        <div>
          <span>best win rate</span>
          <strong>90.6%</strong>
        </div>
        <p>Hybrid and CNN hybrid on the held-out board set.</p>
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
