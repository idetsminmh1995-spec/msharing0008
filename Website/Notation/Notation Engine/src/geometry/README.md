# src/geometry

Pure functions only -- no SVG, no DOM. Staff-position math, glyph metrics,
beam-slope calculation, spacing/formatting math. Everything here is
unit-testable without rendering anything.

Each notation element's *geometry* lives here; the matching *drawing*
lives in src/render. The measurements themselves come from
`src/notation-defaults/engraving-style.ts`.

`staff.ts`: `computeStaffGeometry(numLines)` -- staff line y-positions for
any line count (1-6+), bottom line always at y=0. The places that still
assume five lines are tracked in `../Notation Plan/PLAN.md` Part F.
