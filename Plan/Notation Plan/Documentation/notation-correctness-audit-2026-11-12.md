# Notation Engine correctness audit — 2026-11-12

## Confirmed MusicXML timing defects

The audit compared the MusicXML parser with the official MusicXML 4.0 element reference and inspected the parser and its unit tests. It found that `attributes.ts` and `note.ts` used integer parsing for `<divisions>` and `<duration>`, and the `<backup>`/`<forward>` branches did the same. MusicXML's `divisions` datatype is based on XML `decimal`; integers are preferred, not required. The XML helper `numberOf` already accepts finite decimal values, and the engine's normalized tick model permits fractional ticks. It is a JavaScript IEEE-754 number model rather than exact rational decimal arithmetic, so tiny representation/cumulative error is still a verification concern. The defect was parser truncation before conversion, not inability to represent fractional ticks at all.

The parser also placed `<direction>` and `<harmony>` records at the current cursor without applying their `<offset>`. MusicXML defines offsets in divisions relative to the current measure-local position. The `sound` attribute on offset controls whether the shift also affects playback; absent/`no` offsets are visual-only. The parser should preserve separate visual and playback ticks where needed and must not advance the note cursor for a marking.

## Other confirmed gaps to keep visible

The current harmony parser keeps only a simple root/kind/bass tuple. MusicXML 4.0 allows one or more stacked harmony-chords, with root, numeral, or deprecated function; degree, inversion and other fields can be present. Until the engine model and renderer support a form, it must either preserve that form in the parsed representation or issue a clear diagnostic rather than returning an incomplete success-shaped record.

Additional scoped audits found that non-traditional key signatures and `<clef-octave-change>` are not represented by the current `AttributesUpdate`; MusicXML guitar bends are not parsed from `<technical>`; and the percussion rendering path overrides explicit down stems with its default up-stem policy. Each requires a separate minimal fixture and a product decision on display precedence before implementation. These are not claimed fixed by the timing work.

`unzipMxl` currently expands the complete archive with `unzipSync` without explicit archive-byte, entry-count, per-entry, or total-expanded-size ceilings. XML parser errors also need a stable diagnostic. This requires a streaming/limited decompression approach; a post-expansion size check alone would not be a sufficient memory-safety fix. Upload-route limits were not established by this code audit and must be checked separately.

Engraving audits also found current limits: text width is estimated rather than measured in the final font; collision/skyline wiring and visible-ink bounds have test gaps; beam refinements depend on a stated house style. The existing phase 55–60 work (text, selected marks, transpose/pedal, cue/octave shifts, slides/glissandi and visual polish) remains completed. The merged 44130 missing-head/beam fixes and 115 BPM covered-rest fix remain closed.

## Additional notation formats

The inspected public API and upload path support MusicXML/MXL; no MEI, ABC, or Humdrum `**kern` parser was found. ABC 2.1 is a plausible later bounded text-notation adapter. MEI has broader scholarly/document scope; Humdrum `**kern` is primarily an analytical symbolic representation rather than a page-engraving interchange format. No alternate format is implemented in this timing-focused change; MusicXML semantic correctness takes priority.

## Sources

- [1]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/divisions/ "MusicXML 4.0 divisions element"
- [2]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/positive-divisions/ "MusicXML 4.0 positive-divisions data type"
- [3]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/duration/ "MusicXML 4.0 duration element"
- [4]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/offset/ "MusicXML 4.0 offset element"
- [5]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/ "MusicXML 4.0 direction element"
- [6]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/harmony/ "MusicXML 4.0 harmony element"
- [7]: https://www.w3.org/2021/06/musicxml40/tutorial/compressed-mxl-files/ "MusicXML 4.0 compressed MusicXML tutorial"
- [8]: https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html "OWASP XML External Entity Prevention Cheat Sheet"
- [9]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/key/ "MusicXML 4.0 key element"
- [10]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef/ "MusicXML 4.0 clef element"
- [11]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/technical/ "MusicXML 4.0 technical element"
- [12]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/stem/ "MusicXML 4.0 stem element"
- [13]: http://abcnotation.com/wiki/abc:standard:v2.1 "ABC notation standard 2.1"
- [14]: https://music-encoding.org/guidelines/v4/content/introduction.html "MEI Guidelines v4 introduction"
- [15]: https://www.humdrum.org/Humdrum/representations/kern.rep.html "Humdrum **kern representation"
- [16]: https://www.w3.org/2021/06/musicxml40/musicxml-reference/data-types/divisions/ "MusicXML 4.0 divisions datatype (decimal base type)"


## Implementation result on the review branch

The focused correction is implemented in `Engine/notation-engine/src/parser/musicxml/attributes.ts`, `note.ts`, `harmony.ts`, and `parse.ts`. It parses decimal divisions/note durations and decimal backup/forward durations, applies visual direction/harmony offsets without changing note cursor advancement, separates tempo visual timing from playback timing according to `offset/@sound`, retains fractional root/bass alterations, and warns on selected unsupported harmony structures. The new `Engine/notation-engine/test/unit/musicxml-fractional-offsets.test.js` contains seven targeted regressions. The targeted parser run passed 88 tests with 0 failures; full `npm run verify` passed **1,136/1,136 tests across 208 suites**, with 0 failures/skips and typecheck, lint, format and API-document checks passing. The branch is `manus/musicxml-fidelity-offsets-fractions` and is not yet on main.

This implementation does not close all audit items. It diagnoses but does not fully preserve/render numeral or function harmonies, stacked chords, degrees, inversions and frames. MXL expansion limits, XML/runtime policy, MIDI boundary validation, clef/default positioning, other note-child coverage, drum precedence/geometry, broader producer fixtures, and alternate notation-format adapters remain separate work. No claim of universal MusicXML or “any note file” support is made.
