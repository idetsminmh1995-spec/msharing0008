# Data sources

- **`glyphnames.json`** — from the SMuFL (Standard Music Font Layout)
  specification, https://github.com/w3c/smufl (branch `gh-pages`,
  `metadata/glyphnames.json`). The canonical list of every standard SMuFL
  glyph name and its Unicode Private Use Area codepoint -- font-independent.

- **`bravura_metadata.json`** — from the Bravura font distribution,
  https://github.com/steinbergmedia/bravura (tag `bravura-1.380`,
  `redist/bravura_metadata.json`). Bravura is the reference SMuFL font,
  designed by Steinberg for Dorico, released under the SIL Open Font
  License 1.1 (see that repo's `LICENSE.txt`). This file provides
  Bravura-specific engraving defaults (stem/beam/staff-line thickness,
  etc.) and per-glyph bounding boxes and stem-attachment anchor points.

Both are used as read-only reference data — see `../glyph-table.ts` for the
loader (Phase 5).
