"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { RoomData } from "../RoomModal";
import { vaultFloors, FLOOR_LABEL, type Agent, type AgentId } from "@/lib/vault";
import { VaultRoom } from "./VaultRoom";
import { RoomActionConsole } from "./RoomActionConsole";
import { ResearchResultDrawer } from "./ResearchResultDrawer";
import { RoomDataViewDrawer } from "./RoomDataViewDrawer";
import { RaidDefenseModal } from "./RaidDefenseModal";
import { createClient } from "@/lib/supabase/client";
import type { RoomDataViewKey } from "@/app/actions/roomDataView";
import {
  listActiveRaids,
  spawnRandomRaid,
  type ActiveRaid,
} from "@/app/actions/raids";
import type { RaidSeverity } from "@/lib/raids";
import { Swords, Dices } from "lucide-react";
import { AudioController } from "@/components/audio/AudioController";
import { playSfx } from "@/lib/audio/sfx";

interface VaultProps {
  data: RoomData;
}

interface ActiveJob {
  actionRowId: string;
  room: AgentId;
  progress: string | null;
  status: "queued" | "running" | "completed" | "failed";
}

/**
 * Cross-section side-view of the Lamon Vault — top-down floors with
 * agent rooms. Inspired by Fallout Shelter mobile, but rendered with
 * an Iron-Man steel-and-amber aesthetic so it sits comfortably on top
 * of our existing dark theme.
 *
 * Owns the click-to-research workflow:
 *   - Click a room  → open <RoomActionConsole>
 *   - Pick action   → triggerAgentResearch → ActiveJob added to state
 *   - Realtime sub  → live progress updates the room's animation banner
 *   - On complete   → drawer shows the result
 */
export function Vault({}: VaultProps) {
  const floors = vaultFloors();
  const [openRoom, setOpenRoom] = useState<Agent | null>(null);
  const [drawerActionId, setDrawerActionId] = useState<string | null>(null);
  const [dataView, setDataView] = useState<{ key: RoomDataViewKey; title: string } | null>(null);
  // active jobs keyed by room id → progress text (allows multiple rooms
  // to research in parallel, even though typically only 1 at a time)
  const [active, setActive] = useState<Record<AgentId, ActiveJob>>(
    {} as Record<AgentId, ActiveJob>,
  );
  // raids state — incoming/active threats keyed by id
  const [raids, setRaids] = useState<ActiveRaid[]>([]);
  const [raidModalOpen, setRaidModalOpen] = useState(false);
  const [raidFilterRoom, setRaidFilterRoom] = useState<string | null>(null);
  const [spawningRaid, setSpawningRaid] = useState(false);

  // === Subscribe to ALL agent_actions updates via Supabase Realtime ===
  // Two halves:
  //   1. Initial fetch — pull any currently-queued/running rows so the
  //      Vault overlay shows immediately when the user navigates back from
  //      HQ to Vault while a job is still in progress (Realtime only
  //      delivers FUTURE deltas, not the current state).
  //   2. Realtime subscription — pushes any UPDATE/INSERT to all clients.
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // ---- 1. Initial fetch of in-flight actions ----
    void supabase
      .from("agent_actions")
      .select("id, room, progress_text, status, created_at")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setActive((prev) => {
          const next = { ...prev };
          for (const row of data as Array<{
            id: string;
            room: AgentId;
            progress_text: string | null;
            status: "queued" | "running";
          }>) {
            // First (most recent) row per room wins — typical case is one
            // active action per room, but if there are stale rows we show
            // the newest.
            if (!next[row.room]) {
              next[row.room] = {
                actionRowId: row.id,
                room: row.room,
                progress: row.progress_text,
                status: row.status,
              };
            }
          }
          return next;
        });
      });

    // ---- 2. Subscribe for live updates ----
    const channel = supabase
      .channel("vault-agent-actions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_actions" },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | {
                id: string;
                room: AgentId;
                progress_text: string | null;
                status: "queued" | "running" | "completed" | "failed";
              }
            | undefined;
          if (!row) return;

          setActive((prev) => {
            const next = { ...prev };
            if (row.status === "completed" || row.status === "failed") {
              delete next[row.room];
              // If user left the drawer open on this row, the drawer's own
              // re-poll will pick up the result. Also auto-open drawer on
              // first completion if they haven't dismissed it.
              if (
                row.status === "completed" &&
                prev[row.room]?.actionRowId === row.id
              ) {
                setDrawerActionId(row.id);
              }
              return next;
            }
            next[row.room] = {
              actionRowId: row.id,
              room: row.room,
              progress: row.progress_text,
              status: row.status,
            };
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // === Subscribe to RAIDS table — push spawns + resolutions live ===
  useEffect(() => {
    let mounted = true;
    const seenIds = new Set<string>();
    listActiveRaids().then((rows) => {
      if (mounted) {
        setRaids(rows);
        rows.forEach((r) => seenIds.add(r.id));
      }
    });
    const supabase = createClient();
    const channel = supabase
      .channel("vault-raids")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raids" },
        () => {
          // Re-fetch on any change — keeps logic dead simple, single user app
          listActiveRaids().then((rows) => {
            if (!mounted) return;
            // Detect newly-arrived raids → play alarm SFX
            const fresh = rows.filter((r) => !seenIds.has(r.id));
            fresh.forEach((r) => {
              seenIds.add(r.id);
              playSfx(r.severity === "critical" ? "raid_critical" : "raid_incoming");
            });
            setRaids(rows);
          });
        },
      )
      .subscribe();
    // Refresh every 30s to expire countdowns + catch missed events
    const tick = setInterval(() => {
      listActiveRaids().then((rows) => {
        if (!mounted) return;
        const fresh = rows.filter((r) => !seenIds.has(r.id));
        fresh.forEach((r) => {
          seenIds.add(r.id);
          playSfx(r.severity === "critical" ? "raid_critical" : "raid_incoming");
        });
        setRaids(rows);
      });
    }, 30000);
    return () => {
      mounted = false;
      clearInterval(tick);
      supabase.removeChannel(channel);
    };
  }, []);

  // Per-room raid index (count + highest severity + raid list) for badges + visuals
  const raidsByRoom = useMemo(() => {
    const map = new Map<string, { count: number; highestSeverity: RaidSeverity; raids: ActiveRaid[] }>();
    const sevRank: Record<RaidSeverity, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    for (const r of raids) {
      const cur = map.get(r.target_room);
      if (!cur) {
        map.set(r.target_room, { count: 1, highestSeverity: r.severity, raids: [r] });
      } else {
        cur.count += 1;
        cur.raids.push(r);
        if (sevRank[r.severity] > sevRank[cur.highestSeverity]) {
          cur.highestSeverity = r.severity;
        }
      }
    }
    return map;
  }, [raids]);

  function openRaidModalForRoom(room: string | null) {
    setRaidFilterRoom(room);
    setRaidModalOpen(true);
  }

  async function handleSpawnTestRaid() {
    setSpawningRaid(true);
    playSfx("dice_roll");
    try {
      const res = await spawnRandomRaid();
      if (!res.ok) {
        console.error("[raids] spawnRandomRaid failed:", res.error);
        alert(`Raid spawn failed: ${res.error}`);
      }
      // Don't depend solely on Realtime — refetch immediately
      const fresh = await listActiveRaids();
      setRaids(fresh);
    } finally {
      setSpawningRaid(false);
    }
  }

  // Compute raid summary flags for AudioController
  const hasActiveRaid = raids.length > 0;
  const hasCriticalRaid = raids.some((r) => r.severity === "critical");

  function handleActionStarted(actionRowId: string, agentId: AgentId) {
    // Optimistic — the Realtime UPDATE will overwrite shortly
    setActive((prev) => ({
      ...prev,
      [agentId]: {
        actionRowId,
        room: agentId,
        progress: "Pokrećem AI istraživača…",
        status: "queued",
      },
    }));
  }

  return (
    <main className="vault-bg relative flex-1 overflow-hidden">
      {/* Dot-grid + scanlines background layer */}
      <div className="pointer-events-none absolute inset-0 vault-scanlines" />

      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-8 lg:px-8">
        {/* Minimal terminal banner — no logos, just nameplate */}
        <div className="mb-4 flex items-baseline justify-between border-b border-amber-700/30 pb-2 font-mono text-amber-300/80">
          <div className="text-[10px] uppercase tracking-[0.3em]">
            ▸ Lamon Vault · cross-section
          </div>
          <div className="hidden text-[10px] uppercase tracking-[0.2em] text-amber-400/50 sm:block">
            overseer · Leonardo Lamon
          </div>
        </div>

        {/* === RAIDS HUD — top banner above the vault hull === */}
        <RaidsHUD
          raidCount={raids.length}
          highestSeverity={
            raids.length === 0
              ? "low"
              : raids.reduce<RaidSeverity>((acc, r) => {
                  const rank = { low: 0, medium: 1, high: 2, critical: 3 } as const;
                  return rank[r.severity] > rank[acc] ? r.severity : acc;
                }, "low")
          }
          onOpen={() => openRaidModalForRoom(null)}
          onSpawnTest={handleSpawnTestRaid}
          spawning={spawningRaid}
          hasActiveRaid={hasActiveRaid}
          hasCriticalRaid={hasCriticalRaid}
        />

        {/* Steel ribcage container — vault hull */}
        <div className="relative rounded-2xl border-2 border-amber-500/40 bg-gradient-to-b from-zinc-950 via-stone-950 to-black shadow-[0_0_60px_rgba(245,158,11,0.08),inset_0_0_60px_rgba(0,0,0,0.6)]">
          {/* Rivets along the side */}
          <div className="pointer-events-none absolute inset-y-0 left-2 flex flex-col justify-around">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full border border-amber-700/60 bg-amber-900/30"
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex flex-col justify-around">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-1.5 w-1.5 rounded-full border border-amber-700/60 bg-amber-900/30"
              />
            ))}
          </div>

          <div className="px-6 py-5 lg:px-10 lg:py-8">
            {floors.map((floor, fi) => (
              <FloorRow
                key={floor.number}
                floorNumber={floor.number}
                rooms={floor.rooms}
                isLast={fi === floors.length - 1}
                index={fi}
                active={active}
                raidsByRoom={raidsByRoom}
                onRoomClick={(agent) => setOpenRoom(agent)}
                onRaidBadgeClick={(roomId) => openRaidModalForRoom(roomId)}
              />
            ))}
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-amber-500/30">
          ▸ Lamon Vault · Alt+V → Classic · klik na sobu = AI akcije
        </p>
      </div>

      {/* Action picker modal */}
      <RoomActionConsole
        agent={openRoom}
        onClose={() => setOpenRoom(null)}
        onActionStarted={handleActionStarted}
        onViewResult={(id) => {
          setOpenRoom(null);
          setDrawerActionId(id);
        }}
        onOpenDataView={(viewKey, title) => {
          setOpenRoom(null);
          setDataView({ key: viewKey as RoomDataViewKey, title });
        }}
      />

      {/* Result side drawer (research / pipeline runs) */}
      <ResearchResultDrawer
        actionRowId={drawerActionId}
        onClose={() => setDrawerActionId(null)}
      />

      {/* Data-view side drawer (instant dashboards) */}
      <RoomDataViewDrawer
        viewKey={dataView?.key ?? null}
        title={dataView?.title ?? null}
        onClose={() => setDataView(null)}
      />

      {/* Raid defense modal */}
      <RaidDefenseModal
        open={raidModalOpen}
        raids={raids}
        filterRoom={raidFilterRoom}
        onClose={() => setRaidModalOpen(false)}
        onAiActionSpawned={(rowId, room, title) => {
          // OPTIMISTIC: light up the target room IMMEDIATELY without
          // waiting for Inngest cold-start + agent_actions Realtime
          // broadcast (which can take 10-20s on Vercel cold start).
          // The Realtime sub will overwrite this with real progress
          // text the moment Inngest picks up the event.
          setActive((prev) => ({
            ...prev,
            [room as AgentId]: {
              actionRowId: rowId,
              room: room as AgentId,
              progress: `Pokrećem: ${title}`,
              status: "queued",
            },
          }));
        }}
        onAiActionOpenDrawer={(rowId) => {
          setRaidModalOpen(false);
          setDrawerActionId(rowId);
        }}
      />

      {/* Inline styles for vault textures (kept here so the global stylesheet
          stays clean — these only render in vault view) */}
      <style jsx>{`
        .vault-bg {
          background:
            radial-gradient(ellipse at top, rgba(245, 158, 11, 0.04), transparent 60%),
            radial-gradient(ellipse at bottom, rgba(220, 38, 38, 0.03), transparent 70%),
            #050505;
        }
        .vault-scanlines {
          background-image: repeating-linear-gradient(
            0deg,
            rgba(245, 158, 11, 0.025) 0,
            rgba(245, 158, 11, 0.025) 1px,
            transparent 1px,
            transparent 4px
          );
          mix-blend-mode: overlay;
        }
      `}</style>
    </main>
  );
}

function FloorRow({
  floorNumber,
  rooms,
  isLast,
  index,
  active,
  raidsByRoom,
  onRoomClick,
  onRaidBadgeClick,
}: {
  floorNumber: number;
  rooms: Agent[];
  isLast: boolean;
  index: number;
  active: Record<AgentId, ActiveJob>;
  raidsByRoom: Map<string, { count: number; highestSeverity: RaidSeverity; raids: ActiveRaid[] }>;
  onRoomClick: (agent: Agent) => void;
  onRaidBadgeClick: (roomId: string) => void;
}) {
  const label = FLOOR_LABEL[floorNumber] ?? `Floor ${floorNumber}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className={
        "relative " + (isLast ? "" : "border-b border-dashed border-amber-700/30 pb-5 mb-5")
      }
    >
      {/* Floor label badge — left side */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded border border-amber-500/40 bg-amber-500/10 font-mono text-[10px] font-bold text-amber-300">
          {floorNumber}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/70">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-amber-700/30 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const raidInfo = raidsByRoom.get(room.id);
          return (
            <VaultRoom
              key={room.id}
              agent={room}
              researchProgress={active[room.id]?.progress ?? null}
              raidCount={raidInfo?.count ?? 0}
              raidSeverity={raidInfo?.highestSeverity ?? null}
              raids={raidInfo?.raids ?? []}
              onRaidBadgeClick={() => {
                playSfx("click_metal");
                onRaidBadgeClick(room.id);
              }}
              onClick={(a) => {
                playSfx("room_open");
                onRoomClick(a);
              }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

// =====================================================================
// Raids HUD — top banner with active count + Test Spawn dev button
// =====================================================================

function RaidsHUD({
  raidCount,
  highestSeverity,
  onOpen,
  onSpawnTest,
  spawning,
  hasActiveRaid,
  hasCriticalRaid,
}: {
  raidCount: number;
  highestSeverity: RaidSeverity;
  onOpen: () => void;
  onSpawnTest: () => void;
  spawning: boolean;
  hasActiveRaid: boolean;
  hasCriticalRaid: boolean;
}) {
  const isHot = raidCount > 0;
  const sevColor: Record<RaidSeverity, string> = {
    low: "border-sky-500/60 bg-sky-950/40 text-sky-200",
    medium: "border-amber-500/60 bg-amber-950/40 text-amber-200",
    high: "border-orange-500/70 bg-orange-950/50 text-orange-200",
    critical: "border-rose-500/80 bg-rose-950/60 text-rose-100 animate-pulse",
  };
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button
        onClick={onOpen}
        className={
          "flex items-center gap-2 rounded-md border-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider shadow-md transition-all hover:scale-[1.02] " +
          (isHot
            ? sevColor[highestSeverity]
            : "border-stone-700 bg-stone-900/80 text-stone-400")
        }
      >
        <Swords size={13} />
        {isHot ? (
          <>
            <span className="font-bold">{raidCount}</span>
            <span>{raidCount === 1 ? "raid u tijeku" : "raida u tijeku"}</span>
            <span className="ml-2 rounded bg-black/30 px-1.5 py-0.5 text-[9px]">
              klikni za obranu
            </span>
          </>
        ) : (
          <>
            <span className="opacity-60">nema aktivnih prijetnji</span>
          </>
        )}
      </button>
      <button
        onClick={onSpawnTest}
        disabled={spawning}
        title="Spawn random test raid (dev)"
        className="flex items-center gap-1.5 rounded-md border border-amber-700/50 bg-amber-950/30 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-300/80 transition-colors hover:bg-amber-900/40 disabled:opacity-50"
      >
        <Dices size={12} className={spawning ? "animate-spin" : ""} />
        {spawning ? "spawning…" : "test spawn"}
      </button>
      <AudioController hasActiveRaid={hasActiveRaid} hasCriticalRaid={hasCriticalRaid} />
    </div>
  );
}
