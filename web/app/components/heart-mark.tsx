const PIXELS: Array<[number, number, number, number]> = [
  [1, 0, 2, 1],
  [4, 0, 2, 1],
  [0, 1, 7, 2],
  [1, 3, 5, 1],
  [2, 4, 3, 1],
  [3, 5, 1, 1],
];

export function HeartMark() {
  return (
    <svg aria-hidden="true" className="heart-mark" shapeRendering="crispEdges" viewBox="0 0 7 6">
      {PIXELS.map(([x, y, width, height]) => (
        <rect fill="currentColor" height={height} key={`${x}-${y}`} width={width} x={x} y={y} />
      ))}
    </svg>
  );
}
