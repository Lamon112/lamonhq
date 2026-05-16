"use client";

/**
 * SideHustle Runner — Chrome dinosaur-style mini game shown while AI
 * generates the user's plan (~45s wait).
 *
 * Per Leonardov 2026-05-15 feedback: "ajmo napraviti neku mini igricu
 * koju mogu igrati dokle čekaju rezultat".
 *
 * Theme on-brand for SideHustle™:
 *   - Player: 🧑‍💻 hustle character (solid block w/ gold accent)
 *   - Collect: € coins (+5 each)
 *   - Avoid: distraction obstacles labeled with the universal side
 *     hustle killers (DOOMSCROLL, NETFLIX, COUCH, LAZINESS, EXCUSE)
 *   - Speed ramps every 10 obstacles
 *   - Game over → tap/space to restart, score persists across runs
 *
 * Controls:
 *   - Space / Arrow Up / Tap canvas → jump
 *   - Auto-restart on game over after 1s tap
 *
 * No asset deps — pure canvas drawing. Self-contained, no external
 * dependencies beyond React + the quiz design tokens.
 */

import { useEffect, useRef, useState } from "react";

const CANVAS_W = 720;
const CANVAS_H = 220;
const GROUND_Y = 180;
const GRAVITY = 0.7;
const JUMP_VELOCITY = -13;
const PLAYER_X = 70;
const PLAYER_W = 36;
const PLAYER_H = 44;
const OBSTACLE_W = 28;
const OBSTACLE_H_MIN = 32;
const OBSTACLE_H_MAX = 56;
const COIN_R = 12;

type ObstacleLabel = "DOOMSCROLL" | "NETFLIX" | "LAZINESS" | "EXCUSE" | "COUCH" | "TIKTOK";
const LABELS: ObstacleLabel[] = ["DOOMSCROLL", "NETFLIX", "LAZINESS", "EXCUSE", "COUCH", "TIKTOK"];

interface Obstacle {
  x: number;
  width: number;
  height: number;
  label: ObstacleLabel;
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export function SideHustleRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  // Mutable game state in refs so the rAF loop sees fresh values without
  // re-binding. React state is only used for HUD render.
  const stateRef = useRef({
    playerY: GROUND_Y - PLAYER_H,
    playerVY: 0,
    isJumping: false,
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    speed: 6,
    distance: 0,
    score: 0,
    nextSpawnTick: 60,
    tick: 0,
    over: false,
  });

  function resetGame() {
    stateRef.current = {
      playerY: GROUND_Y - PLAYER_H,
      playerVY: 0,
      isJumping: false,
      obstacles: [],
      coins: [],
      speed: 6,
      distance: 0,
      score: 0,
      nextSpawnTick: 60,
      tick: 0,
      over: false,
    };
    setScore(0);
    setGameOver(false);
    setStarted(true);
  }

  function jump() {
    const s = stateRef.current;
    if (s.over) {
      resetGame();
      return;
    }
    if (!started) {
      setStarted(true);
      return;
    }
    if (!s.isJumping) {
      s.playerVY = JUMP_VELOCITY;
      s.isJumping = true;
    }
  }

  // Keyboard + tap handlers
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Best score persistence in localStorage
  useEffect(() => {
    const saved = parseInt(localStorage.getItem("sh_runner_best") ?? "0", 10);
    if (!isNaN(saved)) setBestScore(saved);
  }, []);
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      localStorage.setItem("sh_runner_best", String(score));
    }
  }, [score, bestScore]);

  // Main game loop
  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxNullable = canvas.getContext("2d");
    if (!ctxNullable) return;
    // Capture as non-null so the closure inside tick() doesn't lose narrowing
    const ctx: CanvasRenderingContext2D = ctxNullable;

    function tick() {
      const s = stateRef.current;
      if (s.over) return;
      s.tick += 1;
      s.distance += s.speed;

      // Difficulty ramp — speed up every 600 distance
      if (s.distance > 0 && s.distance % 600 < s.speed) {
        s.speed = Math.min(13, s.speed + 0.5);
      }

      // Player physics
      s.playerVY += GRAVITY;
      s.playerY += s.playerVY;
      if (s.playerY >= GROUND_Y - PLAYER_H) {
        s.playerY = GROUND_Y - PLAYER_H;
        s.playerVY = 0;
        s.isJumping = false;
      }

      // Spawn obstacles
      if (s.tick >= s.nextSpawnTick) {
        const willCoin = Math.random() < 0.55;
        if (willCoin) {
          // Coin spawned at jump height so player must time it
          const yLevel = GROUND_Y - 60 - Math.random() * 50;
          s.coins.push({ x: CANVAS_W + 30, y: yLevel, collected: false });
        }
        const obstacle: Obstacle = {
          x: CANVAS_W + 30,
          width: OBSTACLE_W + Math.random() * 20,
          height: OBSTACLE_H_MIN + Math.random() * (OBSTACLE_H_MAX - OBSTACLE_H_MIN),
          label: LABELS[Math.floor(Math.random() * LABELS.length)],
          passed: false,
        };
        s.obstacles.push(obstacle);
        // Next spawn — adaptive to speed (faster game = denser spawns)
        s.nextSpawnTick = s.tick + 50 + Math.random() * 40 - s.speed * 2;
      }

      // Move obstacles + coins, prune off-screen
      for (const o of s.obstacles) o.x -= s.speed;
      for (const c of s.coins) c.x -= s.speed;
      s.obstacles = s.obstacles.filter((o) => o.x + o.width > -10);
      s.coins = s.coins.filter((c) => c.x + COIN_R > -10);

      // Collision detection — player AABB vs obstacle AABB
      const playerLeft = PLAYER_X;
      const playerRight = PLAYER_X + PLAYER_W;
      const playerTop = s.playerY;
      const playerBottom = s.playerY + PLAYER_H;
      for (const o of s.obstacles) {
        const oTop = GROUND_Y - o.height;
        const oBottom = GROUND_Y;
        if (
          playerRight > o.x &&
          playerLeft < o.x + o.width &&
          playerBottom > oTop &&
          playerTop < oBottom
        ) {
          s.over = true;
          setGameOver(true);
          return;
        }
        if (!o.passed && o.x + o.width < PLAYER_X) {
          o.passed = true;
          s.score += 1;
          setScore(s.score);
        }
      }

      // Coin collection
      for (const c of s.coins) {
        if (c.collected) continue;
        const dx = c.x - (PLAYER_X + PLAYER_W / 2);
        const dy = c.y - (s.playerY + PLAYER_H / 2);
        if (Math.sqrt(dx * dx + dy * dy) < COIN_R + PLAYER_W / 2 - 4) {
          c.collected = true;
          s.score += 5;
          setScore(s.score);
        }
      }

      // ── Render ──
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background — subtle gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bgGrad.addColorStop(0, "#141414");
      bgGrad.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Parallax dots scrolling backward
      ctx.fillStyle = "rgba(201, 168, 76, 0.12)";
      for (let i = 0; i < 25; i++) {
        const x = ((i * 73 - s.distance * 0.4) % (CANVAS_W + 50) + CANVAS_W + 50) % (CANVAS_W + 50) - 25;
        const y = (i * 37) % (GROUND_Y - 30);
        ctx.fillRect(x, y, 2, 2);
      }

      // Ground line
      ctx.strokeStyle = "rgba(201, 168, 76, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_W, GROUND_Y);
      ctx.stroke();

      // Ground tick marks scrolling
      ctx.strokeStyle = "rgba(201, 168, 76, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const x = ((i * 80 - s.distance) % (CANVAS_W + 80) + CANVAS_W + 80) % (CANVAS_W + 80);
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 2);
        ctx.lineTo(x, GROUND_Y + 8);
        ctx.stroke();
      }

      // Player — gold-accented hustle character
      const px = PLAYER_X;
      const py = s.playerY;
      // body
      ctx.fillStyle = "#e0bf5e";
      ctx.fillRect(px, py + 12, PLAYER_W, PLAYER_H - 12);
      // head
      ctx.fillStyle = "#f5efdc";
      ctx.beginPath();
      ctx.arc(px + PLAYER_W / 2, py + 8, 10, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(px + PLAYER_W / 2 + 2, py + 6, 3, 3);
      // shadow when jumping
      if (s.isJumping) {
        const shadowAlpha = Math.max(0, 1 - (GROUND_Y - PLAYER_H - py) / 80);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * shadowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(px + PLAYER_W / 2, GROUND_Y, PLAYER_W / 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Obstacles
      for (const o of s.obstacles) {
        const oTop = GROUND_Y - o.height;
        // body — danger red gradient
        const grad = ctx.createLinearGradient(o.x, oTop, o.x, GROUND_Y);
        grad.addColorStop(0, "#e04545");
        grad.addColorStop(1, "#7a1f1f");
        ctx.fillStyle = grad;
        ctx.fillRect(o.x, oTop, o.width, o.height);
        // border
        ctx.strokeStyle = "rgba(224, 69, 69, 0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(o.x, oTop, o.width, o.height);
        // label vertical
        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.save();
        ctx.translate(o.x + o.width / 2, oTop + o.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.label, 0, 0);
        ctx.restore();
      }

      // Coins
      for (const c of s.coins) {
        if (c.collected) continue;
        // pulsing glow
        const glowR = COIN_R + 4 + Math.sin(s.tick * 0.15) * 2;
        ctx.fillStyle = "rgba(224, 191, 94, 0.25)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2);
        ctx.fill();
        // coin body
        ctx.fillStyle = "#e0bf5e";
        ctx.beginPath();
        ctx.arc(c.x, c.y, COIN_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#8b7530";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // € symbol
        ctx.fillStyle = "#0a0a0a";
        ctx.font = "bold 13px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("€", c.x, c.y + 1);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [started]);

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-baseline justify-between px-1 pb-1.5 text-xs">
        <span className="font-semibold text-gold">SideHustle Runner™</span>
        <div className="flex gap-4 font-mono">
          <span className="text-text-dim">
            Score: <span className="font-bold text-gold-bright tabular-nums">{score}</span>
          </span>
          <span className="text-text-dim">
            Best: <span className="font-bold text-text tabular-nums">{bestScore}</span>
          </span>
        </div>
      </div>

      <div
        className="relative cursor-pointer overflow-hidden rounded-xl border border-gold/30 shadow-2xl shadow-gold/10"
        onClick={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />

        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/85 backdrop-blur-sm">
            <p className="mb-2 text-2xl font-bold">SideHustle Runner™</p>
            <p className="mb-4 max-w-md px-6 text-center text-xs text-text-dim">
              Skupi <span className="font-bold text-gold">€</span> coins · izbjegni distrakcije
              <br />
              <span className="text-text-muted">(NETFLIX, COUCH, DOOMSCROLL...)</span>
            </p>
            <button
              onClick={jump}
              className="rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-bg transition hover:bg-gold-bright"
            >
              Tap / Space za skok
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/90 backdrop-blur-sm">
            <p className="text-3xl font-bold text-danger">Game Over</p>
            <p className="mt-1 text-base text-text">
              Score: <span className="font-bold text-gold-bright">{score}</span>
              {score === bestScore && score > 0 && (
                <span className="ml-2 rounded bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">
                  NOVI REKORD
                </span>
              )}
            </p>
            <button
              onClick={resetGame}
              className="mt-3 rounded-full bg-gold px-5 py-2 text-xs font-bold text-bg transition hover:bg-gold-bright"
            >
              Tap / Space za retry
            </button>
          </div>
        )}
      </div>

      <p className="mt-2 text-center text-[10px] text-text-muted">
        Kontrole: Space ili tap. Coin = +5 · Preskočena prepreka = +1.
      </p>
    </div>
  );
}
