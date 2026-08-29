// src/makeTestMidi.ts
// Generates a small synthetic drum MIDI file so we can exercise the parser +
// timeline builder end-to-end without needing a real uploaded file.
// Pattern: 3 "bars" of a simple beat with a mid-file tempo change and
// simultaneous hits, specifically designed to prove out:
//   - R/L alternation tracked independently per note number
//   - simultaneous notes (kick+hihat, snare+hihat) not overwriting each other
//   - a mid-file tempo change
//   - a non-4/4 time signature read from the file

import { Midi } from '@tonejs/midi';
import { writeFileSync } from 'fs';

const KICK = 36;
const SNARE = 38;
const HIHAT = 42;

export function makeTestMidi(): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(100);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [3, 4] });

  const track = midi.addTrack();
  const secPerBeat = 60 / 100; // at 100 BPM

  // Bar 1 (3/4): kick+hihat on beat 1, hihat on 2, snare+hihat on 3
  addNote(track, KICK, 0 * secPerBeat, 0.1, 0.9);
  addNote(track, HIHAT, 0 * secPerBeat, 0.05, 0.6);
  addNote(track, HIHAT, 1 * secPerBeat, 0.05, 0.5);
  addNote(track, SNARE, 2 * secPerBeat, 0.1, 0.85);
  addNote(track, HIHAT, 2 * secPerBeat, 0.05, 0.6);

  // Bar 2: kick, hihat, snare+hihat again -> proves alternation continues
  // correctly across bars for each note number independently.
  addNote(track, KICK, 3 * secPerBeat, 0.1, 0.95);
  addNote(track, HIHAT, 3 * secPerBeat, 0.05, 0.55);
  addNote(track, HIHAT, 4 * secPerBeat, 0.05, 0.5);
  addNote(track, SNARE, 5 * secPerBeat, 0.1, 0.9);
  addNote(track, HIHAT, 5 * secPerBeat, 0.05, 0.6);

  // Tempo change partway through, plus a 3rd bar to prove timing still
  // resolves correctly in seconds after the change.
  const tempoChangeTick = midi.header.secondsToTicks(6 * secPerBeat);
  midi.header.tempos.push({ ticks: tempoChangeTick, bpm: 140 });
  // IMPORTANT: @tonejs/midi requires header.update() to be called after any
  // direct mutation of header.tempos / header.timeSignatures — otherwise the
  // new tempo event's `.time` is left undefined and secondsToTicks() on
  // subsequent addNote() calls never resolves (silent infinite loop).
  midi.header.update();

  const secPerBeatNew = 60 / 140;
  const bar3Start = 6 * secPerBeat;
  addNote(track, KICK, bar3Start + 0 * secPerBeatNew, 0.1, 0.9);
  addNote(track, HIHAT, bar3Start + 0 * secPerBeatNew, 0.05, 0.6);
  addNote(track, SNARE, bar3Start + 1 * secPerBeatNew, 0.1, 0.85);
  addNote(track, HIHAT, bar3Start + 1 * secPerBeatNew, 0.05, 0.55);
  addNote(track, HIHAT, bar3Start + 2 * secPerBeatNew, 0.05, 0.5);

  return midi.toArray();
}

function addNote(
  track: ReturnType<Midi['addTrack']>,
  midiNote: number,
  time: number,
  duration: number,
  velocity: number
) {
  track.addNote({ midi: midiNote, time, duration, velocity });
}

// Allow running directly: `npx tsx src/makeTestMidi.ts`
if (require.main === module) {
  const bytes = makeTestMidi();
  writeFileSync('test-drum-pattern.mid', Buffer.from(bytes));
  console.log('Wrote test-drum-pattern.mid');
}
