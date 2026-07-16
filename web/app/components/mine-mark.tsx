const BODY: Array<[number, number, number, number]> = [
  [5, 3, 4, 1],
  [4, 4, 6, 1],
  [3, 5, 8, 4],
  [4, 9, 6, 1],
  [5, 10, 4, 1],
];

const SPIKES: Array<[number, number, number, number]> = [
  [6, 1, 2, 2],
  [6, 11, 2, 2],
  [1, 6, 2, 2],
  [11, 6, 2, 2],
  [2, 2, 2, 2],
  [10, 2, 2, 2],
  [2, 10, 2, 2],
  [10, 10, 2, 2],
];

export function MineMark() {
  return (
    <svg aria-hidden="true" className="mine-mark" shapeRendering="crispEdges" viewBox="0 0 14 14">
      <g fill="var(--ink)">
        {BODY.map(([x, y, width, height]) => (
          <rect height={height} key={`body-${x}-${y}`} width={width} x={x} y={y} />
        ))}
        {SPIKES.map(([x, y, width, height]) => (
          <rect height={height} key={`spike-${x}-${y}`} width={width} x={x} y={y} />
        ))}
      </g>
      <rect fill="#fffaf0" height="2" width="2" x="5" y="5" />
    </svg>
  );
}
