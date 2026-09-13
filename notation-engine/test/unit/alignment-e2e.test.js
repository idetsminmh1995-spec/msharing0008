import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';
import { buildMidiFile, midiHelpers } from '../helpers/midi-builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NE = loadEngine();
const domParser = testDomParser();
const { noteEvent, endOfTrackMetaEvent } = midiHelpers;

describe('end-to-end alignment: a real MusicXML part against a real MIDI file (Phase 42)', () => {
  test('a real 5-note MusicXML part (2 measures) and a matching MIDI file describing the same music align exactly, tier "exact", for every note', () => {
    const xml = fs.readFileSync(
      path.join(__dirname, '..', 'fixtures', 'musicxml', 'simple-single-voice.musicxml'),
      'utf8',
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    const part = parsed.score.parts[0];

    // The real fixture is measure 1: C4,D4,E4,F4 quarter notes (each 480
    // ticks under divisions=2), then measure 2: G4 half note (960 ticks)
    // starting at the real absolute tick where measure 1 ends (1920).
    const C4 = NE.chromaticNoteNumber('C', 0, 4);
    const D4 = NE.chromaticNoteNumber('D', 0, 4);
    const E4 = NE.chromaticNoteNumber('E', 0, 4);
    const F4 = NE.chromaticNoteNumber('F', 0, 4);
    const G4 = NE.chromaticNoteNumber('G', 0, 4);

    const midiBytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [
        [
          noteEvent(0, 0x90, C4, 100),
          noteEvent(0, 0x80, C4, 0),
          noteEvent(480, 0x90, D4, 100),
          noteEvent(0, 0x80, D4, 0),
          noteEvent(480, 0x90, E4, 100),
          noteEvent(0, 0x80, E4, 0),
          noteEvent(480, 0x90, F4, 100),
          noteEvent(0, 0x80, F4, 0),
          noteEvent(480, 0x90, G4, 100), // measure 2's G4, 480 ticks after F4 (which itself started at 1440)
          noteEvent(960, 0x80, G4, 0),
          endOfTrackMetaEvent(),
        ],
      ],
    });
    const { midiFile } = NE.parseMidiFile(midiBytes);
    const midiNotes = midiFile.tracks[0].notes;

    const flat = NE.flattenPartNotes(part, parsed.attributes, undefined);
    assert.equal(flat.length, 5); // 4 quarters + 1 half (the rest in measure 2 isn't a note)

    const { alignment, diagnostics } = NE.alignNotes(flat, midiNotes);

    assert.deepEqual([...diagnostics], []);
    assert.equal(alignment.size, 5);
    for (const [, entry] of alignment) assert.equal(entry.tier, 'exact');
  });
});
