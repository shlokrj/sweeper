"use client";

import { type CSSProperties, type KeyboardEvent, type MouseEvent, useEffect, useState } from "react";
import { FlagMark } from "../components/flag-mark";
import { SiteNav } from "../components/site-nav";

const rows = 9;
const columns = 9;
const mineCount = 10;
const cellCount = rows * columns;

const blastPixels = [
  [-13, -13, 5, "#e6c472"], [-4, -16, 6, "#dd8582"], [8, -11, 5, "#e6c472"],
  [-18, -3, 6, "#dd8582"], [-5, -5, 12, "#be625f"], [10, -2, 7, "#e6c472"],
  [-14, 9, 5, "#e6c472"], [-1, 8, 8, "#dd8582"], [13, 11, 5, "#e6c472"],
] as const;

type Status = "ready" | "playing" | "won" | "lost";

type Cell = {
  adjacent: number;
  exploded: boolean;
  flagged: boolean;
  mine: boolean;
  revealed: boolean;
  wrongFlag: boolean;
};

type Game = {
  board: Cell[];
  firstReveal: boolean;
  id: number;
  moves: number;
  status: Status;
};

function emptyBoard(): Cell[] {
  return Array.from({ length: cellCount }, () => ({
    adjacent: 0,
    exploded: false,
    flagged: false,
    mine: false,
    revealed: false,
    wrongFlag: false,
  }));
}

function newGame(id: number): Game {
  return { board: emptyBoard(), status: "ready", firstReveal: true, id, moves: 0 };
}

function neighbors(index: number): number[] {
  const row = Math.floor(index / columns);
  const column = index % columns;
  const result: number[] = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < rows && nextColumn >= 0 && nextColumn < columns) {
        result.push(nextRow * columns + nextColumn);
      }
    }
  }

  return result;
}

function placeMines(board: Cell[], safeIndex: number): Cell[] {
  const mines = new Set<number>();
  while (mines.size < mineCount) {
    const candidate = Math.floor(Math.random() * cellCount);
    if (candidate !== safeIndex) mines.add(candidate);
  }

  const placed = board.map((cell, index) => ({ ...cell, mine: mines.has(index) }));
  return placed.map((cell, index) => ({
    ...cell,
    adjacent: cell.mine ? 0 : neighbors(index).filter((neighbor) => placed[neighbor].mine).length,
  }));
}

function revealArea(board: Cell[], startIndex: number): Cell[] {
  const next = board.map((cell) => ({ ...cell }));
  const queue = [startIndex];
  const visited = new Set<number>();

  while (queue.length) {
    const index = queue.shift();
    if (index === undefined || visited.has(index)) continue;
    visited.add(index);

    const cell = next[index];
    if (cell.flagged || cell.mine || cell.revealed) continue;
    cell.revealed = true;
    if (cell.adjacent === 0) queue.push(...neighbors(index));
  }

  return next;
}

function revealMines(board: Cell[], explodedIndex: number): Cell[] {
  return board.map((cell, index) => {
    if (cell.mine) return { ...cell, revealed: true, exploded: index === explodedIndex };
    if (cell.flagged) return { ...cell, wrongFlag: true };
    return cell;
  });
}

function hasWon(board: Cell[]): boolean {
  return board.every((cell) => cell.mine || cell.revealed);
}

function coordinate(index: number): string {
  return `${String.fromCharCode(65 + (index % columns))}${Math.floor(index / columns) + 1}`;
}

function statusMessage(status: Status): string {
  if (status === "won") return "Board cleared. All mines marked.";
  if (status === "lost") return "Mine hit. Start a new board to try again.";
  if (status === "playing") return "Board in progress.";
  return "New beginner board. Your first reveal is safe.";
}

export default function PlayPage() {
  const [game, setGame] = useState<Game>(() => newGame(0));
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (game.status !== "playing") return undefined;
    const timer = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1_000);
    return () => window.clearInterval(timer);
  }, [game.status]);

  const flaggedCount = game.board.filter((cell) => cell.flagged).length;
  const minesLeft = mineCount - flaggedCount;

  function reset() {
    setGame((current) => newGame(current.id + 1));
    setElapsed(0);
  }

  function reveal(index: number) {
    setGame((current) => {
      if (current.status === "won" || current.status === "lost") return current;

      const source = current.firstReveal ? placeMines(current.board, index) : current.board;
      const selected = source[index];
      if (selected.flagged) return current;

      if (selected.mine) {
        return { ...current, board: revealMines(source, index), firstReveal: false, moves: current.moves + 1, status: "lost" };
      }

      const board = revealArea(source, index);
      if (hasWon(board)) {
        return {
          ...current,
          board: board.map((cell) => (cell.mine ? { ...cell, flagged: true } : cell)),
          firstReveal: false,
          moves: current.moves + 1,
          status: "won",
        };
      }

      return { ...current, board, firstReveal: false, moves: current.moves + 1, status: "playing" };
    });
  }

  function toggleFlag(index: number) {
    setGame((current) => {
      if (current.status === "won" || current.status === "lost") return current;
      const selected = current.board[index];
      const flags = current.board.filter((cell) => cell.flagged).length;
      if (selected.revealed || (!selected.flagged && flags >= mineCount)) return current;

      const board = current.board.map((cell, cellIndex) => (
        cellIndex === index ? { ...cell, flagged: !cell.flagged } : cell
      ));
      return { ...current, board };
    });
  }

  function handleContextMenu(event: MouseEvent<HTMLButtonElement>, index: number) {
    event.preventDefault();
    toggleFlag(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key.toLowerCase() !== "f") return;
    event.preventDefault();
    toggleFlag(index);
  }

  return (
    <main className="site-page inner-page play-page">
      <SiteNav active="play" />
      <section className="play-heading">
        <div>
          <h1>Play</h1>
          <p>Clear the board. Left click reveals a cell. Right click places a flag.</p>
        </div>
        <button className="play-reset" onClick={reset} type="button">new board <span aria-hidden="true">↻</span></button>
      </section>

      <section className="play-surface corner-ticks" aria-label="Playable beginner Minesweeper board">
        <div className="play-toolbar">
          <div><span>mines</span><strong className={minesLeft < 0 ? "is-negative" : ""}>{String(minesLeft).padStart(2, "0")}</strong></div>
          <div><span>moves</span><strong>{String(game.moves).padStart(2, "0")}</strong></div>
          <div><span>time</span><strong>{String(elapsed).padStart(3, "0")}</strong></div>
        </div>

        <div className={`play-board-wrap is-${game.status}`}>
          <div className="play-board" key={game.id} role="grid" aria-label="9 by 9 beginner Minesweeper board">
            {game.board.map((cell, index) => {
              const visibleValue = cell.exploded ? "mine" : cell.wrongFlag ? "wrong flag" : cell.flagged ? "flagged" : cell.revealed ? cell.adjacent === 0 ? "empty" : `${cell.adjacent} adjacent mines` : "covered";
              return (
                <button
                  aria-label={`${coordinate(index)}, ${visibleValue}`}
                  className={`play-cell ${cell.revealed ? "is-revealed" : "is-covered"} ${cell.flagged ? "is-flagged" : ""} ${cell.exploded ? "is-exploded" : ""} ${cell.wrongFlag ? "is-wrong-flag" : ""} ${cell.adjacent ? `play-number-${cell.adjacent}` : ""}`}
                  key={index}
                  onClick={() => reveal(index)}
                  onContextMenu={(event) => handleContextMenu(event, index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  role="gridcell"
                  style={{ "--cell-delay": `${Math.min(index * 16, 560)}ms` } as CSSProperties}
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

          {game.status === "won" || game.status === "lost" ? (
            <div className={`play-result is-${game.status}`} role="status">
              <span>{game.status === "won" ? "clear" : "boom"}</span>
              <strong>{game.status === "won" ? "board cleared" : "mine hit"}</strong>
              <button onClick={reset} type="button">play again</button>
            </div>
          ) : null}
        </div>

        <p className="play-status" aria-live="polite">{statusMessage(game.status)} Press <kbd>F</kbd> on a cell to flag with the keyboard.</p>
      </section>
    </main>
  );
}
