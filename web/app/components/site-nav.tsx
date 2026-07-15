import Link from "next/link";
import { FlagMark } from "./flag-mark";

type ActivePage = "home" | "demo" | "benchmarks";

export function SiteNav({ active }: { active: ActivePage }) {
  return (
    <header className="site-nav">
      <Link className="brand" href="/" aria-label="Sweeper home">
        <FlagMark />
        <span>sweeper</span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>Home</Link>
        <Link href="/demo" aria-current={active === "demo" ? "page" : undefined}>Demo</Link>
        <Link href="/benchmarks" aria-current={active === "benchmarks" ? "page" : undefined}>Benchmarks</Link>
      </nav>
      <span aria-hidden="true" />
    </header>
  );
}
