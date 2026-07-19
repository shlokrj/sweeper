"use client";

import { type CSSProperties, type KeyboardEvent, type MouseEvent, useEffect, useMemo, useState } from "react";
import { FlagMark } from "../components/flag-mark";
import { LockMark } from "../components/lock-mark";
import { MineMark } from "../components/mine-mark";
import { SiteNav } from "../components/site-nav";
import {
  PRESETS,
  analyze,
  chordCell,
  columnLabel,
  coordinate,
  newGame,
  revealCell,
  toggleFlag,
  type Game,
  type PresetId,
} from "../components/minesweeper";

type PlayMode = "manual" | "assisted" | "auto";

const blastPixels = [
  [-13, -13, 5, "#e6c472"], [-4, -16, 6, "#dd8582"], [8, -11, 5, "#e6c472"],
  [-18, -3, 6, "#dd8582"], [-5, -5, 12, "#be625f"], [10, -2, 7, "#e6c472"],
  [-14, 9, 5, "#e6c472"], [-1, 8, 8, "#dd8582"], [13, 11, 5, "#e6c472"],
] as const;

const hiddenAnalysis = { frontier: [], provenMines: new Map<number, string>(), provenSafe: new Map<number, string>(), recommendation: null };

const autoSpeeds = [
  { id: "crawl", label: "crawl", delay: 1_200 },
  { id: "slow", label: "slow", delay: 820 },
  { id: "steady", label: "steady", delay: 560 },
  { id: "fast", label: "fast", delay: 340 },
  { id: "rapid", label: "rapid", delay: 180 },
  { id: "overdrive", label: "overdrive", delay: 55 },
] as const;

export default function DemoPage() {
  const [game, setGame] = useState<Game>(() => newGame(0));
  const [mode, setMode] = useState<PlayMode>("assisted");
  const [autoRunning, setAutoRunning] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [autoSpeedIndex, setAutoSpeedIndex] = useState(2);

  useEffect(() => {
    if (game.status !== "playing") return undefined;
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const showAssistance = mode !== "manual";
  const flaggedCount = game.board.filter((cell) => cell.flagged).length;
  const minesLeft = game.preset.mines - flaggedCount;
  const finished = game.status === "won" || game.status === "lost";
  const analysis = useMemo(
    () => (showAssistance ? analyze(game.board, game.status, game.preset) : hiddenAnalysis),
    [game.board, game.preset, game.status, showAssistance],
  );
  const recommendation = analysis.recommendation;
  const recommendedCoordinate = recommendation ? coordinate(recommendation.index, game.preset) : null;
  const columnLabels = Array.from({ length: game.preset.columns }, (_, index) => columnLabel(index));
  const rowLabels = Array.from({ length: game.preset.rows }, (_, index) => index + 1);
  const activeCoordinate = hovered ?? recommendedCoordinate ?? "";
  const activeColumn = activeCoordinate.match(/[A-Z]+/)?.[0] ?? "";
  const activeRow = activeCoordinate.match(/\d+/)?.[0] ?? "";
  const locked = mode === "auto" && !finished;
  const autoSpeed = autoSpeeds[autoSpeedIndex];
  const autoDelay = autoSpeed.delay;
  const autoSpeedFill = (autoSpeedIndex / (autoSpeeds.length - 1)) * 100;
  const isOverdrive = autoSpeed.id === "overdrive";
  const explodedIndex = game.status === "lost" ? game.board.findIndex((cell) => cell.exploded) : -1;
  const confetti = useMemo(() => {
    if (game.status !== "won") return [];
    let state = ((game.id + 1) * 9301) >>> 0;
    const next = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const colors = ["#dd8582", "#84ad83", "#84b3cf", "#e6c472"];
    return Array.from({ length: 30 }, (_, index) => ({
      color: colors[index % colors.length],
      delay: Math.round(next() * 460),
      drift: Math.round((next() - 0.5) * 70),
      duration: 1100 + Math.round(next() * 750),
      size: 4 + Math.round(next() * 6),
      x: Math.round(next() * 100),
    }));
  }, [game.id, game.status]);
  const boardStyle = {
    "--board-columns": game.preset.columns,
    "--board-rows": game.preset.rows,
    "--board-aspect": game.preset.columns / game.preset.rows,
  } as CSSProperties;

  function reset() {
    setGame((current) => newGame(current.id + 1, current.preset));
    setAutoRunning(false);
    setElapsed(0);
    setHovered(null);
  }

  function selectPreset(presetId: PresetId) {
    setGame((current) => newGame(current.id + 1, PRESETS[presetId]));
    setAutoRunning(false);
    setElapsed(0);
    setHovered(null);
  }

  function selectMode(nextMode: PlayMode) {
    setMode(nextMode);
    setAutoRunning(false);
  }

  function handleReveal(index: number) {
    if (locked) return;
    setGame((current) => {
      const cell = current.board[index];
      return cell.revealed ? chordCell(current, index) : revealCell(current, index);
    });
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    if (locked) return;
    setGame((current) => toggleFlag(current, index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key.toLowerCase() !== "f" || locked) return;
    event.preventDefault();
    setGame((current) => toggleFlag(current, index));
  }

  function playRecommendation() {
    if (recommendation) handleReveal(recommendation.index);
  }

  useEffect(() => {
    if (mode !== "auto" || !autoRunning || finished || !recommendation) return undefined;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (current.status === "won" || current.status === "lost") return current;
        return revealCell(current, recommendation.index);
      });
    }, autoDelay);
    return () => window.clearTimeout(timer);
  }, [autoDelay, autoRunning, finished, game.id, game.moves, mode, recommendation]);

  return (
    <main className="site-page inner-page">
      <SiteNav active="demo" />
      <section className="inner-heading demo-heading">
        <h1>Demo</h1>
        <p>Play a real board. The panel shows the proof, or the honest risk, behind the next move.</p>
      </section>

      <section className="demo-surface corner-ticks" aria-label="Playable Minesweeper demo">
        <div className="demo-board-area">
          <div className="demo-meta">
            <span>{game.preset.rows} × {game.preset.columns} board · {game.preset.mines} mines</span>
            <span>mines {String(minesLeft).padStart(2, "0")} · moves {String(game.moves).padStart(2, "0")} · time {String(elapsed).padStart(3, "0")}</span>
          </div>
          <div className="preset-selector" aria-label="Board preset" role="group">
            {(Object.keys(PRESETS) as PresetId[]).map((presetId) => {
              const preset = PRESETS[presetId];
              return (
                <button
                  aria-pressed={game.preset.id === presetId}
                  className={game.preset.id === presetId ? "is-active" : ""}
                  key={presetId}
                  onClick={() => selectPreset(presetId)}
                  type="button"
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.rows} × {preset.columns} · {preset.mines}</span>
                </button>
              );
            })}
          </div>
          <div className={`board-frame is-${game.preset.id}`} style={boardStyle}>
              <div className="frame-cols" aria-hidden="true">
                {columnLabels.map((column) => (
                  <span className={activeColumn === column ? "is-live" : ""} key={column}>{column}</span>
                ))}
              </div>
              <div className="frame-rows" aria-hidden="true">
                {rowLabels.map((row) => (
                  <span className={activeRow === `${row}` ? "is-live" : ""} key={row}>{row}</span>
                ))}
              </div>
              <div className={`board-slot is-${game.status}`}>
                <div className="play-board" key={game.id} role="grid" aria-label={`Playable ${game.preset.label} Minesweeper board`} onMouseLeave={() => setHovered(null)} style={boardStyle}>
                  {game.board.map((cell, index) => {
                    const cellCoordinate = coordinate(index, game.preset);
                    const rowIndex = Math.floor(index / game.preset.columns);
                    const columnIndex = index % game.preset.columns;
                    const scanlineCell = cellCoordinate !== activeCoordinate && activeCoordinate !== "" && (cellCoordinate[0] === activeCoordinate[0] || cellCoordinate.slice(1) === activeCoordinate.slice(1));
                    const recommendedCell = !finished && showAssistance && recommendedCoordinate === cellCoordinate;
                    const mineHint = !finished && showAssistance && !cell.revealed && analysis.provenMines.has(index);
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
                        style={{
                          "--cell-delay": `${80 + (rowIndex + columnIndex) * 18}ms`,
                          ...(cell.mine && explodedIndex >= 0
                            ? { "--pop-delay": `${Math.max(Math.abs(rowIndex - Math.floor(explodedIndex / game.preset.columns)), Math.abs(columnIndex - (explodedIndex % game.preset.columns))) * 70}ms` }
                            : {}),
                        } as CSSProperties}
                        type="button"
                      >
                        {cell.exploded ? <><MineMark /><span className="play-explosion" aria-hidden="true">{blastPixels.map(([x, y, size, color], pixelIndex) => <i key={pixelIndex} style={{ "--blast-color": color, "--blast-size": `${size}px`, "--blast-x": `${x}px`, "--blast-y": `${y}px` } as CSSProperties} />)}</span></> : null}
                        {!cell.exploded && cell.wrongFlag ? <span className="wrong-flag">×</span> : null}
                        {!cell.exploded && !cell.wrongFlag && cell.flagged ? <FlagMark compact /> : null}
                        {!cell.exploded && !cell.wrongFlag && !cell.flagged && cell.revealed && cell.mine ? <MineMark /> : null}
                        {!cell.exploded && !cell.wrongFlag && !cell.flagged && cell.revealed && !cell.mine && cell.adjacent > 0 ? cell.adjacent : null}
                      </button>
                    );
                  })}
                </div>

                {game.status === "won" ? (
                  <span aria-hidden="true" className="board-confetti">
                    {confetti.map((piece, pieceIndex) => (
                      <i
                        key={pieceIndex}
                        style={{
                          "--confetti-color": piece.color,
                          "--confetti-delay": `${piece.delay}ms`,
                          "--confetti-drift": `${piece.drift}px`,
                          "--confetti-duration": `${piece.duration}ms`,
                          "--confetti-size": `${piece.size}px`,
                          "--confetti-x": `${piece.x}%`,
                        } as CSSProperties}
                      />
                    ))}
                  </span>
                ) : null}

                {locked ? (
                  <div className="board-lock" role="status">
                    <LockMark />
                    <span>auto has the board</span>
                    <em>switch to manual or assisted to play</em>
                  </div>
                ) : null}

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
            {showAssistance ? <><span><i className="key-green" /> proven safe</span><span><i className="key-red" /> proven mine</span></> : null}
            <span>right click or <kbd>F</kbd> flags a cell</span>
          </div>
        </div>

        <aside className="demo-decision">
          <div className="mode-selector" role="group" aria-label="Demo mode">
            {(["manual", "assisted", "auto"] as PlayMode[]).map((option) => (
              <button className={mode === option ? "is-active" : ""} key={option} onClick={() => selectMode(option)} type="button">{option}</button>
            ))}
          </div>
          <p className="decision-label">{mode === "manual" ? "inspecting" : mode === "auto" ? "auto move" : "next move"}</p>
          <div className={`decision-coordinate ${mode === "manual" && !finished ? "decision-coordinate-manual" : ""}`} key={`coordinate-${game.id}-${mode}-${recommendedCoordinate ?? game.status}`}>
            {finished ? (game.status === "won" ? ":)" : ":(") : mode === "manual" ? hovered ?? "+" : recommendedCoordinate ?? "+"}
          </div>
          {showAssistance ? (
            recommendation ? (
              <div className="decision-verdict" key={`verdict-${game.id}-${recommendation.index}-${recommendation.label}`}>
                <span className={`evidence-chip ${recommendation.label === "approximate" ? "evidence-chip-approximate" : recommendation.label === "model" || recommendation.label === "exact" ? "evidence-chip-model" : ""}`}>{recommendation.label}</span>
                <p className={`decision-risk ${recommendation.label === "approximate" ? "decision-risk-approximate" : recommendation.label === "model" || recommendation.label === "exact" ? "decision-risk-model" : ""}`}>{(recommendation.risk * 100).toFixed(1)}% mine risk</p>
              </div>
            ) : (
              <div className="decision-verdict" key={`verdict-${game.id}-${game.status}`}>
                <span className={`evidence-chip ${game.status === "lost" ? "evidence-chip-lost" : ""}`}>{game.status === "won" ? "board cleared" : "mine hit"}</span>
              </div>
            )
          ) : null}
          <div className={`decision-actions ${mode === "manual" ? "decision-actions-single" : ""}`} role="group" aria-label="Board actions">
            {mode === "assisted" ? <button disabled={!recommendation} onClick={playRecommendation} type="button">play this move</button> : null}
            {mode === "auto" ? (
              <button className={isOverdrive ? "is-overdrive" : ""} disabled={finished} onClick={() => setAutoRunning((running) => !running)} type="button">
                {autoRunning ? "pause" : "run auto"} <span aria-hidden="true">{autoRunning ? "❚❚" : "▶"}</span>
              </button>
            ) : null}
            <button onClick={reset} type="button">new board <span aria-hidden="true">↻</span></button>
          </div>
          {mode === "auto" ? (
            <div className={`auto-speed ${isOverdrive ? "is-overdrive" : ""}`} style={{ "--speed-fill": `${autoSpeedFill}%` } as CSSProperties}>
              <label>
                <span className="auto-speed-caption">speed</span>
                <span className="auto-speed-rail">
                  <input
                    aria-label={`Auto play speed: ${autoSpeed.label}`}
                    max={autoSpeeds.length - 1}
                    min="0"
                    onChange={(event) => setAutoSpeedIndex(Number(event.target.value))}
                    step="1"
                    type="range"
                    value={autoSpeedIndex}
                  />
                  {autoSpeeds.map((speed, index) => (
                    <i
                      aria-hidden="true"
                      className={index <= autoSpeedIndex ? "is-passed" : ""}
                      key={speed.id}
                      style={{ "--speed-stop": `${(index / (autoSpeeds.length - 1)) * 100}%` } as CSSProperties}
                    />
                  ))}
                </span>
                <output aria-live="polite" key={autoSpeed.id}>{autoSpeed.label}</output>
              </label>
              <div aria-hidden="true" className="auto-speed-stops">
                {autoSpeeds.map((speed, index) => (
                  <span className={index === autoSpeedIndex ? "is-active" : ""} key={speed.id}>{speed.label}</span>
                ))}
              </div>
              {isOverdrive ? <p>overdrive engaged</p> : null}
            </div>
          ) : null}
          <div className="decision-evidence" key={`evidence-${game.id}-${mode}-${recommendation?.index ?? game.status}-${game.moves}`}>
            <p>
              {mode === "manual"
                ? "Assistance is off. Proofs and mine risk stay hidden while you play."
                : mode === "auto"
                  ? autoRunning
                    ? isOverdrive
                      ? "Overdrive is engaged. Auto moves at the fastest interval."
                      : `Auto plays the next recommended cell at ${autoSpeed.label} speed.`
                    : "Auto is paused. Press run auto to let the agent take the board."
                  : recommendation
                    ? recommendation.evidence
                    : game.status === "won"
                      ? "Every safe cell is revealed and every mine is flagged."
                      : "A mine ended this run. The board stays open for inspection."}
            </p>
            {showAssistance ? (
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
