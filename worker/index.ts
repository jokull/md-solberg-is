/**
 * Cloudflare Worker entry point.
 *
 * Uses the Cloudflare Cache API to cache rendered pages at the edge.
 * Workers responses aren't cached by Cloudflare's CDN automatically,
 * so we explicitly put/match via the Cache API.
 *
 * Cloudflare's Cache API doesn't support Vary headers, so we strip
 * them and use a cache key based on the URL only.
 */
import handler from "vinext/server/app-router-entry";

// Cache-busting version, updated at build time by Vite's define plugin.
// Each deploy gets a fresh cache namespace so stale HTML is never served.
declare const __DEPLOY_VERSION__: string;
const DEPLOY_VERSION = typeof __DEPLOY_VERSION__ !== "undefined" ? __DEPLOY_VERSION__ : "dev";

interface Env {
  [key: string]: unknown;
}

async function computeETag(body: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", body);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `"${hex.slice(0, 16)}"`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") {
        process.env[key] = value;
      }
    }

    // Only cache GET/HEAD HTML requests (not RSC or API)
    const isRSC =
      request.headers.get("rsc") === "1" ||
      request.headers.get("accept")?.includes("text/x-component");
    if (request.method !== "GET" || isRSC) {
      return handler.fetch(request);
    }

    // Use a versioned cache key so each deploy gets a fresh cache
    const url = new URL(request.url);
    url.searchParams.set("__v", DEPLOY_VERSION);
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);

    if (cached) {
      // Check If-None-Match for conditional requests
      const ifNoneMatch = request.headers.get("if-none-match");
      const etag = cached.headers.get("etag");
      if (ifNoneMatch && etag && ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: etag, "Cache-Control": cached.headers.get("cache-control") || "" },
        });
      }
      return cached;
    }

    const response = await handler.fetch(request);

    // Cache responses that have s-maxage (set by revalidate config)
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl?.includes("s-maxage")) {
      // Read body to compute ETag
      const body = await response.arrayBuffer();
      const etag = await computeETag(body);

      // Clone and strip Vary header — CF Cache API rejects Vary: *
      // and doesn't handle custom Vary values well
      const headers = new Headers(response.headers);
      headers.delete("vary");
      headers.set("ETag", etag);
      const cacheable = new Response(body.slice(0), {
        status: response.status,
        headers,
      });
      ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));

      // Check If-None-Match against freshly computed ETag
      const ifNoneMatch = request.headers.get("if-none-match");
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: etag, "Cache-Control": cacheControl },
        });
      }

      return cacheable;
    }

    return response;
  },
};
