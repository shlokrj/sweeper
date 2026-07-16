import Link from "next/link";
import { BrandMark } from "./brand-mark";

type ActivePage = "home" | "demo" | "benchmarks";

export function SiteNav({ active }: { active: ActivePage }) {
  return (
    <header className="site-nav">
      <BrandMark />
      <nav aria-label="Primary navigation">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>Home</Link>
        <Link href="/demo" aria-current={active === "demo" ? "page" : undefined}>Demo</Link>
        <Link href="/benchmarks" aria-current={active === "benchmarks" ? "page" : undefined}>Benchmarks</Link>
      </nav>
      <a className="made-by nav-credit" href="https://shlok.fyi/" rel="noreferrer" target="_blank">
        made by shlok.fyi <span aria-hidden="true" className="smile-mark">:)</span>
      </a>
    </header>
  );
}
