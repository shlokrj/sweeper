import { SiteNav } from "../components/site-nav";

const benchmarkRows = [
  ["random", "0.0%", "4.8", "uniform valid move"],
  ["local heuristic", "33.0%", "10.9", "clue count"],
  ["symbolic", "87.6%", "19.2", "constraint proof"],
  ["exact", "86.2%", "18.6", "frontier enumeration"],
  ["hybrid", "90.6%", "19.7", "symbolic + exact"],
  ["CNN", "88.6%", "19.2", "symmetry-augmented"],
  ["CNN hybrid", "90.6%", "19.6", "model rank + proof"],
];

export default function BenchmarksPage() {
  return (
    <main className="site-page inner-page">
      <SiteNav active="benchmarks" />
      <section className="inner-heading benchmark-heading">
        <p className="signal-label">HELD-OUT EVALUATION</p>
        <h1>500 fixed boards.</h1>
        <p>Beginner boards, 9 × 9, 10 mines. Every agent receives the same seeds from 20000 through 20499.</p>
      </section>

      <section className="benchmark-highlight" aria-label="Best observed result">
        <span className="signal-label">BEST WIN RATE</span>
        <strong>90.6%</strong>
        <p>hybrid and CNN hybrid</p>
      </section>

      <section className="benchmark-table-wrap" aria-labelledby="benchmark-table-title">
        <div className="benchmark-table-note">
          <p className="signal-label" id="benchmark-table-title">RUN / AUGMENTED CNN</p>
          <p>Win rate measures complete boards solved without a mine click.</p>
        </div>
        <div className="benchmark-table" role="table" aria-label="Agent benchmark results">
          <div className="benchmark-row benchmark-head" role="row">
            <span role="columnheader">agent</span>
            <span role="columnheader">win rate</span>
            <span role="columnheader">avg moves</span>
            <span role="columnheader">decision rule</span>
          </div>
          {benchmarkRows.map(([agent, winRate, moves, rule], index) => (
            <div className={`benchmark-row ${index >= 5 ? "benchmark-model" : ""}`} key={agent} role="row">
              <span role="cell">{agent}</span>
              <strong role="cell">{winRate}</strong>
              <span role="cell">{moves}</span>
              <span role="cell">{rule}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
