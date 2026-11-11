# Integration T — a drum file's own staff positions were being overruled

**Not a numbered phase.** The owner put a five-bar drum chart through
MuseScore and through this engine side by side, and almost every note
was on a different line.

**Status:** complete. `npm run verify` clean (915 tests).

## 1. What was wrong

A MusicXML percussion note states where it goes:

```xml
<note>
  <unpitched><display-step>D</display-step><display-octave>4</display-octave></unpitched>
  <instrument id="P1-I45"/><voice>2</voice><stem>down</stem><notehead>x</notehead>
</note>
```

That is the pedal hi-hat, and `D4` under a percussion clef is one line
BELOW the staff. This engine drew it above the top line, because
Phase 41 decided that `<instrument id>` beat `<display-step>`:

> GM numbers are unambiguous (§13.1's own authority rule for "which drum
> sound"), while a file's own display-step/octave is only ever a
> rendering hint.

The first half of that is true and the second half is not. A GM number
says which drum SOUNDS; `<display-step>`/`<display-octave>` say where it
is DRAWN, and they are the only thing in the file that does.

MuseScore's own importer settles it. `xmlSetDrumsetPitch` computes the
line from the file and the clef —

```cpp
const int po = ClefInfo::pitchOffset(clef);
const int pitch = MusicXmlStepAltOct2Pitch(step, 0, octave);
int line = po - absStep(pitch);
```

— then looks for a drum in its own drumset already on that line with
that notehead, and **adds one** when it finds none. The drumset adapts
to the file. The file is never moved to suit the drumset.

## 2. What it looked like

On the owner's own file, against what MuseScore drew:

| | MuseScore | this engine |
|---|---|---|
| Pedal hi-hat | one line BELOW the staff | above the top line |
| Bass drum 2 | on the bottom line | half a space above it |
| Hi-mid tom | 1 half-space below the top line | 2 |
| Low-mid tom | 2 | 3 |
| Low tom | 4 | 5 |
| High floor tom | 5 | 6 |
| Low floor tom | 6 | 7 |
| China cymbal | 3 above the staff | 2 |
| Splash cymbal | 4 above | 3 |
| Ride bell | on the top line | half a space above it |
| Ride cymbal 2 | 2 below the top line | 4 above |

Thirteen of the seventeen notes in a five-bar chart.

## 3. The fix

`Note.hasExplicitDisplayPosition` — set by the parser when an
`<unpitched>` carried BOTH a `<display-step>` and a `<display-octave>`,
and read by `resolveNoteRendering`:

- **Position.** With the flag, the position comes from the display step
  and octave through the staff's own clef. Without it, the GM drum table
  places the note, which is now the only case that table is for.
- **Notehead.** Same rule. MuseScore reads the head from the note's own
  `<notehead>` and defaults to a plain one, so a file that wants an X on
  the hi-hat line says so and one that says nothing means a plain oval.
  The table's shape is withheld for a note the file placed, because
  substituting one there is this engine disagreeing with the file about
  its own notation.
- **Stem** was already the file's: `<stem>` outranks everything, and
  every MuseScore export writes it.

### A diagnostic that was too loud

MusicXML's DTD makes both elements OPTIONAL inside `<unpitched>`, so a
file that omits them is not malformed -- it has left the placing to the
drum mapping. The parser used to call that an `error`
(`INVALID_PITCH_STEP` + `MISSING_OCTAVE`); it now reports
`MISSING_DISPLAY_POSITION` at `info` and keeps the errors for a value
that IS there and is not a step or a number.

## 4. What changed for existing fixtures

`gm-drum-mapping.musicxml` was written to test the GM table, but every
note in it also carried a display position -- of the same pitch, three
times over, precisely so the table would be the thing being tested. It
now carries none, which is the case the table is actually for, and its
three tests assert exactly what they asserted before. Its saved snapshot
did not change at all.

## 5. Tests

`test/unit/musescore.test.js` gained two, against a new fixture that is
the owner's own file (`musescore-drum-notes.musicxml`, MuseScore Studio
4.7.4, five bars, 17 unpitched notes, eight instruments):

- every notehead's y, as a multiset, equals what the FILE's own display
  positions give through MuseScore's percussion clef -- nothing
  hardcoded, so a different export tests whatever that export contains;
- and the six instruments that were furthest wrong are each named and
  checked on their own line.

`cross-software-corpus.test.js` now asserts the new severity, and that
a note with no display position does not claim one.

## 6. How to revert

Drop `hasExplicitDisplayPosition` from `core/note.ts`, the parser and
`resolveNoteRendering`'s two `positionedByFile` guards; restore the
display positions in `gm-drum-mapping.musicxml` and the `error`
severities in `parser/musicxml/note.ts`.
