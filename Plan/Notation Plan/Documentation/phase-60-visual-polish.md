# Phase 60 — Visual engraving polish

**Status:** complete.

This pass used the SMuFL engraving defaults and MuseScore-style spacing principles as the visual reference. SMuFL defines the staff space as the common unit and recommends a thin staff line/stem relationship with substantially heavier beams; the engine already used those exact Bravura defaults (`staffLineThickness` 0.13, `stemThickness` 0.12, `beamThickness` 0.5, `beamSpacing` 0.25). The audit therefore avoided arbitrary rescaling of correct noteheads and instead fixed the visible page-edge defect around the first system.

## Change

Scroll-mode SVG output now has a one-staff-space optical inset on both sides. The drawing remains in the same notation coordinates, while the viewBox starts at `x=-1` and grows by three staff spaces. This keeps the left overhang of the first clef, system-start bar number and other header glyphs visible instead of clipping them at `x=0`; the right side receives the same breathing room for balance.

`createSvgDocument` now supports an optional `viewBoxMinX`, and the pure-scale resize parser accepts negative viewBox origins without changing its public width/height contract. Page-mode output keeps the page's own coordinate system and margins unchanged.

## Design principles retained

- Noteheads remain Bravura's oval glyphs, with real SMuFL stem anchors rather than hand-tuned rectangles.
- Staff lines and stems remain close in weight, while beams remain about four times the stem weight, matching standard engraving guidance.
- Ledger-line extension and thickness continue to come from SMuFL engraving defaults.
- Staff-space coordinates remain the single source of truth, so resizing changes pixels without changing note proportions or spacing.

## Validation

The focused layout/resize tests pass, the visual regression suite passes after snapshot refresh, and the full verification gate remains green. The updated QA render is available as `/home/ubuntu/note-marks-polished.png`.

References: [SMuFL engraving defaults](https://www.w3.org/2019/03/smufl13/specification/engravingdefaults.html), [MuseScore score size and spacing](https://handbook.musescore.org/formatting/score-size-and-spacing), [Open Music Theory note placement](https://viva.pressbooks.pub/openmusictheory/chapter/notation-of-notes-clefs-and-ledger-lines/).
