function svgUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * A sporadic erosion mask. The board stays solid on the right and breaks
 * into irregular clusters toward the left, without a single directional edge.
 */
export function ditherMask(size = 64, seed = 7): string {
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 1442695041) >>> 0;
    h = ((h ^ (h >>> 13)) * 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const smooth = (value: number) => value * value * (3 - 2 * value);
  const mix = (start: number, end: number, amount: number) => start + (end - start) * amount;
  const noise = (x: number, y: number, scale: number) => {
    const gridX = Math.floor(x / scale);
    const gridY = Math.floor(y / scale);
    const xAmount = smooth((x % scale) / scale);
    const yAmount = smooth((y % scale) / scale);
    const top = mix(hash(gridX, gridY), hash(gridX + 1, gridY), xAmount);
    const bottom = mix(hash(gridX, gridY + 1), hash(gridX + 1, gridY + 1), xAmount);
    return mix(top, bottom, yAmount);
  };

  const visible = (x: number, y: number) => {
    const progress = (x + 0.5) / size;
    const clusters = (noise(x, y, 12) - 0.5) * 0.42 + (noise(x, y, 4) - 0.5) * 0.14;
    const density = Math.max(0, Math.min(1, (progress - 0.07) / 0.5 + clusters));
    return hash(x, y) < Math.pow(density, 1.35);
  };
  const rows: string[] = [];
  for (let y = 0; y < size; y += 1) {
    let x = 0;
    while (x < size) {
      if (visible(x, y)) {
        let run = 1;
        while (x + run < size && visible(x + run, y)) run += 1;
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
