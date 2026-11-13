# src/render

Builds the actual SVG DOM/markup from the geometry computed in
src/geometry. This is the only layer that touches SVG elements directly.

See PLAN.md Phase 6 and `../../Doc/phase-06-svg-primitives.md` for the full
record. Main entry points: `svgLine`/`svgPath`/`svgRect`/`svgText`/
`svgGroup`/`svgGlyphText`/`createSvgDocument` in `svg-primitives.ts`.
