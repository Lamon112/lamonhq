"use client";

import { motion } from "framer-motion";
import type { Room as RoomType } from "@/lib/rooms";

interface RoomProps {
  room: RoomType;
  index: number;
  onClick: (room: RoomType) => void;
}

export function Room({ room, index, onClick }: RoomProps) {
  const Icon = room.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 * index, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onClick(room)}
      className="group relative flex h-full min-h-[150px] flex-col justify-between overflow-hidden rounded-xl border border-border bg-bg-card p-4 text-left transition-colors duration-200 hover:border-gold/70 hover:bg-bg-elevated focus:outline-none focus:ring-2 focus:ring-gold/50"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(201,168,76,0.10), transparent 60%)",
        }}
      />

      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold transition-colors group-hover:border-gold group-hover:text-gold-bright">
          <Icon size={20} />
        </div>
        <span className="text-2xl opacity-60 transition-opacity group-hover:opacity-100">
          {room.emoji}
        </span>
      </div>

      <div className="relative space-y-1">
        <h3 className="text-base font-semibold leading-tight text-text">
          {room.name}
        </h3>
        <p className="text-xs leading-snug text-text-dim">{room.tagline}</p>
      </div>

      <div className="relative mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] uppercase tracking-wider">
        <span className="text-text-muted">Klikni za detalje</span>
        <span className="text-gold/0 transition-colors group-hover:text-gold">
          →
        </span>
      </div>
    </motion.button>
  );
}
