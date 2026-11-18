# src/glyphs

SMuFL glyph table + font metadata loader (Bravura or any SMuFL-compliant
font). Single source of truth for glyph codepoints and engraving-default
metrics (stem thickness, notehead anchor points) -- other modules read from
here instead of hardcoding magic numbers.

Main entry point: `getGlyph(name)` in `glyph-table.ts`. The engine's
generated API reference is at
`../Notation Plan/Documentation/API.md`.
