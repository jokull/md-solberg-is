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
- `components/` — shared UI components
- `lib/` — utilities (GitHub API client, shiki, etc.)
- `worker/index.ts` — Cloudflare Worker entry point
- `vite.config.ts` — Vite + vinext + Cloudflare plugin config
- `wrangler.jsonc` — Cloudflare Workers deployment config

## Design Principles

- Full minimalism. White background, clean typography, nothing unnecessary.
- Content is king. The rendered gist takes center stage.
- No em dashes in any user-facing copy. Use commas or periods instead.
- Responsive: must look great on mobile.
- Fully dynamic rendering (force-dynamic), no ISR/static caching.

## Key Decisions

- react-markdown (not Tiptap) for rendering since this is read-only
- Shiki with JavaScript regex engine (not WASM) for CF Workers compatibility
- vinext replaces Next.js CLI, enabling Vite builds and Cloudflare Workers deployment
- Raw content served via API route with proper Content-Type headers
- oxlint + oxfmt for linting/formatting
