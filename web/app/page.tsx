import Link from "next/link";
import { SiteNav } from "./components/site-nav";

type HeroCell = "covered" | "clear" | "flag" | "mine" | "one" | "two" | "three";

const heroBoard: HeroCell[][] = [
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "one", "one", "two", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "one", "clear", "two", "flag", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "two", "one", "three", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "mine", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
  ["covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered", "covered"],
];

const labelForCell: Record<HeroCell, string> = {
  covered: "",
  clear: "",
  flag: "⚑",
  mine: "✦",
  one: "1",
  two: "2",
  three: "3",
};

export default function Home() {
  return (
    <main className="site-page home-page">
      <SiteNav active="home" />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="signal-label">MINESWEEPER RESEARCH / 2026</p>
          <h1 id="home-title">
            Sweep the board.
            <br />
            See the proof.
          </h1>
          <p className="hero-description">
            Sweeper studies how symbolic constraints, exact search, and learned policies choose the next safe move.
          </p>
          <div className="hero-actions">
            <Link className="signal-button" href="/demo">
              open demo <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="/benchmarks">
              benchmark results <span aria-hidden="true">↓</span>
            </Link>
          </div>
        </div>

        <div className="hero-board-stage" aria-label="Illustrated Minesweeper board">
          <div className="board-orbit board-orbit-one" aria-hidden="true" />
          <div className="board-orbit board-orbit-two" aria-hidden="true" />
          <div className="hero-board-readout readout-top">FIELD / 09 × 12</div>
          <div className="hero-board-readout readout-bottom">SAFE CELL FOUND / E6</div>
          <div className="hero-board" aria-hidden="true">
            {heroBoard.flatMap((row, rowIndex) =>
              row.map((cell, columnIndex) => (
                <span
                  className={`hero-cell hero-cell-${cell}`}
                  key={`${rowIndex}-${columnIndex}`}
                  style={{ animationDelay: `${(rowIndex * heroBoard[0].length + columnIndex) * 17}ms` }}
                >
                  {labelForCell[cell]}
                </span>
              )),
            )}
          </div>
          <div className="board-crosshair board-crosshair-x" aria-hidden="true" />
          <div className="board-crosshair board-crosshair-y" aria-hidden="true" />
        </div>
      </section>

      <section className="home-stats" aria-label="Project summary">
        <div>
          <span className="signal-label">BOARD</span>
          <strong>9 × 9</strong>
          <p>beginner field</p>
        </div>
        <div>
          <span className="signal-label">METHODS</span>
          <strong>03</strong>
          <p>proof, search, model</p>
        </div>
        <div>
          <span className="signal-label">BEST HELD-OUT</span>
          <strong>90.6%</strong>
          <p>500 fixed boards</p>
        </div>
      </section>

      <section className="method-section" aria-labelledby="methods-title">
        <div className="section-intro">
          <p className="signal-label">DECISION STACK</p>
          <h2 id="methods-title">No mystery move.</h2>
          <p>Each decision keeps its evidence close to the board.</p>
        </div>
        <div className="method-list">
          <article className="method-row">
            <span className="method-number">01</span>
            <div>
              <h3>symbolic solver</h3>
              <p>Converts visible clues into safe-cell and mine-cell constraints.</p>
            </div>
            <span className="method-mark mark-green">proof</span>
          </article>
          <article className="method-row">
            <span className="method-number">02</span>
            <div>
              <h3>exact frontier search</h3>
              <p>Enumerates valid assignments when local deductions stop.</p>
            </div>
            <span className="method-mark mark-amber">count</span>
          </article>
          <article className="method-row">
            <span className="method-number">03</span>
            <div>
              <h3>strategy-aware CNN</h3>
              <p>Ranks unresolved cells with board state and symbolic masks.</p>
            </div>
            <span className="method-mark mark-violet">rank</span>
          </article>
        </div>
      </section>

      <footer className="site-footer">
        <p>SWEEPER / RESEARCH INTERFACE</p>
        <p>BUILT FOR BOARD-LEVEL EVIDENCE</p>
      </footer>
    </main>
  );
}
