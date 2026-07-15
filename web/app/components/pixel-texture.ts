const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * An ordered-dither mask that dissolves the board toward its top left corner.
 * The threshold rises along the x + y diagonal, so tiles break into square
 * pixels instead of fading through translucency.
 */
export function ditherMask(size = 32, clearDiagonal = 4, solidDiagonal = 16): string {
  const rows: string[] = [];
  const threshold = (x: number, y: number) =>
    Math.min(17, Math.max(0, Math.floor(((x + y + 1 - clearDiagonal) / (solidDiagonal - clearDiagonal)) * 17)));
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (BAYER[y % 4][x % 4] < threshold(x, y)) {
        let run = 1;
        while (x + run < size && BAYER[y % 4][(x + run) % 4] < threshold(x + run, y)) run += 1;
        rows.push(`<rect x='${x}' y='${y}' width='${run}' height='1'/>`);
        x += run;
      } else {
        x += 1;
      }
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${size} ${size}' preserveAspectRatio='none' shape-rendering='crispEdges' fill='black'>${rows.join("")}</svg>`;
  return svgUrl(svg);
}

const DUST_COLORS = ["#dd8582", "#84ad83", "#84b3cf", "#cbbba5"];

/**
 * A repeating tile of solid pastel squares on a coarse grid. A seeded
 * generator keeps the server and client render identical.
 */
export function pixelDust(tile = 144, step = 16, seed = 9, alpha = 1): string {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const squares: string[] = [];
  for (let y = 0; y < tile; y += step) {
    for (let x = 0; x < tile; x += step) {
      if (next() > 0.3) continue;
      const size = next() > 0.78 ? 5 : 3;
      const jitterX = Math.floor(next() * ((step - size) / 4)) * 4;
      const jitterY = Math.floor(next() * ((step - size) / 4)) * 4;
      const color = DUST_COLORS[Math.floor(next() * DUST_COLORS.length)];
      squares.push(
        `<rect x='${x + jitterX}' y='${y + jitterY}' width='${size}' height='${size}' fill='${color}'${alpha < 1 ? ` fill-opacity='${alpha}'` : ""}/>`,
      );
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${tile} ${tile}' shape-rendering='crispEdges'>${squares.join("")}</svg>`;
  return svgUrl(svg);
}
