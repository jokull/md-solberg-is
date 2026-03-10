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
import { KVCacheHandler } from "vinext/cloudflare";
import { setCacheHandler } from "vinext/shims/cache";
import handler from "vinext/server/app-router-entry";

interface Env {
  VINEXT_CACHE: KVNamespace;
  [key: string]: unknown;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    setCacheHandler(new KVCacheHandler(env.VINEXT_CACHE));
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

    // Use a simplified cache key (URL only, no Vary)
    const cacheKey = new Request(request.url, { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await handler.fetch(request);

    // Cache responses that have s-maxage (set by revalidate config)
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl?.includes("s-maxage")) {
      // Clone and strip Vary header — CF Cache API rejects Vary: *
      // and doesn't handle custom Vary values well
      const headers = new Headers(response.headers);
      headers.delete("vary");
      const cacheable = new Response(response.clone().body, {
        status: response.status,
        headers,
      });
      ctx.waitUntil(cache.put(cacheKey, cacheable));
    }

    return response;
  },
};
