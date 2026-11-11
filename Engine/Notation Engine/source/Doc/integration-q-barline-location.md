# Integration Q — a `<barline location="left">` was drawn a whole measure late

**Not a numbered phase.** Found while chasing down the user's tempo-mark
position report: the mark itself was correctly placed, but the repeat
barline it sits above was not, which is what actually made the passage
look wrong.

**Status:** complete. `npm run verify` clean (660 tests).

## 1. What was wrong

The parser read every `<barline>` in a measure into ONE pair of side-table
fields (`barlineStyle`/`repeatDirection`), regardless of that barline's own
`location` attribute. `renderBarline` then always draws at the CURRENT
measure's own right edge (`layout.x + layout.width`). Both of those are
correct for a `location="right"` barline (or one with no `location` at
all — MusicXML's own default) — that genuinely is this measure's own
ending barline. They are wrong for `location="left"`, which describes a
DIFFERENT physical position: the boundary BEFORE this measure, i.e. the
PREVIOUS measure's right edge.

The project's own `Drum_Lesson_5.musicxml` writes its repeat exactly this
way — a `<barline location="left"><repeat direction="forward"/></barline>`
on measure 2 (the first measure of the repeated section), not a
`location="right"` on measure 1. The engine parsed it, but rendered it a
full measure too late: at measure 2's own right edge (between measures 2
and 3) instead of its left edge (between measures 1 and 2, immediately
before the notes it's supposed to introduce).

This is why the tempo mark above it looked wrong even though its own x
was correct (verified directly: both the tempo mark's and the first
note's glyphs land at the same x already, matching tick 0 of measure 2 in
both cases). The mark sat correctly above the first note; what was missing
was the repeat-begin bar that should have appeared just before it. With
that bar instead appearing one measure later — after eight notes had
already gone by, mid-passage, for no visible reason — the whole opening
read as disordered.

## 2. The fix

- **Parser** (`src/parser/musicxml/parse.ts`): a `<barline>` element's
  `location` attribute now routes it to one of two field pairs on
  `MeasureAttributes` — `barlineStyle`/`repeatDirection` for `"right"`
  (or unmarked, the default), and new `leftBarlineStyle`/
  `leftRepeatDirection` for `"left"`.
- **Renderer** (`src/render-from-musicxml.ts`): when drawing a measure's
  own right-edge barline, it now looks ahead to the NEXT measure's
  `leftBarlineStyle`/`leftRepeatDirection` first, falling back to this
  measure's own right-edge fields only if the next measure didn't state
  one. Since a boundary is drawn exactly once (at the CURRENT measure's
  iteration, whichever side declared it), there's no risk of drawing the
  same barline twice even when both a measure's own right declaration and
  its successor's left declaration could theoretically both be present —
  the left one simply wins, matching which one a real file is more likely
  to have deliberately written.

## 3. What actually changed on real content

On `Drum_Lesson_5.musicxml`: the repeat-begin barline (thick + thin +
dots, per §9.5's own documented stroke order) now appears immediately
before measure 2's first note — the same boundary the tempo mark already
sat above — instead of after measure 2's eighth note. Verified both in
raw SVG coordinates (the `repeatDot` glyphs moved from x≈36 — inside
measure 3's territory — to x≈9, the actual measure 1/2 boundary) and
visually in headless Chromium with the real font.

No saved snapshot changed for any file OTHER than ones that explicitly
exercise this pattern, because none of the existing fixtures used
`location="left"` before now — this was a real, previously entirely
untested gap, not a regression of covered behavior.

## 4. Tests

New: `test/unit/barline-location.test.js` — a 3-measure fixture
(`location="left"` repeat-begin on measure 2, no explicit barline on
measures 1 or 3) asserting: the side-table captures the left-fields
separately from the right ones; the repeat dots render between measure
1's note and measure 2's note (not after measure 2's); no other spurious
repeat dots appear.

## 5. How to revert

Drop `leftBarlineStyle`/`leftRepeatDirection` from `MeasureAttributes`
and the `location === 'left'` branch in the parser's `<barline>` handling
(merge back into the single `barlineStyle`/`repeatDirection` assignment).
Drop the `nextAttrs` lookahead in `render-from-musicxml.ts`'s barline
block, back to `mapBarline(attrs.barlineStyle, attrs.repeatDirection)`
directly. Remove `test/unit/barline-location.test.js`.
