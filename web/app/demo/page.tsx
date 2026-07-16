"use client";

import { type CSSProperties, type KeyboardEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { FlagMark } from "../components/flag-mark";
import { SiteNav } from "../components/site-nav";
import {
  COLUMNS,
  MINE_COUNT,
  analyze,
  chordCell,
  coordinate,
  newGame,
  revealCell,
  toggleFlag,
  type Game,
} from "../components/minesweeper";

const columnLabels = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

const blastPixels = [
  [-13, -13, 5, "#e6c472"], [-4, -16, 6, "#dd8582"], [8, -11, 5, "#e6c472"],
  [-18, -3, 6, "#dd8582"], [-5, -5, 12, "#be625f"], [10, -2, 7, "#e6c472"],
  [-14, 9, 5, "#e6c472"], [-1, 8, 8, "#dd8582"], [13, 11, 5, "#e6c472"],
] as const;

const hiddenAnalysis = { frontier: [], provenMines: new Map<number, string>(), provenSafe: new Map<number, string>(), recommendation: null };

export default function DemoPage() {
  const [game, setGame] = useState<Game>(() => newGame(0));
  const [assist, setAssist] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (game.status !== "playing") return undefined;
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const analysis = useMemo(
    () => (assist ? analyze(game.board, game.status) : hiddenAnalysis),
    [assist, game.board, game.status],
  );
  const recommendation = analysis.recommendation;
  const recommendedCoordinate = recommendation ? coordinate(recommendation.index) : null;
  const flaggedCount = game.board.filter((cell) => cell.flagged).length;
  const minesLeft = MINE_COUNT - flaggedCount;
  const activeCoordinate = hovered ?? recommendedCoordinate ?? "";

  function reset() {
    setGame((current) => newGame(current.id + 1));
    setElapsed(0);
  }

  function handleReveal(index: number) {
    setGame((current) => {
      const cell = current.board[index];
      return cell.revealed ? chordCell(current, index) : revealCell(current, index);
    });
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    setGame((current) => toggleFlag(current, index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key.toLowerCase() !== "f") return;
    event.preventDefault();
    setGame((current) => toggleFlag(current, index));
  }

  function playRecommendation() {
    if (recommendation) handleReveal(recommendation.index);
  }

  const finished = game.status === "won" || game.status === "lost";

  return (
    <main className="site-page inner-page">
      <SiteNav active="demo" />
      <section className="inner-heading">
        <h1>Demo</h1>
        <p>Play a real beginner board. The panel shows the proof, or the honest risk, behind the next move.</p>
      </section>

      <section className="demo-surface corner-ticks" aria-label="Playable Minesweeper demo">
        <div className="demo-board-area">
          <div className="demo-meta">
            <span>9 × 9 board · {MINE_COUNT} mines</span>
            <span>mines {String(minesLeft).padStart(2, "0")} · moves {String(game.moves).padStart(2, "0")} · time {String(elapsed).padStart(3, "0")}</span>
          </div>
          <div className="board-frame">
            <div className="frame-cols" aria-hidden="true">
              {columnLabels.map((column) => (
                <span className={activeCoordinate[0] === column ? "is-live" : ""} key={column}>{column}</span>
              ))}
            </div>
            <div className="frame-rows" aria-hidden="true">
              {columnLabels.map((_, rowIndex) => (
                <span className={activeCoordinate.slice(1) === `${rowIndex + 1}` ? "is-live" : ""} key={rowIndex}>{rowIndex + 1}</span>
              ))}
            </div>
            <div className={`board-slot is-${game.status}`}>
              <div className="play-board" key={game.id} role="grid" aria-label="Playable 9 by 9 Minesweeper board" onMouseLeave={() => setHovered(null)}>
                {game.board.map((cell, index) => {
                  const cellCoordinate = coordinate(index);
                  const rowIndex = Math.floor(index / COLUMNS);
                  const columnIndex = index % COLUMNS;
                  const scanlineCell = cellCoordinate !== activeCoordinate && activeCoordinate !== "" && (cellCoordinate[0] === activeCoordinate[0] || cellCoordinate.slice(1) === activeCoordinate.slice(1));
                  const recommendedCell = !finished && recommendedCoordinate === cellCoordinate;
                  const mineHint = !finished && !cell.revealed && analysis.provenMines.has(index);
                  const visibleValue = cell.exploded ? "mine" : cell.wrongFlag ? "wrong flag" : cell.flagged ? "flagged" : cell.revealed ? cell.adjacent === 0 ? "empty" : `${cell.adjacent} adjacent mines` : "covered";
                  return (
                    <button
                      aria-label={`${cellCoordinate}, ${visibleValue}`}
                      className={`play-cell ${cell.revealed ? "is-revealed" : "is-covered"} ${cell.flagged ? "is-flagged" : ""} ${cell.exploded ? "is-exploded" : ""} ${cell.wrongFlag ? "is-wrong-flag" : ""} ${cell.revealed && cell.adjacent ? `play-number-${cell.adjacent}` : ""} ${scanlineCell ? "is-scanline" : ""} ${recommendedCell ? "is-recommended" : ""} ${mineHint ? "is-mine-hint" : ""}`}
                      key={`${game.id}-${index}`}
                      onClick={() => handleReveal(index)}
                      onContextMenu={(event) => handleContextMenu(event, index)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      onMouseEnter={() => setHovered(cellCoordinate)}
                      role="gridcell"
                      style={{ "--cell-delay": `${80 + (rowIndex + columnIndex) * 26}ms` } as CSSProperties}
                      type="button"
                    >
                      {cell.exploded ? <><span className="mine-symbol">✹</span><span className="play-explosion" aria-hidden="true">{blastPixels.map(([x, y, size, color], pixelIndex) => <i key={pixelIndex} style={{ "--blast-color": color, "--blast-size": `${size}px`, "--blast-x": `${x}px`, "--blast-y": `${y}px` } as CSSProperties} />)}</span></> : null}
                      {!cell.exploded && cell.wrongFlag ? <span className="wrong-flag">×</span> : null}
                      {!cell.exploded && !cell.wrongFlag && cell.flagged ? <FlagMark compact /> : null}
                      {!cell.exploded && !cell.wrongFlag && !cell.flagged && cell.revealed && cell.mine ? <span className="mine-symbol">✹</span> : null}
                      {!cell.exploded && !cell.wrongFlag && !cell.flagged && cell.revealed && !cell.mine && cell.adjacent > 0 ? cell.adjacent : null}
                    </button>
                  );
                })}
              </div>

              {finished ? (
                <div className={`play-result is-${game.status}`} role="status">
                  <span>{game.status === "won" ? "clear" : "boom"}</span>
                  <strong>{game.status === "won" ? "board cleared" : "mine hit"}</strong>
                  <button onClick={reset} type="button">play again</button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="demo-board-key">
            {assist ? (
              <>
                <span><i className="key-green" /> proven safe</span>
                <span><i className="key-red" /> proven mine</span>
              </>
            ) : null}
            <span>right click or <kbd>F</kbd> flags a cell</span>
          </div>
        </div>

        <aside className="demo-decision">
          <div className="assist-toggle" role="group" aria-label="Assistant mode">
            <button className={assist ? "is-active" : ""} onClick={() => setAssist(true)} type="button">assist</button>
            <button className={assist ? "" : "is-active"} onClick={() => setAssist(false)} type="button">manual</button>
          </div>
          <p className="decision-label">{assist ? "next move" : "inspecting"}</p>
          <div className={`decision-coordinate ${!assist && !finished ? "decision-coordinate-manual" : ""}`} key={`coordinate-${game.id}-${assist ? recommendedCoordinate ?? game.status : "manual"}`}>
            {finished ? (game.status === "won" ? ":)" : ":(") : assist ? recommendedCoordinate ?? "+" : hovered ?? "+"}
          </div>
          {assist ? (
            recommendation ? (
              <div className="decision-verdict" key={`verdict-${game.id}-${recommendation.index}-${recommendation.label}`}>
                <span className={`evidence-chip ${recommendation.label === "approximate" ? "evidence-chip-approximate" : ""}`}>{recommendation.label}</span>
                <p className={`decision-risk ${recommendation.label === "approximate" ? "decision-risk-approximate" : ""}`}>{(recommendation.risk * 100).toFixed(1)}% mine risk</p>
              </div>
            ) : (
              <div className="decision-verdict" key={`verdict-${game.id}-${game.status}`}>
                <span className={`evidence-chip ${game.status === "lost" ? "evidence-chip-lost" : ""}`}>{game.status === "won" ? "board cleared" : "mine hit"}</span>
              </div>
            )
          ) : null}
          <div className={`decision-actions ${assist ? "" : "decision-actions-single"}`} role="group" aria-label="Assistant actions">
            {assist ? <button disabled={!recommendation} onClick={playRecommendation} type="button">play this move</button> : null}
            <button onClick={reset} type="button">new board <span aria-hidden="true">↻</span></button>
          </div>
          <div className="decision-evidence" key={`evidence-${game.id}-${assist ? `${recommendation?.index ?? game.status}-${game.moves}` : "manual"}`}>
            <p>
              {!assist
                ? "Assist is off. Proofs and mine risk stay hidden while you play."
                : recommendation
                  ? recommendation.evidence
                  : game.status === "won"
                    ? "Every safe cell is revealed and every mine is flagged."
                    : "A mine ended this run. The board stays open for inspection."}
            </p>
            {assist ? (
              <dl>
                <div><dt>method</dt><dd>{recommendation ? recommendation.method : "game over"}</dd></div>
                <div><dt>frontier</dt><dd>{analysis.frontier.length} {analysis.frontier.length === 1 ? "candidate" : "candidates"}</dd></div>
                <div><dt>proven</dt><dd>{analysis.provenSafe.size} safe · {analysis.provenMines.size} {analysis.provenMines.size === 1 ? "mine" : "mines"}</dd></div>
              </dl>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}
