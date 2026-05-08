"use client";

import { motion } from "framer-motion";

export function StatTile({
  label,
  value,
  accent = "gold",
  hint,
}: {
  label: string;
  value: string;
  accent?: "gold" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const accentClass = {
    gold: "border-gold/30 bg-gold/5",
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-danger/30 bg-danger/5",
  }[accent];
  return (
    <div className={`rounded-lg border ${accentClass} px-3 py-2 leading-tight`}>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="text-base font-semibold text-text">{value}</div>
      {hint && (
        <div className="text-[10px] text-text-dim mt-0.5">{hint}</div>
      )}
    </div>
  );
}

export function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors -mb-px " +
        (active
          ? "border-gold text-text"
          : "border-transparent text-text-muted hover:text-text-dim")
      }
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="text-[10px] text-text-muted">{hint}</span>}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger"
    >
      {message}
    </motion.div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
  icon,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-gold-bright disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  type = "button",
  icon,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-xs text-text-dim transition-colors hover:border-gold/50 hover:text-text disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "gold";
}) {
  const map = {
    neutral: "border-border text-text-muted",
    success: "border-success/40 bg-success/10 text-success",
    warning: "border-warning/40 bg-warning/10 text-warning",
    danger: "border-danger/40 bg-danger/10 text-danger",
    gold: "border-gold/40 bg-gold/10 text-gold",
  } as const;
  return (
    <span
      className={
        "rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider " +
        map[tone]
      }
    >
      {children}
    </span>
  );
}
