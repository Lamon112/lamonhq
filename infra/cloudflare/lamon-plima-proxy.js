/**
 * Cloudflare Worker · lamon-plima-proxy
 *
 * Transparently proxies lamon.io/plima* and /_next/* requests to
 * lamon-hq.vercel.app so the URL bar stays "lamon.io/plima" while
 * Vercel serves the actual Plima landing.
 *
 * Why this exists:
 *   Previously a Cloudflare Redirect Rule did 301 → lamon-hq.vercel.app/plima.
 *   That flipped the URL bar in the visitor's browser, which kills the
 *   premium feel for clinic owners clicking the link in our cold email.
 *   This Worker keeps the host on lamon.io while pulling content from
 *   Vercel underneath.
 *
 * Routes that should hit this Worker (configure in Cloudflare dashboard):
 *   - lamon.io/plima        (the landing page itself)
 *   - lamon.io/plima/*      (any sub-asset like /plima/intro-poster.svg)
 *   - lamon.io/_next/*      (Next.js bundled JS/CSS/fonts for the page)
 *   - lamon.io/favicon.ico  (Next.js routes favicon under app/ icon convention)
 *
 * After enabling this Worker route, DELETE the old Redirect Rule
 * "lamon.io/plima → lamon-hq.vercel.app/plima" from Rules → Redirect Rules.
 *
 * Free Workers tier: 100k req/day. Our /plima traffic is far below that.
 */

const ORIGIN = "https://lamon-hq.vercel.app";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Build target URL on the Vercel origin, preserving path + query.
    const target = new URL(url.pathname + url.search, ORIGIN);

    // Strip Cloudflare-injected host headers and replace with origin host
    // so Vercel routing/SSL works correctly.
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("host", "lamon-hq.vercel.app");
    reqHeaders.set("X-Forwarded-Host", "lamon.io");
    reqHeaders.set("X-Forwarded-Proto", "https");
    // Drop CF's caching/optimization headers that confuse origin
    reqHeaders.delete("cf-connecting-ip");
    reqHeaders.delete("cf-ipcountry");
    reqHeaders.delete("cf-ray");
    reqHeaders.delete("cf-visitor");

    const proxyReq = new Request(target.toString(), {
      method: request.method,
      headers: reqHeaders,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : request.body,
      redirect: "manual",
    });

    let proxyRes;
    try {
      proxyRes = await fetch(proxyReq);
    } catch (err) {
      return new Response(
        `Plima proxy error: ${err && err.message ? err.message : "unknown"}`,
        { status: 502, headers: { "content-type": "text/plain; charset=utf-8" } },
      );
    }

    // Pass response through but strip headers that pin the response to
    // the vercel.app origin (which would break cookies, CSP, etc).
    const resHeaders = new Headers(proxyRes.headers);
    resHeaders.delete("strict-transport-security"); // CF sets its own
    resHeaders.delete("x-vercel-id");
    resHeaders.delete("x-vercel-cache");
    // If Vercel tries to redirect to its own apex (e.g. trailing-slash),
    // rewrite the Location to stay on lamon.io.
    const loc = proxyRes.headers.get("location");
    if (loc) {
      try {
        const rewritten = new URL(loc, ORIGIN);
        if (rewritten.hostname === "lamon-hq.vercel.app") {
          rewritten.hostname = "lamon.io";
          rewritten.port = "";
        }
        resHeaders.set("location", rewritten.toString());
      } catch {
        /* leave as-is on parse failure */
      }
    }

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers: resHeaders,
    });
  },
};
