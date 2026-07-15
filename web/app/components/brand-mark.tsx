"use client";

import Link from "next/link";
import { type MouseEvent } from "react";
import { FlagMark } from "./flag-mark";

const blastPixels = [
  [-12, -12, 5, "#e6c472"], [-3, -15, 6, "#dd8582"], [7, -10, 5, "#e6c472"],
  [-17, -3, 6, "#dd8582"], [-5, -5, 12, "#be625f"], [10, -2, 7, "#e6c472"],
  [-14, 8, 5, "#e6c472"], [-1, 7, 8, "#dd8582"], [12, 10, 5, "#e6c472"],
  [-22, -16, 3, "#be625f"], [20, -13, 3, "#be625f"], [-23, 17, 3, "#e6c472"], [22, 18, 3, "#e6c472"],
] as const;

export function BrandMark() {
  function explode(event: MouseEvent<HTMLAnchorElement>) {
    const icon = event.currentTarget.querySelector<HTMLElement>(".brand-icon");
    if (!icon) return;

    const bounds = icon.getBoundingClientRect();
    const burst = document.createElement("span");
    burst.className = "brand-explosion brand-explosion-fixed";
    burst.setAttribute("aria-hidden", "true");
    burst.style.left = `${bounds.left + bounds.width / 2}px`;
    burst.style.top = `${bounds.top + bounds.height / 2}px`;

    blastPixels.forEach(([x, y, size, color]) => {
      const pixel = document.createElement("i");
      pixel.style.setProperty("--blast-color", color);
      pixel.style.setProperty("--blast-size", `${size}px`);
      pixel.style.setProperty("--blast-x", `${x}px`);
      pixel.style.setProperty("--blast-y", `${y}px`);
      burst.append(pixel);
    });

    document.body.append(burst);
    window.setTimeout(() => burst.remove(), 480);
  }

  return (
    <Link
      aria-label="Sweeper home"
      className="brand"
      href="/"
      onClick={explode}
    >
      <span className="brand-icon">
        <FlagMark />
      </span>
      <span className="brand-word">sweeper</span>
    </Link>
  );
}
