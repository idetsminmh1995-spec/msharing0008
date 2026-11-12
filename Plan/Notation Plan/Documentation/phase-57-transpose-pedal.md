# Phase 57 — MusicXML transpose and pedal

Status: implemented in the notation-engine parser/model and renderer.

`<transpose>` is parsed as persistent positioned attribute metadata (`diatonic`, `chromatic`, `octaveChange`, and derived `semitones`), carried through `attributeChanges`, publicly exported, and accompanied by `soundingPitch` for pitched-pitch conversion. Unpitched display positions remain unchanged.

`<direction-type><pedal>` is parsed as start/change/stop/continue events. Pedal starts/stops are resolved into spans, rendered below the staff with Bravura keyboard pedal glyphs and continuation lines, and unmatched spans produce `UNMATCHED_PEDAL` diagnostics. Cue, octave-shift, and slides remain out of scope.
