"use client";

/**
 * Meta Pixel — quiz funnel tracking only.
 *
 * Mounts on /quiz routes only (NOT global). Reason: lamon-hq is the
 * agency's internal HQ ops dashboard — we don't want pixel firing on
 * Vault/Plima/login pages and inflating tracking/contaminating audiences.
 *
 * Events fired by /quiz funnel:
 *   - PageView          → on /quiz mount
 *   - ViewContent       → on /quiz/result/[id] mount (after AI gen)
 *   - Lead              → on quiz submit success (in QuizWizard)
 *   - InitiateCheckout  → on Skool CTA click (in QuizResult)
 *
 * Pixel ID is read from NEXT_PUBLIC_META_PIXEL_ID. Set in Vercel env
 * before launching ads. If env missing, component no-ops (safe).
 */

import Script from "next/script";

export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
`}
      </Script>
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}

/** Helper for client-side event firing from quiz components. */
export function trackMetaEvent(
  event: "Lead" | "ViewContent" | "InitiateCheckout" | "CompleteRegistration",
  params?: Record<string, string | number>,
) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...args: unknown[]) => void };
  if (!w.fbq) return;
  if (params) w.fbq("track", event, params);
  else w.fbq("track", event);
}
