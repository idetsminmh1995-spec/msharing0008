import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'musicxml');

const NE = loadEngine();
const domParser = testDomParser();

function loadFixture(name) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.parseMusicXml(xml, { domParser });
}

describe('MusicXML parser v1 (Phase 20)', () => {
  test('a simple single-voice piece parses into the right number of parts/measures/notes', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.score.parts.length, 1);
    const part = result.score.parts[0];
    assert.equal(part.id, 'P1');
    assert.equal(part.name, 'Piano');
    assert.equal(part.measures.length, 2);

    const m1 = part.measures[0];
    assert.equal(m1.number, 1);
    assert.equal(m1.voices.length, 1);
    assert.equal(m1.voices[0].events.length, 4);
    const steps = [...m1.voices[0].events].map((e) => e.pitch.step);
    assert.deepEqual(steps, ['C', 'D', 'E', 'F']);

    const m2 = part.measures[1];
    assert.equal(m2.voices[0].events.length, 2);
    assert.equal(m2.voices[0].events[0].kind, 'note');
    assert.equal(m2.voices[0].events[1].kind, 'rest');
  });

  test('the attributes side-table records divisions/key/time/clef, inherited into measure 2', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    assert.equal(result.attributes.length, 2);
    const [a1, a2] = result.attributes;
    assert.equal(a1.divisions, 2);
    assert.equal(a1.fifths, 0);
    assert.equal(a1.timeNumerator, 4);
    assert.equal(a1.timeDenominator, 4);
    assert.equal(a1.clefSign, 'G');
    assert.equal(a1.clefLine, 2);
    // Measure 2 declares no <attributes> of its own -- must inherit measure 1's.
    assert.equal(a2.divisions, 2);
    assert.equal(a2.clefSign, 'G');
  });

  test('<key><mode> is captured, because fifths alone cannot name a key', () => {
    // One sharp is G major AND E minor. The file says which; the parser
    // has to pass it on, or every host has to guess "major".
    const xml = (mode) => `<?xml version="1.0"?>
      <score-partwise version="4.0">
        <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
        <part id="P1"><measure number="1">
          <attributes><divisions>1</divisions>
            <key><fifths>1</fifths>${mode}</key>
            <time><beats>4</beats><beat-type>4</beat-type></time>
            <clef><sign>G</sign><line>2</line></clef>
          </attributes>
          <note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
        </measure></part>
      </score-partwise>`;
    const minor = NE.parseMusicXml(xml('<mode>minor</mode>'), { domParser });
    assert.equal(minor.attributes[0].fifths, 1);
    assert.equal(minor.attributes[0].mode, 'minor');

    const major = NE.parseMusicXml(xml('<mode>Major</mode>'), { domParser });
    assert.equal(major.attributes[0].mode, 'major', 'the mode is lower-cased');

    // A file that says nothing says nothing: no invented "major".
    const silent = NE.parseMusicXml(xml(''), { domParser });
    assert.equal(silent.attributes[0].fifths, 1);
    assert.equal(silent.attributes[0].mode, undefined);
  });

  test('a mid-score key change carries its own mode, and clears the old one', () => {
    const xml = `<?xml version="1.0"?>
      <score-partwise version="4.0">
        <part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list>
        <part id="P1">
          <measure number="1">
            <attributes><divisions>1</divisions>
              <key><fifths>0</fifths><mode>minor</mode></key>
              <time><beats>4</beats><beat-type>4</beat-type></time>
              <clef><sign>G</sign><line>2</line></clef>
            </attributes>
            <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
          </measure>
          <measure number="2">
            <attributes><key><fifths>-2</fifths><mode>major</mode></key></attributes>
            <note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
          </measure>
          <measure number="3">
            <attributes><key><fifths>2</fifths></key></attributes>
            <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
          </measure>
        </part>
      </score-partwise>`;
    const result = NE.parseMusicXml(xml, { domParser });
    // Read one at a time rather than deep-comparing a mapped array: the
    // engine is loaded in its own realm by the test helper, so an array
    // it built has a different Array.prototype and strict deep equality
    // rejects it for that alone.
    assert.equal(result.attributes.length, 3);
    assert.equal(result.attributes[0].fifths, 0);
    assert.equal(result.attributes[0].mode, 'minor');
    assert.equal(result.attributes[1].fifths, -2);
    assert.equal(result.attributes[1].mode, 'major');
    // Measure 3 changed the key without saying the mode. It is not
    // still "major" -- this file stopped claiming one.
    assert.equal(result.attributes[2].fifths, 2);
    assert.equal(result.attributes[2].mode, undefined);
  });

  test('barline info is captured in the attributes side-table', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    assert.equal(result.attributes[1].barlineStyle, 'light-heavy');
  });

  test('durations convert to the engine\'s normalized ticks correctly (divisions=2 -> quarter=480)', () => {
    const result = loadFixture('simple-single-voice.musicxml');
    const firstNote = result.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(firstNote.duration.ticks, 480);
    assert.equal(firstNote.duration.type, 'quarter');
  });

  test('two voices via <backup> BOTH survive -- the exact bug the prototype hit once', () => {
    const result = loadFixture('two-voice-backup.musicxml');
    assert.equal(result.diagnostics.length, 0);
    const measure = result.score.parts[0].measures[0];
    assert.equal(measure.voices.length, 2);

    const voiceIds = [...measure.voices].map((v) => v.id).sort();
    assert.deepEqual(voiceIds, [1, 2]);

    const voice1 = [...measure.voices].find((v) => v.id === 1);
    const voice2 = [...measure.voices].find((v) => v.id === 2);
    assert.equal(voice1.events.length, 4);
    assert.equal(voice2.events.length, 1);
    assert.equal(voice2.events[0].pitch.step, 'G');
    assert.equal(voice2.events[0].pitch.octave, 3);
  });

  test('a chord (<chord/> continuation notes) merges into one Chord event, not 3 separate notes', () => {
    const result = loadFixture('chord.musicxml');
    assert.equal(result.diagnostics.length, 0);
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events.length, 3); // chord, rest, half note -- not 5
    assert.equal(events[0].kind, 'chord');
    assert.equal(events[0].notes.length, 3);
    const steps = [...events[0].notes].map((n) => n.pitch.step);
    assert.deepEqual(steps, ['C', 'E', 'G']);
    assert.equal(events[1].kind, 'rest');
    assert.equal(events[2].kind, 'note');
    assert.equal(events[2].pitch.step, 'A');
  });

  test('missing <divisions> recovers by assuming 1 and emits MISSING_DIVISIONS', () => {
    const result = loadFixture('missing-divisions.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('MISSING_DIVISIONS'));
    const note = result.score.parts[0].measures[0].voices[0].events[0];
    // duration=1 with assumed divisions=1 -> exactly one quarter note's ticks (480).
    assert.equal(note.duration.ticks, 480);
  });

  test('an unrecognized <type> derives the duration from ticks and emits UNKNOWN_DURATION_TYPE', () => {
    const result = loadFixture('unknown-duration-type.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('UNKNOWN_DURATION_TYPE'));
    const note = result.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(note.duration.type, 'quarter'); // derived correctly despite the bogus <type> text
  });

  test('a non-score-partwise root produces an empty score with an UNSUPPORTED_ROOT diagnostic, never throws', () => {
    const result = NE.parseMusicXml('<not-a-score/>', { domParser });
    assert.equal(result.score.parts.length, 0);
    assert.ok([...result.diagnostics].some((d) => d.code === 'UNSUPPORTED_ROOT'));
  });

  test('throws a clear error if no DOMParser is available and none was injected', () => {
    assert.throws(() => NE.parseMusicXml('<a/>'), /No DOMParser available/);
  });

  test('an unknown/v2-only element inside a measure is ignored but recorded as an info diagnostic', () => {
    const result = loadFixture('unknown-element.musicxml');
    const infos = [...result.diagnostics].filter((d) => d.severity === 'info');
    // <bookmark> is the genuinely-unhandled element here. The fixture's
    // <direction><words> used to be the one; Phase 35 Tier 2 reads that
    // now, so the fixture gained a real unknown element rather than this
    // test being weakened to match.
    assert.ok(infos.some((d) => d.code === 'UNKNOWN_ELEMENT'));
    assert.ok(infos.some((d) => d.message.includes('bookmark')));
    // The note after the ignored <direction> element must still parse correctly.
    const note = result.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(note.pitch.step, 'C');
  });

  test('a measure with more ticks than its time signature allows keeps the events and warns MEASURE_OVERRUN', () => {
    const result = loadFixture('measure-overrun.musicxml');
    const warnings = [...result.diagnostics].filter((d) => d.code === 'MEASURE_OVERRUN');
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].severity, 'warning');
    // The 5th (overrun) note is still present, not dropped.
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events.length, 5);
    assert.equal(events[4].pitch.step, 'G');
  });

  test('a part with zero measures produces an empty score and a NO_MEASURES diagnostic, never throws', () => {
    const result = loadFixture('empty-part.musicxml');
    assert.equal(result.score.parts[0].measures.length, 0);
    assert.ok([...result.diagnostics].some((d) => d.code === 'NO_MEASURES'));
  });

  test('multiple parts each parse independently with their own clef/pitch content', () => {
    const result = loadFixture('multi-part.musicxml');
    assert.equal(result.diagnostics.length, 0);
    assert.equal(result.score.parts.length, 2);
    const [violin, cello] = result.score.parts;
    assert.equal(violin.name, 'Violin');
    assert.equal(cello.name, 'Cello');
    assert.equal(violin.measures[0].voices[0].events[0].pitch.step, 'E');
    assert.equal(cello.measures[0].voices[0].events[0].pitch.step, 'C');
    const [violinAttrs, celloAttrs] = result.attributes;
    assert.equal(violinAttrs.partId, 'P1');
    assert.equal(violinAttrs.clefSign, 'G');
    assert.equal(celloAttrs.partId, 'P2');
    assert.equal(celloAttrs.clefSign, 'F');
  });

  test('ties, a dotted note, and <staff> all parse correctly together', () => {
    const result = loadFixture('tie-dot-staff.musicxml');
    const measure = result.score.parts[0].measures[0];
    assert.equal(measure.voices.length, 2);

    const voice1 = [...measure.voices].find((v) => v.id === 1);
    assert.equal(voice1.events.length, 2);
    const [first, second] = voice1.events;
    assert.equal(first.tieStart, true);
    assert.equal(first.staff, 1);
    assert.equal(second.tieStop, true);
    assert.equal(second.duration.dots, 1);
    assert.equal(second.duration.type, 'quarter');
    // divisions=4 -> a dotted quarter's raw duration (6) converts to 720 ticks (480 * 1.5).
    assert.equal(second.duration.ticks, 720);

    const voice2 = [...measure.voices].find((v) => v.id === 2);
    assert.equal(voice2.events[0].staff, 2);
    assert.equal(voice2.events[0].pitch.octave, 3);
  });
  test('<forward> advances the tick cursor, leaving a gap between notes', () => {
    const result = loadFixture('forward.musicxml');
    const events = result.score.parts[0].measures[0].voices[0].events;
    assert.equal(events.length, 2);
    assert.equal(events[0].pitch.step, 'C');
    assert.equal(events[1].pitch.step, 'G');
    // The <forward duration=4> (2 quarter notes at divisions=2) must have
    // pushed the second note past the gap -- if <forward> were ignored,
    // both notes would still parse but the second would sit at the wrong
    // musical position. Event order proves the cursor moved forward, and
    // no MEASURE_OVERRUN warning proves it moved by the right amount
    // (C=480 + forward=960 + G=480 = 1920 = exactly one 4/4 measure).
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(!codes.includes('MEASURE_OVERRUN'), 'forward should land the measure exactly full');
  });

  test('a note with no <duration> recovers as a quarter note and emits MISSING_DURATION', () => {
    const result = loadFixture('malformed-notes.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('MISSING_DURATION'));
  });

  test('a pitched note with no <octave> recovers and emits MISSING_OCTAVE', () => {
    const result = loadFixture('malformed-notes.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('MISSING_OCTAVE'));
  });

  test('an invalid <step> emits INVALID_PITCH_STEP', () => {
    const result = loadFixture('malformed-notes.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('INVALID_PITCH_STEP'));
  });

  test('an <unpitched> note now parses into a real unpitched Note (percussion support)', () => {
    const result = loadFixture('malformed-notes.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    // No longer skipped -- UNSUPPORTED_NOTE is now reserved for a <note>
    // that is neither <pitch>, <unpitched>, nor <rest>.
    assert.ok(!codes.includes('UNSUPPORTED_NOTE'));
    const events = result.score.parts[0].measures[0].voices[0].events;
    const unpitched = events.filter((e) => e.kind === 'note' && e.pitch.kind === 'unpitched');
    assert.equal(unpitched.length, 1);
    assert.equal(unpitched[0].pitch.displayStep, 'E');
    assert.equal(unpitched[0].pitch.displayOctave, 4);
  });

  test('a chord whose members disagree on duration falls back to the first note with INVALID_CHORD, never throws', () => {
    const result = loadFixture('invalid-chord.musicxml');
    const codes = [...result.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('INVALID_CHORD'));
    const events = result.score.parts[0].measures[0].voices[0].events;
    // Fell back to the single first note rather than losing the measure.
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'note');
    assert.equal(events[0].pitch.step, 'C');
  });

  // The old hand-maintained EMITTED_CODES coverage check that used to
  // live here was replaced in Phase 38 by a dynamic version
  // (test/unit/diagnostics-hardening.test.js) that scans the actual
  // parser source for every diagnostic code and checks coverage across
  // the WHOLE test suite, not just this one file's hardcoded list --
  // strictly more robust, so kept in one place instead of two
  // diverging mechanisms for the same concern.

});
