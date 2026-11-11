# Integration N — GM drum staff-position corrections (snare, hi-hat)

**Not a numbered phase.** Prompted by the user annotating a screenshot of
their own real drum chart, reporting the snare's position looked wrong and
that a hi-hat "written as a quarter note" looked tied/beamed incorrectly.

**Status:** complete. `npm run verify` clean (653 tests).

## 1. What was actually wrong

Phase 41's `DEFAULT_DRUM_MAPPING_TABLE` (`src/drums/drum-map.ts`) assigned
every GM percussion note a `staffPosition`, "checked against several
independent drum-notation guides" per its own doc comment — but that same
comment is honest that "real practice genuinely varies" and the values were
never checked against one exact, real, professionally-authored file with
pixel precision.

The user's own `Drum_Lesson_5.musicxml` is exactly that file, and it gives
unambiguous, 100%-internally-consistent ground truth: every snare note (62
of them) encodes the identical `<display-step>C</display-step>
<display-octave>5</display-octave>`, and every hi-hat note (248 of them)
encodes `<display-step>G</display-step><display-octave>5</display-octave>`.
Converting those through `staffPositionForPitch(PERCUSSION_CLEF, ...)` gives
the position the file's own exporter intended, independent of my engine's
own GM table:

| Sound | File's own intended position | Table had | Gap |
|---|---|---|---|
| Bass Drum 1 (kick) | −0.5 | −0.5 | none — already correct |
| Acoustic Snare | **−2.5** (3rd space, above the middle line) | −1.5 (2nd space, below the middle line) | a full staff-space too low |
| Closed Hi-Hat | **−4.5** (space above the top line) | −4 (on the top line) | half a staff-space too low |

Kick already matched exactly. Snare was a full space off; hi-hat half a
space off. With snare that close to the kick (only one space apart instead
of two), the chart read as visually cramped — likely what the user
described as the hi-hat's quarter-note-adjacent notes looking "tied"
together, even though a direct check of the beam geometry (below) found no
actual beam touching a quarter note anywhere in the file.

## 2. What was changed

In `src/drums/drum-map.ts`:

| GM # | Name | Old | New | Why |
|---|---|---|---|---|
| 38 | Acoustic Snare | −1.5 | **−2.5** | direct file evidence (62/62 notes) |
| 40 | Electric Snare | −1.5 | **−2.5** | same drum family/position as 38 — the table already treats Open/Closed Hi-Hat this way (both share one position, differentiated by notehead/articulation, not staff line) |
| 37 | Side Stick | −1.5 | **−2.5** | struck on the snare itself; every drum-notation guide places it at the snare's own line, matching the same shared-position pattern |
| 42 | Closed Hi-Hat | −4 | **−4.5** | direct file evidence (248/248 notes) |
| 46 | Open Hi-Hat | −4 | **−4.5** | same instrument/position as Closed Hi-Hat |
| 44 | Pedal Hi-Hat | −3.5 | unchanged | no file evidence; a genuinely distinct foot-played convention, not the same position family as 42/46 |
| 35, 36 | Bass drums | −0.5 | unchanged | already matched the file exactly |

## 3. A real trade-off, stated rather than hidden

Moving Acoustic Snare to −2.5 makes it land on the exact same line as
**Hi-Mid Tom (GM 48)**, which was already at −2.5 and was **not** touched —
there is no file evidence for tom positions in the one real file available,
and guessing new tom values to avoid this collision would trade a
proven-wrong value for an unproven one. A drum chart that genuinely uses
both a standard snare and a Hi-Mid Tom will now see them share a line;
`config.drums.mapping` (§13.3) exists precisely for a real chart to
override either one. This is the same trade-off Phase 41's own doc already
accepted for Open/Closed Hi-Hat sharing one position with Ride Cymbal 1/Ride
Bell/Ride Cymbal 2/Tambourine, all independently already at −4.5 before this
change.

## 4. What was checked and found NOT to be a bug

The user's report mentioned a hi-hat "written as a quarter note" appearing
beamed. Direct inspection of the real file's own data (§10.4's parsed
`<beam>` hints) found:
- Every voice-1 (hi-hat/snare) note is a real eighth note, correctly grouped
  into two four-note beams the file itself states via `<beam>` elements.
- The one voice-2 (kick) quarter note (beat 1) carries **no** `<beam>`
  element at all, and a direct SVG check confirms no beam-thickness line
  overlaps its stem's x/y range — it renders as a plain, unbeamed quarter
  note, exactly as it should.

So there was no actual beam-grouping defect in this passage; the visual
impression of "wrongly connected" notes most plausibly came from the snare
sitting only one space (not two) away from the kick under the old,
incorrect table value, cited above.

## 5. How to modify further

| Want to change | Where |
|---|---|
| A specific chart's own drum positions | `config.drums.mapping` per §13.3 — no code change needed |
| The table's own defaults | `DEFAULT_DRUM_MAPPING_TABLE` in `src/drums/drum-map.ts` |

## 6. How to revert

Set GM 37/38/40 back to −1.5 and GM 42/46 back to −4, and revert the two
`gm-drum-wiring.test.js` assertions (`y="5.5"`→`y="6.5"`,
`y="3.5"`→`y="4"`). Regenerate `render-from-musicxml-gm-drum-mapping.snap`
and `render-from-musicxml-v2-elements.snap` (both fixtures render a
GM-linked hi-hat and change output).

Tests: the two corrected assertions in `test/unit/gm-drum-wiring.test.js`;
no new fixture was needed since the existing `gm-drum-mapping.musicxml` and
the real `Drum_Lesson_5.musicxml` already exercise both corrected sounds.
