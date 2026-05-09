"use client";

import { motion } from "framer-motion";
import { Room } from "./Room";
import type { Floor as FloorType, Room as RoomType, FloorId } from "@/lib/rooms";

interface FloorProps {
  floor: FloorType;
  floorIndex: number;
  isLast: boolean;
  onRoomClick: (room: RoomType) => void;
}

const FLOOR_AMBIENT: Record<FloorId, string> = {
  operations:
    "radial-gradient(ellipse at center, rgba(123, 182, 99, 0.04), transparent 70%)",
  intelligence:
    "radial-gradient(ellipse at center, rgba(120, 180, 240, 0.04), transparent 70%)",
  revenue:
    "radial-gradient(ellipse at center, rgba(201, 168, 76, 0.05), transparent 70%)",
};

export function Floor({ floor, floorIndex, isLast, onRoomClick }: FloorProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: floorIndex * 0.12 }}
      className="relative"
      style={{ background: FLOOR_AMBIENT[floor.id] }}
    >
      <div className="flex items-center justify-between border-b border-border-strong px-4 py-2 lg:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-gold/40 bg-gold/10 font-mono text-xs font-bold text-gold">
            {floor.number}
          </div>
          <div className="leading-tight">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text">
              {floor.name}
            </h2>
            <p className="text-[10px] text-text-muted">{floor.subtitle}</p>
          </div>
        </div>
        <span className="hidden text-[10px] uppercase tracking-wider text-text-muted sm:block">
          Floor {floor.number} / 3
        </span>
      </div>

      <div
        className={
          "grid grid-cols-1 sm:grid-cols-2 " +
          (floor.rooms.length === 4 ? "lg:grid-cols-4 " : "lg:grid-cols-3 ") +
          (isLast ? "" : "border-b border-border-strong")
        }
      >
        {floor.rooms.map((room, i) => (
          <Room
            key={room.id}
            room={room}
            index={floorIndex * 3 + i}
            isLastInRow={i === floor.rooms.length - 1}
            onClick={onRoomClick}
          />
        ))}
      </div>
    </motion.section>
  );
}
