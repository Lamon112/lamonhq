# Instagram Auto-Responder — Setup Guide

**Built:** 2026-05-17  
**Funnel:** Comment → public reply "javi se u DM" → DM → quiz link  
**Status:** Code shipped, waiting on Meta Developer console setup (only Leonardo can do)

---

## ✅ Što je već u kodu

1. **Migration `0033_ig_autoresponder.sql`** — 3 tables + seed 6 keywords (online, AI, clipping, zlatna knjiga, info, mentorstvo)
2. **`src/lib/instagram.ts`** — Meta Graph API client (reply to comment + send DM)
3. **`src/lib/igKeywordMatcher.ts`** — keyword matching s 3 modea (exact, contains, word_boundary) + cache
4. **`src/app/api/webhooks/instagram/route.ts`** — full webhook handler:
   - GET (verification handshake)
   - POST (comment + DM events)
   - Signature verification (HMAC SHA256)
   - Idempotency (dedupe by message_id)
   - Cooldown (don't spam same user)
   - Logging za analytics

---

## 🔧 Što Leonardo treba odraditi u Meta Developer console (15-30 min)

### Korak 1 — Connect Instagram to Facebook Page

Pretpostavka: imaš Facebook page za @sidequestshr ili @sidehustlebalkan. Ako nemaš, kreirati ga u Meta Business Suite.

1. Idi na **business.facebook.com**
2. Settings → Accounts → Instagram → Connect → Connect with username
3. Login Instagram (@sidequestshr ili kojigod hoces)
4. Connect to Facebook Page (ako nema page-a, kreirati novi "SideHustle™")

### Korak 2 — Create Meta App

1. Idi na **developers.facebook.com**
2. My Apps → Create App → Business
3. Name: "SideHustle Auto-Responder"
4. Add products:
   - Instagram Graph API
   - Messenger
   - Webhooks

### Korak 3 — Get IG Business Account ID

1. U Meta App → Tools → **Graph API Explorer**
2. Select your app, dropdown App Token
3. Query: `me/accounts` → kopirat će `id` of vaše stranice
4. Onda: `{PAGE_ID}?fields=instagram_business_account` → kopirat će `instagram_business_account.id`
5. Spremi taj ID — to je **`IG_BUSINESS_ACCOUNT_ID`**

### Korak 4 — Generate Long-Lived Page Access Token

1. Graph API Explorer → Get Token → User Access Token
2. Permissions:
   - `instagram_basic`
   - `instagram_manage_comments`
   - `instagram_manage_messages`
   - `pages_messaging`
   - `pages_show_list`
   - `pages_manage_metadata`
3. Token je kratkoročan (1h). Exchange za long-lived (60 days):
   ```
   GET /oauth/access_token?
     grant_type=fb_exchange_token&
     client_id={app-id}&
     client_secret={app-secret}&
     fb_exchange_token={short-token}
   ```
4. Onda Page Token (zadnji korak):
   ```
   GET /{user-id}/accounts?access_token={long-lived-user-token}
   ```
5. Spremi Page Access Token — to je **`IG_PAGE_ACCESS_TOKEN`**

### Korak 5 — Setup Webhook

1. Meta App → Webhooks
2. Subscribe Object: **Instagram**
3. Callback URL: `https://lamon-hq.vercel.app/api/webhooks/instagram`
4. Verify Token: izmisli neki string (npr. `sidehustle_webhook_2026_abc123`) — spremi za env var
5. Subscribe Fields:
   - `comments` ✅
   - `messages` ✅
6. Klikni "Verify and Save"
7. **Test webhook** — Meta će probati GET na tvoj URL s `hub.challenge`, kod automatski odgovara

### Korak 6 — Vercel Environment Variables

Otvori **vercel.com/teamlamon6-4471s-projects/lamon-hq/settings/environment-variables** i dodaj:

| Variable | Value | Notes |
|---|---|---|
| `META_APP_SECRET` | Tvoj Meta App Secret | Iz App Settings → Basic |
| `META_VERIFY_TOKEN` | Tvoj custom string iz koraka 5 | Mora se podudarati s webhook setup |
| `IG_PAGE_ACCESS_TOKEN` | Long-lived Page token iz koraka 4 | Vrijedi 60 dana, treba refresh |
| `IG_BUSINESS_ACCOUNT_ID` | IG Business Account ID iz koraka 3 | npr. `17841405822304914` |

Apply to: Production, Preview, Development.

**Redeploy** Vercel deployment nakon dodavanja env vars.

### Korak 7 — Apply Supabase migration

```sql
-- run u Supabase SQL editor
-- file: supabase/migrations/0033_ig_autoresponder.sql
```

Provjeri da su 3 tablice kreirane (ig_keyword_triggers, ig_comment_events, ig_dm_events) i da je 6 seed keywords umetnutih.

---

## 🧪 Testiranje

### Test 1 — Webhook verification
Iz Meta Dev console klikni "Test" pored webhook subscription. Trebao bi prikazati success ✅.

### Test 2 — Real comment
1. Sa drugog IG accounta (test) komentiraj na bilo koji tvoj post: **"online"**
2. Unutar 5 sekundi tvoj account treba odgovoriti pod komentarom: "Javi se u DM, šaljem vam besplatan vodič 🙏"
3. Provjeri u Supabase: `select * from ig_comment_events order by received_at desc limit 5;`

### Test 3 — Real DM
1. Sa test accounta pošalji DM bilo kakav: **"online"** (ili samo "info")
2. Unutar 5 sekundi treba doći auto-reply s quiz linkom
3. Provjeri: `select * from ig_dm_events order by received_at desc limit 5;`

---

## 📊 Što je u sistemu — Funnel Logic

```
USER VIDI VIDEO
     │
     ▼
USER OSTAVI KOMENTAR (npr. "online")
     │
     ▼  webhook fired
     │
[match keyword? cooldown? not-self?]
     │
     ▼ all ok
     │
AUTO REPLY POD KOMENTAR ◀── "Javi se u DM, šaljem vodič 🙏"
     │
     ▼  user vidi
     │
USER ŠALJE DM
     │
     ▼  webhook fired
     │
[match keyword in DM? cooldown? not-self?]
     │
     ▼
AUTO DM ◀── "Hej! Evo besplatan vodič i osobni plan: {QUIZ_LINK}"
     │
     ▼
USER PRELAZI NA QUIZ → AI score → Skool funnel
```

---

## 🔄 Token Refresh

Page Access Token vrijedi **60 dana**. Trebamo refresh prije expiry.

**TODO za V2:**
- [ ] Inngest cron job da refresh-uje token mjesečno
- [ ] Alert na Telegram bot ako refresh fail-a
- [ ] Admin panel u HQ za update keyword-a / disable triggers

---

## 🎛️ Keyword Management

Trenutno (V1) keyword-i se mijenjaju kroz Supabase SQL:

```sql
-- Add new keyword
insert into ig_keyword_triggers (keyword, comment_reply_text, dm_reply_text, dm_link, priority)
values ('skool', 'Javi se u DM za Skool info 📚', 'Hej! Evo link za Skool premium: {{link}}', 'https://skool.com/sidehustlebalkan', 25);

-- Disable trigger
update ig_keyword_triggers set active = false where keyword = 'online';

-- Update reply text
update ig_keyword_triggers set comment_reply_text = 'Novi tekst' where keyword = 'AI';
```

Cache invalidira automatski svake 1 min, ili napravi POST na `/api/admin/ig-triggers/refresh` (V2).

**V2 TODO**: Admin panel u Lamon HQ za visual management.

---

## ⚠️ Limitations & Caveats

1. **24h messaging window**: Meta dopušta DM samo unutar 24h od korisnikove zadnje poruke. Ako prođe više od 24h, DM neće biti poslan (status: failed).
2. **Page-level**: Trenutno samo 1 IG account. Multi-account support u V2.
3. **Comment edit/delete**: Ako korisnik obrise/edita komentar nakon match-a, nema callback-a. Naš public reply ostaje.
4. **Replies to replies**: Webhook dolazi za nested replies također. Self-reply check sprečava infinite loop.
5. **Rate limits**: Meta API ima 200 calls/h per user. Trenutno daleko ispod, ali pri 1000+ komentara dnevno treba batchirati.

---

## 🚀 Sljedeći koraci

1. **Leonardo**: koraci 1-7 iznad (15-30 min hands-on)
2. **Test sa drugim IG accountom** (Test 2 + Test 3)
3. **Monitoring prvih 24h** — provjeri status events u Supabase
4. **V2 build** (Week 2):
   - Admin panel u HQ za keyword management
   - Token refresh cron
   - TikTok Playwright worker
   - YouTube monitoring
   - Inbox dashboard u HQ
