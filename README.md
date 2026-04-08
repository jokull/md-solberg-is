# md.solberg.is

A minimal, beautiful viewer for GitHub Gists, tailored for my own single-user setup. It renders my gists at `md.solberg.is/<gistId>` with clean typography, syntax highlighting, and a much nicer reading experience than the default GitHub gist UI.

**[md.solberg.is](https://md.solberg.is)**

## What this is

This project started as a fork of [`linuz90/gists.sh`](https://github.com/linuz90/gists.sh), then evolved into a personal deployment with a different URL structure, Cloudflare setup, and agent-centric sharing workflow.

In this version:

- the site is deployed at `md.solberg.is`
- it is configured for a single user (`jokull`)
- gist URLs use `/<gistId>` with no username prefix
- it includes a local skill for creating and sharing nicely rendered gist links from coding agents
- it is set up for Cloudflare Workers deployment via Wrangler and vinext

## Usage

```
md.solberg.is/<gistId>
```

Every file type gets the best possible rendering:

- **Markdown** - proper typography, GFM alerts, frontmatter tables, auto table of contents, heading anchors
- **Code** - syntax highlighting via Shiki (same engine as VS Code), with copy buttons on every block
- **JSON / GeoJSON** - collapsible tree viewer
- **YAML** - parsed and displayed as a navigable tree
- **CSV / TSV** - sortable, searchable data table
- **ICS / iCal** - calendar event cards with dates, locations, and recurrence

Multi-file gists get tabs. Toggle between "Pretty" and "Raw" views on structured files.

### URL parameters

Customize how any gist renders by appending query params:

| Param              | Effect                                     |
| ------------------ | ------------------------------------------ |
| `?theme=dark`      | Force dark mode                            |
| `?theme=light`     | Force light mode                           |
| `?noheader`        | Hide title, tabs, and copy buttons         |
| `?nofooter`        | Hide author info and footer                |
| `?mono`            | Monospace font for all text                |
| `?file={filename}` | Show a specific file from multi-file gists |

Combine them: `md.solberg.is/<gistId>?theme=dark&noheader&nofooter`

### Raw content

Fetch raw file content with proper `Content-Type` headers via the API:

```
md.solberg.is/api/raw/{gist_id}
md.solberg.is/api/raw/{gist_id}?file={filename}
```

## Agent workflow

This repo also contains a local agent skill for turning generated content into shareable gist links with a clean reading experience.

See:

- `skills/share-pretty-gist/SKILL.md`

The intended flow is:

1. an agent creates or updates a gist with `gh gist`
2. it warms the rendered page
3. it returns `md.solberg.is/<gistId>` as the primary share link

This works especially well for markdown notes, instructions, reports, and code snippets that should be shared as artifacts rather than pasted from chat.

## Self-hosting

```bash
bun install
bun dev
bun run build
bun run deploy
```

Set a `GITHUB_TOKEN` with gist access for higher API rate limits. In my deployment, this is stored as a Cloudflare Workers secret.

## Stack

Next.js 16 (via vinext), Tailwind CSS v4, react-markdown, Shiki, deployed on Cloudflare Workers.

## Credit

This project is based on the excellent original work in [`linuz90/gists.sh`](https://github.com/linuz90/gists.sh) by [Fabrizio Rinaldi](https://fabrizio.so).

That project established the core idea and a lot of the original implementation. This repo is my personal adaptation of it for `md.solberg.is`, single-user routing, and agent-oriented sharing workflows.