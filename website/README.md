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
anywhere, and every upload/preview panel is a static illustration of
the intended UI, not the real, working `web-preview/canvas-preview.html`
app (which is a separate, already-functional tool elsewhere in this
repo). Drum's page carries a bit more illustrated detail (its own kit
selector, a filled-in preview) since it was built first; the other 8
instrument pages share one simpler template (upload area, titles, a
generic preset dropdown, video style, an empty preview) with only the
labels, icon, and engine name swapped per instrument.
