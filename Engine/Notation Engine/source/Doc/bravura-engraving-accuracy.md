# Bravura engraving accuracy and limits

## Why a correct font is only one part of correct notation

Bravura supplies a standards-based set of music glyphs and font-specific engraving data. It does not decide whether a source note is on the right staff position, which accidental a notation convention requires, or how every collision should be resolved. The engine therefore treats semantic parsing, glyph selection, glyph metrics, and page layout as separate accuracy problems. A Bravura glyph can be the correct shape while the final score is still wrong if an input attribute was discarded or the layout algorithm ignored the glyph's real ink bounds.

## Pinned glyph and metric data

The engine now uses the release-matched Bravura 1.482 font and metadata, implementing SMuFL 1.4. The canonical glyph-name table is independent of the font; `bravura_metadata.json` supplies Bravura's published engraving defaults, glyph advance widths, bounding boxes, and anchors. A generated cmap/hmtx manifest is tied to the exact bundled font by SHA-256. Regression tests compare the engine metadata with the real font files and verify that the font, metadata, and declared version agree. See [`src/glyphs/data/SOURCES.md`](../src/glyphs/data/SOURCES.md) for release tags, licensing, hashes, and regeneration steps.

The renderer uses the right metric for the right job. Advance widths move successive glyphs in digit and text-like runs such as time signatures, tempo marks, and tablature frets. Ink bounding boxes place shapes that must clear one another, including notehead parentheses and accidental brackets/parentheses. Where glyphs have negative or nonzero side bearings, the renderer accounts for those bearings rather than treating the visible width as the glyph origin. Bravura anchors and engraving defaults remain available as source data; not every anchor is yet consumed by every drawing path.

## MusicXML fidelity improvements in this change

MusicXML notehead values are mapped to Bravura notehead glyphs; `filled="yes|no"` now overrides the duration-based fill for the supported ordinary notehead path, and `parentheses="yes"` draws the actual SMuFL parenthesis glyphs around the notehead. Accidental parentheses/brackets are preserved and rendered for ordinary notes, grace notes, and chord members. Their horizontal positions are composed from the actual Bravura ink bounds. An explicit rest `<display-step>`/`<display-octave>` pair affects its rendered staff position; incomplete or invalid pairs do not claim an explicit position.

An explicit MusicXML notehead `smufl` value is accepted only when it resolves to a Bravura glyph in the SMuFL notehead blocks (U+E0A0–U+E0FF or U+EEA0–U+EEDF). Left/right parenthesis wrappers and non-notehead glyphs such as clefs are rejected with `UNKNOWN_NOTEHEAD_SMUFL`; the renderer falls back to the MusicXML notehead value or duration default instead of silently drawing a wrong symbol.

The MusicXML parser also retains fractional `<alter>` values and note-level SMuFL accidental glyph requests covered by the supported resolver. Percussion inputs now validate malformed display coordinates and GM MIDI note identifiers, emit actionable diagnostics, and preserve explicit source staff positions rather than silently substituting a drum-map position. Details about the boundary between staff notation and independent global notation systems are in [`international-notation-support.md`](international-notation-support.md).

## Regression evidence

The tests cover release/hash consistency, font cmap coverage, glyph codepoints, Bravura advances versus OpenType `hmtx`, notehead fill/wrapper selection, accidental wrapper ink clearances (including side bearings), explicit rest positions, fractional and named accidentals, tablature digit advances, tempo-mark advances, and percussion parsing/rendering. The full supported validation command is `npm run verify` from this package; browser pages also need the generated engine bundle refreshed from `dist/notation-engine.js` when renderer source changes.

## Explicit limits

This is not a claim that every world notation or every MusicXML presentation feature is now exact. `clef-octave-change` is not yet parsed; note-level `default-x/default-y` engraving coordinates are not generally retained; `notehead-text` and arbitrary text-font styling are not fully engraved; and many MusicXML placement, collision, cross-staff, and system-break rules remain outside current coverage. Grace notes use precomposed Bravura figures, so some note-level modifications that require decomposing those figures are not yet supported.

The renderer's horizontal/vertical spacing and collision algorithms are still a custom engraving implementation, not MuseScore or another mature notation application's layout engine. Accurate glyph data improves the source material and measured placement, but does not make optical spacing, all chord columns, all multi-voice collisions, every clef, or every tradition-specific rule automatically correct. The current product is a Bravura-based MusicXML staff-notation engine, not a universal notation interpreter. Claims of broader accuracy need independently sourced rules, source scores from each tradition, visual comparisons against trusted engravers, and new regression fixtures.

## Primary references

- [SMuFL specification: glyph advance widths](https://w3c.github.io/smufl/latest/specification/glyphadvancewidths.html), [glyph bounding boxes](https://w3c.github.io/smufl/latest/specification/glyphbboxes.html), [glyph anchors](https://w3c.github.io/smufl/latest/specification/glyphswithanchors.html), and [engraving defaults](https://w3c.github.io/smufl/latest/specification/engravingdefaults.html).
- [SMuFL noteheads](https://w3c.github.io/smufl/latest/tables/noteheads.html) and [notehead supplement](https://w3c.github.io/smufl/latest/tables/noteheads-supplement.html); [SMuFL clefs](https://w3c.github.io/smufl/latest/tables/clefs.html).
- [Bravura 1.482 release](https://github.com/steinbergmedia/bravura/releases/tag/bravura-1.482) and [release-tagged font-specific metadata](https://raw.githubusercontent.com/steinbergmedia/bravura/bravura-1.482/redist/Bravura.json).
- MusicXML 4.0 [`<notehead>`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/notehead/), [`<rest>`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/rest/), [`<accidental>`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/accidental/), and [`<clef-octave-change>`](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/clef-octave-change/).
