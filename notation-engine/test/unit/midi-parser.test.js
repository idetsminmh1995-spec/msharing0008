import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { buildMidiFile, midiHelpers } from '../helpers/midi-builder.js';

const NE = loadEngine();
const {
  encodeVlq,
  noteEvent,
  runningStatusDataEvent,
  tempoMetaEvent,
  timeSignatureMetaEvent,
  keySignatureMetaEvent,
  endOfTrackMetaEvent,
} = midiHelpers;

describe('MIDI parser: header and error conditions (Phase 39, §11.2)', () => {
  test('bad header magic produces a diagnostic, never throws, and midiFile is undefined', () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
    assert.doesNotThrow(() => NE.parseMidiFile(bytes));
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.equal(midiFile, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'BAD_HEADER_MAGIC'));
  });

  test('a truncated header (fewer than 14 bytes total) produces TRUNCATED_HEADER, never throws', () => {
    const bytes = new Uint8Array([...'MThd'].map((c) => c.charCodeAt(0)));
    assert.doesNotThrow(() => NE.parseMidiFile(bytes));
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.equal(midiFile, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'TRUNCATED_HEADER'));
  });

  test('an SMPTE-frame division (high bit set) is rejected with a diagnostic, never mis-parsed as PPQ', () => {
    const bytes = buildMidiFile({ format: 0, ppq: 0x8018, tracks: [[endOfTrackMetaEvent()]] });
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.equal(midiFile, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'SMPTE_DIVISION_UNSUPPORTED'));
  });

  test('format 2 is rejected with a diagnostic', () => {
    const bytes = buildMidiFile({ format: 2, ppq: 480, tracks: [[endOfTrackMetaEvent()]] });
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.equal(midiFile, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'FORMAT_2_UNSUPPORTED'));
  });

  test('a genuinely unrecognized format number (3+) is rejected with UNKNOWN_FORMAT', () => {
    const bytes = buildMidiFile({ format: 3, ppq: 480, tracks: [[endOfTrackMetaEvent()]] });
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.equal(midiFile, undefined);
    assert.ok([...diagnostics].some((d) => d.code === 'UNKNOWN_FORMAT'));
  });

  test('a truncated track (bad MTrk magic) recovers with whatever tracks parsed so far, never throws', () => {
    const validTrack = trackWithNotes();
    // Build the header claiming TWO tracks, but only supply valid bytes
    // for one -- the second track's chunk header is genuine garbage,
    // exercising the exact recovery path this test targets.
    const header = buildMidiFile({ format: 1, ppq: 480, tracks: [validTrack, validTrack] });
    const firstTrackByteLength = buildMidiFile({ format: 1, ppq: 480, tracks: [validTrack] }).length - 14; // minus the MThd header
    const bytes = new Uint8Array([...header.slice(0, 14 + firstTrackByteLength), 0, 1, 2, 3]);
    assert.doesNotThrow(() => NE.parseMidiFile(bytes));
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.notEqual(midiFile, undefined);
    assert.equal(midiFile.tracks.length, 1); // the first, valid track was kept
    assert.ok([...diagnostics].some((d) => d.code === 'BAD_TRACK_MAGIC'));
  });

  test('a track truncated mid-event (a note-on with its data bytes cut off) recovers with TRUNCATED_TRACK, keeping any earlier notes in that track', () => {
    // A valid note-on/note-off pair, followed by a delta-time and a
    // status byte for a SECOND note-on whose data bytes never arrive --
    // the MTrk chunk's declared length still claims those missing bytes
    // exist, so the reader runs off the real end of the buffer.
    const goodPair = [...encodeVlq(0), 0x90, 60, 100, ...encodeVlq(240), 0x80, 60, 0];
    const truncatedEventStart = [...encodeVlq(0), 0x90, 64]; // missing the velocity byte
    const trackBytes = [...goodPair, ...truncatedEventStart];
    const trackLen = trackBytes.length;
    const bytes = new Uint8Array([
      ...[...'MThd'].map((c) => c.charCodeAt(0)),
      0,
      0,
      0,
      6,
      0,
      0, // format 0
      0,
      1, // 1 track
      0x01,
      0xe0, // ppq 480
      ...[...'MTrk'].map((c) => c.charCodeAt(0)),
      (trackLen >> 24) & 0xff,
      (trackLen >> 16) & 0xff,
      (trackLen >> 8) & 0xff,
      trackLen & 0xff,
      ...trackBytes,
    ]);
    assert.doesNotThrow(() => NE.parseMidiFile(bytes));
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.notEqual(midiFile, undefined);
    assert.equal(midiFile.tracks[0].notes.length, 1); // the first, complete note-on/off pair survived
    assert.ok([...diagnostics].some((d) => d.code === 'TRUNCATED_TRACK'));
  });
});

function trackWithNotes() {
  return [
    noteEvent(0, 0x90, 60, 100), // note-on, channel 0, note 60
    noteEvent(480, 0x80, 60, 0), // note-off after 480 ticks
    endOfTrackMetaEvent(),
  ];
}

describe('MIDI parser: VLQ decoding across its full range (Phase 39, §11.2)', () => {
  test('single-byte VLQ values (0, 64, 127) round-trip correctly as delta-times', () => {
    for (const v of [0, 64, 127]) {
      const bytes = buildMidiFile({
        format: 0,
        ppq: 480,
        tracks: [[noteEvent(v, 0x90, 60, 100), noteEvent(0, 0x80, 60, 0), endOfTrackMetaEvent()]],
      });
      const { midiFile } = NE.parseMidiFile(bytes);
      assert.equal(midiFile.tracks[0].notes[0].tick, v);
    }
  });

  test('multi-byte VLQ values (128, 16384, 2097151) round-trip correctly', () => {
    for (const v of [128, 16384, 2097151]) {
      const bytes = buildMidiFile({
        format: 0,
        ppq: 480,
        tracks: [[noteEvent(v, 0x90, 60, 100), noteEvent(0, 0x80, 60, 0), endOfTrackMetaEvent()]],
      });
      const { midiFile } = NE.parseMidiFile(bytes);
      assert.equal(midiFile.tracks[0].notes[0].tick, v);
    }
  });

  test('encodeVlq itself produces the documented continuation-bit shape for a known 2-byte value', () => {
    // 300 = 0b1_0010_1100 -> should split into 2 groups: high=0x02, low=0x2c, with the high byte's continuation bit set.
    assert.deepEqual(encodeVlq(300), [0x82, 0x2c]);
  });
});

describe('MIDI parser: running status (Phase 39, §11.1/§11.2)', () => {
  test('a second note-on with NO repeated status byte (running status) is read correctly', () => {
    const bytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [
        [
          noteEvent(0, 0x90, 60, 100), // real status byte
          runningStatusDataEvent(0, 64, 100), // relies on running status = 0x90
          noteEvent(240, 0x80, 60, 0),
          noteEvent(0, 0x80, 64, 0),
          endOfTrackMetaEvent(),
        ],
      ],
    });
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.deepEqual([...diagnostics], []);
    assert.equal(midiFile.tracks[0].notes.length, 2);
    assert.equal(midiFile.tracks[0].notes[0].noteNumber, 60);
    assert.equal(midiFile.tracks[0].notes[1].noteNumber, 64);
  });
});

describe('MIDI parser: note-on velocity 0 as note-off (Phase 39, §11.1)', () => {
  test('a note-on with velocity 0 closes the note exactly like an explicit note-off would', () => {
    const bytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [[noteEvent(0, 0x90, 67, 90), noteEvent(960, 0x90, 67, 0), endOfTrackMetaEvent()]],
    });
    const { midiFile } = NE.parseMidiFile(bytes);
    assert.equal(midiFile.tracks[0].notes.length, 1);
    assert.equal(midiFile.tracks[0].notes[0].noteNumber, 67);
    assert.equal(midiFile.tracks[0].notes[0].durationTicks, 960);
    assert.equal(midiFile.tracks[0].notes[0].velocity, 90); // the NOTE-ON's velocity, not the closing 0
  });
});

describe("MIDI parser: a multi-tempo file's tempo list (Phase 39, §11.2)", () => {
  test('multiple tempo meta events across the file are all collected, in order, into one global list', () => {
    const bytes = buildMidiFile({
      format: 1,
      ppq: 480,
      tracks: [
        [tempoMetaEvent(0, 500000), tempoMetaEvent(960, 400000), endOfTrackMetaEvent()], // 120bpm -> 150bpm
        [noteEvent(0, 0x90, 60, 100), noteEvent(480, 0x80, 60, 0), endOfTrackMetaEvent()],
      ],
    });
    const { midiFile } = NE.parseMidiFile(bytes);
    assert.equal(midiFile.tempoEvents.length, 2);
    assert.equal(midiFile.tempoEvents[0].microsecondsPerQuarter, 500000);
    assert.equal(midiFile.tempoEvents[1].microsecondsPerQuarter, 400000);
    assert.equal(midiFile.tempoEvents[1].tick, 960); // already normalized, ppq=480 == TICKS_PER_QUARTER so unchanged
  });

  test("a file with no tempo event at all simply has an empty tempoEvents list (120 BPM default is a downstream concern, not this parser's)", () => {
    const bytes = buildMidiFile({ format: 0, ppq: 480, tracks: [trackWithNotes()] });
    const { midiFile } = NE.parseMidiFile(bytes);
    assert.deepEqual([...midiFile.tempoEvents], []);
  });
});

describe('MIDI parser: PPQ -> 480 tick normalization (Phase 39, §11.2)', () => {
  for (const ppq of [96, 480, 960]) {
    test(`a quarter note's worth of ticks (declared as one PPQ unit per beat) normalizes correctly for ppq=${ppq}`, () => {
      const bytes = buildMidiFile({
        format: 0,
        ppq,
        tracks: [[noteEvent(0, 0x90, 60, 100), noteEvent(ppq, 0x80, 60, 0), endOfTrackMetaEvent()]],
      });
      const { midiFile } = NE.parseMidiFile(bytes);
      // One PPQ-unit's worth of raw ticks (a real quarter note) must always
      // normalize to exactly 480, the engine's fixed internal unit,
      // regardless of the file's own declared PPQ.
      assert.equal(midiFile.tracks[0].notes[0].durationTicks, 480);
    });
  }
});

describe('MIDI parser: time signature and key signature meta events (Phase 39, §11.1)', () => {
  test('a time signature meta event decodes the printed denominator correctly from its 2^dd encoding', () => {
    const bytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [[timeSignatureMetaEvent(0, 6, 3), endOfTrackMetaEvent()]], // 6/8: dd=3 -> 2^3=8
    });
    const { midiFile } = NE.parseMidiFile(bytes);
    assert.equal(midiFile.timeSignatureEvents[0].numerator, 6);
    assert.equal(midiFile.timeSignatureEvents[0].denominator, 8);
  });

  test('a key signature meta event decodes a negative (flats) sharpsFlats value correctly from its signed-byte encoding', () => {
    const bytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [[keySignatureMetaEvent(0, -3, false), endOfTrackMetaEvent()]], // 3 flats, major
    });
    const { midiFile } = NE.parseMidiFile(bytes);
    assert.equal(midiFile.keySignatureEvents[0].sharpsFlats, -3);
    assert.equal(midiFile.keySignatureEvents[0].isMinor, false);
  });

  test('a key signature meta event decodes a positive (sharps) value and minor flag correctly', () => {
    const bytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [[keySignatureMetaEvent(0, 4, true), endOfTrackMetaEvent()]], // 4 sharps, minor
    });
    const { midiFile } = NE.parseMidiFile(bytes);
    assert.equal(midiFile.keySignatureEvents[0].sharpsFlats, 4);
    assert.equal(midiFile.keySignatureEvents[0].isMinor, true);
  });
});

describe('MIDI parser: unknown meta events are skipped by declared length (Phase 39, §11.2)', () => {
  test('an unrecognized meta event type does not desynchronize parsing of the events after it', () => {
    const unknownMeta = [0x00, 0xff, 0x7f, 0x03, 0xaa, 0xbb, 0xcc]; // a "sequencer-specific" meta event, 3 bytes, deliberately not one this parser interprets
    const bytes = buildMidiFile({
      format: 0,
      ppq: 480,
      tracks: [[unknownMeta, noteEvent(0, 0x90, 72, 100), noteEvent(240, 0x80, 72, 0), endOfTrackMetaEvent()]],
    });
    const { midiFile, diagnostics } = NE.parseMidiFile(bytes);
    assert.deepEqual([...diagnostics], []);
    assert.equal(midiFile.tracks[0].notes.length, 1);
    assert.equal(midiFile.tracks[0].notes[0].noteNumber, 72);
  });
});
