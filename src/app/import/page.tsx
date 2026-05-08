import Link from "next/link";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="dot-grid min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border-strong bg-bg-elevated/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-gold/40 bg-gold/10 text-gold transition-colors hover:bg-gold/20"
            >
              <span className="text-lg font-bold">L</span>
            </Link>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-wide text-text">
                Import iz <span className="text-gold">Notion-a</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                Bootstrap real podataka
              </div>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-text-muted hover:text-text"
          >
            ← Natrag u HQ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-10">
        <ImportClient />
      </main>
    </div>
  );
}
