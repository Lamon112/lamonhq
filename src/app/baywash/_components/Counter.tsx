"use client";

/**
 * Animated number counter — eases from 0 to target when scrolled into view.
 *
 * - Triggers ONCE per mount via IntersectionObserver.
 * - Respects prefers-reduced-motion: jumps straight to final value.
 * - Format options: integer, decimal (1 place), with optional prefix/suffix.
 */

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  target: number;
  decimals?: 0 | 1 | 2;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

export function Counter({
  target,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1500,
  className,
}: CounterProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (reduced) {
      setValue(target);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting;
        if (!visible || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (now: number) => {
          const elapsed = now - t0;
          const t = Math.min(elapsed / durationMs, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(target * eased);
          if (t < 1) requestAnimationFrame(tick);
          else setValue(target);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, durationMs]);

  const formatted = decimals
    ? value.toFixed(decimals).replace(".", ",")
    : Math.floor(value).toLocaleString("hr-HR");

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
