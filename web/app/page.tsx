import type { CSSProperties } from "react";
import Link from "next/link";
import { FlagMark } from "./components/flag-mark";
import { SiteNav } from "./components/site-nav";
import { ditherMask } from "./components/pixel-texture";

type HeroCell = "covered" | "clear" | "flag" | "one" | "two" | "three";

const heroBoard: HeroCell[][] = [
  ["clear", "clear", "one", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["clear", "one", "two", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["clear", "one", "flag", "two", "one", "covered", "covered", "covered", "covered"],
  ["clear", "two", "two", "three", "two", "one", "covered", "covered", "covered"],
  ["clear", "one", "flag", "two", "one", "one", "two", "covered", "covered"],
  ["clear", "one", "one", "two", "two", "flag", "two", "one", "covered"],
  ["clear", "clear", "one", "two", "flag", "two", "one", "one", "covered"],
  ["clear", "clear", "one", "two", "two", "one", "covered", "covered", "covered"],
  ["clear", "clear", "clear", "one", "covered", "covered", "covered", "covered", "covered"],
];

const labelForCell: Record<HeroCell, string> = {
  covered: "",
  clear: "",
  flag: "",
  one: "1",
  two: "2",
  three: "3",
};

type DebrisParticle = {
  color: string;
  delay: number;
  driftX: number;
  driftY: number;
  opacity: number;
  size: number;
  x: number;
  y: number;
};

const boardDebris: DebrisParticle[] = (() => {
  const colors = ["#dd8582", "#84ad83", "#84b3cf", "#cbbba5"];
  const sizes = [2, 3, 4, 5, 6, 8, 10];
  let state = 41;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  return Array.from({ length: 68 }, (_, index) => {
    const y = Math.max(2, Math.min(98, 3 + (index / 67) * 94 + (next() - 0.5) * 8));
    const cut = 17 + y * 0.48;
    const distance = index % 11 === 0 ? 24 + next() * 16 : 4 + Math.pow(next(), 1.65) * 24;
    const x = cut - distance;
    return {
      color: colors[Math.floor(next() * colors.length)],
      delay: 120 + index * 7 + Math.floor(next() * 80),
      driftX: -5 - Math.floor(next() * 22),
      driftY: -10 + Math.floor(next() * 20),
      opacity: 0.25 + next() * 0.42,
      size: sizes[Math.floor(next() * sizes.length)],
      x,
      y,
    };
  });
})();

const stageStyle = {
  "--board-dither": ditherMask(64, 17),
} as CSSProperties;

export default function Home() {
  return (
    <main className="site-page home-page">
      <SiteNav active="home" />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <h1 id="home-title">Where logic meets chance.</h1>
          <p className="hero-lede">
            <strong>Sweeper</strong> explains each Minesweeper move with a proof. It uses probability only when the board requires a guess.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/demo">try the demo <span aria-hidden="true">→</span></Link>
            <Link className="secondary-link" href="/benchmarks">see benchmarks</Link>
          </div>
          <dl className="hero-stats">
            <div><dt>win rate</dt><dd className="stat-green">90.6%</dd></div>
            <div><dt>test boards</dt><dd className="stat-blue">500</dd></div>
            <div><dt>mine count</dt><dd className="stat-red">10</dd></div>
          </dl>
        </div>

        <div className="hero-board-stage" style={stageStyle} aria-label="Illustrated Minesweeper board">
          <div className="hero-board-shell" aria-hidden="true">
            <div className="board-debris">
              {boardDebris.map((particle, index) => (
                <i
                  className="board-debris-pixel"
                  key={index}
                  style={{
                    "--debris-color": particle.color,
                    "--debris-delay": `${particle.delay}ms`,
                    "--debris-drift-x": `${particle.driftX}px`,
                    "--debris-drift-y": `${particle.driftY}px`,
                    "--debris-opacity": particle.opacity,
                    "--debris-size": `${particle.size}px`,
                    "--debris-x": `${particle.x}%`,
                    "--debris-y": `${particle.y}%`,
                  } as CSSProperties}
                />
              ))}
            </div>
            <div className="hero-board">
              {heroBoard.flatMap((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <span
                    className={`hero-cell hero-cell-${cell}`}
                    key={`${rowIndex}-${columnIndex}`}
                    style={{ "--cell-delay": `${160 + (8 - columnIndex) * 42 + rowIndex * 14}ms` } as CSSProperties}
                  >
                    {cell === "flag" ? <FlagMark compact /> : labelForCell[cell]}
                  </span>
                )),
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="home-methods" aria-label="Methods used by Sweeper">
        <article>
          <span className="method-dot method-dot-green" />
          <h2>Deduce</h2>
          <p>Read visible clues as constraints.</p>
        </article>
        <article>
          <span className="method-dot method-dot-blue" />
          <h2>Search</h2>
          <p>Count valid frontier assignments.</p>
        </article>
        <article>
          <span className="method-dot method-dot-red" />
          <h2>Choose</h2>
          <p>Rank the remaining safe moves.</p>
        </article>
      </section>

      <footer className="site-footer">
        <span>sweeper</span>
        <span>Minesweeper research project</span>
      </footer>
    </main>
  );
}
