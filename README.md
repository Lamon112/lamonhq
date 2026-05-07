# 🏢 LAMON HQ

> Gamificirana web app za upravljanje Lamon Agency — vizualni ecosystem (Fallout-Shelter-style) s 3 kata × 3 sobe.
> **Phase 1 — MVP scaffold** (auth + visual ecosystem + manual data entry)

Spec: [`LAMON_HQ_Build_Spec.md`](./LAMON_HQ_Build_Spec.md)

---

## Tech stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS v4** (CSS-first `@theme` tokens)
- **Framer Motion** za animacije
- **Zustand** za client state
- **Supabase** (Postgres + Auth)
- **Vercel** za deploy

## Brand tokens (u `globals.css`)

| Token | Vrijednost | Tailwind utility |
|---|---|---|
| `--color-bg` | `#0A0A0A` | `bg-bg` |
| `--color-bg-elevated` | `#141414` | `bg-bg-elevated` |
| `--color-bg-card` | `#181818` | `bg-bg-card` |
| `--color-gold` | `#C9A84C` | `text-gold` / `bg-gold` |
| `--color-gold-bright` | `#E0BF5E` | `text-gold-bright` |

Font: **DM Sans** (Google Fonts).

---

## Setup (prvi put)

### 1. Install + dev server

```bash
npm install
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000). Bez Supabase env-a, middleware preskače auth i pušta te direktno u HQ view.

### 2. Supabase project

1. Idi na [supabase.com](https://supabase.com) → **New project**
2. Project Settings → **API** → kopiraj `URL` i `anon public` key
3. Kopiraj `.env.local.example` u `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

4. Popuni:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 3. Run SQL migration

1. Supabase Dashboard → **SQL Editor** → **New query**
2. Paste sadržaj `supabase/migrations/0001_initial_schema.sql`
3. Run (Ctrl+Enter)

Kreira sve tabele (`clients`, `leads`, `outreach`, `content_posts`, `goals`, `tasks`, `activity_log`, `competitors`, `profiles`) + RLS policies (single-user owner-only).

### 4. Google OAuth

U Supabase Dashboard:

1. **Authentication → Providers → Google → Enable**
2. Slijedi [Supabase Google docs](https://supabase.com/docs/guides/auth/social-login/auth-google) za Client ID / Secret iz Google Cloud Console
3. **Authorized redirect URIs** u Google Cloud:
   - `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
4. **Site URL** u Supabase → Authentication → URL Configuration:
   - Dev: `http://localhost:3000`
   - Prod: `https://lamonhq.vercel.app` (ili custom domain)
5. **Redirect URLs** dodaj iste

(Opcionalno) Restrict na samo svoj email — u Supabase Auth → Hooks možeš dodati custom hook ili ručno onemogući signup nakon prvog login-a.

---

## Deploy na Vercel

### Brzi put (web UI)

1. Push repo na GitHub (vidi dolje "Git init")
2. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
3. Framework: **Next.js** (auto-detected)
4. Environment variables — dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy**
6. Nakon deploya, kopiraj prod URL i dodaj ga u Supabase → Auth → URL Configuration kao **Site URL** + **Redirect URL**

### Git init (lokalno)

```bash
git init
git add -A
git commit -m "Initial scaffold: LAMON HQ Phase 1 MVP"
gh repo create lamon-hq --private --source=. --push
```

ili preko web UI-a → kreiraj prazan repo → `git remote add origin … && git push -u origin main`.

---

## Što je gotovo (Phase 1 scaffold)

- [x] Next.js 16 + TS + Tailwind v4 + DM Sans
- [x] Brand tema (dark + gold #C9A84C)
- [x] **Top resource bar** — MRR, klijenti, leads, content, goal progress (placeholder zero)
- [x] **3 kata × 3 sobe** — visual building grid s hover/click animacijama
- [x] **Bottom action bar** — Add Lead / Send Outreach / Manual Entry / Quick Note
- [x] **Room modal** — placeholder, otvara se na klik
- [x] Supabase clients (browser + server + middleware)
- [x] Google OAuth login page + `/auth/callback` route
- [x] Middleware route protection (skip kad nema env-a)
- [x] SQL migration sa svim tabelama + RLS

## Što slijedi (room po room)

1. **Outreach Lab** — forma + lista poruka, animacija envelope flying
2. **Discovery Bay** — call log + Calendly manual sync
3. **Closing Room** — deals s probability, "close-won" akcija → MRR boost
4. **Lead Scorer** — ICP kalkulator (5 kriterija) + lista
5. **Performance Analytics** — manual paste post URL + stats
6. **Competitor Watch** — basic log
7. **Client Manager** — CRUD klijenata, churn risk badge
8. **Calendar / Tasks** — today/week/month + add task
9. **Weekly Reports** — per-klijent template generator

## Folder struktura

```
lamon-hq/
├── middleware.ts                  # Auth gating
├── supabase/migrations/
│   └── 0001_initial_schema.sql    # Run in Supabase SQL editor
├── src/
│   ├── app/
│   │   ├── globals.css            # Brand tokens + Tailwind v4 @theme
│   │   ├── layout.tsx             # Root layout, DM Sans
│   │   ├── page.tsx               # Glavni HQ view
│   │   ├── login/page.tsx         # Google OAuth
│   │   └── auth/callback/route.ts
│   ├── components/
│   │   ├── ResourceBar.tsx        # Top sticky bar
│   │   ├── ActionBar.tsx          # Bottom bar
│   │   ├── Building.tsx           # 3 floors container
│   │   ├── Floor.tsx              # 1 floor s 3 sobe
│   │   ├── Room.tsx               # Single room card
│   │   └── RoomModal.tsx          # Detail modal (placeholder)
│   ├── lib/
│   │   ├── rooms.ts               # 9-room config (single source of truth)
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── middleware.ts
│   └── store/
│       └── useHQStore.ts          # Zustand
└── .env.local.example
```

---

*Phase 1 scaffold · 7.5.2026*
