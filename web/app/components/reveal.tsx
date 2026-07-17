"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Holds every CSS animation inside paused until the block scrolls into
 * view, so entrance motion plays where the reader can see it. A position
 * check on scroll backs up the observer where it is throttled.
 */
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || revealed) return undefined;
    const check = () => {
      const rect = node.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) setRevealed(true);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setRevealed(true);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    observer.observe(node);
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [revealed]);

  return (
    <div className={revealed ? "reveal is-revealed" : "reveal"} ref={ref}>
      {children}
    </div>
  );
}
