"use client";

import { useState } from "react";
import { Floor } from "./Floor";
import { RoomModal } from "./RoomModal";
import { FLOORS, type Room } from "@/lib/rooms";

export function Building() {
  const [selected, setSelected] = useState<Room | null>(null);

  return (
    <main className="dot-grid relative flex-1">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 lg:px-8 lg:py-10">
        {FLOORS.map((floor, i) => (
          <Floor
            key={floor.id}
            floor={floor}
            floorIndex={i}
            onRoomClick={setSelected}
          />
        ))}
      </div>
      <RoomModal room={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
