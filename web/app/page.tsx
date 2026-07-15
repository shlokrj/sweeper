import Link from "next/link";
import { FlagMark } from "./components/flag-mark";
import { SiteNav } from "./components/site-nav";

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

export default function Home() {
  return (
    <main className="site-page home-page">
      <SiteNav active="home" />

      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <h1 id="home-title">Where logic meets chance.</h1>
          <p>
            Sweeper is an explainable Minesweeper agent. It shows the proof behind a move, then uses probability only when the board requires a guess.
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

        <div className="hero-board-stage" aria-label="Illustrated Minesweeper board">
          <div className="board-dust" aria-hidden="true" />
          <div className="hero-board" aria-hidden="true">
            {heroBoard.flatMap((row, rowIndex) =>
              row.map((cell, columnIndex) => (
                <span className={`hero-cell hero-cell-${cell}`} key={`${rowIndex}-${columnIndex}`}>
                  {cell === "flag" ? <FlagMark compact /> : labelForCell[cell]}
                </span>
              )),
            )}
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
