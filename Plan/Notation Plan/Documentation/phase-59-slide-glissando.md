# Phase 59 — Slides and glissandi

**Status:** complete. The final note-level MusicXML gap from the Phase 56 audit is now implemented and tested.

## What was missing

The parser already preserved `slideStart`/`slideStop` booleans, but the renderer never consumed them. That meant a guitar `<slide>` and a pitched `<glissando>` were parsed and then disappeared from the page. The missing work was not a glyph lookup: both marks are spans between two note anchors and therefore must be resolved only after note/chord/tab positions are known.

## Implementation

- Preserved source kind through the parser and core model as `slideStartKind` / `slideStopKind` (`slide` or `glissando`). Existing boolean fields remain compatible.
- Added pure geometry in `src/geometry/slide.ts`.
- Added renderers in `src/render/slide.ts`:
  - `<slide>` is a straight diagonal line.
  - `<glissando>` is a visibly distinct wavy path.
- Added endpoint pairing after note positions are computed, covering pitched notes, chord anchors and tablature notes. Tab endpoints are matched by string identity so a slide cannot connect unrelated strings.
- Added diagnostics for unmatched starts/stops, incompatible endpoints and spans that would cross a system boundary rather than drawing a misleading line through a restarted coordinate system.
- Exported the new geometry/render APIs through the normal public indexes.

## Tests

`test/unit/slide-glissando.test.js` covers source-kind preservation, straight versus wavy SVG output and unmatched-stop diagnostics. The existing parser Tier 2/3 expectation was corrected: `<glissando>` is a supported note notation, not `UNKNOWN_ELEMENT`.

The complete package test suite now passes **1,129/1,129** tests across 206 suites. Typecheck, lint and build also pass.

## Scope boundary now closed

The remaining-note audit from Phase 56 listed slides/glissandi, cue notes, octave-shift, pedals and transpose. Phases 57–59 close all five items:

- Phase 57: `<transpose>` metadata and sounding-pitch helper; pedal parsing and below-staff rendering.
- Phase 58: cue-note metadata/scaling; octave-shift parsing, matching, labels, brackets and layout reservation.
- Phase 59: slide/glissando endpoint pairing and rendering.

The engine now does not silently discard these note/direction families. Unsupported or malformed cases produce stable diagnostics instead of disappearing.
