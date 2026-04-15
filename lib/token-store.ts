// Source of truth for the GitHub access token used by lib/github.ts.
//
// Storage: Cloudflare KV (TOKEN_KV namespace, key "github_token").
// Renewal: generate a new PAT and write it to KV:
//   bunx wrangler kv key put --binding=TOKEN_KV --remote github_token "<token>"
// No redeploy required. In-isolate cache TTL is 60s.
//
// Fallback: GITHUB_TOKEN env var is used if KV is empty.

import { env } from "cloudflare:workers";

const KEY = "github_token";
const TTL_MS = 60_000;

let cached: { token: string | null; expires: number } | null = null;

function getKv(): KVNamespace | null {
  const kv = (env as unknown as { TOKEN_KV?: KVNamespace }).TOKEN_KV;
  return kv ?? null;
}

export async function getToken(): Promise<string | null> {
  if (cached && cached.expires > Date.now()) return cached.token;

  const kv = getKv();
  if (kv) {
    try {
      const token = await kv.get(KEY);
      if (token) {
        cached = { token, expires: Date.now() + TTL_MS };
        return token;
      }
    } catch {
      // KV read failed, fall through to env fallback
    }
  }

  const fallback = process.env.GITHUB_TOKEN ?? null;
  cached = { token: fallback, expires: Date.now() + TTL_MS };
  return fallback;
}

export async function setToken(token: string): Promise<void> {
  const kv = getKv();
  if (!kv) throw new Error("TOKEN_KV binding not available");
  await kv.put(KEY, token);
  cached = { token, expires: Date.now() + TTL_MS };
}

export function clearTokenCache(): void {
  cached = null;
}
