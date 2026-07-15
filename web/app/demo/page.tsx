"use client";

import { useState } from "react";
import { FlagMark } from "../components/flag-mark";
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
const details: Record<Agent, { label: string; risk: string; method: string; evidence: string }> = {
  hybrid: { label: "proven", risk: "0.0%", method: "symbolic proof, then ranking", evidence: "E6 is safe under the adjacent 1 and 2 constraints." },
  symbolic: { label: "proven", risk: "0.0%", method: "constraint propagation", evidence: "E6 is a direct safe-cell deduction." },
  neural: { label: "neural", risk: "0.8%", method: "CNN probability estimate", evidence: "E6 has the lowest mine probability on this frontier." },
};

export default function DemoPage() {
  const [agent, setAgent] = useState<Agent>("hybrid");
  const [selected, setSelected] = useState("E6");
  const [hovered, setHovered] = useState<string | null>(null);
  const current = details[agent];
  const activeCoordinate = hovered ?? selected;

  return (
    <main className="site-page inner-page">
      <SiteNav active="demo" />
      <section className="inner-heading">
        <h1>Demo</h1>
        <p>Select a cell to inspect the board. The panel explains the current E6 recommendation.</p>
      </section>

      <section className="demo-surface corner-ticks" aria-label="Minesweeper demo">
        <div className="demo-board-area">
          <div className="demo-meta"><span>9 × 9 board · 10 mines</span><span>move 12 · safe E6</span></div>
          <div className="board-frame">
            <div className="frame-cols" aria-hidden="true">
              {columns.map((column) => (
                <span className={activeCoordinate[0] === column ? "is-live" : ""} key={column}>{column}</span>
              ))}
            </div>
            <div className="frame-rows" aria-hidden="true">
              {columns.map((_, rowIndex) => (
                <span className={activeCoordinate.slice(1) === `${rowIndex + 1}` ? "is-live" : ""} key={rowIndex}>{rowIndex + 1}</span>
              ))}
            </div>
            <div className="demo-board" role="grid" aria-label="Minesweeper board" onMouseLeave={() => setHovered(null)}>
              {board.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
                const coordinate = `${columns[columnIndex]}${rowIndex + 1}`;
                const selectedCell = selected === coordinate;
                const recommendedCell = coordinate === "E6";
                const scanlineCell = coordinate !== activeCoordinate && (coordinate[0] === activeCoordinate[0] || coordinate.slice(1) === activeCoordinate.slice(1));
                return (
                  <button
                    aria-label={`${coordinate}, ${cell === "covered" ? "covered" : cell === "flag" ? "flagged" : `${cell} adjacent mines`}`}
                    aria-selected={selectedCell}
                    className={`demo-cell ${cell === "covered" ? "demo-cell-covered" : ""} ${cell === "flag" ? "demo-cell-flag" : ""} ${typeof cell === "number" ? `demo-number-${cell}` : ""} ${scanlineCell ? "is-scanline" : ""} ${selectedCell ? "is-selected" : ""} ${recommendedCell ? "is-recommended" : ""}`}
                    key={coordinate}
                    onClick={() => setSelected(coordinate)}
                    onMouseEnter={() => setHovered(coordinate)}
                    role="gridcell"
                    style={{ "--cell-delay": `${80 + (rowIndex * 9 + columnIndex) * 18}ms` } as React.CSSProperties}
                    type="button"
                  >
                    {cell === "flag" ? <FlagMark compact /> : cell === "covered" || cell === 0 ? "" : cell}
                  </button>
                );
              }))}
            </div>
          </div>
          <div className="demo-board-key">
            <span><i className="key-green" /> recommended safe</span>
            <span><i className="key-red" /> flagged mine</span>
            <span><i className="key-yellow" /> inspecting {selected}</span>
          </div>
        </div>

        <aside className="demo-decision">
          <p className="decision-label">recommended move</p>
          <div className="decision-coordinate">E6</div>
          <div className="decision-verdict" key={`verdict-${agent}`}>
            <span className={`evidence-chip ${agent === "neural" ? "evidence-chip-neural" : ""}`}>{current.label}</span>
            <p className={`decision-risk ${agent === "neural" ? "decision-risk-neural" : ""}`}>{current.risk} mine risk</p>
          </div>
          <div className="agent-tabs" role="group" aria-label="Agent policy">
            {(Object.keys(details) as Agent[]).map((name) => (
              <button className={agent === name ? "is-active" : ""} key={name} onClick={() => setAgent(name)} type="button">{name}</button>
            ))}
          </div>
          <div className="decision-evidence" key={`evidence-${agent}`}>
            <p>{current.evidence}</p>
            <dl>
              <div><dt>method</dt><dd>{current.method}</dd></div>
              <div><dt>frontier</dt><dd>7 candidates</dd></div>
              <div><dt>selection</dt><dd>{selected === "E6" ? "recommended cell" : "manual check"}</dd></div>
            </dl>
          </div>
        </aside>
      </section>
    </main>
  );
}
