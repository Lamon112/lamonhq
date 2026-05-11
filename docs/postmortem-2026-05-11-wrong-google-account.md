# Postmortem · 2026-05-11 · Wrong Google account login → empty HQ dashboard

**Owner:** Leonardo Lamon
**Severity:** P1 (perceived data loss; no actual data loss)
**Duration:** ~30 minutes (22:00–22:30 CET)
**Status:** Resolved

---

## Symptoms

User reported HQ dashboard at https://lamon-hq.vercel.app showing:

- MRR: 0 klijenata (was 1: Baywash)
- Active: 0 (was 1)
- Leads: 0, Hot: 0 (was 357 after Špehar import)
- LVL 1, 0/100 XP (was LVL 8, 255 XP)
- Daily Briefing: empty
- Auto Follow-ups: empty
- Lead Scorer modal: 0 leadova
- Avatar visible (Leonardo logged in via Google)

User tried: hard refresh (Ctrl+Shift+R), Lead Scorer modal, sign-out + sign-in. All failed.

## Initial misdiagnosis

First three hypotheses, all wrong:

1. **Auth session expired** — cookies were present (`sb-vqwaqylnxxmcrnkmpauu-auth-token.0/.1`), 3180 chars, valid base64-encoded JSON wrapping a JWT.
2. **Cookie corruption from Vercel timeout during 304-lead Holmes batch enrich** — cookies decoded fine, JWT was valid.
3. **Real data wipe** — direct Supabase Studio query showed `leads` table = **357 records** intact.

## Real root cause

Decoded the access_token JWT in the user's browser session and found:

```json
{
  "sub": "fd027c26-6cc4-421e-a514-56b4cb8e0ef6",
  "email": "teamlamon6@gmail.com",
  "iss": "https://vqwaqylnxxmcrnkmpauu.supabase.co/auth/v1",
  "exp_date": "2026-05-11T23:16:13.000Z",
  "is_expired": false,
  "role": "authenticated"
}
```

Versus the user_id owning all leads in Supabase: `c3037ad0-72e0-4f4a-b5e5-2e427...` (which corresponds to **leopoldlamon@gmail.com**).

**Two different Google accounts → two different Supabase users → RLS filtered out
all data for the new (wrong) user.**

## Why this happened

Leonardo had been actively switching between Google accounts during the day:

- `leopoldlamon@gmail.com` — original HQ login, owns all data
- `teamlamon6@gmail.com` — used for Gmail Send-As alias setup, Calendly config, profile pic upload (the `leonardo@lamon.io` alias is hosted under teamlamon6)

When he hit "Sign out + sign in" on HQ, Google's account chooser auto-selected the **most recently active** account — teamlamon6 — because that's the one we'd just been working with for Gmail/Calendly tasks.

Supabase Auth saw a brand-new email address (`teamlamon6@gmail.com`) and created a fresh user row with `id = fd027c26-...`. RLS on the `leads` table filtered everything to that empty user.

The fix was: clear cookies, re-login, and **carefully select `leopoldlamon@gmail.com`** in the Google picker (not teamlamon6).

## What we got right

- Trusted user's "all three tests failed" report instead of dismissing.
- Verified data integrity in Supabase Studio before any restore action.
- Used in-browser JS to decode the actual JWT instead of guessing.
- Resisted urge to "fix" middleware code (would have broken the actual security model).

## What we got wrong

- Assumed auth was either valid or invalid — didn't consider "valid auth, wrong account."
- Spent ~20 minutes investigating cookie format, Supabase publishable key migration, middleware code, and bulk-enrich race conditions before checking the actual user_id in the JWT.
- Should have decoded the JWT as the **first** diagnostic step once we confirmed cookies were present.

## Prevention for next time

### Code-side mitigation (TODO)

Add an "account warning" banner to the HQ landing page. Pseudocode:

```ts
// On the landing page, if the authenticated user has 0 leads + 0 clients but
// the email is teamlamon6@gmail.com (or anything other than leopoldlamon@gmail.com),
// show a yellow warning:
//   "⚠️ Logged in as <email> — looks like wrong Google account.
//    Sign out and use leopoldlamon@gmail.com to see your data."
```

This catches the failure mode immediately on first render instead of leaving the
user staring at an empty dashboard wondering if their data is gone.

### User-side checklist

When HQ dashboard appears empty:

1. **First check:** open Supabase Studio
   (https://supabase.com/dashboard/project/vqwaqylnxxmcrnkmpauu/editor) → `leads`
   table → look at row count. If 300+ → data is fine, this is an auth/account
   issue, not data loss.
2. **Second check:** look at the avatar in the top-right corner of HQ. If it's
   not Leonardo's primary face → wrong Google account is logged in.
3. **Fix:** clear cookies for `lamon-hq.vercel.app`, refresh, and at the Google
   account picker carefully select `leopoldlamon@gmail.com` (the original HQ
   account), NOT `teamlamon6@gmail.com` (the Gmail-alias account).

### Diagnostic snippet (paste in browser console at /login)

To check which user is currently authenticated without going through the UI:

```js
const m0 = document.cookie.match(/sb-vqwaqylnxxmcrnkmpauu-auth-token\.0=([^;]+)/);
const m1 = document.cookie.match(/sb-vqwaqylnxxmcrnkmpauu-auth-token\.1=([^;]+)/);
if (m0 && m1) {
  const combined = (decodeURIComponent(m0[1]) + decodeURIComponent(m1[1])).replace(/^base64-/, "");
  const parsed = JSON.parse(atob(combined));
  const payload = JSON.parse(atob(parsed.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  console.log("Logged in as:", payload.email, "user_id:", payload.sub);
}
```

Expected:
- ✅ `email: "leopoldlamon@gmail.com"` — correct, data should be visible
- ❌ `email: "teamlamon6@gmail.com"` (or anything else) — wrong account, sign out

## Cross-references

- Supabase project: `vqwaqylnxxmcrnkmpauu` (region: eu-west)
- Middleware: `middleware.ts` + `src/lib/supabase/middleware.ts`
- Auth callback: `src/app/auth/callback/route.ts`
- The 357-lead import was successful and never lost (verified via Supabase Studio).

---

*Last updated: 2026-05-12 · Author: Leonardo + Claude*
