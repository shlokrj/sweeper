import Link from "next/link";
import { FlagMark } from "./flag-mark";

export function BrandMark() {
  return (
    <Link
      aria-label="Sweeper home"
      className="brand"
      href="/"
    >
      <span className="brand-icon">
        <FlagMark />
      </span>
      <span className="brand-word">sweeper</span>
    </Link>
  );
}
