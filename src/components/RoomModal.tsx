"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Room } from "@/lib/rooms";
import type { OutreachRow, OutreachStats } from "@/lib/queries";
import { OutreachPanel } from "./rooms/OutreachPanel";

interface RoomModalProps {
  room: Room | null;
  onClose: () => void;
  outreachData?: {
    list: OutreachRow[];
    stats: OutreachStats;
  };
  onSendAnimation?: () => void;
}

export function RoomModal({
  room,
  onClose,
  outreachData,
  onSendAnimation,
}: RoomModalProps) {
  return (
    <AnimatePresence>
      {room && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 10, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="scrollbar-thin relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gold/30 bg-bg-elevated p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-dim transition-colors hover:border-gold/50 hover:text-text"
              aria-label="Zatvori"
            >
              <X size={16} />
            </button>

            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-3xl">
                {room.emoji}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                  Room · Floor {room.floor}
                </div>
                <h2 className="text-2xl font-semibold text-text">
                  {room.name}
                </h2>
                <p className="text-sm text-text-dim">{room.tagline}</p>
              </div>
            </div>

            {room.id === "outreach" && outreachData ? (
              <OutreachPanel
                initialList={outreachData.list}
                initialStats={outreachData.stats}
                onSendAnimation={onSendAnimation}
              />
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-border bg-bg-card/60 p-6 text-center">
                <p className="text-sm text-text-dim">
                  Soba dolazi uskoro — gradimo room-by-room.
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  Sljedeće na redu prema build planu.
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
