# src/glyphs

SMuFL glyph table + font metadata loader (Bravura or any SMuFL-compliant
font). Single source of truth for glyph codepoints and engraving-default
metrics (stem thickness, notehead anchor points) -- other modules read from
here instead of hardcoding magic numbers.

See PLAN.md Phase 5 and `../../Doc/phase-05-smufl-glyph-table.md` for the
full record. Main entry point: `getGlyph(name)` in `glyph-table.ts`.
