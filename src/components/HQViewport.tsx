"use client";

import { useEffect, useState } from "react";
import { Building as ClassicBuilding, BoxSelect, Eye, EyeOff } from "lucide-react";
import { Building } from "./Building";
import { type RoomData } from "./RoomModal";
import { Vault } from "./vault/Vault";

type ViewMode = "classic" | "vault";

const STORAGE_KEY = "lamon-hq:view-mode";
const PANELS_KEY = "lamon-hq:vault-show-panels";

export function HQViewport({ data }: { data: RoomData }) {
  const [view, setView] = useState<ViewMode>("classic");
  const [showPanelsInVault, setShowPanelsInVault] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore last preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "vault" || saved === "classic") setView(saved);
      const panels = localStorage.getItem(PANELS_KEY);
      if (panels === "1") setShowPanelsInVault(true);
    } catch {
      /* ignore SSR / privacy mode */
    }
    setHydrated(true);
  }, []);

  // Mirror view mode + peek state onto <body> so siblings (floating
  // panels) can hide via CSS without knowing the viewport state.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const hidePanels = view === "vault" && !showPanelsInVault;
    document.body.dataset.viewMode = hidePanels ? "vault" : "classic";
    return () => {
      delete document.body.dataset.viewMode;
    };
  }, [view, showPanelsInVault]);

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

  function toggleView() {
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

  function togglePanels() {
    setShowPanelsInVault((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(PANELS_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <>
      <ViewControls
        view={view}
        showPanels={showPanelsInVault}
        onToggleView={toggleView}
        onTogglePanels={togglePanels}
        hidden={!hydrated}
      />
      {view === "classic" ? <Building data={data} /> : <Vault data={data} />}
    </>
  );
}

function ViewControls({
  view,
  showPanels,
  onToggleView,
  onTogglePanels,
  hidden,
}: {
  view: ViewMode;
  showPanels: boolean;
  onToggleView: () => void;
  onTogglePanels: () => void;
  hidden: boolean;
}) {
  if (hidden) return null;
  const isVault = view === "vault";
  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
      {/* Show/hide panels toggle — only visible in vault mode */}
      {isVault && (
        <button
          type="button"
          onClick={onTogglePanels}
          title={showPanels ? "Sakrij action panele" : "Prikaži action panele"}
          className={
            "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur-md transition-colors " +
            (showPanels
              ? "border-emerald-500/60 bg-black/70 text-emerald-200 hover:border-emerald-400"
              : "border-amber-500/40 bg-black/70 text-amber-200/70 hover:border-amber-400 hover:text-amber-200")
          }
        >
          {showPanels ? <EyeOff size={12} /> : <Eye size={12} />}
          <span>{showPanels ? "Hide panels" : "Show panels"}</span>
        </button>
      )}

      {/* View toggle */}
      <button
        type="button"
        onClick={onToggleView}
        title={`Switch to ${isVault ? "Classic" : "Vault"} view (Alt+V)`}
        className={
          "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur-md transition-colors " +
          (isVault
            ? "border-amber-500/60 bg-black/70 text-amber-200 hover:border-amber-400 hover:bg-black/90"
            : "border-border bg-bg-elevated/80 text-text-muted hover:border-gold/50 hover:text-gold")
        }
      >
        {isVault ? (
          <>
            <ClassicBuilding size={13} />
            <span>Exit Vault</span>
          </>
        ) : (
          <>
            <BoxSelect size={13} />
            <span>Enter Vault</span>
          </>
        )}
      </button>
    </div>
  );
}
