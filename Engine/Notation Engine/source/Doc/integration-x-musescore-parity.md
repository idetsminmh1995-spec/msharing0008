# Integration X — measured against what MuseScore says it drew

**Not a numbered phase.** The owner asked for the engine to be brought
closer to MuseScore's own output. This time there was no screenshot to
squint at: his file states the answer.

**Status:** complete. `npm run verify` clean (1002 tests).

## 1. The file is the ruler

MuseScore writes `default-x` and `default-y` on every note and rest it
exports, and a `width` on every measure. Those are not hints. They are
MuseScore reporting the layout it actually produced, in tenths — a
tenth being a tenth of a staff space by definition of the format. On a
grand staff both staves' `default-y` are measured from the top line of
the PART's first staff, which is the one thing about them that has to be
worked out rather than read.

So the whole of this pass was a loop: measure, find the gap, close it,
measure again. Four gaps turned up.

## 2. An accidental was reserved for every note that had one to SOUND

The measure-width pass asked "does this note's `alter` differ from
zero?" and reserved a staff space for an accidental if so. That is not
the same question as "is an accidental DRAWN". In five sharps — this
piece's key — every F, C, G, D and A in it has `alter: 1` and no
accidental at all, because the key signature has already said so.

The allowance becomes the segment's own minimum width, so the floor
then bound on nearly every segment in the piece and flattened the
spacing. The clearest symptom: in measure 5, a sixteenth's segment came
out exactly as wide as an eighth's, where MuseScore makes it half.

The measurement pass now runs the SAME accidental state machine the
renderer runs (`drawnAccidentalTicks`). Three details make it the same
answer: state is per STAFF, it resets at every barline — which is why
nothing is threaded between measures, a fresh state from the measure's
own `fifths` being exactly what `resetMeasure` would produce — and
voices are walked in the order the renderer walks them, because the
state threads through that order.

The widths are real glyph measurements now rather than round numbers,
and they include the augmentation dots the engine started drawing in
Integration W.

## 3. The accidental was put on the wrong side of its note

An accidental is drawn BEFORE its notehead. Folding it into the note's
own width widened the gap LEAVING that attack — pushing the next note
away instead of making room for the accidental that needed it.

`SpacingEvent` now has a `leadingWidth` beside its `renderedWidth`: how
far the attack's ink reaches left of its x, as against right of it. The
minimum-distance pass adds the leading width to the gap coming IN.

## 4. The minimum distance was measured across the whole system

A dotted note low in the bass staff is wide, and the attack after it may
be in the TREBLE staff, half a stave away. Nothing can collide, and
MuseScore — which spaces by each element's real shape — lets them sit
close. This engine took one width per attack, the widest anywhere on the
system, and pushed the next attack clear of it whatever staff that was.
On a grand staff where the two hands alternate, which is most piano
music, that inflated the gap after every wide thing in either staff.

`SpacingEvent.widthsByStaff` carries the widths per staff, and the
minimum-distance pass keeps, per staff, the last attack that staff drew
at. A staff then constrains the attack it NEXT appears at, not simply
the one after it.

## 5. A grand staff was being treated as two voices on one staff

`const isMultiVoice = measure.voices.length > 1;`

A grand staff is one Measure with two voices in it — the right hand's
and the left hand's — and they share no staff at all. Counting the
measure's voices rather than the staff's meant:

- **every rest** was pushed a staff space clear of a voice that was
  never there. MuseScore's own `default-y` puts all twelve of this
  file's rests on the middle line; this engine put all twelve one space
  off it.
- **every stem** was forced — voice 1 up, voice 5 down — overriding the
  `<stem>` the file states on each of its 167 notes.

Counted per staff now. Two voices sharing one staff still get the rule,
which is the case the rule is for: the drum fixture's hi-hat is still up
and its kick still down.

Three stems were still wrong after that, all in beam groups, where the
group decided its own direction from its noteheads with the file sitting
right there having already stated one. §10.8 again: a group whose
members all state the same `<stem>` now takes it. One that disagrees, or
where any member says nothing, falls back to §9.13's own rule.

## 6. What it measures now

Against the owner's own MuseScore export, every one of these is a test
in `test/unit/musescore-piano-parity.test.js`:

| | before | after |
|---|---|---|
| noteheads at MuseScore's own y | 93 of 185 | **185 of 185, exactly** |
| rests at MuseScore's own y | 0 of 12 | **12 of 12, exactly** |
| stems the way the file states | 164 of 167 | **167 of 167** |
| measures whose spacing SHAPE matches | — | **11 of 12 to 0.001sp** |
| grand-staff distance | 6.5sp | 6.5sp (MuseScore's own) |
| diagnostics | 0 | 0 |

"Shape" is where each attack sits WITHIN its measure, relative to the
rest of them — not the absolute width. MuseScore justifies each system
out to the page margin and this engine's scroll mode has no margin to
reach, so the absolute widths differ by the justification factor and
always will. The shape is the spacing law, and the shape is what the eye
reads.

## 7. The one measure that is not exact

Measure 8 — three cautionary accidentals and two chords in one bar — is
0.45sp out. Its minimum-distance floors bind, and MuseScore evens the
result out again when it justifies the system. Scroll mode has no system
to justify, so that last evening never happens. Page mode does justify,
and would.

## 8. How to revert

- Accidental measurement: delete `drawnAccidentalTicks` and the
  `accidentals` parameter; `attackWidth` goes back to reading
  `pitch.alter`.
- Left/right extents: delete `leadingWidth`/`leadingByStaff` from
  `SpacingEvent` and the term they add in `applyMinimumDistance`.
- Per-staff distance: delete `widthsByStaff` and the `pending` map; the
  pass goes back to one width per attack.
- Per-staff voice counting: restore `measure.voices.length > 1`.
- Beam direction: drop the `stated` term in `renderBeamGroup`.
