"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed");
      setLoading(false);
    }
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm rounded-2xl border border-gold/30 bg-bg-elevated p-8 shadow-2xl"
      >
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-2xl font-bold text-gold">
            L
          </div>
          <h1 className="text-xl font-semibold text-text">
            LAMON <span className="text-gold">HQ</span>
          </h1>
          <p className="text-center text-xs text-text-muted">
            Agency operations dashboard · Phase 1 MVP
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-bg-card px-4 py-3 text-sm font-medium text-text transition-colors hover:border-gold/60 disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.63z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z"
            />
          </svg>
          {loading ? "Signing in…" : "Nastavi s Google"}
        </button>

        {error && (
          <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-[10px] uppercase tracking-wider text-text-muted">
          Single-user · Leonardo only
        </p>
      </motion.div>
    </div>
  );
}
