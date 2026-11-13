# Data sources

- **`glyphnames.json`** — the SMuFL 1.4 canonical glyph-name table from the
  W3C Music Notation Community Group's `w3c-cg/smufl` repository, tag `v1.4`
  (commit `753f551ca6f96bf24ba38aa2d8a317e706238c51`):
  <https://raw.githubusercontent.com/w3c-cg/smufl/v1.4/metadata/glyphnames.json>.
  It is font-independent and maps standard SMuFL names to codepoints.

- **`bravura_metadata.json`** — Bravura 1.482's official font-specific
  metadata from Steinberg's `steinbergmedia/bravura` repository, tag
  `bravura-1.482` (commit `37b194378b710cc40e406ab6c4b07608bb9548ae`):
  <https://raw.githubusercontent.com/steinbergmedia/bravura/bravura-1.482/redist/Bravura.json>.
  It includes engraving defaults, advance widths in staff spaces, bounding
  boxes, anchors and other metadata. Bravura 1.482 implements SMuFL 1.4.

- **Bundled `Bravura.woff2`** — the matching official font from the same
  Bravura tag:
  <https://raw.githubusercontent.com/steinbergmedia/bravura/bravura-1.482/redist/woff/Bravura.woff2>.
  Identical copies are kept in `notation-engine/dist/fonts/` and
  `website/assets/fonts/`; both have SHA-256
  `e68df66446e3ffa6f474ce9eb2949e938102406f12d8f40ad8754398c50f55d4`.
  The font and metadata are distributed under the SIL Open Font License
  1.1; see the release-tagged
  <https://github.com/steinbergmedia/bravura/blob/bravura-1.482/LICENSE.txt>.

- **`bravura_font_metrics.json`** — generated from the bundled Bravura 1.482
  WOFF2 by `../../../scripts/generate-bravura-font-metrics.py` using fontTools.
  It records Unicode cmap codepoint coverage and the corresponding raw
  OpenType `hmtx` advance widths, tied to the font SHA-256 above. Recreate it
  from `notation-engine/` with
  `python3 scripts/generate-bravura-font-metrics.py` after installing
  fontTools. Runtime lookup uses this manifest to reject codepoints absent
  from the bundled font. The exposed `GlyphInfo.advanceWidth` comes from
  Bravura's official metadata and is in staff spaces.

The glyph table loads these read-only sources; see `../glyph-table.ts`.
