"use client";

import { useEffect, useState } from "react";
import { Floor } from "./Floor";
import { RoomModal, type RoomData } from "./RoomModal";
import { EnvelopeFly } from "./EnvelopeFly";
import { MoneyFly } from "./MoneyFly";
import { ALL_ROOMS, FLOORS, type Room, type RoomId } from "@/lib/rooms";

interface BuildingProps {
  data: RoomData;
}

export function Building({ data }: BuildingProps) {
  const [selected, setSelected] = useState<Room | null>(null);
  const [envelopeTrigger, setEnvelopeTrigger] = useState(0);
  const [moneyTrigger, setMoneyTrigger] = useState(0);

  useEffect(() => {
    function onOpen(e: Event) {
      const detail = (e as CustomEvent<{ roomId: RoomId }>).detail;
      const room = ALL_ROOMS.find((r) => r.id === detail?.roomId);
      if (room) setSelected(room);
    }
    window.addEventListener("hq:open-room", onOpen);
    return () => window.removeEventListener("hq:open-room", onOpen);
  }, []);

  return (
    <main className="dot-grid relative flex-1">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
        <div className="relative overflow-hidden rounded-2xl border border-border-strong bg-bg/60">
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-px bg-gradient-to-b from-gold/0 via-gold/30 to-gold/0 lg:block"
            style={{ left: "calc(100% / 3 * 2 - 2px)" }}
          />
          <div className="relative">
            {FLOORS.map((floor, i) => (
              <Floor
                key={floor.id}
                floor={floor}
                floorIndex={i}
                isLast={i === FLOORS.length - 1}
                onRoomClick={setSelected}
              />
            ))}
          </div>
        </div>
      </div>

      <RoomModal
        room={selected}
        data={data}
        onClose={() => setSelected(null)}
        onSendAnimation={() => setEnvelopeTrigger((n) => n + 1)}
        onWonAnimation={() => setMoneyTrigger((n) => n + 1)}
      />
      <EnvelopeFly trigger={envelopeTrigger} />
      <MoneyFly trigger={moneyTrigger} />
    </main>
  );
}
