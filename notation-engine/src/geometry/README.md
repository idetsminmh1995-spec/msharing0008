# src/geometry

Pure functions only -- no SVG, no DOM. Staff-position math, glyph metrics,
beam-slope calculation, spacing/formatting math. Everything here is
unit-testable without rendering anything.

See PLAN.md §9 -- each notation element's *geometry*
lives here; the matching *drawing* lives in src/render.

`staff.ts` (Phase 9): `computeStaffGeometry(numLines)` -- staff line
y-positions for any line count (1-6+), bottom line always at y=0. See
`../../Doc/phase-09-staff-stave-rendering.md`.
