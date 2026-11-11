# Fermata rendering — MusicXML to Bravura

**Status:** implemented and covered by parser, geometry and end-to-end rendering tests.

The engine previously parsed `<fermata>` into a boolean but did not draw it. This pass completes that path for notes, chords and rests. It keeps MusicXML's orientation (`upright` or `inverted`) and draws the normal fermata using its exact above/below Bravura glyph. Empty shape content means normal, and omitted orientation means upright, matching MusicXML's defaults.

`src/geometry/fermata.ts` chooses the exact Bravura glyph. MusicXML's shape names (including `angled`, `square`, `double-angled`, `double-square`, `double-dot`, `half-curve` and `curlew`) are not the same as Bravura's short/long glyph variants. Since this renderer currently has an exact mapping only for `normal`, other non-empty shapes are not silently mapped to a visually different symbol: the parser emits `UNSUPPORTED_FERMATA_SHAPE` and the renderer uses the normal glyph as a visible fallback. Unknown `type` values likewise emit `UNSUPPORTED_FERMATA_TYPE` and use the default upright orientation. Mark placement uses a consistent 1.5 staff-space clearance; the above and below positions are selected from the source orientation.

The work extends `Note` and `Rest` with optional `fermataPlacement` and `fermataShape` fields while retaining `hasFermata` for compatibility. The additional fields remain absent on scores without fermatas, preserving existing output and snapshots.

Verification includes unit coverage for both exact normal glyph mappings, parser coverage for default and inverted forms and unsupported-shape diagnostics, and end-to-end SVG assertions for fermatas on notes and rests.

References: MusicXML defines an empty fermata as normal and defaults its type to upright [MusicXML 4.0 fermata element](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/fermata/); the complete content vocabulary is specified by the [MusicXML 4.0 fermata-shape data type](https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/fermata-shape/). AlphaTab identifies rendering notation and interactive score output as core engine capabilities [AlphaTab features](https://alphatab.net/docs/features/render/).
