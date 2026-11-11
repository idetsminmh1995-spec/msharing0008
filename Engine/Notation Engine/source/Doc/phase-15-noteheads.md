# Phase 15 — Noteheads + the Shape-Mapping System

**Status:** complete and verified (112/112 tests pass, including a visual
snapshot confirming all three selection tiers on real drum-notation-style
noteheads).

## 1. What was written

**`src/geometry/notehead.ts`** (selection logic, no SVG):
- **`SHAPE_GLYPHS`** — every shape family from §9.7's list, each mapped to
  its 3 real whole/half/black SMuFL glyph names, verified against
  `glyphnames.json` before writing (two shapes don't follow the obvious
  naming pattern: circle-x's filled variant is plain `noteheadCircleX`,
  not `noteheadCircleXBlack`; square has no half-specific glyph, so half
  falls back to the white/open one).
- **`shapeGlyphName(shape, durationType)`** — the duration-appropriate
  glyph for a shape family (e.g. `'x'` + a quarter note →
  `'noteheadXBlack'`). Throws for an unrecognized shape name.
- **`durationDefaultNotehead(durationType)`** — priority 3 (lowest) of
  §9.7's selection order: whole/half stay open, everything shorter fills.
- **`musicXmlNoteheadToShape(value)`** — maps a MusicXML `<notehead>`
  value to a shape-family key. `'normal'` returns `undefined` on purpose
  — per the MusicXML spec it means "use the ordinary duration-based
  notehead", so it is **not** an override, not an error. A genuinely
  unrecognized value (e.g. one of the shape-note solfège heads, `'cluster'`)
  **throws** rather than silently falling back — the file asked for
  something specific; pretending it didn't would be worse than saying so.
- **`noteheadMappingKey(pitch, midiNote?)`** — the unified key from §9.7:
  unpitched + known GM MIDI note → that number as a string (`"38"` for
  snare); unpitched without one → `"<displayStep><displayOctave>"`;
  pitched → `"<step><octave>"`. One scheme, no separate drum-vs-pitched
  systems.
- **`selectNoteheadGlyphName(input)`** — the full priority chain: explicit
  XML notehead (if not `'normal'`) → config override by key → duration
  default.

**`src/render/notehead.ts`**:
- **`noteheadWidth(glyphName)`** — real width from the glyph's Bravura
  bounding box (for a future Phase 16 stem attachment, and already usable
  with Phase 14's ledger lines).
- **`renderNotehead(glyphName, options)`** — draws the glyph via Phase 6's
  `svgGlyphText`.

## 2. How this was verified

Ran `npm run verify` clean, 112/112. Specifically, the plan's own four
named test cases:
- **Duration-default selection** — whole/half/quarter/eighth each produce
  the correct glyph.
- **An XML `<notehead>x</notehead>` overriding it** — including confirming
  the override still respects the NOTE's own duration fill (a whole note
  with an `x` override correctly gets `noteheadXWhole`, not always the
  black variant).
- **A config override overriding *that*** — actually the reverse priority
  check: confirmed a config override applies when no XML notehead is
  given, and confirmed an XML notehead present still wins over a config
  override for the same note (both directions of the priority chain
  tested, not just one).
- **An unknown key falling back cleanly** — a config map that doesn't
  contain the note's key produces the plain duration default, not an
  error.

Plus: `'normal'` confirmed to fall through rather than override; an
unrecognized MusicXML value confirmed to throw; `noteheadMappingKey`
checked for all three of its cases (MIDI-numbered unpitched, displayStep-
keyed unpitched, pitched); circle-x's non-obvious glyph names confirmed
directly.

A visual snapshot renders three drum voices on one percussion staff: a
plain kick (duration default → `noteheadBlack`, `U+E0A4`), a hi-hat with a
config override (→ `noteheadXBlack`, `U+E0A9`), and a note with both a
config override AND an explicit XML notehead (→ `noteheadDiamondBlack`,
`U+E0DB` — confirming the XML override wins over the config override even
when both are present on the same note, not just in isolation).

## 3. How to modify it

- **Add a new shape family** (e.g. the shape-note solfège heads) — add its
  3-glyph entry to `SHAPE_GLYPHS` and its MusicXML value case to
  `musicXmlNoteheadToShape`; nothing else changes.
- **Change the mapping key scheme** — `noteheadMappingKey` is the only
  place that decides it; `config.noteheadMapping`'s shape (§8) doesn't
  need to change to support a different scheme, only this function.

## 4. How to revert/remove it

Delete `src/geometry/notehead.ts`, `src/render/notehead.ts`,
`test/unit/notehead.test.js`, and the `notehead-selection-variants.snap`
file; remove their `export * from` lines from `src/geometry/index.ts` and
`src/render/index.ts`; remove the added test case from
`test/visual/rendering.test.js`.
