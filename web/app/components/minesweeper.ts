export const PRESETS = {
  easy: { columns: 9, id: "easy", label: "Easy", mines: 10, rows: 9 },
  medium: { columns: 18, id: "medium", label: "Medium", mines: 40, rows: 14 },
  hard: { columns: 24, id: "hard", label: "Hard", mines: 99, rows: 20 },
} as const;

export type PresetId = keyof typeof PRESETS;
export type BoardPreset = (typeof PRESETS)[PresetId];
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
  preset: BoardPreset;
  status: Status;
};

export function columnLabel(index: number): string {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

export function coordinate(index: number, preset: BoardPreset): string {
  return `${columnLabel(index % preset.columns)}${Math.floor(index / preset.columns) + 1}`;
}

export function neighbors(index: number, preset: BoardPreset): number[] {
  const row = Math.floor(index / preset.columns);
  const column = index % preset.columns;
  const result: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextColumn = column + columnOffset;
      if (nextRow >= 0 && nextRow < preset.rows && nextColumn >= 0 && nextColumn < preset.columns) {
        result.push(nextRow * preset.columns + nextColumn);
      }
    }
  }
  return result;
}

function emptyBoard(preset: BoardPreset): Cell[] {
  return Array.from({ length: preset.rows * preset.columns }, () => ({
    adjacent: 0,
    exploded: false,
    flagged: false,
    mine: false,
    revealed: false,
    wrongFlag: false,
  }));
}

export function newGame(id: number, preset: BoardPreset = PRESETS.easy): Game {
  return { board: emptyBoard(preset), firstReveal: true, id, moves: 0, preset, status: "ready" };
}

function placeMines(board: Cell[], safeIndex: number, preset: BoardPreset): Cell[] {
  const mines = new Set<number>();
  while (mines.size < preset.mines) {
    const candidate = Math.floor(Math.random() * board.length);
    if (candidate !== safeIndex) mines.add(candidate);
  }
  const placed = board.map((cell, index) => ({ ...cell, flagged: cell.flagged, mine: mines.has(index) }));
  return placed.map((cell, index) => ({
    ...cell,
    adjacent: cell.mine ? 0 : neighbors(index, preset).filter((neighbor) => placed[neighbor].mine).length,
  }));
}

function revealArea(board: Cell[], startIndex: number, preset: BoardPreset): Cell[] {
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
    if (cell.adjacent === 0) queue.push(...neighbors(index, preset));
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
  const source = game.firstReveal ? placeMines(game.board, index, game.preset) : game.board;
  const cell = source[index];
  if (cell.flagged || cell.revealed) return game;
  if (cell.mine) {
    return { ...game, board: revealAllMines(source, index), firstReveal: false, moves: game.moves + 1, status: "lost" };
  }
  return settle(game, revealArea(source, index, game.preset));
}

/**
 * Chording, like Google Minesweeper: clicking a revealed clue whose flag
 * count matches the number reveals every other covered neighbor at once.
 */
export function chordCell(game: Game, index: number): Game {
  if (game.status !== "playing") return game;
  const cell = game.board[index];
  if (!cell.revealed || cell.adjacent === 0) return game;
  const around = neighbors(index, game.preset);
  const flagged = around.filter((neighbor) => game.board[neighbor].flagged).length;
  const targets = around.filter((neighbor) => !game.board[neighbor].flagged && !game.board[neighbor].revealed);
  if (flagged !== cell.adjacent || targets.length === 0) return game;

  const hitMine = targets.find((target) => game.board[target].mine);
  if (hitMine !== undefined) {
    return { ...game, board: revealAllMines(game.board, hitMine), moves: game.moves + 1, status: "lost" };
  }
  let board = game.board;
  for (const target of targets) board = revealArea(board, target, game.preset);
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

/* The solver reads only visible state: revealed clue numbers and covered cells. */

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

function clue(board: Cell[], index: number, preset: BoardPreset): string {
  return `${coordinate(index, preset)}=${board[index].adjacent}`;
}

export function analyze(board: Cell[], status: Status, preset: BoardPreset): Analysis {
  const provenSafe = new Map<number, string>();
  const provenMines = new Map<number, string>();

  if (status === "ready") {
    const centerRow = Math.floor(preset.rows / 2);
    const centerColumn = Math.floor(preset.columns / 2);
    return {
      frontier: [],
      provenMines,
      provenSafe,
      recommendation: {
        evidence: "The opening reveal is never a mine. Starting near the center touches the most cells.",
        index: centerRow * preset.columns + centerColumn,
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
  for (let index = 0; index < board.length; index += 1) {
    const cell = board[index];
    if (!cell.revealed || cell.adjacent === 0) continue;
    const cells = neighbors(index, preset).filter((neighbor) => !board[neighbor].revealed);
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
        for (const cell of unknown) provenSafe.set(cell, `${clue(board, constraint.source, preset)} is satisfied, so ${coordinate(cell, preset)} cannot hold a mine.`);
        changed = true;
      } else if (remaining === unknown.length) {
        for (const cell of unknown) provenMines.set(cell, `${clue(board, constraint.source, preset)} forces a mine at ${coordinate(cell, preset)}.`);
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
              provenSafe.set(cell, `${clue(board, small.source, preset)} accounts for every mine ${clue(board, large.source, preset)} needs, so ${coordinate(cell, preset)} is safe.`);
              changed = true;
            }
          }
        } else if (largeRemaining - smallRemaining === rest.length) {
          for (const cell of rest) {
            if (!provenMines.has(cell)) {
              provenMines.set(cell, `Comparing ${clue(board, small.source, preset)} with ${clue(board, large.source, preset)} forces a mine at ${coordinate(cell, preset)}.`);
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
  const baseline = unknownCovered.length > 0 ? Math.max(0, preset.mines - knownMines) / unknownCovered.length : 1;
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
        ? `No proof exists. ${coordinate(best.index, preset)} carries the lowest bound on mine risk along the frontier.`
        : `No proof exists. ${coordinate(best.index, preset)} is outside every constraint, so only the global mine density applies.`,
      index: best.index,
      label: "approximate",
      method: "local risk estimate",
      risk: best.risk,
    },
  };
}
