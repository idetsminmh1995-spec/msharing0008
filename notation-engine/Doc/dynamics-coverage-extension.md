# Static dynamic coverage extension

**Status:** implemented; parser, glyph, and end-to-end rendering tests cover the supported tokens.

The engine already rendered AlphaTab's documented static set (`ppp` through `fff`), plus `sfz`, hairpins, and note articulations. This follow-up broadens static MusicXML directions where the bundled Bravura font has a corresponding named SMuFL glyph. It adds the six-level piano and forte extremes and supported compound markings such as `fp`, `sfp`, `sfpp`, `sffz`, `fz`, `n`, `pf`, `rf`, and `sfzp`.[1] [2] [3]

The additions flow through both matching unions and maps: `ParsedDynamicLevel`/`DYNAMIC_ELEMENTS` in `parser/musicxml/direction.ts`, and `DynamicLevel`/`GLYPH_NAMES` in `geometry/dynamic.ts`. Several `<dynamics>` children in one direction remain separate glyphs and keep their existing left-to-right compound placement. Tests assert that all 25 mapped values resolve to distinct glyphs that exist in the bundled font, parse without diagnostics, and render `ffff` plus `fp` as correctly spaced marks.

Two MusicXML values remain deliberately unsupported. `rfz` has multiple similarly named SMuFL rinforzando variants but no mapping is established here, so the parser reports `UNSUPPORTED_DYNAMIC` rather than guessing. `<other-dynamics>` can carry arbitrary text, for which this engine still has no general text-font path; it receives the same explicit diagnostic.

References

[1]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/dynamics/ "MusicXML 4.0 dynamics element"
[2]: https://alphatab.net/docs/features/render/coverage-dynamics "AlphaTab dynamics, hairpins and accents"
[3]: https://w3c.github.io/smufl/latest/tables/dynamics.html "SMuFL dynamics glyph table"
