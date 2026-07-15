const CLOTH: Array<[number, number, number]> = [
  [6, 1, 2],
  [4, 2, 4],
  [2, 3, 6],
  [4, 4, 4],
  [6, 5, 2],
];

const STAND: Array<[number, number, number, number]> = [
  [8, 1, 1, 10],
  [6, 11, 5, 1],
  [4, 12, 9, 1],
];

export function FlagMark({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`flag-mark ${compact ? "flag-mark-compact" : ""}`}
      shapeRendering="crispEdges"
      viewBox="0 0 14 14"
    >
      <g fill="var(--red)">
        {CLOTH.map(([x, y, width]) => (
          <rect height="1" key={`${x}-${y}`} width={width} x={x} y={y} />
        ))}
      </g>
      <g fill="var(--ink)">
        {STAND.map(([x, y, width, height]) => (
          <rect height={height} key={`${x}-${y}`} width={width} x={x} y={y} />
        ))}
      </g>
    </svg>
  );
}
