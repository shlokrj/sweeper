export const ROWS = 9;
export const COLUMNS = 9;
export const MINE_COUNT = 10;
export const CELL_COUNT = ROWS * COLUMNS;

export type Status = "ready" | "playing" | "won" | "lost";

export type Cell = {
  adjacent: number;
  exploded: boolean;
  flagged: boolean;
  mine: boolean;
  revealed: boolean;
  wrongFlag: boolean;
};

export type Game = {
  board: Cell[];
  firstReveal: boolean;
  id: number;
  moves: number;
  status: Status;
};

export function coordinate(index: number): string {
  return `${String.fromCharCode(65 + (index % COLUMNS))}${Math.floor(index / COLUMNS) + 1}`;
}

export function neighbors(index: number): number[] {
  const row = Math.floor(index / COLUMNS);
  const column = index % COLUMNS;
  const result: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < ROWS && nextColumn >= 0 && nextColumn < COLUMNS) {
        result.push(nextRow * COLUMNS + nextColumn);
      }
    }
  }
  return result;
}

function emptyBoard(): Cell[] {
  return Array.from({ length: CELL_COUNT }, () => ({
    adjacent: 0,
    exploded: false,
    flagged: false,
    mine: false,
    revealed: false,
    wrongFlag: false,
  }));
}

export function newGame(id: number): Game {
  return { board: emptyBoard(), firstReveal: true, id, moves: 0, status: "ready" };
}

/**
 * Mines avoid the first revealed cell and its whole neighborhood, so the
 * opening click always lands on a zero and breaks the board open.
 */
function placeMines(board: Cell[], safeIndex: number): Cell[] {
  const safeZone = new Set([safeIndex, ...neighbors(safeIndex)]);
  const mines = new Set<number>();
  while (mines.size < MINE_COUNT) {
    const candidate = Math.floor(Math.random() * CELL_COUNT);
    if (!safeZone.has(candidate)) mines.add(candidate);
  }
  const placed = board.map((cell, index) => ({ ...cell, flagged: cell.flagged, mine: mines.has(index) }));
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
    if (cell.mine || cell.revealed) continue;
    if (cell.flagged && index !== startIndex) continue;
    cell.flagged = false;
    cell.revealed = true;
    if (cell.adjacent === 0) queue.push(...neighbors(index));
  }
  return next;
}

function revealAllMines(board: Cell[], explodedIndex: number): Cell[] {
  return board.map((cell, index) => {
    if (cell.mine) return { ...cell, revealed: true, exploded: index === explodedIndex };
    if (cell.flagged) return { ...cell, wrongFlag: true };
    return cell;
  });
}

function hasWon(board: Cell[]): boolean {
  return board.every((cell) => cell.mine || cell.revealed);
}

function settle(game: Game, board: Cell[]): Game {
  if (hasWon(board)) {
    return {
      ...game,
      board: board.map((cell) => (cell.mine ? { ...cell, flagged: true } : cell)),
      firstReveal: false,
      moves: game.moves + 1,
      status: "won",
    };
  }
  return { ...game, board, firstReveal: false, moves: game.moves + 1, status: "playing" };
}

export function revealCell(game: Game, index: number): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const source = game.firstReveal ? placeMines(game.board, index) : game.board;
  const cell = source[index];
  if (cell.flagged || cell.revealed) return game;
  if (cell.mine) {
    return { ...game, board: revealAllMines(source, index), firstReveal: false, moves: game.moves + 1, status: "lost" };
  }
  return settle(game, revealArea(source, index));
}

/**
 * Chording, like Google Minesweeper: clicking a revealed clue whose flag
 * count matches the number reveals every other covered neighbor at once.
 */
export function chordCell(game: Game, index: number): Game {
  if (game.status !== "playing") return game;
  const cell = game.board[index];
  if (!cell.revealed || cell.adjacent === 0) return game;
  const around = neighbors(index);
  const flagged = around.filter((neighbor) => game.board[neighbor].flagged).length;
  const targets = around.filter((neighbor) => !game.board[neighbor].flagged && !game.board[neighbor].revealed);
  if (flagged !== cell.adjacent || targets.length === 0) return game;

  const hitMine = targets.find((target) => game.board[target].mine);
  if (hitMine !== undefined) {
    return { ...game, board: revealAllMines(game.board, hitMine), moves: game.moves + 1, status: "lost" };
  }
  let board = game.board;
  for (const target of targets) board = revealArea(board, target);
  return settle(game, board);
}

export function toggleFlag(game: Game, index: number): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.board[index];
  if (cell.revealed) return game;
  const board = game.board.map((entry, entryIndex) => (
    entryIndex === index ? { ...entry, flagged: !entry.flagged } : entry
  ));
  return { ...game, board };
}

/* The solver reads only visible state: revealed clue numbers and which
   cells remain covered. Player flags and hidden mines never inform it. */

type Constraint = { cells: number[]; count: number; source: number };

export type Analysis = {
  frontier: number[];
  provenMines: Map<number, string>;
  provenSafe: Map<number, string>;
  recommendation: {
    evidence: string;
    index: number;
    label: "proven" | "approximate";
    method: string;
    risk: number;
  } | null;
};

function clue(board: Cell[], index: number): string {
  return `${coordinate(index)}=${board[index].adjacent}`;
}

export function analyze(board: Cell[], status: Status): Analysis {
  const provenSafe = new Map<number, string>();
  const provenMines = new Map<number, string>();

  if (status === "ready") {
    const center = Math.floor(CELL_COUNT / 2);
    return {
      frontier: [],
      provenMines,
      provenSafe,
      recommendation: {
        evidence: "The opening reveal is guaranteed safe and always breaks the board open. A center start touches the most cells.",
        index: center,
        label: "proven",
        method: "safe first reveal",
        risk: 0,
      },
    };
  }
  if (status === "won" || status === "lost") {
    return { frontier: [], provenMines, provenSafe, recommendation: null };
  }

  const covered = board.map((cell, index) => (!cell.revealed ? index : -1)).filter((index) => index >= 0);
  const constraints: Constraint[] = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const cell = board[index];
    if (!cell.revealed || cell.adjacent === 0) continue;
    const cells = neighbors(index).filter((neighbor) => !board[neighbor].revealed);
    if (cells.length > 0) constraints.push({ cells, count: cell.adjacent, source: index });
  }
  const frontier = [...new Set(constraints.flatMap((constraint) => constraint.cells))].sort((a, b) => a - b);

  let changed = true;
  while (changed) {
    changed = false;
    for (const constraint of constraints) {
      const unknown = constraint.cells.filter((cell) => !provenSafe.has(cell) && !provenMines.has(cell));
      const found = constraint.cells.filter((cell) => provenMines.has(cell)).length;
      const remaining = constraint.count - found;
      if (unknown.length === 0) continue;
      if (remaining === 0) {
        for (const cell of unknown) provenSafe.set(cell, `${clue(board, constraint.source)} is already satisfied, so ${coordinate(cell)} cannot hold a mine.`);
        changed = true;
      } else if (remaining === unknown.length) {
        for (const cell of unknown) provenMines.set(cell, `${clue(board, constraint.source)} forces every remaining neighbor to be a mine, including ${coordinate(cell)}.`);
        changed = true;
      }
    }
    for (const small of constraints) {
      for (const large of constraints) {
        if (small === large) continue;
        const smallUnknown = small.cells.filter((cell) => !provenSafe.has(cell) && !provenMines.has(cell));
        const largeUnknown = large.cells.filter((cell) => !provenSafe.has(cell) && !provenMines.has(cell));
        if (smallUnknown.length === 0 || smallUnknown.length >= largeUnknown.length) continue;
        if (!smallUnknown.every((cell) => largeUnknown.includes(cell))) continue;
        const smallRemaining = small.count - small.cells.filter((cell) => provenMines.has(cell)).length;
        const largeRemaining = large.count - large.cells.filter((cell) => provenMines.has(cell)).length;
        const rest = largeUnknown.filter((cell) => !smallUnknown.includes(cell));
        if (largeRemaining - smallRemaining === 0) {
          for (const cell of rest) {
            if (!provenSafe.has(cell)) {
              provenSafe.set(cell, `${clue(board, small.source)} accounts for every mine ${clue(board, large.source)} needs, so ${coordinate(cell)} is safe.`);
              changed = true;
            }
          }
        } else if (largeRemaining - smallRemaining === rest.length) {
          for (const cell of rest) {
            if (!provenMines.has(cell)) {
              provenMines.set(cell, `Comparing ${clue(board, small.source)} with ${clue(board, large.source)} forces a mine at ${coordinate(cell)}.`);
              changed = true;
            }
          }
        }
      }
    }
  }

  const safeChoices = frontier.filter((cell) => provenSafe.has(cell));
  if (safeChoices.length > 0) {
    const index = safeChoices[0];
    return {
      frontier,
      provenMines,
      provenSafe,
      recommendation: { evidence: provenSafe.get(index) ?? "", index, label: "proven", method: "constraint propagation", risk: 0 },
    };
  }

  const knownMines = provenMines.size;
  const unknownCovered = covered.filter((cell) => !provenMines.has(cell));
  const baseline = unknownCovered.length > 0 ? Math.max(0, MINE_COUNT - knownMines) / unknownCovered.length : 1;
  let best: { index: number; risk: number } | null = null;
  for (const cell of unknownCovered) {
    let risk = baseline;
    for (const constraint of constraints) {
      const unknown = constraint.cells.filter((entry) => !provenSafe.has(entry) && !provenMines.has(entry));
      if (!unknown.includes(cell)) continue;
      const remaining = constraint.count - constraint.cells.filter((entry) => provenMines.has(entry)).length;
      risk = Math.max(risk, unknown.length > 0 ? remaining / unknown.length : 0);
    }
    if (best === null || risk < best.risk) best = { index: cell, risk };
  }
  if (best === null) return { frontier, provenMines, provenSafe, recommendation: null };
  const onFrontier = frontier.includes(best.index);
  return {
    frontier,
    provenMines,
    provenSafe,
    recommendation: {
      evidence: onFrontier
        ? `No proof exists on this board. ${coordinate(best.index)} carries the lowest bound on mine risk along the frontier.`
        : `No proof exists on this board. ${coordinate(best.index)} sits away from every constraint, so only the global mine density applies.`,
      index: best.index,
      label: "approximate",
      method: "local risk estimate",
      risk: best.risk,
    },
  };
}
