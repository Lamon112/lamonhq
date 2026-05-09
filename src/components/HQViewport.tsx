"use client";

import { useEffect, useState } from "react";
import { Building as ClassicBuilding, BoxSelect } from "lucide-react";
import { Building } from "./Building";
import { type RoomData } from "./RoomModal";
import { Vault } from "./vault/Vault";

type ViewMode = "classic" | "vault";

const STORAGE_KEY = "lamon-hq:view-mode";

export function HQViewport({ data }: { data: RoomData }) {
  const [view, setView] = useState<ViewMode>("classic");
  const [hydrated, setHydrated] = useState(false);

  // Restore last preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "vault" || saved === "classic") setView(saved);
    } catch {
      /* ignore SSR / privacy mode */
    }
    setHydrated(true);
  }, []);

  // Mirror view mode onto <body> so siblings (floating panels) can hide
  // themselves via CSS without needing to know about the viewport state.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.dataset.viewMode = view;
    return () => {
      delete document.body.dataset.viewMode;
    };
  }, [view]);

  // Keyboard shortcut: Alt+V toggles
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        setView((prev) => {
          const next = prev === "classic" ? "vault" : "classic";
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            /* ignore */
          }
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggle() {
    setView((prev) => {
      const next = prev === "classic" ? "vault" : "classic";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <>
      <ViewSwitcher
        view={view}
        onToggle={toggle}
        // Avoid hydration flicker — render switcher only once preference loaded
        hidden={!hydrated}
      />
      {view === "classic" ? <Building data={data} /> : <Vault data={data} />}
    </>
  );
}

function ViewSwitcher({
  view,
  onToggle,
  hidden,
}: {
  view: ViewMode;
  onToggle: () => void;
  hidden: boolean;
}) {
  if (hidden) return null;
  const isVault = view === "vault";
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`Switch to ${isVault ? "Classic" : "Vault"} view (Alt+V)`}
      className={
        // Bottom-right floating chip — out of the way of stats / header
        "fixed bottom-4 right-4 z-40 " +
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur-md transition-colors " +
        (isVault
          ? "border-amber-500/60 bg-black/70 text-amber-200 hover:border-amber-400 hover:bg-black/90"
          : "border-border bg-bg-elevated/80 text-text-muted hover:border-gold/50 hover:text-gold")
      }
    >
      {isVault ? (
        <>
          <ClassicBuilding size={13} />
          <span>Exit Vault → Classic</span>
        </>
      ) : (
        <>
          <BoxSelect size={13} />
          <span>☢ Enter Vault</span>
        </>
      )}
    </button>
  );
}
