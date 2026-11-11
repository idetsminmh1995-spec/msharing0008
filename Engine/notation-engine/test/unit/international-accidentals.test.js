import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const domParser = testDomParser();

function scoreWithNotes(notes) {
  return `<?xml version="1.0"?>
    <score-partwise version="4.0">
      <part-list><score-part id="P1"><part-name>Microtonal study</part-name></score-part></part-list>
      <part id="P1"><measure number="1">
        <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
          <clef><sign>G</sign><line>2</line></clef></attributes>
        ${notes}
      </measure></part>
    </score-partwise>`;
}

function note(step, alter, accidental = '') {
  return `<note><pitch><step>${step}</step>${alter === undefined ? '' : `<alter>${alter}</alter>`}<octave>4</octave></pitch>
    <duration>1</duration><type>quarter</type>${accidental}</note>`;
}

describe('MusicXML international and microtonal accidentals', () => {
  test('every MusicXML 4.0 accidental-value resolves to its bundled SMuFL glyph', () => {
    const values = [
      'sharp',
      'natural',
      'flat',
      'double-sharp',
      'sharp-sharp',
      'flat-flat',
      'natural-sharp',
      'natural-flat',
      'quarter-flat',
      'quarter-sharp',
      'three-quarters-flat',
      'three-quarters-sharp',
      'sharp-down',
      'sharp-up',
      'natural-down',
      'natural-up',
      'flat-down',
      'flat-up',
      'double-sharp-down',
      'double-sharp-up',
      'flat-flat-down',
      'flat-flat-up',
      'arrow-down',
      'arrow-up',
      'triple-sharp',
      'triple-flat',
      'slash-quarter-sharp',
      'slash-sharp',
      'slash-flat',
      'double-slash-flat',
      'sharp-1',
      'sharp-2',
      'sharp-3',
      'sharp-5',
      'flat-1',
      'flat-2',
      'flat-3',
      'flat-4',
      'sori',
      'koron',
    ];
    assert.equal(values.length, 40);
    for (const value of values) {
      const glyphName = NE.musicXmlAccidentalGlyphName(value);
      assert.ok(glyphName, `MusicXML accidental value ${value} has a mapping`);
      assert.ok(NE.getGlyph(glyphName), `${value} resolves to bundled glyph ${glyphName}`);
    }
    assert.equal(NE.musicXmlAccidentalGlyphName('other'), undefined);
  });

  test('decimal <alter> values and named Turkish/Persian/SMuFL signs survive parse and render', () => {
    const xml = scoreWithNotes(
      [
        note('C', '0.5', '<accidental>quarter-sharp</accidental>'),
        note('D', '-0.5', '<accidental>koron</accidental>'),
        note('E', '0.25', '<accidental>slash-quarter-sharp</accidental>'),
        note(
          'F',
          '0.5',
          '<accidental smufl="accidentalQuarterToneSharpArabic">quarter-sharp</accidental>',
        ),
      ].join('\n'),
    );
    const parsed = NE.parseMusicXml(xml, { domParser });
    const events = parsed.score.parts[0].measures[0].voices[0].events;
    assert.equal(parsed.diagnostics.length, 0);
    assert.equal(events[0].pitch.alter, 0.5);
    assert.equal(events[0].accidentalGlyphName, 'accidentalQuarterToneSharpStein');
    assert.equal(events[1].pitch.alter, -0.5);
    assert.equal(events[1].accidentalGlyphName, 'accidentalKoron');
    assert.equal(events[2].pitch.alter, 0.25);
    assert.equal(events[2].accidentalGlyphName, 'accidentalKucukMucennebSharp');
    assert.equal(events[3].accidentalGlyphName, 'accidentalQuarterToneSharpArabic');

    const rendered = NE.renderFromMusicXml(xml, { domParser });
    assert.equal(rendered.diagnostics.length, 0);
    for (const glyphName of [
      'accidentalQuarterToneSharpStein',
      'accidentalKoron',
      'accidentalKucukMucennebSharp',
      'accidentalQuarterToneSharpArabic',
    ]) {
      assert.ok(rendered.svg.includes(NE.getGlyph(glyphName).char), `${glyphName} is in the SVG`);
    }
  });

  test('unsupported alterations and invalid glyph/value data warn and never crash rendering', () => {
    const xml = scoreWithNotes(
      [
        note('C', '0.3333333333'),
        note('D', '0.5', '<accidental smufl="noteheadBlack">other</accidental>'),
        note('E', 'not-a-number'),
      ].join('\n'),
    );
    assert.doesNotThrow(() => NE.renderFromMusicXml(xml, { domParser }));
    const parsed = NE.parseMusicXml(xml, { domParser });
    const codes = [...parsed.diagnostics].map((d) => d.code);
    assert.ok(codes.includes('UNSUPPORTED_PITCH_ALTER'));
    assert.ok(codes.includes('UNKNOWN_ACCIDENTAL_SMUFL'));
    assert.ok(codes.includes('UNSUPPORTED_ACCIDENTAL'));
    assert.ok(codes.includes('INVALID_PITCH_ALTER'));
    assert.equal(parsed.score.parts[0].measures[0].voices[0].events[0].pitch.alter, 0.3333333333);
  });

  test('fractional numeric lookup is exact for standard quarter-tone alterations', () => {
    assert.equal(NE.accidentalGlyphName(-0.5), 'accidentalQuarterToneFlatStein');
    assert.equal(NE.accidentalGlyphName(0.5), 'accidentalQuarterToneSharpStein');
    assert.equal(NE.accidentalGlyphName(-1.5), 'accidentalThreeQuarterTonesFlatZimmermann');
    assert.equal(NE.accidentalGlyphName(1.5), 'accidentalThreeQuarterTonesSharpStein');
    assert.equal(NE.tryAccidentalGlyphName(0.3333333333), undefined);
  });
});
