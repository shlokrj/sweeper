const SHACKLE: Array<[number, number, number, number]> = [
  [4, 1, 6, 1],
  [4, 2, 2, 4],
  [8, 2, 2, 4],
];

export function LockMark() {
  return (
    <svg aria-hidden="true" className="lock-mark" shapeRendering="crispEdges" viewBox="0 0 14 14">
      <g fill="var(--ink)">
        {SHACKLE.map(([x, y, width, height]) => (
          <rect height={height} key={`${x}-${y}`} width={width} x={x} y={y} />
        ))}
        <rect height={7} width={10} x={2} y={6} />
      </g>
      <rect fill="#fffaf0" height="3" width="2" x="6" y="8" />
    </svg>
  );
}
