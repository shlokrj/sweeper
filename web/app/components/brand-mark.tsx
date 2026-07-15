"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type MouseEvent, useState } from "react";
import { FlagMark } from "./flag-mark";

const blastPixels = [
  [-12, -12, 5, "#e6c472"], [-3, -15, 6, "#dd8582"], [7, -10, 5, "#e6c472"],
  [-17, -3, 6, "#dd8582"], [-5, -5, 12, "#be625f"], [10, -2, 7, "#e6c472"],
  [-14, 8, 5, "#e6c472"], [-1, 7, 8, "#dd8582"], [12, 10, 5, "#e6c472"],
  [-22, -16, 3, "#be625f"], [20, -13, 3, "#be625f"], [-23, 17, 3, "#e6c472"], [22, 18, 3, "#e6c472"],
] as const;

export function BrandMark() {
  const [burst, setBurst] = useState(0);
  const router = useRouter();

  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    setBurst((count) => count + 1);
    window.setTimeout(() => router.push("/"), 460);
  }

  return (
    <Link
      aria-label="Sweeper home"
      className="brand"
      href="/"
      onClick={goHome}
    >
      <span className="brand-icon">
        <FlagMark />
        {burst > 0 && (
          <span className="brand-explosion" key={burst} aria-hidden="true">
            {blastPixels.map(([x, y, size, color], index) => (
              <i
                key={index}
                style={{
                  "--blast-color": color,
                  "--blast-size": `${size}px`,
                  "--blast-x": `${x}px`,
                  "--blast-y": `${y}px`,
                } as CSSProperties}
              />
            ))}
          </span>
        )}
      </span>
      <span className="brand-word">sweeper</span>
    </Link>
  );
}
