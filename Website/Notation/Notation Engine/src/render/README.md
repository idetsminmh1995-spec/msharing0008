# src/render

Builds the actual SVG DOM/markup from the geometry computed in
src/geometry. This is the only layer that touches SVG elements directly.

Main entry points: `svgLine`/`svgPath`/`svgRect`/`svgText`/`svgGroup`/
`svgGlyphText`/`createSvgDocument` in `svg-primitives.ts`. The engine's
generated API reference is at
`../Notation Plan/Documentation/API.md`.
