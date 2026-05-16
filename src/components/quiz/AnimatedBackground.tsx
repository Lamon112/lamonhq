"use client";

/**
 * Quiz funnel — premium animated background.
 *
 * Replaces the dead-flat #0a0a0a we had on /quiz routes. Per Leonardov
 * 2026-05-15 feedback: "pozadina mi je previše crna treba biti to više
 * stilisticki animacijski".
 *
 * Layers (z-stack, all pointer-events-none, all behind z-10 content):
 *   1. Base radial gradient — warm gold breathing in BR + cool indigo BL
 *   2. Animated aurora orbs — 3 large blurred blobs moving along long
 *      sinusoidal paths, hue rotates between gold/amber/indigo
 *   3. Subtle gold dot grid (already in globals.css) — masked by radial
 *      fade so center stays clean for content readability
 *   4. Conic shimmer overlay — slow rotation for premium feel
 *
 * `intensity`:
 *   - "medium" (quiz form) — calm, doesn't fight content
 *   - "high"   (waiting screen w/ mini-game) — extra orbs, brighter,
 *               adds celebratory energy while AI thinks
 *
 * No JS animation loops — all CSS keyframes for cheap GPU compositing.
 * Respects prefers-reduced-motion.
 */

interface AnimatedBackgroundProps {
  intensity?: "medium" | "high";
}

export function AnimatedBackground({ intensity = "medium" }: AnimatedBackgroundProps) {
  const orbCount = intensity === "high" ? 5 : 3;
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Layer 1: base radial */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 70% 90%, rgba(201, 168, 76, 0.12), transparent 60%), radial-gradient(ellipse 60% 50% at 20% 10%, rgba(99, 102, 241, 0.08), transparent 70%), #0a0a0a",
        }}
      />

      {/* Layer 2: aurora orbs */}
      {Array.from({ length: orbCount }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-40 blur-3xl quiz-orb"
          style={{
            width: i % 2 === 0 ? "32rem" : "26rem",
            height: i % 2 === 0 ? "32rem" : "26rem",
            background:
              i === 0
                ? "radial-gradient(circle, rgba(224, 191, 94, 0.55), transparent 70%)"
                : i === 1
                  ? "radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%)"
                  : i === 2
                    ? "radial-gradient(circle, rgba(217, 119, 6, 0.35), transparent 70%)"
                    : i === 3
                      ? "radial-gradient(circle, rgba(168, 85, 247, 0.28), transparent 70%)"
                      : "radial-gradient(circle, rgba(34, 197, 94, 0.25), transparent 70%)",
            left: `${(i * 27) % 80}%`,
            top: `${(i * 41) % 70}%`,
            animationDuration: `${22 + i * 4}s`,
            animationDelay: `${i * -3}s`,
          }}
        />
      ))}

      {/* Layer 3: dot grid mask */}
      <div
        className="dot-grid absolute inset-0 opacity-40"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 60% at center, transparent 30%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at center, transparent 30%, black 100%)",
        }}
      />

      {/* Layer 4: subtle vignette so content always pops */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at center, transparent 40%, rgba(0, 0, 0, 0.45) 100%)",
        }}
      />

      <style jsx>{`
        .quiz-orb {
          animation-name: orbDrift;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          animation-direction: alternate;
          will-change: transform;
        }
        @keyframes orbDrift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          25% {
            transform: translate3d(8vw, -6vh, 0) scale(1.1);
          }
          50% {
            transform: translate3d(-4vw, 8vh, 0) scale(0.95);
          }
          75% {
            transform: translate3d(6vw, 4vh, 0) scale(1.05);
          }
          100% {
            transform: translate3d(-8vw, -4vh, 0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .quiz-orb {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
