"use client";

import { motion } from "framer-motion";
import { Room } from "./Room";
import type { Floor as FloorType, Room as RoomType } from "@/lib/rooms";

interface FloorProps {
  floor: FloorType;
  floorIndex: number;
  onRoomClick: (room: RoomType) => void;
}

export function Floor({ floor, floorIndex, onRoomClick }: FloorProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: floorIndex * 0.12 }}
      className="relative"
    >
      <div className="mb-3 flex items-end justify-between border-b border-border-strong pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gold/40 bg-gold/10 font-mono text-sm font-bold text-gold">
            {floor.number}
          </div>
          <div className="leading-tight">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text">
              {floor.name}
            </h2>
            <p className="text-xs text-text-muted">{floor.subtitle}</p>
          </div>
        </div>
        <span className="hidden text-[10px] uppercase tracking-wider text-text-muted sm:block">
          Floor {floor.number} / 3
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {floor.rooms.map((room, i) => (
          <Room
            key={room.id}
            room={room}
            index={floorIndex * 3 + i}
            onClick={onRoomClick}
          />
        ))}
      </div>
    </motion.section>
  );
}
