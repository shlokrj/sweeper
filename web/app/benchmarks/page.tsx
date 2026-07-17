import type { CSSProperties } from "react";
import { Reveal } from "../components/reveal";
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

const studyFigures = [
  {
    groups: [
      { control: 66, controlLabel: "66.0", delta: "+5.2 pp", name: "cnn", strategy: 71.2, strategyLabel: "71.2" },
      { control: 74.8, controlLabel: "74.8", delta: "+0.6 pp", name: "cnn hybrid", strategy: 75.4, strategyLabel: "75.4" },
    ],
    max: 100,
    ticks: ["100", "50", "0"],
    title: "win rate · %",
  },
  {
    groups: [
      { control: 0.259, controlLabel: "0.26", delta: "−22.4%", name: "brier", strategy: 0.201, strategyLabel: "0.20" },
      { control: 1.483, controlLabel: "1.48", delta: "−68.4%", name: "calibration", strategy: 0.468, strategyLabel: "0.47" },
    ],
    max: 1.5,
    ticks: ["1.5", "0.75", "0"],
    title: "calibration · e-3",
  },
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

      <Reveal>
        <section className="benchmark-highlight corner-ticks" style={highlightStyle} aria-label="Best observed result">
          <div>
            <span>best win rate</span>
            <strong>91.0%</strong>
          </div>
          <p>Strategy CNN hybrid on the held-out 10-mine board set.</p>
        </section>
      </Reveal>

      <Reveal>
        <section className="strategy-study" aria-labelledby="strategy-study-title">
          <div className="strategy-study-copy">
            <h2 id="strategy-study-title">The harder board check.</h2>
            <p>The same control and strategy models also ran on 16 × 16 boards with 40 mines. The strategy model adds three playbook-derived channels.</p>
          </div>
          <div className="strategy-figures" aria-label="Control and strategy model comparison">
            {studyFigures.map((figure, figureIndex) => (
              <figure className="pixel-figure" key={figure.title} style={{ "--figure-delay": `${140 + figureIndex * 130}ms` } as CSSProperties}>
                <figcaption>{figure.title}</figcaption>
                <div className="figure-body">
                  <div className="figure-ticks" aria-hidden="true">
                    {figure.ticks.map((tick) => <span key={tick}>{tick}</span>)}
                  </div>
                  <div>
                    <div className="figure-plot">
                      {figure.groups.map((group) => (
                        <div className="figure-columns" key={group.name}>
                          <div className="figure-column">
                            <em>{group.controlLabel}</em>
                            <i style={{ "--h": `${(group.control / figure.max) * 100}%` } as CSSProperties} />
                          </div>
                          <div className="figure-column is-strategy">
                            <em>{group.strategyLabel}</em>
                            <i style={{ "--h": `${(group.strategy / figure.max) * 100}%` } as CSSProperties} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="figure-names">
                      {figure.groups.map((group) => (
                        <div key={group.name}>
                          <span>{group.name}</span>
                          <strong>{group.delta}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </figure>
            ))}
            <div className="figure-legend" aria-hidden="true">
              <span><i className="key-control" /> control</span>
              <span><i className="key-strategy" /> strategy</span>
            </div>
          </div>
          <p className="strategy-method">Lower is better for Brier score and expected calibration error. 500 held-out intermediate boards.</p>
        </section>
      </Reveal>

      <Reveal>
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
      </Reveal>
    </main>
  );
}
