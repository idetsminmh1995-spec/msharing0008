# MusicXML support matrix

What the parser reads, what it reads but does not yet use, and what it
records as a diagnostic instead of guessing. This is the contract PLAN.md
Part B asks for: a caller can look up an element here rather than reading the
parser.

Three states:

- **Implemented** -- parsed into the score model and used by the renderer.
- **Parsed, not applied** -- the parser reads it and carries it on the model
  or a side table, but rendering does not yet act on it.
- **Recovered** -- the parser does not act on it, records a stable diagnostic
  code, and keeps going. It never throws on malformed input.

## Score structure

| Element | State | Notes |
| --- | --- | --- |
| `score-partwise` | Implemented | The primary form. |
| `score-timewise` | Implemented | Normalised to partwise on read (`timewise.ts`). |
| `part`, `part-list`, `score-part` | Implemented | Part id, name, instrument list. |
| `measure` | Implemented | Numbered and implicit measures. |
| `attributes` | Implemented | See the table below. |
| `backup`, `forward` | Implemented | Cursor moves; the event onset (`startTick`) comes from here. |
| `print` | Implemented | New-system / new-page breaks and staff layout. |
| `sound` | Implemented | `<sound tempo="...">` becomes a tempo event (quarter-notes per minute). Other `sound` attributes are not read. |
| unknown elements | Recovered | `UNKNOWN_ELEMENT`. |

## Attributes

| Element | State | Notes |
| --- | --- | --- |
| `divisions` | Implemented | Ticks per quarter; `MISSING_DIVISIONS` / `INVALID_DIVISIONS` when absent or bad. |
| `key` | Implemented | Fifths, plus `UNSUPPORTED_ROOT` for a `<key-step>` spelling. |
| `time` | Implemented | Numerator/denominator, including the display form. |
| `clef` | Implemented | Sign/line/octave change; `INVALID_OCTAVE_SHIFT`. |
| `staves` | Implemented | Multi-staff parts. |
| `staff-details` | Implemented | Staff line count; `INVALID_BOOLEAN_ATTRIBUTE` on a bad flag. |
| `transpose` | Implemented | Carried on the measure state and applied to SOUNDING pitch for playback and MIDI alignment; the notation stays at written pitch. |
| `midi-instrument` | Implemented | `midi-unpitched` → GM percussion key (unpitched notes now SOUND), plus `midi-program` / `midi-bank` / `midi-channel` routing on the playback track; `INVALID_MIDI_UNPITCHED` / `INVALID_MIDI_PROGRAM` / `INVALID_MIDI_BANK` / `INVALID_MIDI_CHANNEL`. See PLAN.md Part E and the SoundFont milestone. |

## Notes and rhythm

| Element | State | Notes |
| --- | --- | --- |
| `note` | Implemented | Pitch, duration, voice, staff, type, dots. |
| `rest` | Implemented | Including `MISSING_DISPLAY_POSITION`, `INVALID_REST_DISPLAY_POSITION`. |
| `chord` | Implemented | A `<chord/>` note joins the previous onset. |
| `pitch` | Implemented | `INVALID_PITCH_STEP`, `MISSING_OCTAVE`, `INVALID_PITCH_ALTER`, `UNSUPPORTED_PITCH_ALTER`. |
| `unpitched` | Implemented | `INVALID_MIDI_UNPITCHED`. |
| `duration`, `type`, `dot` | Implemented | `MISSING_DURATION`, `UNKNOWN_DURATION_TYPE`. |
| `time-modification` | Implemented | Tuplet ratios. |
| `grace` | Implemented | Grace notes render without advancing the cursor. |
| `accidental` | Implemented | `UNSUPPORTED_ACCIDENTAL`, `CONTRADICTORY_ACCIDENTAL_WRAPPERS`, `UNKNOWN_ACCIDENTAL_SMUFL`. |
| `notehead` | Implemented | `UNKNOWN_NOTEHEAD`, `UNKNOWN_NOTEHEAD_SMUFL`. |
| `stem`, `beam` | Implemented | `UNSUPPORTED_BEAM_VALUE` for an unknown beam state. |
| `staff` | Implemented | Which staff of the part. |
| unknown notes | Recovered | `UNSUPPORTED_NOTE`, `INVALID_CHORD`. |

## Notations

| Element | State | Notes |
| --- | --- | --- |
| `tied`, `tie`, `slur` | Implemented | Ties and slurs; `INVALID_OFFSET` for a bad number. |
| `tuplet` | Implemented | Bracket/number display. |
| `articulations` | Implemented | Known marks drawn; `UNSUPPORTED_ARTICULATION` otherwise. |
| `ornaments` | Partly implemented | Trill etc. where known; `UNSUPPORTED_ORNAMENT` otherwise. |
| `fermata` | Implemented | `UNSUPPORTED_FERMATA_TYPE`, `UNSUPPORTED_FERMATA_SHAPE`. |
| `tremolo` | Implemented | `TREMOLO_STROKES_CLAMPED` when the count is out of range. |

## Directions, harmony, lyrics

| Element | State | Notes |
| --- | --- | --- |
| `direction` | Implemented | Words, metronome, dynamics, wedge, pedal, octave shift. |
| `direction-type`/`words` | Implemented | Text directions. |
| `metronome` | Implemented | Display form drawn; `<sound tempo>` in the same direction becomes a tempo event. `UNSUPPORTED_METRONOME` for a beat unit it cannot express. |
| `dynamics` | Partly implemented | Known dynamics drawn; `UNSUPPORTED_DYNAMIC` otherwise. |
| `wedge` | Partly implemented | Crescendo/diminuendo; `UNSUPPORTED_WEDGE` otherwise. |
| `pedal` | Partly implemented | `UNSUPPORTED_PEDAL` otherwise. |
| `octave-shift` | Implemented | `INVALID_OCTAVE_SHIFT`. |
| `harmony` | Partly implemented | Chord symbols; `UNSUPPORTED_HARMONY_FEATURE`. |
| `lyric` | Implemented | Verse/chorus lines. |
| `barline` | Implemented | Styles, repeats, endings. |
| `sound` | Parsed, not applied | See Score structure. |

## Containers and recovery

| Case | State | Diagnostic |
| --- | --- | --- |
| Malformed XML | Recovered | `error` severity; the parse result keeps whatever was read. |
| No measures | Recovered | `NO_MEASURES`. |
| A measure past its time signature | Recovered | `MEASURE_OVERRUN`. |
| A backup before the measure start | Recovered | `BACKUP_BEFORE_MEASURE_START`. |
| `.mxl` not a zip | Recovered | `MXL_INVALID_ARCHIVE`. |
| `.mxl` with no `META-INF/container.xml` | Recovered | `MXL_MISSING_CONTAINER`. |
| `.mxl` container with no `<rootfile>` | Recovered | `MXL_MISSING_ROOTFILE_POINTER`. |
| `.mxl` rootfile pointing at a missing entry | Recovered | `MXL_MISSING_SCORE_FILE`. |

Every code above is stable and meant to be asserted on in tests, not just
read by a human. The message text may change; the code will not.
