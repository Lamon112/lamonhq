"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Room } from "@/lib/rooms";
import type {
  OutreachRow,
  OutreachStats,
  ClientRow,
  ClientsStats,
  LeadRow,
  LeadsStats,
  DiscoveryStats,
  DealsStats,
  ContentPostRow,
  ContentStats,
  CompetitorRow,
  CompetitorUpdateRow,
  CompetitorStats,
  TaskRow,
  TasksStats,
  WeeklyReportRow,
  ReportsStats,
} from "@/lib/queries";
import { OutreachPanel } from "./rooms/OutreachPanel";
import { ClientsPanel } from "./rooms/ClientsPanel";
import { LeadScorerPanel } from "./rooms/LeadScorerPanel";
import { DiscoveryPanel } from "./rooms/DiscoveryPanel";
import { ClosingPanel } from "./rooms/ClosingPanel";
import { AnalyticsPanel } from "./rooms/AnalyticsPanel";
import { CompetitorPanel } from "./rooms/CompetitorPanel";
import { CalendarPanel } from "./rooms/CalendarPanel";
import { ReportsPanel } from "./rooms/ReportsPanel";

export interface RoomData {
  outreach: { list: OutreachRow[]; stats: OutreachStats };
  clients: { list: ClientRow[]; stats: ClientsStats };
  leads: { list: LeadRow[]; stats: LeadsStats };
  discovery: { stats: DiscoveryStats };
  deals: { stats: DealsStats };
  content: { list: ContentPostRow[]; stats: ContentStats };
  competitor: {
    list: CompetitorRow[];
    updates: CompetitorUpdateRow[];
    stats: CompetitorStats;
  };
  tasks: { list: TaskRow[]; stats: TasksStats };
  reports: {
    list: WeeklyReportRow[];
    stats: ReportsStats;
    weekStart: string;
  };
}

interface RoomModalProps {
  room: Room | null;
  data: RoomData;
  onClose: () => void;
  onSendAnimation?: () => void;
  onWonAnimation?: () => void;
}

export function RoomModal({
  room,
  data,
  onClose,
  onSendAnimation,
  onWonAnimation,
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
            className="scrollbar-thin relative max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gold/30 bg-bg-elevated p-6 shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-elevated text-text-dim transition-colors hover:border-gold/50 hover:text-text"
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

            <RoomBody
              room={room}
              data={data}
              onSendAnimation={onSendAnimation}
              onWonAnimation={onWonAnimation}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RoomBody({
  room,
  data,
  onSendAnimation,
  onWonAnimation,
}: {
  room: Room;
  data: RoomData;
  onSendAnimation?: () => void;
  onWonAnimation?: () => void;
}) {
  switch (room.id) {
    case "outreach":
      return (
        <OutreachPanel
          initialList={data.outreach.list}
          initialStats={data.outreach.stats}
          onSendAnimation={onSendAnimation}
        />
      );
    case "clients":
      return (
        <ClientsPanel
          initialList={data.clients.list}
          initialStats={data.clients.stats}
        />
      );
    case "lead_scorer":
      return (
        <LeadScorerPanel
          initialList={data.leads.list}
          initialStats={data.leads.stats}
        />
      );
    case "discovery":
      return (
        <DiscoveryPanel
          initialList={data.leads.list}
          initialStats={data.discovery.stats}
        />
      );
    case "closing":
      return (
        <ClosingPanel
          initialList={data.leads.list}
          initialStats={data.deals.stats}
          onWonAnimation={onWonAnimation}
        />
      );
    case "analytics":
      return (
        <AnalyticsPanel
          initialList={data.content.list}
          initialStats={data.content.stats}
        />
      );
    case "competitor":
      return (
        <CompetitorPanel
          initialList={data.competitor.list}
          initialUpdates={data.competitor.updates}
          initialStats={data.competitor.stats}
        />
      );
    case "calendar":
      return (
        <CalendarPanel
          initialList={data.tasks.list}
          initialStats={data.tasks.stats}
          clients={data.clients.list}
          leads={data.leads.list}
        />
      );
    case "reports":
      return (
        <ReportsPanel
          initialReports={data.reports.list}
          initialStats={data.reports.stats}
          clients={data.clients.list}
          contentPosts={data.content.list}
          outreach={data.outreach.list}
          weekStart={data.reports.weekStart}
        />
      );
    default:
      return (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-bg-card/60 p-6 text-center">
          <p className="text-sm text-text-dim">
            Soba dolazi uskoro — gradimo room-by-room.
          </p>
        </div>
      );
  }
}
