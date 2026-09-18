# MusicNote — Website

Plain, static HTML/CSS site (no build step, no framework). Ready to
deploy directly to Cloudflare Pages from this repo.

## Pages

| URL | File |
|---|---|
| `/` | `index.html` — home page (notes/courses storefront) |
| `/video-create/` | `video-create/index.html` — instrument-selection hub |
| `/video-create/drum/` | `video-create/drum/index.html` — Drum video creation page |

Only **Drum** is wired live right now; the other 8 instrument boxes on
`/video-create/` show a "SOON" badge and aren't linked yet, matching
the current build-out order in `WebApp_Requirements_Notes.md`.

## Cloudflare Pages deployment settings

When connecting this repo in the Cloudflare Pages dashboard:

- **Build command:** *(leave empty — nothing to build)*
- **Build output directory:** `website`
- **Root directory:** *(repo root — leave default)*

Every push to `main` will redeploy automatically once connected.

## Status

This is a **visual mockup / static prototype**, converted from a design
draft. Nothing here talks to Supabase, Cloudflare Workers, R2, or any
of the actual engines yet — form fields and buttons don't submit
anywhere, and the drum-kit/upload/preview panel on the Drum page is a
static illustration of the intended UI, not the real, working
`web-preview/canvas-preview.html` app (which is a separate, already-
functional tool elsewhere in this repo).
