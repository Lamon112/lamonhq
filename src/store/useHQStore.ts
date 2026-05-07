import { create } from "zustand";
import type { RoomId } from "@/lib/rooms";

interface HQState {
  selectedRoom: RoomId | null;
  setSelectedRoom: (id: RoomId | null) => void;
}

export const useHQStore = create<HQState>((set) => ({
  selectedRoom: null,
  setSelectedRoom: (id) => set({ selectedRoom: id }),
}));
