# CLAUDE.md — Agent Instructions for gists.sh

## What is this project?

A self-hosted, single-user gist viewer for jokull's GitHub Gists. URLs are `md.solberg.is/<gistId>` with no username prefix needed. Clean typography, syntax highlighting, and a distraction-free reading experience.

## Tech Stack

- Next.js 16 (App Router, TypeScript) via vinext (Vite-based)
- Vite + @cloudflare/vite-plugin for builds
- Tailwind CSS v4 (via @tailwindcss/vite)
- react-markdown + remark-gfm + rehype for markdown rendering
- Shiki for syntax highlighting (JavaScript regex engine for CF Workers)
- Deployed on Cloudflare Workers

## Development

```bash
bun install
bun dev         # starts vinext dev server
bun run build   # vite production build
bun run deploy  # build + wrangler deploy to Cloudflare Workers
```

## Environment Variables

- `GITHUB_TOKEN` — GitHub PAT for API access (higher rate limits). Set as a Cloudflare Workers secret.

## Project Structure

- `app/[gistId]/` — main gist viewer route (username hardcoded to "jokull")
- `app/api/` — API routes (raw content proxy)
- `bin/encrypt-gist` — CLI tool for creating encrypted gists
- `components/` — shared UI components
- `components/encrypted-gist-viewer.tsx` — client-side decryption + rendering
- `lib/` — utilities (GitHub API client, shiki, etc.)
- `lib/crypto.ts` — AES-256-GCM encrypt/decrypt (Web Crypto API)
- `worker/index.ts` — Cloudflare Worker entry point (caching + ETags)
- `vite.config.ts` — Vite + vinext + Cloudflare plugin config
- `wrangler.jsonc` — Cloudflare Workers deployment config

## Design Principles

- Full minimalism. White background, clean typography, nothing unnecessary.
- Content is king. The rendered gist takes center stage.
- No em dashes in any user-facing copy. Use commas or periods instead.
- Responsive: must look great on mobile.
- Fully dynamic rendering (force-dynamic), no ISR/static caching.

## Encrypted Gists

End-to-end encrypted gists where the server never sees the decryption key. The key lives only in the URL hash fragment, which browsers never send to the server.

### How it works

1. Content is encrypted locally with AES-256-GCM (Web Crypto API)
2. The encrypted payload is uploaded as a regular gist with a `.encrypted` file extension
3. The decryption key is encoded in the URL fragment: `md.solberg.is/<id>#key=<base64url>`
4. The server detects `.encrypted` files and renders a client-only decryption component
5. The browser reads the hash, decrypts, and renders (markdown via react-markdown, code as plain pre/code)

### Creating encrypted gists

```bash
# Encrypt a file and create a secret gist
bin/encrypt-gist notes.md -d "Private meeting notes"

# Pipe content from stdin
echo "secret stuff" | bin/encrypt-gist --stdin secret.md -d "Quick secret"

# The script outputs the share URL with the key in the fragment
#   https://md.solberg.is/abc123#key=base64urlkey
```

Requires `gh` CLI (authenticated) and `bun`.

### File format

Encrypted gist files are named `<original>.<ext>.encrypted` (e.g. `notes.md.encrypted`). The original extension is preserved so the viewer knows how to render after decryption. File contents are JSON:

```json
{ "v": 1, "iv": "<base64url>", "ct": "<base64url>" }
```

### Security properties

- AES-256-GCM with random IV per encryption
- Key is 256-bit, base64url-encoded in the URL fragment
- The fragment is never sent to the server (per HTTP/URL spec)
- Server only sees the ciphertext, never the plaintext or key
- No syntax highlighting for encrypted code (would require shipping Shiki to the client)

## Key Decisions

- react-markdown (not Tiptap) for rendering since this is read-only
- Shiki with JavaScript regex engine (not WASM) for CF Workers compatibility
- vinext replaces Next.js CLI, enabling Vite builds and Cloudflare Workers deployment
- Raw content served via API route with proper Content-Type headers
- oxlint + oxfmt for linting/formatting
- Encrypted gists use client-side react-markdown (no SSR, by design)
