# MusicNote — Website

Plain, static HTML/CSS site (no build step, no framework). Ready to
deploy directly to Cloudflare Pages from this repo.

## Pages

| URL | File |
|---|---|
| `/` | `index.html` — home page (notes/courses storefront) |
| `/video-create/` | `video-create/index.html` — instrument-selection hub (9 boxes) |
| `/video-create/drum/` | Drum upload &amp; create page |
| `/video-create/piano/` | Piano upload &amp; create page |
| `/video-create/guitar/` | Guitar upload &amp; create page |
| `/video-create/bass-guitar/` | Bass Guitar upload &amp; create page |
| `/video-create/violin/` | Violin upload &amp; create page |
| `/video-create/viola/` | Viola upload &amp; create page |
| `/video-create/cello/` | Cello upload &amp; create page |
| `/video-create/bass-cello/` | Bass Cello upload &amp; create page |
| `/video-create/vocal/` | Vocal upload &amp; create page |

Every instrument box on `/video-create/` now links to its own real
page — each with an Upload File area (MusicXML / MIDI / Audio), so the
full navigation flow (Home → Video Create → pick an instrument → reach
the upload area) can be clicked through end to end once deployed.

## Cloudflare deployment settings

This Cloudflare account's Pages build system uses the newer, unified
Workers + static-assets model rather than a classic "build output
directory" field, so this folder carries its own `wrangler.jsonc`
declaring itself as a static-assets Worker. Settings in the dashboard:

- **Root directory:** `website`
- **Build command:** *(leave empty)*
- **Deploy command:** `npx wrangler deploy`

Every push to `main` will redeploy automatically once connected.

### After changing an engine bundle

The pages load the engines straight from `assets/`, so a browser that
already has one keeps running the OLD bundle until its cache lets go —
long enough for a change to look like it simply did not work. The
filenames cannot carry a hash (these pages are hand-written and there is
no build step), so the query string does it instead. After copying a
`dist/` bundle into `website/assets/`, run:

```
node tools/stamp-assets.mjs
```

It rewrites every `<script src=".../assets/*.js?v=...">` to a short hash
of the file it points at: a bundle that changed gets a URL that changed,
one that did not keeps its URL and stays cached. `--check` writes
nothing and exits non-zero if a page is pointing at a stale bundle.

## Status

This is a **visual mockup / static prototype**, converted from a design
draft. Nothing here talks to Supabase, Cloudflare Workers, R2, or any
of the actual engines yet — form fields and buttons don't submit
anywhere, and every upload/preview panel is a static illustration of
the intended UI, not the real, working `web-preview/canvas-preview.html`
app (which is a separate, already-functional tool elsewhere in this
repo). Drum's page carries a bit more illustrated detail (its own kit
selector, a filled-in preview) since it was built first; the other 8
instrument pages share one simpler template (upload area, titles, a
generic preset dropdown, video style, an empty preview) with only the
labels, icon, and engine name swapped per instrument.
