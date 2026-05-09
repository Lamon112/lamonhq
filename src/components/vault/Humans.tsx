"use client";

/**
 * Reusable humanoid figures + workstations for vault rooms.
 *
 *   <HumanFigure>       basic standing pixel humanoid
 *   <PhoneStation>      standing humanoid + phone to ear + desk + rotary phone + cord
 *   <LaptopStation>     seated humanoid + desk + glowing laptop + (optional) coffee mug
 *   <BankerWindow>      banker behind brass grille + cash counter + cash stack
 *   <PointingFigure>    standing humanoid with one arm extended (gesture pose)
 *   <CameraOperator>    standing humanoid behind a tripod camera (one eye to viewfinder)
 *   <SmithAtAnvil>      humanoid swinging hammer down on anvil (with motion arc)
 *
 * All pure CSS / SVG — no asset files. Suit color drives the palette.
 */

interface HumanProps {
  suit?: string;
  skin?: string;
  scale?: number;
}

/** Pure standing pixel humanoid (12px wide × 22px tall). */
export function HumanFigure({
  suit = "fill-amber-500",
  skin = "fill-orange-200",
  scale = 1,
}: HumanProps) {
  return (
    <svg
      width={14 * scale}
      height={22 * scale}
      viewBox="0 0 14 22"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
    >
      <rect className={skin} x="4" y="0" width="6" height="6" />
      <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
      <rect className="fill-white/10" x="4" y="2" width="2" height="4" />
      <rect className={suit} x="3" y="6" width="8" height="8" />
      <rect className="fill-white/15" x="3" y="6" width="1" height="7" />
      <rect className="fill-black/25" x="10" y="6" width="1" height="7" />
      <rect className="fill-stone-900" x="3" y="13" width="8" height="1" />
      <rect className="fill-stone-800" x="4" y="14" width="2" height="6" />
      <rect className="fill-stone-800" x="8" y="14" width="2" height="6" />
      <rect className="fill-black" x="3" y="20" width="3" height="2" />
      <rect className="fill-black" x="8" y="20" width="3" height="2" />
    </svg>
  );
}

/**
 * Phone station — standing humanoid with phone held to ear, in front
 * of a small desk with a rotary phone + tangled cord.
 */
interface PhoneStationProps {
  /** Absolute left in px relative to parent */
  left: number;
  /** Absolute bottom in px */
  bottom?: number;
  suit?: string;
  skin?: string;
  /** "left" or "right" — which side the phone arm sticks out */
  arm?: "left" | "right";
}
export function PhoneStation({
  left,
  bottom = 4,
  suit = "fill-amber-400",
  skin = "fill-orange-200",
  arm = "right",
}: PhoneStationProps) {
  const armRight = arm === "right";
  return (
    <div
      className="absolute z-10"
      style={{ left, bottom, width: 18 }}
    >
      {/* Desk */}
      <div className="absolute bottom-0 left-1/2 h-2 w-5 -translate-x-1/2 rounded-sm border-t border-amber-900/80 bg-gradient-to-b from-amber-800 to-amber-950 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />
      {/* Rotary phone on desk */}
      <div className="absolute bottom-1.5 left-1/2 h-1 w-2 -translate-x-1/2 rounded-sm bg-stone-900" />
      <div className="absolute bottom-2 left-1/2 h-px w-px -translate-x-1/2 rounded-full bg-stone-600" />

      {/* Standing humanoid (behind/above desk) */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}
      >
        <svg width="14" height="22" viewBox="0 0 14 22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          {/* head */}
          <rect className={skin} x="4" y="0" width="6" height="6" />
          <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
          <rect className="fill-white/10" x="4" y="2" width="2" height="4" />
          {/* body */}
          <rect className={suit} x="3" y="6" width="8" height="8" />
          <rect className="fill-white/15" x="3" y="6" width="1" height="7" />
          <rect className="fill-black/25" x="10" y="6" width="1" height="7" />
          {/* belt */}
          <rect className="fill-stone-900" x="3" y="13" width="8" height="1" />
          {/* legs (mostly hidden by desk) */}
          <rect className="fill-stone-800" x="4" y="14" width="2" height="4" />
          <rect className="fill-stone-800" x="8" y="14" width="2" height="4" />
          {/* RAISED ARM holding phone to ear */}
          {armRight ? (
            <>
              {/* upper arm */}
              <rect className={suit} x="10" y="6" width="2" height="2" />
              {/* forearm bent up to ear */}
              <rect className={suit} x="11" y="3" width="2" height="3" />
              {/* phone receiver (curved black) at ear */}
              <rect className="fill-stone-900" x="9" y="1" width="3" height="2" />
              <rect className="fill-stone-700" x="9" y="0" width="3" height="1" />
            </>
          ) : (
            <>
              <rect className={suit} x="2" y="6" width="2" height="2" />
              <rect className={suit} x="1" y="3" width="2" height="3" />
              <rect className="fill-stone-900" x="2" y="1" width="3" height="2" />
              <rect className="fill-stone-700" x="2" y="0" width="3" height="1" />
            </>
          )}
        </svg>
      </div>

      {/* Coiled cord from phone to receiver */}
      <svg
        viewBox="0 0 18 14"
        className="absolute bottom-2 left-0 h-3 w-full opacity-80"
        aria-hidden
      >
        <path
          d={
            armRight
              ? "M 9 12 Q 14 10 13 6 Q 12 4 14 3"
              : "M 9 12 Q 4 10 5 6 Q 6 4 4 3"
          }
          stroke="rgb(28 25 23)"
          strokeWidth="0.6"
          fill="none"
          strokeDasharray="0.7 0.5"
        />
      </svg>

      {/* Speech-burst indicator (active call) */}
      <div
        className="absolute -top-1 h-1 w-1 rounded-full bg-amber-300 shadow-[0_0_3px_rgba(252,211,77,0.95)]"
        style={{ left: armRight ? "70%" : "20%" }}
      />
    </div>
  );
}

/**
 * Laptop station — seated humanoid behind a desk with a glowing
 * laptop facing the viewer. Optional coffee mug for ambient.
 */
interface LaptopStationProps {
  left: number;
  bottom?: number;
  suit?: string;
  skin?: string;
  /** Color of the laptop screen content */
  screenColor?: "cyan" | "violet" | "emerald" | "amber" | "rose";
  /** Show steaming coffee mug next to laptop */
  withMug?: boolean;
}
export function LaptopStation({
  left,
  bottom = 4,
  suit = "fill-cyan-400",
  skin = "fill-orange-200",
  screenColor = "cyan",
  withMug = false,
}: LaptopStationProps) {
  const screenBg =
    screenColor === "violet"
      ? "from-violet-500/80 to-violet-900"
      : screenColor === "emerald"
      ? "from-emerald-400/80 to-emerald-900"
      : screenColor === "amber"
      ? "from-amber-400/80 to-amber-900"
      : screenColor === "rose"
      ? "from-rose-400/80 to-rose-900"
      : "from-cyan-400/80 to-cyan-900";
  const screenGlow =
    screenColor === "violet"
      ? "rgba(167,139,250,0.6)"
      : screenColor === "emerald"
      ? "rgba(16,185,129,0.6)"
      : screenColor === "amber"
      ? "rgba(252,211,77,0.6)"
      : screenColor === "rose"
      ? "rgba(244,63,94,0.6)"
      : "rgba(34,211,238,0.6)";

  return (
    <div
      className="absolute z-10"
      style={{ left, bottom, width: 22 }}
    >
      {/* Desk */}
      <div className="absolute bottom-0 left-1/2 h-2.5 w-6 -translate-x-1/2 rounded-sm border-t border-stone-700 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />

      {/* Standing/sitting humanoid behind desk (head + shoulders visible) */}
      <div
        className="absolute bottom-[0.55rem] left-1/2 -translate-x-1/2"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          {/* head */}
          <rect className={skin} x="4" y="0" width="6" height="6" />
          <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
          <rect className="fill-white/10" x="4" y="2" width="2" height="4" />
          {/* shoulders */}
          <rect className={suit} x="3" y="6" width="8" height="6" />
          <rect className="fill-white/15" x="3" y="6" width="1" height="6" />
          <rect className="fill-black/25" x="10" y="6" width="1" height="6" />
          {/* arms reaching forward to laptop (small bumps) */}
          <rect className={suit} x="2" y="9" width="2" height="3" />
          <rect className={suit} x="10" y="9" width="2" height="3" />
        </svg>
      </div>

      {/* Laptop on desk */}
      <div className="absolute bottom-0 left-1/2 h-2.5 w-5 -translate-x-1/2">
        {/* Open lid (screen) — facing viewer */}
        <div
          className={`absolute bottom-0.5 left-0 right-0 h-2 rounded-t border border-stone-600 bg-gradient-to-b ${screenBg} shadow-[inset_0_0_2px_${screenGlow}]`}
          style={{ boxShadow: `inset 0 0 3px ${screenGlow}, 0 0 4px ${screenGlow}` }}
        >
          {/* Fake content lines */}
          <div className="absolute top-px left-0.5 h-px w-2 bg-white/70" />
          <div className="absolute top-1 left-0.5 h-px w-3 bg-white/50" />
        </div>
        {/* Laptop base */}
        <div className="absolute bottom-0 left-0 right-0 h-px rounded-b bg-stone-300" />
      </div>

      {/* Optional coffee mug */}
      {withMug && (
        <>
          <div
            className="absolute bottom-1 h-1.5 w-1 rounded-b border border-stone-400 bg-amber-100"
            style={{ left: 0 }}
          />
          {/* Steam */}
          <div
            className="absolute bottom-2.5 h-2 w-px bg-gradient-to-t from-stone-300/50 to-transparent blur-[0.5px]"
            style={{ left: 1 }}
          />
        </>
      )}
    </div>
  );
}

/**
 * Banker window — humanoid behind brass-grille teller window with a
 * cash stack on the counter + cash-counting machine. For Treasury.
 */
interface BankerWindowProps {
  left: number;
  bottom?: number;
  suit?: string;
  skin?: string;
  /** Label above the window (e.g., "T-1") */
  label?: string;
}
export function BankerWindow({
  left,
  bottom = 4,
  suit = "fill-emerald-400",
  skin = "fill-orange-200",
  label,
}: BankerWindowProps) {
  return (
    <div className="absolute z-10" style={{ left, bottom, width: 22 }}>
      {/* Marble counter base */}
      <div className="absolute bottom-0 left-0 right-0 h-2 rounded-sm border-t border-emerald-800/80 bg-gradient-to-b from-emerald-950/90 to-stone-950 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.5)]" />

      {/* Banker humanoid (head + shoulders behind counter) */}
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
      >
        <svg width="14" height="12" viewBox="0 0 14 12" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect className={skin} x="4" y="0" width="6" height="6" />
          <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
          <rect className="fill-white/10" x="4" y="2" width="2" height="4" />
          <rect className={suit} x="3" y="6" width="8" height="6" />
          <rect className="fill-white/15" x="3" y="6" width="1" height="6" />
          <rect className="fill-black/25" x="10" y="6" width="1" height="6" />
          {/* Bow tie */}
          <rect className="fill-emerald-900" x="6" y="6" width="2" height="1" />
        </svg>
      </div>

      {/* Brass grille bars in front of banker */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-6 w-5 flex justify-around pointer-events-none">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-full w-px bg-gradient-to-b from-yellow-500 via-yellow-600 to-yellow-700 shadow-[0_0_1px_rgba(250,204,21,0.5)]"
          />
        ))}
        {/* Top arch bar */}
        <div className="absolute -top-px left-0 right-0 h-px bg-yellow-500" />
      </div>

      {/* Cash stack on counter (in front of grille) */}
      <div className="absolute bottom-1 left-0 h-1 w-3">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-emerald-500/90" />
        <div className="absolute bottom-px left-0 right-0 h-px bg-emerald-400/90" />
        <div className="absolute bottom-0.5 left-0 right-0 h-px bg-emerald-500/90" />
      </div>

      {/* Cash-counting machine on counter (right of cash) */}
      <div className="absolute bottom-1 right-0 h-1.5 w-2 rounded-sm border border-emerald-700 bg-stone-900 shadow-[inset_0_0_1px_rgba(16,185,129,0.5)]">
        <div className="absolute right-px top-px h-px w-1 bg-emerald-400/80" />
        <div className="absolute -bottom-0.5 left-0 right-0 h-px bg-emerald-400" />
      </div>

      {/* Window label sign above */}
      {label && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-sm border border-emerald-600 bg-emerald-900/90 px-px font-mono text-[4px] font-bold leading-none tracking-wider text-emerald-200 shadow-md">
          {label}
        </div>
      )}
    </div>
  );
}

/**
 * Pointing figure — humanoid with one arm extended (gesture pose).
 * Use for war-room strategists, directors, or anyone gesturing.
 */
interface PointingFigureProps {
  left: number;
  bottom?: number;
  suit?: string;
  skin?: string;
  /** Which side the arm points to */
  arm?: "left" | "right";
  scale?: number;
}
export function PointingFigure({
  left,
  bottom = 4,
  suit = "fill-violet-400",
  skin = "fill-orange-200",
  arm = "right",
  scale = 1,
}: PointingFigureProps) {
  const isRight = arm === "right";
  const w = 16 * scale;
  const h = 22 * scale;
  return (
    <div
      className="absolute z-10"
      style={{
        left,
        bottom,
        width: w,
        filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))",
      }}
    >
      <svg width={w} height={h} viewBox="0 0 16 22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {/* head */}
        <rect className={skin} x="5" y="0" width="6" height="6" />
        <rect className="fill-stone-900" x="5" y="0" width="6" height="2" />
        <rect className="fill-white/10" x="5" y="2" width="2" height="4" />
        {/* body */}
        <rect className={suit} x="4" y="6" width="8" height="8" />
        <rect className="fill-white/15" x="4" y="6" width="1" height="7" />
        <rect className="fill-black/25" x="11" y="6" width="1" height="7" />
        <rect className="fill-stone-900" x="4" y="13" width="8" height="1" />
        {/* legs */}
        <rect className="fill-stone-800" x="5" y="14" width="2" height="6" />
        <rect className="fill-stone-800" x="9" y="14" width="2" height="6" />
        <rect className="fill-black" x="4" y="20" width="3" height="2" />
        <rect className="fill-black" x="9" y="20" width="3" height="2" />
        {/* extended arm pointing */}
        {isRight ? (
          <>
            <rect className={suit} x="11" y="7" width="2" height="2" />
            <rect className={suit} x="13" y="8" width="2" height="2" />
            {/* Pointing finger */}
            <rect className={skin} x="15" y="8" width="1" height="1" />
          </>
        ) : (
          <>
            <rect className={suit} x="3" y="7" width="2" height="2" />
            <rect className={suit} x="1" y="8" width="2" height="2" />
            <rect className={skin} x="0" y="8" width="1" height="1" />
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * Camera operator — standing humanoid behind a tripod camera, one
 * eye to viewfinder. For Atlas studio.
 */
interface CameraOperatorProps {
  left: number;
  bottom?: number;
  suit?: string;
  skin?: string;
}
export function CameraOperator({
  left,
  bottom = 4,
  suit = "fill-rose-400",
  skin = "fill-orange-200",
}: CameraOperatorProps) {
  return (
    <div className="absolute z-10" style={{ left, bottom, width: 24 }}>
      {/* Tripod legs */}
      <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 bg-stone-700" />
      <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 origin-top -rotate-12 bg-stone-700" />
      <div className="absolute bottom-0 left-1/2 h-7 w-px -translate-x-1/2 origin-top rotate-12 bg-stone-700" />
      {/* Camera body */}
      <div className="absolute bottom-7 left-1 h-3 w-5 rounded border border-rose-700/80 bg-gradient-to-b from-stone-700 to-stone-900 shadow-[inset_0_0_2px_rgba(244,63,94,0.3)]">
        {/* Lens */}
        <div className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border border-rose-500 bg-stone-950 shadow-[inset_0_0_2px_rgba(244,63,94,0.5)]">
          <div className="absolute inset-0.5 rounded-full border border-stone-600" />
        </div>
        {/* Red REC light */}
        <div className="absolute left-1 top-1 h-px w-px rounded-full bg-rose-400 shadow-[0_0_3px_rgba(251,113,133,0.9)]" />
      </div>
      {/* Operator standing right of camera, looking through viewfinder */}
      <div
        className="absolute bottom-0 left-[1.1rem]"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))" }}
      >
        <svg width="14" height="22" viewBox="0 0 14 22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <rect className={skin} x="4" y="0" width="6" height="6" />
          <rect className="fill-stone-900" x="4" y="0" width="6" height="2" />
          <rect className={suit} x="3" y="6" width="8" height="8" />
          <rect className="fill-white/15" x="3" y="6" width="1" height="7" />
          <rect className="fill-black/25" x="10" y="6" width="1" height="7" />
          <rect className="fill-stone-900" x="3" y="13" width="8" height="1" />
          <rect className="fill-stone-800" x="4" y="14" width="2" height="6" />
          <rect className="fill-stone-800" x="8" y="14" width="2" height="6" />
          <rect className="fill-black" x="3" y="20" width="3" height="2" />
          <rect className="fill-black" x="8" y="20" width="3" height="2" />
          {/* Arms forward to camera */}
          <rect className={suit} x="2" y="7" width="2" height="3" />
          <rect className={suit} x="0" y="7" width="2" height="2" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Smith at anvil — humanoid mid-swing hammer down. For Forge.
 */
interface SmithAtAnvilProps {
  left: number;
  bottom?: number;
  suit?: string;
  skin?: string;
}
export function SmithAtAnvil({
  left,
  bottom = 4,
  suit = "fill-amber-700",
  skin = "fill-orange-300",
}: SmithAtAnvilProps) {
  return (
    <div className="absolute z-10" style={{ left, bottom, width: 22 }}>
      {/* Smith figure */}
      <div
        className="absolute bottom-0 left-0"
        style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.6))" }}
      >
        <svg width="14" height="22" viewBox="0 0 14 22" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          {/* head */}
          <rect className={skin} x="4" y="0" width="6" height="6" />
          {/* leather cap */}
          <rect className="fill-amber-950" x="4" y="0" width="6" height="2" />
          {/* leather apron over body */}
          <rect className={suit} x="3" y="6" width="8" height="8" />
          <rect className="fill-white/15" x="3" y="6" width="1" height="7" />
          <rect className="fill-black/30" x="10" y="6" width="1" height="7" />
          {/* belt */}
          <rect className="fill-stone-900" x="3" y="13" width="8" height="1" />
          {/* legs */}
          <rect className="fill-stone-800" x="4" y="14" width="2" height="6" />
          <rect className="fill-stone-800" x="8" y="14" width="2" height="6" />
          <rect className="fill-black" x="3" y="20" width="3" height="2" />
          <rect className="fill-black" x="8" y="20" width="3" height="2" />
          {/* Raised hammer arm */}
          <rect className={suit} x="11" y="4" width="2" height="3" />
          <rect className={suit} x="12" y="2" width="2" height="3" />
          {/* Hammer head */}
          <rect className="fill-stone-700" x="13" y="0" width="3" height="2" />
          <rect className="fill-stone-500" x="13" y="0" width="3" height="1" />
          {/* Hammer handle */}
          <rect className="fill-amber-900" x="14" y="2" width="1" height="2" />
        </svg>
      </div>
      {/* Motion arc (hammer swing trail) */}
      <svg
        viewBox="0 0 22 12"
        className="absolute bottom-[1rem] left-0 h-3 w-full opacity-50 pointer-events-none"
        aria-hidden
      >
        <path
          d="M 14 1 Q 18 4 16 8"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.4"
          fill="none"
          strokeDasharray="0.8 0.6"
        />
      </svg>
    </div>
  );
}
