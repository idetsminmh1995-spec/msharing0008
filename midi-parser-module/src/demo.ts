// src/demo.ts
// End-to-end demo: build a synthetic test MIDI, parse it, build the R/L
// animation timeline, and print everything so we can visually verify:
//   1. Notes/timing/velocity/tempo/time-signature extraction is correct
//   2. R/L alternation is tracked independently per MIDI note number
//   3. Simultaneous notes appear as separate concurrent events
//   4. The 10-minute cap / error handling paths work

import { makeTestMidi } from './makeTestMidi';
import { parseMidiFile } from './midiParser';
import { buildAnimationTimeline, groupSimultaneous } from './timelineBuilder';
import { MidiParseError } from './types';

const NOTE_NAMES: Record<number, string> = { 36: 'Kick', 38: 'Snare', 42: 'Hi-Hat' };

function main() {
  console.log('=== 1. Generating synthetic test MIDI ===');
  const bytes = makeTestMidi();
  console.log(`Generated ${bytes.length} bytes\n`);

  console.log('=== 2. Parsing MIDI ===');
  const parsed = parseMidiFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  console.log(`Duration: ${parsed.durationSeconds.toFixed(3)}s`);
  console.log(`PPQ: ${parsed.ppq}`);
  console.log('Tempo changes:', parsed.tempoChanges.map((t) => `${t.bpm}bpm @ ${t.time.toFixed(3)}s`).join(', '));
  console.log(
    'Time signatures:',
    parsed.timeSignatures.map((ts) => `${ts.numerator}/${ts.denominator} @ ${ts.time.toFixed(3)}s`).join(', ')
  );
  console.log(`Notes parsed: ${parsed.notes.length}\n`);

  console.log('=== 3. Building R/L animation timeline ===');
  const timeline = buildAnimationTimeline(parsed.notes);
  for (const event of timeline) {
    const label = NOTE_NAMES[event.midiNote] ?? `Note ${event.midiNote}`;
    console.log(
      `${event.time.toFixed(3)}s  ${label.padEnd(7)} note=${event.midiNote}  hand=${event.hand}  ` +
        `vel=${event.velocity.toFixed(2)}  asset=${event.hand}${event.midiNote}.png`
    );
  }

  console.log('\n=== 4. Verifying per-note alternation (independent per MIDI note) ===');
  const byNote = new Map<number, string[]>();
  for (const e of timeline) {
    if (!byNote.has(e.midiNote)) byNote.set(e.midiNote, []);
    byNote.get(e.midiNote)!.push(e.hand);
  }
  for (const [note, hands] of byNote) {
    const label = NOTE_NAMES[note] ?? `Note ${note}`;
    console.log(`${label} (${note}): ${hands.join(' -> ')}`);
  }

  console.log('\n=== 5. Simultaneous-note grouping (must not overwrite each other) ===');
  const groups = groupSimultaneous(timeline);
  for (const group of groups) {
    if (group.length > 1) {
      const parts = group.map((e) => `${NOTE_NAMES[e.midiNote] ?? e.midiNote}(${e.hand})`);
      console.log(`t=${group[0].time.toFixed(3)}s -> ${parts.join(' + ')} [${group.length} concurrent layers]`);
    }
  }

  console.log('\n=== 6. Error handling check ===');
  try {
    parseMidiFile(new ArrayBuffer(4)); // garbage input
  } catch (err) {
    if (err instanceof MidiParseError) {
      console.log(`Correctly rejected invalid file: "${err.message}"`);
    } else {
      throw err;
    }
  }
}

main();
