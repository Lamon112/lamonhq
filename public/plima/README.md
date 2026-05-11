# /public/plima/ — video assets za /plima landing

Drop these 2 files here when video editing complete:

## intro.mp4 (REQUIRED)

- **Format:** MP4, H.264 codec
- **Resolution:** 1920×1080 (16:9)
- **Frame rate:** 30 fps
- **Bitrate:** 4-8 Mbps (target file size 30-60 MB for 3-5 min video)
- **Audio:** AAC, 128 kbps stereo
- **Duration:** 3-5 min
- **Source:** Leonardo's recorded intro per docs/plima-intro-video-script.md

**Export tip:** Use Descript or CapCut Pro → Export 1080p preset, MP4 H.264, target 6 Mbps. If file >80MB, drop to 5 Mbps.

## intro-poster.jpg (REQUIRED)

- **Format:** JPEG (or PNG, but JPEG ~5× smaller)
- **Resolution:** 1920×1080 (matches video aspect)
- **File size:** <300 KB (compress with squoosh.app or tinyjpg.com)
- **Content:** Best frame from video (Leonardo's face, mid-sentence energy, NOT mouth open mid-word). Frame around 0:30-0:40 usually works. Avoid black/transition frames.

## After upload

1. `git add public/plima/intro.mp4 public/plima/intro-poster.jpg`
2. `git commit -m "video: add Plima intro (90s explainer)"`
3. `git push`
4. Vercel auto-deploys (1-2 min) — video live on lamon.io/plima (after redirect setup) or lamon-hq.vercel.app/plima

## Vercel file size note

Vercel free tier supports up to **100 MB per file** in /public/. If your master export is >100 MB:
- Re-encode to 5 Mbps (drop bitrate)
- OR upload to a CDN (Cloudflare R2, Bunny.net) and update `<source src=...>` in PlimaIntroVideo.tsx

For 90-sec video at 6 Mbps = ~67 MB → safe.
For 3-5 min at 6 Mbps = 130-200 MB → too big, re-encode to 4 Mbps.

## Mobile optimization (later, optional)

For better mobile bandwidth, add WebM variant:
1. Encode `intro.webm` (VP9 codec, same resolution)
2. Update `<source>` tags in PlimaIntroVideo.tsx to include both:
   ```jsx
   <source src="/plima/intro.webm" type="video/webm" />
   <source src="/plima/intro.mp4" type="video/mp4" />
   ```
3. Browsers prefer WebM (smaller, ~30% bandwidth savings)
