import Link from "next/link";
import { getCalendlyStatus } from "@/app/actions/calendly";
import { CalendlySetup } from "./CalendlySetup";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const calendlyStatus = await getCalendlyStatus();

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
                <span className="text-gold">Integracije</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">
                External tools & webhooks
              </div>
            </div>
          </div>
          <Link href="/" className="text-xs text-text-muted hover:text-text">
            ← Natrag u HQ
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:px-8 lg:py-10">
        <CalendlySetup initialStatus={calendlyStatus} />
      </main>
    </div>
  );
}
