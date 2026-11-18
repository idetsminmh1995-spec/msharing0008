import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

describe('midiNoteNumber', () => {
  test('middle C is MIDI 60 and follows scientific octave notation', () => {
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: 4 }), 60);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'A', alter: 0, octave: 4 }), 69);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: 0 }), 12);
  });

  test('accidentals raise or lower by semitone', () => {
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 1, octave: 4 }), 61);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: -1, octave: 4 }), 59);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'B', alter: 0, octave: 3 }), 59);
  });

  test('a transposition offset shifts the sounding note', () => {
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: 4 }, 2), 62);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: 4 }, -12), 48);
  });

  test('an unpitched position has no MIDI note, and out-of-range pitches return undefined', () => {
    assert.equal(NE.midiNoteNumber({ kind: 'unpitched', displayStep: 'C', displayOctave: 4 }), undefined);
    // MIDI stops at 127 (G9); C10 would be 132 and C-2 would be -12.
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: 10 }), undefined);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: -2 }), undefined);
    // The extremes of the valid range still resolve.
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'G', alter: 0, octave: 9 }), 127);
    assert.equal(NE.midiNoteNumber({ kind: 'pitched', step: 'C', alter: 0, octave: -1 }), 0);
  });

  test('the playback event stream and the preview helper agree on a note number', () => {
    const pitch = { kind: 'pitched', step: 'G', alter: 0, octave: 4 };
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1"><attributes><divisions>4</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>' +
      '<note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>' +
      '</measure></part></score-partwise>';
    const { playback } = NE.renderFromMusicXml(xml, { domParser });
    const event = playback.events[0];
    // The event stream derives its MIDI note from the same helper the
    // editor's note preview calls, so hearing a written note and playing
    // it back can never disagree.
    assert.equal(event.midiNotes.length, 1);
    assert.equal(event.midiNotes[0], NE.midiNoteNumber(pitch));
    assert.equal(event.midiNotes[0], 67);
  });
});
