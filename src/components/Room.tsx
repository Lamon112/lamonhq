"use client";

import { motion } from "framer-motion";
import type { Room as RoomType } from "@/lib/rooms";
import { RoomScene } from "./RoomScene";

interface RoomProps {
  room: RoomType;
  index: number;
  isLastInRow: boolean;
  onClick: (room: RoomType) => void;
}

export function Room({ room, index, isLastInRow, onClick }: RoomProps) {
  const Icon = room.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.06 * index, ease: "easeOut" }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onClick(room)}
      className={
        "group relative flex h-full min-h-[170px] flex-col justify-between overflow-hidden bg-bg-card/40 p-4 text-left transition-colors duration-200 hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-gold/40 focus:ring-inset " +
        (isLastInRow ? "" : "sm:border-r sm:border-border-strong")
      }
    >
      {/* Room scene (decorative props + character) */}
      <RoomScene roomId={room.id} />

      {/* Hover gold gradient */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(201,168,76,0.10), transparent 60%)",
        }}
      />

      {/* Hover gold border (inset, doesn't affect layout) */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-gold/0 transition-all duration-200 group-hover:ring-gold/60" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:border-gold group-hover:text-gold-bright">
          <Icon size={18} />
        </div>
      </div>

      <div className="relative space-y-0.5">
        <h3 className="text-sm font-semibold leading-tight text-text">
          {room.name}
        </h3>
        <p className="text-[11px] leading-snug text-text-dim">{room.tagline}</p>
      </div>

      <div className="relative mt-2 flex items-center justify-between border-t border-border/60 pt-1.5 text-[10px] uppercase tracking-wider">
        <span className="text-text-muted group-hover:text-text-dim">
          Open →
        </span>
        <span className="text-gold/0 transition-colors group-hover:text-gold">
          {room.emoji}
        </span>
      </div>
    </motion.button>
  );
}
