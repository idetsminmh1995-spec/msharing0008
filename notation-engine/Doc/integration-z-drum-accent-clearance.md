# Integration Z — drum accent and strong-accent clearance

**Status:** complete. `npm run verify` passes 1057/1057.

## User-visible change

For unpitched drum notes, MusicXML `<accent/>` (`>`) and
`<strong-accent/>` (`^`) now render in the shared upper articulation lane,
above the possible stem and beam reach. They no longer sit merely one staff
space above the notehead, where an up-stem hand pattern could cover the mark.

Pitched notation keeps the normal opposite-stem articulation rule. Marcato
(`strong-accent`) remains above for pitched notation as required by the
existing articulation rule.

## Implementation

`renderNoteMarks` identifies unpitched notes from the core pitch union. Before
placing drum articulations, it reserves the same `STEM_AND_BEAM_ALLOWANCE`
used by the renderer's content-clearance calculations. The articulation glyph
is then placed above that reserved reach, while multiple marks continue to
stack through the existing upper cursor.

This is intentionally a placement rule, not a new drum-specific glyph. The
existing SMuFL `articAccentAbove` and `articMarcatoAbove` glyphs remain the
source of truth.

## Regression coverage

The articulation wiring suite now covers both:

- a plain drum accent and strong accent, asserting that neither uses a below
  glyph; and
- a correctly beamed four-eighth-note drum hand pattern, asserting that both
  marks have a smaller SVG `y` than the rendered beam.

The complete repository verification suite passed with 1057 tests.
