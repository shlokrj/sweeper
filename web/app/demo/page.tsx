"use client";

import { useState } from "react";
import { SiteNav } from "../components/site-nav";

type Cell = "covered" | "flag" | number;
type Agent = "hybrid" | "symbolic" | "neural";

const board: Cell[][] = [
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", 1, 1, 1, "covered", "covered", "covered", "covered"],
  ["covered", "covered", 1, 0, 1, 2, "covered", "covered", "covered"],
  ["covered", "covered", 2, 1, 2, "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "flag", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
];

const columns = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
const details: Record<Agent, { risk: string; method: string; evidence: string }> = {
  hybrid: {
    risk: "0.0%",
    method: "proof, then ranking",
    evidence: "E6 is safe under the adjacent 1 and 2 constraints.",
  },
  symbolic: {
    risk: "0.0%",
    method: "constraint propagation",
    evidence: "E6 is a direct safe-cell deduction.",
  },
  neural: {
    risk: "0.8%",
    method: "CNN probability estimate",
    evidence: "E6 has the lowest mine probability on this frontier.",
  },
};

export default function DemoPage() {
  const [agent, setAgent] = useState<Agent>("hybrid");
  const [selected, setSelected] = useState("E6");
  const current = details[agent];

  return (
    <main className="site-page inner-page">
      <SiteNav active="demo" />
      <section className="inner-heading">
        <p className="signal-label">INTERACTIVE SAMPLE</p>
        <h1>Board reader.</h1>
        <p>Choose a cell or switch the policy to inspect the same decision from three angles.</p>
      </section>

      <section className="demo-surface" aria-label="Minesweeper demo">
        <div className="demo-board-area">
          <div className="demo-meta"><span>BEGINNER / SEED 20037</span><span>MOVE 12</span></div>
          <div className="demo-board" role="grid" aria-label="Minesweeper board">
            {board.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
              const coordinate = `${columns[columnIndex]}${rowIndex + 1}`;
              const selectedCell = selected === coordinate;
              const recommendedCell = coordinate === "E6";
              return (
                <button
                  aria-label={`${coordinate}, ${cell === "covered" ? "covered" : cell === "flag" ? "flagged" : `${cell} adjacent mines`}`}
                  aria-selected={selectedCell}
                  className={`demo-cell ${cell === "covered" ? "demo-cell-covered" : ""} ${cell === "flag" ? "demo-cell-flag" : ""} ${typeof cell === "number" ? `demo-number-${cell}` : ""} ${selectedCell ? "is-selected" : ""} ${recommendedCell ? "is-recommended" : ""}`}
                  key={coordinate}
                  onClick={() => setSelected(coordinate)}
                  role="gridcell"
                  type="button"
                >
                  {cell === "flag" ? "⚑" : cell === "covered" ? "" : cell}
                </button>
              );
            }))}
          </div>
          <div className="demo-board-key"><span><i className="key-green" /> proven safe</span><span><i className="key-amber" /> estimated risk</span><span>selected / {selected}</span></div>
        </div>

        <aside className="demo-decision">
          <p className="signal-label">NEXT MOVE</p>
          <div className="decision-coordinate">E6</div>
          <p className="decision-command">click this cell</p>
          <p className="decision-risk">{current.risk} MINE RISK</p>
          <div className="agent-tabs" role="group" aria-label="Agent policy">
            {(Object.keys(details) as Agent[]).map((name) => (
              <button className={agent === name ? "is-active" : ""} key={name} onClick={() => setAgent(name)} type="button">
                {name}
              </button>
            ))}
          </div>
          <div className="decision-evidence">
            <p className="signal-label">EVIDENCE</p>
            <p>{current.evidence}</p>
            <dl>
              <div><dt>policy</dt><dd>{current.method}</dd></div>
              <div><dt>frontier</dt><dd>7 candidates</dd></div>
              <div><dt>selection</dt><dd>{selected === "E6" ? "recommended cell" : "manual check"}</dd></div>
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}
