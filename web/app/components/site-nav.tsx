import Link from "next/link";
import { BrandMark } from "./brand-mark";

type ActivePage = "home" | "play" | "demo" | "benchmarks";

export function SiteNav({ active }: { active: ActivePage }) {
  return (
    <header className="site-nav">
      <BrandMark />
      <nav aria-label="Primary navigation">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>Home</Link>
        <Link href="/play" aria-current={active === "play" ? "page" : undefined}>Play</Link>
        <Link href="/demo" aria-current={active === "demo" ? "page" : undefined}>Demo</Link>
        <Link href="/benchmarks" aria-current={active === "benchmarks" ? "page" : undefined}>Benchmarks</Link>
      </nav>
      <span aria-hidden="true" />
    </header>
  );
}
