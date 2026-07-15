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
 * An ordered-dither mask that dissolves the left edge into square pixels.
 * The tile is 4 rows tall and repeats vertically, so every mask pixel stays
 * crisp instead of fading through translucency.
 */
export function ditherMask(columns = 36, dissolveColumns = 14): string {
  const rows: string[] = [];
  for (let y = 0; y < 4; y += 1) {
    let x = 0;
    while (x < columns) {
      const threshold = Math.min(16, Math.floor(((x + 1) / dissolveColumns) * 17));
      if (BAYER[y][x % 4] < threshold) {
        let run = 1;
        while (x + run < columns) {
          const nextThreshold = Math.min(16, Math.floor(((x + run + 1) / dissolveColumns) * 17));
          if (BAYER[y][(x + run) % 4] >= nextThreshold) break;
          run += 1;
        }
        rows.push(`<rect x='${x}' y='${y}' width='${run}' height='1'/>`);
        x += run;
      } else {
        x += 1;
      }
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${columns} 4' preserveAspectRatio='none' shape-rendering='crispEdges' fill='black'>${rows.join("")}</svg>`;
  return svgUrl(svg);
}

const DUST_COLORS = ["#dd8582", "#84ad83", "#84b3cf"];

/**
 * A repeating tile of small pastel squares on a coarse grid. A seeded
 * generator keeps the server and client render identical.
 */
export function pixelDust(tile = 132, step = 12, seed = 9): string {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const squares: string[] = [];
  for (let y = 0; y < tile; y += step) {
    for (let x = 0; x < tile; x += step) {
      if (next() > 0.34) continue;
      const size = next() > 0.72 ? 3 : 2;
      const jitterX = Math.floor(next() * (step - size));
      const jitterY = Math.floor(next() * (step - size));
      const color = DUST_COLORS[Math.floor(next() * DUST_COLORS.length)];
      const alpha = (0.38 + next() * 0.42).toFixed(2);
      squares.push(
        `<rect x='${x + jitterX}' y='${y + jitterY}' width='${size}' height='${size}' fill='${color}' fill-opacity='${alpha}'/>`,
      );
    }
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${tile} ${tile}' shape-rendering='crispEdges'>${squares.join("")}</svg>`;
  return svgUrl(svg);
}
