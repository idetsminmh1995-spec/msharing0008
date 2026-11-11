# Integration Pass C — Tablature fret numbers

**Status:** complete. 451/451 tests pass. A guitar tab staff now draws
real fret numbers on their own string lines, including multi-digit frets
and open strings.

**Not a numbered plan phase** — a corrective/integration pass, following
A (grand staff) and B (multi-part + per-staff line counts), which
together made the tab staff *appear*. C fills it in.

## 0. The one thing worth checking first, and the surprise

C was originally scoped as "needs the general text-font system Phases
31/32/33 are all waiting on." Checking the real glyph table first showed
that is **not** true for tab: fret numbers are digits only, and SMuFL
provides real digit glyphs with real metrics. Unlike lyrics or chord
symbols (arbitrary words), nothing here needs a text font at all.

Two candidate digit families existed; the choice is not arbitrary:
- `luteItalianFret0-9` — specifically **Italian lute tablature**, a
  different historical system, not modern guitar tab. Rejected.
- `fingering0-9` — plain digits designed for the same staff scale. Used.

**A real trap, caught by checking rather than assuming:** these
codepoints are **not contiguous**. `fingering0-5` sit at U+ED10..U+ED15,
but `fingering6-9` jump to U+ED24..U+ED27. Computing a codepoint as
`fingering0 + n` — the obvious implementation — would have silently
produced four wrong glyphs. The table is keyed by name instead, and a
test asserts 6-9 specifically for this reason.

## 1. The convention, verified before implementing

Confirmed unanimously across LilyPond's own notation reference, Berklee,
Yamaha, and Acoustic Guitar, with no source disagreeing:

- **String 1 is the TOP line; the highest-numbered string is the BOTTOM
  line.** This is the mirror of what a player sees looking down at the
  instrument, and the opposite of what "string 1 = first line" would
  suggest — worth stating explicitly because getting it backwards would
  produce plausible-looking but completely wrong tab.
- A number is placed **directly on its string's line**, with `0` meaning
  an open string.
- Tab sits below standard notation, vertically aligned with it.

## 2. What was built

**`geometry/tab.ts`**
- `tabStringPosition(stringNumber, numLines)` → `stringNumber - numLines`,
  giving string 1 → -5 and string 6 → 0 on a 6-line staff, in Phase 9's
  existing coordinate convention. Adapts to a 4-line bass-guitar staff
  with no special-casing. Throws for a string the staff doesn't have,
  rather than drawing off-staff.
- `fretDigitGlyphNames(fret)` → the glyph names spelling the number, most
  significant digit first. Returns an **array**, because a 24-fret guitar
  genuinely reaches two digits.

**`render/tab.ts`** — `renderTabNumber`. Real engraving *breaks* the
staff line where a number sits; the current per-measure draw order draws
staff lines before it knows any number's position, so this masks instead:
a rectangle in the page's own `BACKGROUND_COLOR` (the renderer already
paints a real background, so this is safe and not an assumption about
white paper), then the digits over it. Digit x-advance comes from the
real font bounding boxes, so `12` is spaced and centred as two digits
rather than overprinted.

**Parser** — `<notations><technical><string>` and `<fret>` parsed onto
`ParsedNoteEvent`, mirrored onto the core `Note` type, and threaded
through `buildSingle`, following the exact pattern every earlier
per-note field already established.

**`render-from-musicxml.ts`** — a tab clef no longer skips its notes. It
gets its own branch computing the **same** horizontal timeline as the
pitched branch, so a tab staff stays aligned under the notation staff it
accompanies. Two new diagnostics rather than silence: a tab note with no
`<string>`/`<fret>` says exactly that, and a string outside the staff's
line count is reported and skipped.

## 3. How this was verified

`npm run verify` clean, **451/451** (15 new tests + 1 visual snapshot).

Rendered output checked against hand-computed positions, not just
"something appeared": on a 6-line staff with its bottom line at y=8,
fret 0/string 6 landed at y=8 (bottom line), fret 3/string 5 at y=7,
fret 7/string 2 at y=4, and fret 12/string 1 at y=3 (top line) — every
one correct. Fret 12's two digits rendered at x=14.362 and x=14.83:
adjacent, not overlapping. Mask rectangles numbered 5 = one document
background + one per number (four), confirming one mask per *number*
rather than per digit.

Tests also cover the 4-line bass-guitar mapping, out-of-range strings
throwing, all ten digits resolving to real and mutually distinct glyphs,
digits 6-9 specifically (the non-contiguous-codepoint trap), negative and
fractional frets throwing, and the missing-`<string>`/`<fret>` diagnostic.

## 4. A behaviour change this forced, and how it was handled

Integration B had a test asserting a tab part reports
`UNSUPPORTED_CLEF_FOR_NOTES`. C makes that false by design — tab *is*
supported now. The test was updated to assert the new, more specific
diagnostic rather than deleted.

That also made the `UNSUPPORTED_CLEF_FOR_NOTES` branch **unreachable**:
tab was the only clef with `positionsByPitch === false`, and it now has
its own branch. It was deliberately **retained, not deleted**, with a
comment saying so — if a future non-pitch clef is added, that branch
fails loudly instead of silently dropping every note on the staff.
Deleting it would trade dead code for a silent-data-loss risk.

## 5. Known limitations (stated, not silently missing)

- **No rhythm stems below the tab staff.** Some tab styles draw stems
  and beams under the numbers; this draws numbers only, which is the
  style that relies on the accompanying notation staff for rhythm —
  exactly how the two-part guitar fixture is laid out.
- **The staff line is masked, not broken.** Visually equivalent on the
  rendered page, but a consumer extracting the SVG's line geometry still
  sees an unbroken line behind the mask.
- **No string/fret is inferred.** A tab staff whose notes carry only
  pitch gets a diagnostic, not a guess — choosing a string/fret for a
  pitch requires knowing the instrument's tuning and capo, which
  `<staff-details><staff-tuning>` provides and this pass does not parse.
- **Ties, slurs, bends, hammer-ons and slides are not drawn** on tab.
- **Fret numbers don't yet avoid colliding** with each other when two
  notes sound very close together.

## 6. How to modify it

- **Draw rhythm stems on tab** — would reuse Phase 16/17's stem and flag
  geometry, anchored below the lowest number of each chord.
- **Break the line instead of masking** — collect every number's x-range
  for a measure before drawing that measure's staff lines, then emit the
  lines as segments skipping those ranges.
- **Infer string/fret from pitch** — parse
  `<staff-details><staff-tuning>` and pick the string/fret pair, which is
  what a notation editor does when converting notation to tab.

## 7. How to revert

Delete `src/geometry/tab.ts`, `src/render/tab.ts`,
`test/unit/tab-rendering.test.js`,
`test/fixtures/musicxml/guitar-tab-frets.musicxml` and its snapshot;
remove their `export * from` lines from the geometry/render barrels;
revert the `stringNumber`/`fret` fields from `core/note.ts`,
`parser/musicxml/note.ts` and `parse.ts`; and revert
`render-from-musicxml.ts`'s tab branch (restoring the plain
`UNSUPPORTED_CLEF_FOR_NOTES` else) together with Integration B's original
test assertion.
