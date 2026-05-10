/**
 * Plima val-logo — 3 stacked rising tide waves (smallest top → largest
 * bottom) + Plima wordmark. Cyan-to-deep-ocean gradient. Pure SVG so
 * it scales razor-sharp on retina + print.
 *
 * Variants:
 *   - "full"     wave mark + "Plima" wordmark (default, hero use)
 *   - "mark"     wave mark only (favicon, watermark)
 *   - "stacked"  wave mark above wordmark (small spaces)
 *
 * Color modes:
 *   - "light"    for light backgrounds (deep navy text)
 *   - "dark"     for dark backgrounds (white text + brighter waves)
 */

interface PlimaLogoProps {
  variant?: "full" | "mark" | "stacked";
  mode?: "light" | "dark";
  /** Pixel size of the wave mark (height). Wordmark scales proportionally. */
  size?: number;
  className?: string;
}

export function PlimaLogo({
  variant = "full",
  mode = "dark",
  size = 56,
  className = "",
}: PlimaLogoProps) {
  const wordColor = mode === "dark" ? "#ffffff" : "#0c1f3d";
  const wordSize = Math.round(size * 0.68);
  const wordTracking = -0.02;

  const Mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="plima-wave-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="55%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
        <linearGradient id="plima-wave-grad-bright" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <filter id="plima-wave-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wave 1 — top, smallest, lightest */}
      <path
        d="M 8 22 Q 18 16, 32 22 T 56 22"
        stroke="url(#plima-wave-grad-bright)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
        filter="url(#plima-wave-glow)"
      />

      {/* Wave 2 — middle, medium */}
      <path
        d="M 5 34 Q 18 24, 32 34 T 59 34"
        stroke="url(#plima-wave-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#plima-wave-glow)"
      />

      {/* Wave 3 — bottom, biggest crest */}
      <path
        d="M 2 48 Q 18 32, 32 48 T 62 48"
        stroke="url(#plima-wave-grad)"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        filter="url(#plima-wave-glow)"
      />

      {/* Tide line — subtle horizontal at base */}
      <line
        x1="4"
        y1="56"
        x2="60"
        y2="56"
        stroke={mode === "dark" ? "#0ea5e9" : "#0c4a6e"}
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  );

  const Wordmark = (
    <span
      style={{
        fontSize: wordSize,
        fontWeight: 700,
        letterSpacing: `${wordTracking}em`,
        color: wordColor,
        lineHeight: 1,
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      Plima
    </span>
  );

  if (variant === "mark") {
    return <span className={className}>{Mark}</span>;
  }

  if (variant === "stacked") {
    return (
      <span
        className={"inline-flex flex-col items-center gap-1 " + className}
      >
        {Mark}
        {Wordmark}
      </span>
    );
  }

  // full
  return (
    <span className={"inline-flex items-center gap-3 " + className}>
      {Mark}
      {Wordmark}
    </span>
  );
}
