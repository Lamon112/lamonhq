export function formatEuro(cents: number, opts?: { compact?: boolean }): string {
  const value = cents / 100;
  if (opts?.compact && Math.abs(value) >= 1000) {
    return `€${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `€${value.toLocaleString("hr-HR", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatPct(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "upravo";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}
