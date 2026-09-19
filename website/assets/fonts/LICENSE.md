# Bravura (bundled font)

`Bravura.woff2` is the reference SMuFL music font, by Steinberg.

- **Source:** https://github.com/steinbergmedia/bravura, tag
  `bravura-1.380`, file `redist/woff/Bravura.woff2`
- **License:** SIL Open Font License 1.1 (see that repository's
  `LICENSE.txt`)

**Why it is committed here rather than downloaded at build time:** the
drum-video web app is served as static files from GitHub Pages, which has
no build step. The Notation Engine emits `font-family="Bravura"` in its
SVG output (the glyph metrics in
`src/glyphs/data/bravura_metadata.json` are Bravura's own), so without
this file in the repo every notehead, clef, rest and accidental renders
as a blank box in the browser.

The version here must stay in sync with the metadata JSON's version —
both currently come from tag `bravura-1.380`.
