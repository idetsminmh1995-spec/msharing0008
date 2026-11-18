import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

/** How many times one SMuFL glyph is actually drawn -- the "was this note rendered" probe. */
function glyphCount(svg, name) {
  return svg.split(NE.getGlyph(name).char).length - 1;
}

/** The total noteheads drawn, across every shape family. */
function noteheadCount(svg) {
  return svg.split('').filter((c) => NE.getGlyphByChar(c)?.name.startsWith('notehead')).length;
}

const PART_LIST =
  '<part-list><score-part id="P1"><part-name>X</part-name></score-part></part-list>';

function score(partXml, partList = PART_LIST) {
  return (
    '<?xml version="1.0"?><score-partwise version="3.1">' +
    partList +
    `<part id="P1">${partXml}</part>` +
    '</score-partwise>'
  );
}

function pitchedNote(step, octave, extra = '') {
  return (
    `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
    `<duration>4</duration><voice>1</voice><type>quarter</type>${extra}</note>`
  );
}

function attributes(clefSign = 'G', clefLine = 2, extra = '') {
  return (
    '<attributes><divisions>1</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    `<clef><sign>${clefSign}</sign><line>${clefLine}</line></clef>${extra}</attributes>`
  );
}

const render = (xml, options) => NE.renderFromMusicXml(xml, { domParser, ...options });

function context(overrides = {}) {
  return {
    pitch: { kind: 'pitched', step: 'C', alter: 0, octave: 4 },
    durationType: 'quarter',
    staffLines: 5,
    clef: NE.TREBLE_CLEF,
    drumMap: NE.DEFAULT_DRUM_MAPPING_TABLE,
    ...overrides,
  };
}

describe('Part E: mapping layer contract (PLAN.md Part E)', () => {
  test('the default registry resolves a pitched note through the generic profile', () => {
    const resolution = new NE.MappingRegistry().resolve(context());
    assert.equal(resolution.profileId, 'generic-pitched');
    assert.equal(resolution.note.noteheadSource, 'fallback');
    assert.equal(typeof resolution.note.staffPosition, 'number');
    assert.match(resolution.note.noteheadGlyph, /^notehead/);
  });

  test('the generic profile is always the last profile, whatever the caller passes', () => {
    const custom = {
      id: 'custom',
      description: 'never matches',
      matches: () => false,
      resolve: () => {
        throw new Error('unreachable');
      },
    };
    const ids = new NE.MappingRegistry([custom]).profileIds();
    assert.equal(ids[0], 'custom');
    assert.equal(ids[ids.length - 1], 'generic-pitched');
  });

  test('a caller profile that throws degrades to the generic answer, never a crash', () => {
    const registry = new NE.MappingRegistry([
      {
        id: 'explodes',
        description: 'always throws',
        matches: () => true,
        resolve: () => {
          throw new Error('boom');
        },
      },
    ]);
    const resolution = registry.resolve(context());
    assert.equal(resolution.profileId, 'explodes');
    assert.match(resolution.note.noteheadGlyph, /^notehead/);
    assert.ok(
      resolution.diagnostics.some((d) => d.code === 'MAPPING_PROFILE_FAILED'),
      'a throwing profile must be reported, not silently swallowed',
    );
  });

  test('an explicit <notehead> is reported as explicit-file, and outranks the profile', () => {
    const resolution = new NE.MappingRegistry().resolve(context({ explicitNotehead: 'x' }));
    assert.equal(resolution.note.noteheadSource, 'explicit-file');
  });

  test('a config override is reported as user-override', () => {
    const resolution = new NE.MappingRegistry().resolve(
      context({ overridesByKey: { C4: 'diamond' } }),
    );
    assert.equal(resolution.note.noteheadSource, 'user-override');
  });

  test('an unpitched note with a GM number goes through the percussion profile', () => {
    const resolution = new NE.MappingRegistry().resolve(
      context({
        pitch: { kind: 'unpitched', displayStep: 'C', displayOctave: 4 },
        gmNote: 38,
      }),
    );
    assert.equal(resolution.profileId, 'unpitched-percussion');
    assert.equal(resolution.note.staffPositionSource, 'instrument-profile');
  });

  test('an out-of-range GM number resolves without throwing and reports a diagnostic', () => {
    const resolution = new NE.MappingRegistry().resolve(
      context({
        pitch: { kind: 'unpitched', displayStep: 'B', displayOctave: 4 },
        gmNote: 200,
      }),
    );
    assert.equal(resolution.profileId, 'unpitched-percussion');
    assert.ok(
      resolution.diagnostics.some((d) => d.code === 'DRUM_NOTE_OUT_OF_RANGE'),
      'an out-of-range GM number must be reported through the registry diagnostics',
    );
  });

  test('drumLookupDiagnostics states the same finding the renderer emits', () => {
    const findings = NE.drumLookupDiagnostics(200, NE.DEFAULT_DRUM_MAPPING_TABLE);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, 'DRUM_NOTE_OUT_OF_RANGE');
  });

  test('a profile list with no matching profile recovers with MAPPING_NO_PROFILE', () => {
    // `MappingRegistry` always appends the generic fallback, so this branch
    // is only reachable through the exported pure function -- which is the
    // whole reason it is exported.
    const never = {
      id: 'never',
      description: 'never matches',
      matches: () => false,
      resolve: () => {
        throw new Error('unreachable');
      },
    };
    const resolution = NE.resolveWithProfiles([never], context());
    assert.equal(resolution.profileId, 'generic-pitched');
    assert.match(resolution.note.noteheadGlyph, /^notehead/);
    assert.ok(resolution.diagnostics.some((d) => d.code === 'MAPPING_NO_PROFILE'));
  });
});

describe('Part E: MappingProfile validation', () => {
  test('an empty id is rejected with MAPPING_PROFILE_NO_ID', () => {
    const findings = NE.validateMappingProfile({ id: '' });
    assert.ok(findings.some((d) => d.code === 'MAPPING_PROFILE_NO_ID'));
  });

  test('an empty match object warns with MAPPING_PROFILE_EMPTY_MATCH', () => {
    const findings = NE.validateMappingProfile({ id: 'broad', match: {} });
    assert.ok(findings.some((d) => d.code === 'MAPPING_PROFILE_EMPTY_MATCH'));
  });

  test('a well-formed profile produces no findings', () => {
    const findings = NE.validateMappingProfile({
      id: 'kit',
      match: { instrumentName: 'Drum Set' },
      noteheadByKey: { 38: 'x' },
    });
    assert.equal(findings.length, 0);
  });
});

describe('Part E: every instrument renders, no note dropped (the completion test)', () => {
  const cases = {
    'a piano (plain pitched, no instrument data at all)': attributes() + pitchedNote('C', 4),
    'an unknown instrument (a theremin)': attributes() + pitchedNote('C', 4),
    'an alto-clef viola': attributes('C', 3) + pitchedNote('C', 4),
    'a tenor-clef trombone': attributes('C', 4) + pitchedNote('C', 3),
    'a bass-clef cello': attributes('F', 4) + pitchedNote('C', 3),
    'a transposing Bb clarinet':
      attributes(
        'G',
        2,
        '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>',
      ) + pitchedNote('C', 4),
    'a harmonic guitar note':
      attributes() + pitchedNote('E', 3, '<notations><harmonic/></notations>'),
    'an unpitched note with a display position':
      attributes('percussion', 2) +
      '<note><unpitched><display-step>B</display-step><display-octave>4</display-octave></unpitched><duration>4</duration><voice>1</voice><type>quarter</type></note>',
    'an unpitched note with NO display position':
      attributes('percussion', 2) +
      '<note><unpitched/><duration>4</duration><voice>1</voice><type>quarter</type></note>',
  };

  for (const [label, body] of Object.entries(cases)) {
    test(`${label} renders exactly one notehead`, () => {
      const { svg } = render(score(`<measure number="1">${body}</measure>`));
      assert.equal(noteheadCount(svg), 1, `${label}: expected exactly one notehead`);
    });
  }

  test('a GM-mapped drum kit places each of three drums', () => {
    const xml = score(
      '<measure number="1">' +
        attributes('percussion', 2) +
        '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I1"/></note>' +
        '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I2"/></note>' +
        '<note><unpitched/><duration>1</duration><voice>1</voice><type>quarter</type><instrument id="P1-I3"/></note>' +
        '</measure>',
      '<part-list><score-part id="P1"><part-name>Drum Set</part-name>' +
        '<score-instrument id="P1-I1"><instrument-name>Acoustic Snare</instrument-name></score-instrument>' +
        '<score-instrument id="P1-I2"><instrument-name>Bass Drum 1</instrument-name></score-instrument>' +
        '<score-instrument id="P1-I3"><instrument-name>Closed Hi-Hat</instrument-name></score-instrument>' +
        '<midi-instrument id="P1-I1"><midi-unpitched>39</midi-unpitched></midi-instrument>' +
        '<midi-instrument id="P1-I2"><midi-unpitched>36</midi-unpitched></midi-instrument>' +
        '<midi-instrument id="P1-I3"><midi-unpitched>43</midi-unpitched></midi-instrument>' +
        '</score-part></part-list>',
    );
    assert.equal(noteheadCount(render(xml).svg), 3);
  });
});

describe('Part E: mapping never touches the music (sounding pitch unchanged)', () => {
  test('a transposing instrument keeps its sounding pitch in the playback stream', () => {
    const xml = score(
      `<measure number="1">${attributes(
        'G',
        2,
        '<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>',
      )}${pitchedNote('C', 4)}</measure>`,
    );
    const result = render(xml);
    assert.equal(noteheadCount(result.svg), 1);
    const sounding = NE.getEventStream(result.playback).flatMap((e) => e.midiNotes ?? []);
    assert.equal(sounding.length, 1);
    assert.equal(sounding[0], 58);
  });
});

describe('Part E: MappingProfile customization', () => {
  test('a custom profile applies its own notehead shape for its instrument', () => {
    const registry = new NE.MappingRegistry([
      NE.mappingProfileToInstrumentProfile({
        id: 'custom-x',
        description: 'draws C4 as an x',
        match: { instrumentName: 'Xylophone' },
        noteheadByKey: { C4: 'x' },
      }),
    ]);
    const xml = score(
      `<measure number="1">${attributes()}${pitchedNote('C', 4)}</measure>`,
      '<part-list><score-part id="P1"><part-name>Xylophone</part-name></score-part></part-list>',
    );
    const withProfile = render(xml, { mappingRegistry: registry }).svg;
    const withoutProfile = render(xml).svg;
    assert.notEqual(withProfile, withoutProfile, 'the custom profile must change the drawing');
    assert.equal(glyphCount(withProfile, 'noteheadXBlack'), 1);
    assert.equal(noteheadCount(withProfile), 1);
  });

  test('a custom profile that matches no part leaves the render unchanged', () => {
    const registry = new NE.MappingRegistry([
      NE.mappingProfileToInstrumentProfile({
        id: 'custom-x',
        match: { instrumentName: 'Nonexistent Instrument' },
        noteheadByKey: { C4: 'x' },
      }),
    ]);
    const xml = score(`<measure number="1">${attributes()}${pitchedNote('C', 4)}</measure>`);
    assert.equal(render(xml, { mappingRegistry: registry }).svg, render(xml).svg);
  });

  test('an explicit <notehead> in the file outranks the custom profile', () => {
    const registry = new NE.MappingRegistry([
      NE.mappingProfileToInstrumentProfile({
        id: 'custom-x',
        match: {},
        noteheadByKey: { C4: 'x' },
      }),
    ]);
    const xml = score(
      `<measure number="1">${attributes()}${pitchedNote('C', 4, '<notehead>diamond</notehead>')}</measure>`,
    );
    const svg = render(xml, { mappingRegistry: registry }).svg;
    assert.equal(
      glyphCount(svg, 'noteheadDiamondBlack'),
      1,
      "the file's own diamond head must win",
    );
    assert.equal(glyphCount(svg, 'noteheadXBlack'), 0);
  });
});
