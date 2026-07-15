import Link from "next/link";
import { BrandMark } from "./brand-mark";

type ActivePage = "home" | "demo" | "benchmarks";

export function SiteNav({ active }: { active: ActivePage }) {
  return (
    <header className="site-nav">
      <div className="brand">
        <BrandMark />
        <Link href="/" aria-label="Sweeper home">sweeper</Link>
      </div>
      <nav aria-label="Primary navigation">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>Home</Link>
        <Link href="/demo" aria-current={active === "demo" ? "page" : undefined}>Demo</Link>
        <Link href="/benchmarks" aria-current={active === "benchmarks" ? "page" : undefined}>Benchmarks</Link>
      </nav>
      <span aria-hidden="true" />
    </header>
  );
}
