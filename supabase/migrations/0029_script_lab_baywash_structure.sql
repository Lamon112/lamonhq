-- Script Lab v2 — extend video_scripts to mirror Leonardo's Baywash
-- script structure (per his 2026-05-14 directive: "ugledaj se na nacin
-- na koji smo konstruirali zadnje baywash skripte").
--
-- Each script now stores: hook_formula taxonomy, narration with stage
-- directions, per-second top-broll timeline, text overlays, caption,
-- production notes, target language (hr for @lamon.leonardo Plima,
-- en for @sidequestshr SideHustle US audience).

ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS hook_formula TEXT;

ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS script_goal TEXT
    CHECK (script_goal IN ('viral_reach', 'conversion', 'brand_pillar', 'low_barrier_entry', 'social_proof', null));

ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS mix_tag TEXT
    CHECK (mix_tag IN ('drama', 'conversion', 'edu', 'pillar', null));

-- Verbatim spoken narration WITH inline stage directions (italics in MD)
ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS narration_md TEXT;

-- Per-second editor instructions (which archive clip / overlay at which timestamp)
ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS broll_timeline_md TEXT;

-- Burned-in text overlays with timestamp ranges
ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS text_overlays_md TEXT;

-- Final post caption (HR or EN) + hashtags
ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS caption_md TEXT;

-- Why this format works + tweaks (production notes from Baywash style)
ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS production_notes_md TEXT;

-- Audience targeting — Plima B2B = HR audience, SideHustle = US audience
ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS target_audience TEXT
    CHECK (target_audience IN ('hr_b2b', 'us_global', 'balkan_b2c', null));

ALTER TABLE public.video_scripts
  ADD COLUMN IF NOT EXISTS target_language TEXT
    CHECK (target_language IN ('hr', 'en', null));
