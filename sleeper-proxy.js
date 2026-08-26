// Minimal CORS proxy for Sleeper's public draft-picks API.
//
// Why this exists: Sleeper's API (api.sleeper.app) is free and public, but
// it doesn't send an Access-Control-Allow-Origin header - which means a
// browser can never successfully call it directly from a different website
// (this is a real, confirmed limitation, not an assumption - verified via
// an actual failed request before building this). This Worker sits between
// Draft Command's browser and Sleeper, doing nothing but relaying the exact
// same request and adding the missing header on the way back.
//
// Deliberately narrow by design: this ONLY forwards requests matching
// /draft/<numeric-id>/picks - nothing else. It can't be used as an open
// relay to fetch arbitrary URLs (that would be a real SSRF-style risk of
// our own making), and the CORS header is scoped to this site's own origin
// specifically, not a wildcard - no other website can piggyback on it.
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create -> paste this
// file into the built-in code editor -> Deploy. No local tooling needed.

const ALLOWED_ORIGIN = "https://whittakermediagroup-collab.github.io";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only ever forwards to this one specific, real Sleeper endpoint shape.
    const match = url.pathname.match(/^\/draft\/(\d+)\/picks\/?$/);
    if (!match) {
      return new Response("Not found - this proxy only serves /draft/<id>/picks", { status: 404 });
    }
    const draftId = match[1];

    let sleeperRes;
    try {
      sleeperRes = await fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Could not reach Sleeper" }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": ALLOWED_ORIGIN },
      });
    }

    const body = await sleeperRes.text();
    return new Response(body, {
      status: sleeperRes.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Cache-Control": "no-store",
      },
    });
  },
};
