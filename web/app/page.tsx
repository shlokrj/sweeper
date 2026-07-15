"use client";

import { useMemo, useState } from "react";

type Cell = "covered" | "flag" | number;
type AgentMode = "hybrid" | "symbolic" | "neural";

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

const rowNames = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const columnNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

const modeDetails: Record<AgentMode, { label: string; method: string; probability: string; finding: string }> = {
  hybrid: {
    label: "hybrid",
    method: "symbolic proof, then neural ranking",
    probability: "0.0% mine risk",
    finding: "E6 is proven safe from the adjacent 1 and 2 constraints.",
  },
  symbolic: {
    label: "symbolic",
    method: "constraint propagation",
    probability: "0.0% mine risk",
    finding: "E6 follows from a local safe-cell deduction.",
  },
  neural: {
    label: "neural",
    method: "CNN probability estimate",
    probability: "0.8% mine risk",
    finding: "E6 has the lowest estimated mine probability in the frontier.",
  },
};

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function Home() {
  const [agentMode, setAgentMode] = useState<AgentMode>("hybrid");
  const [selectedCell, setSelectedCell] = useState("E6");
  const [showRationale, setShowRationale] = useState(true);
  const details = modeDetails[agentMode];

  const selectedPosition = useMemo(() => {
    const column = columnNames.indexOf(selectedCell[0]);
    const row = rowNames.indexOf(selectedCell.slice(1));
    return { column, row };
  }, [selectedCell]);

  function resetView() {
    setAgentMode("hybrid");
    setSelectedCell("E6");
    setShowRationale(true);
  }

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="wordmark" href="#workspace" aria-label="Sweeper home">
          sweeper<span>.</span>
        </a>
        <div className="topbar-center">
          <span className="status-dot" aria-hidden="true" />
          <span>research workspace</span>
        </div>
        <button className="quiet-button" type="button" onClick={resetView}>
          reset view
        </button>
      </nav>

      <section className="intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">MINESWEEPER DECISION RESEARCH</p>
          <h1 id="page-title">Inspect the next move.</h1>
        </div>
        <p className="intro-copy">
          A working surface for checking board state, solver evidence, and model confidence before a click.
        </p>
      </section>

      <section className="workspace" id="workspace" aria-label="Board analysis workspace">
        <div className="board-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">CURRENT BOARD</p>
              <h2>beginner / 9 × 9 / 10 mines</h2>
            </div>
            <div className="board-state">
              <span>move 12</span>
              <span aria-hidden="true">·</span>
              <span>safe start</span>
            </div>
          </div>

          <div className="board-wrap">
            <div className="board-column-labels" aria-hidden="true">
              <span />
              {columnNames.map((column) => <span key={column}>{column}</span>)}
            </div>
            <div className="board-grid-wrap">
              <div className="board-row-labels" aria-hidden="true">
                {rowNames.map((row) => <span key={row}>{row}</span>)}
              </div>
              <div className="board-grid" role="grid" aria-label="Minesweeper board">
                {board.flatMap((row, rowIndex) =>
                  row.map((cell, columnIndex) => {
                    const coordinate = `${columnNames[columnIndex]}${rowNames[rowIndex]}`;
                    const isSelected = coordinate === selectedCell;
                    const isRecommended = coordinate === "E6";
                    const content = cell === "covered" ? "" : cell === "flag" ? "⚑" : cell;
                    return (
                      <button
                        aria-label={`${coordinate}, ${cell === "covered" ? "covered" : cell === "flag" ? "marked mine" : `${cell} adjacent mines`}`}
                        aria-selected={isSelected}
                        className={classNames(
                          "board-cell",
                          cell === "covered" && "is-covered",
                          cell === "flag" && "is-flagged",
                          typeof cell === "number" && `number-${cell}`,
                          isSelected && "is-selected",
                          isRecommended && "is-recommended",
                        )}
                        key={coordinate}
                        onClick={() => setSelectedCell(coordinate)}
                        role="gridcell"
                        type="button"
                      >
                        {content}
                        {isRecommended && !isSelected ? <span className="cell-marker" aria-hidden="true" /> : null}
                      </button>
                    );
                  }),
                )}
              </div>
            </div>
          </div>

          <div className="board-footer">
            <p>
              <span className="legend-safe" /> proven safe
              <span className="legend-risk" /> estimated risk
            </p>
            <p>selected {selectedCell}</p>
          </div>
        </div>

        <aside className="decision-panel" aria-label="Decision trace">
          <div className="decision-heading">
            <p className="eyebrow">RECOMMENDED MOVE</p>
            <button
              aria-expanded={showRationale}
              className="text-button"
              onClick={() => setShowRationale((current) => !current)}
              type="button"
            >
              {showRationale ? "hide rationale" : "show rationale"}
            </button>
          </div>

          <div className="move-card">
            <div className="move-coordinate">E6</div>
            <div>
              <p className="move-action">click this cell</p>
              <p className="move-confidence">{details.probability}</p>
            </div>
          </div>

          <div className="mode-switch" role="group" aria-label="Agent mode">
            {(Object.keys(modeDetails) as AgentMode[]).map((mode) => (
              <button
                className={classNames("mode-button", agentMode === mode && "is-active")}
                key={mode}
                onClick={() => setAgentMode(mode)}
                type="button"
              >
                {modeDetails[mode].label}
              </button>
            ))}
          </div>

          {showRationale ? (
            <div className="rationale">
              <p className="rationale-label">EVIDENCE</p>
              <p>{details.finding}</p>
              <dl>
                <div>
                  <dt>method</dt>
                  <dd>{details.method}</dd>
                </div>
                <div>
                  <dt>frontier</dt>
                  <dd>7 candidate cells</dd>
                </div>
                <div>
                  <dt>selection</dt>
                  <dd>{selectedPosition.column === 4 && selectedPosition.row === 5 ? "recommended cell" : "manual inspection"}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="next-action">
            <span>analysis is read-only</span>
            <button className="primary-button" type="button" onClick={() => setSelectedCell("E6")}>
              focus recommended move
            </button>
          </div>
        </aside>
      </section>

      <section className="methods" aria-labelledby="methods-title">
        <div className="methods-heading">
          <p className="eyebrow">DECISION PATH</p>
          <h2 id="methods-title">Three ways to read a board.</h2>
        </div>
        <div className="method-grid">
          <article className="method-card">
            <span className="method-index">01</span>
            <h3>symbolic solver</h3>
            <p>Turns visible clues into constraints, then identifies certain safe cells and mines.</p>
          </article>
          <article className="method-card">
            <span className="method-index">02</span>
            <h3>exact search</h3>
            <p>Enumerates valid frontier assignments when direct deductions stop.</p>
          </article>
          <article className="method-card method-card-accent">
            <span className="method-index">03</span>
            <h3>strategy-aware CNN</h3>
            <p>Ranks unresolved cells using board state and the solver’s safe and mine masks.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
