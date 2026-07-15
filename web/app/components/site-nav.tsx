import Link from "next/link";
import { SweeperMark } from "./sweeper-mark";

type ActivePage = "home" | "demo" | "benchmarks";

export function SiteNav({ active }: { active: ActivePage }) {
  return (
    <header className="site-nav">
      <Link className="brand" href="/" aria-label="Sweeper home">
        <SweeperMark />
        <span>sweeper</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>home</Link>
        <Link href="/demo" aria-current={active === "demo" ? "page" : undefined}>demo</Link>
        <Link href="/benchmarks" aria-current={active === "benchmarks" ? "page" : undefined}>benchmarks</Link>
      </nav>
      <span className="nav-status"><i /> local build</span>
    </header>
  );
}
