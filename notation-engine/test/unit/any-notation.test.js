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

/** A one-note score whose single note carries `noteheadXml` verbatim. */
function noteheadScore(noteheadXml, type = 'quarter', duration = 1) {
  return (
    '<score-partwise version="4.0"><part-list><score-part id="P1"/></part-list><part id="P1">' +
    '<measure number="1"><attributes><divisions>1</divisions>' +
    '<time><beats>4</beats><beat-type>4</beat-type></time>' +
    '<clef><sign>percussion</sign><line>2</line></clef></attributes>' +
    '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
    `<duration>${duration}</duration><voice>1</voice><type>${type}</type>${noteheadXml}</note>` +
    '</measure></part></score-partwise>'
  );
}

/**
 * "It must be able to read ANY drum notation."
 *
 * The engine used to THROW on any `<notehead>` value outside a
 * seven-item list. A real MuseScore drum chart writes `slashed` and
 * `<notehead smufl="noteheadHeavyXHat">other</notehead>`, so the whole
 * file came back as "Could not parse this file" -- over noteheads, on a
 * file whose notes, rhythms and barlines the engine read perfectly.
 */
describe('every MusicXML notehead value, and none of them fatal (§9.7)', () => {
  test('every value the spec defines resolves to a real glyph', () => {
    for (const value of [...NE.supportedMusicXmlNoteheads()]) {
      const shape = NE.musicXmlNoteheadToShape(value);
      if (shape === undefined) continue; // 'normal' and 'other', by design
      for (const durationType of ['whole', 'half', 'quarter', 'eighth']) {
        const glyph = NE.shapeGlyphName(shape, durationType);
        assert.ok(
          NE.getGlyph(glyph) !== undefined,
          `${value} -> ${shape} -> ${glyph} is not a glyph this font has`,
        );
      }
    }
  });

  test('the drum-chart values that used to be fatal now draw their own shapes', () => {
    // slashed and slash are DIFFERENT shapes, and getting them confused
    // is the easy mistake here.
    assert.equal(NE.selectNoteheadGlyphName({ pitch: NE.unpitchedPitch('F', 4), durationType: 'quarter', explicitNotehead: 'slashed' }), 'noteheadSlashedBlack1');
    assert.equal(NE.selectNoteheadGlyphName({ pitch: NE.unpitchedPitch('F', 4), durationType: 'quarter', explicitNotehead: 'slash' }), 'noteheadSlashVerticalEnds');
    assert.equal(NE.selectNoteheadGlyphName({ pitch: NE.unpitchedPitch('F', 4), durationType: 'quarter', explicitNotehead: 'back slashed' }), 'noteheadSlashedBlack2');
  });

  test('MusicXML "cross" is the PLUS shape, and "x" is the other one', () => {
    assert.equal(NE.musicXmlNoteheadToShape('cross'), 'plus');
    assert.equal(NE.musicXmlNoteheadToShape('x'), 'x');
  });

  test('<notehead smufl="..."> names its glyph directly, and outranks the enumeration', () => {
    const { svg, diagnostics } = NE.renderFromMusicXml(
      noteheadScore('<notehead smufl="noteheadHeavyXHat">other</notehead>'),
      { domParser },
    );
    assert.deepEqual([...diagnostics], [], 'a value the spec defines is not a warning');
    assert.ok(svg.includes(NE.getGlyph('noteheadHeavyXHat').char), 'the named glyph is drawn');
  });

  test('a smufl name no font has is ignored, falling through rather than drawing nothing', () => {
    const { svg } = NE.renderFromMusicXml(
      noteheadScore('<notehead smufl="noteheadNotARealGlyph">other</notehead>'),
      { domParser },
    );
    assert.ok(svg.includes(NE.getGlyph('noteheadBlack').char), 'the ordinary notehead is drawn');
  });

  test('a value outside the spec warns and draws the ordinary head -- it never takes the file down', () => {
    const { svg, diagnostics } = NE.renderFromMusicXml(
      noteheadScore('<notehead>wobbly</notehead>'),
      { domParser },
    );
    assert.ok([...diagnostics].some((d) => d.code === 'UNKNOWN_NOTEHEAD'));
    assert.ok(svg.includes(NE.getGlyph('noteheadBlack').char));
  });

  test('"none" draws SMuFL s own invisible head, keeping the note s place', () => {
    assert.equal(
      NE.selectNoteheadGlyphName({
        pitch: NE.unpitchedPitch('F', 4),
        durationType: 'quarter',
        explicitNotehead: 'none',
      }),
      'noteheadNull',
    );
  });

  test('the shape-note heads (do/re/mi/fa/so/la/ti) map to SMuFL s noteShape glyphs', () => {
    assert.equal(NE.musicXmlNoteheadToShape('fa up'), 'fa-up');
    assert.equal(NE.shapeGlyphName('mi', 'quarter'), 'noteShapeDiamondBlack');
    assert.equal(NE.shapeGlyphName('mi', 'whole'), 'noteShapeDiamondWhite');
  });
});

describe('a measure has a standard minimum width (§14)', () => {
  const widths = (name, config) => {
    const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
    const { playback } = NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
    return [...playback.measureLayoutsByNumber.entries()].map(([n, l]) => [n, l.width, l.headerWidth]);
  };

  test('a 4/4 bar is never narrower than config.spacing.minMeasureWidth past its header', () => {
    for (const [number, width, headerWidth] of widths('drum-forward-gap.musicxml')) {
      assert.ok(
        width - headerWidth >= NE.DEFAULT_CONFIG.spacing.minMeasureWidth - 1e-9,
        `measure ${number} is only ${(width - headerWidth).toFixed(2)} wide past its header`,
      );
    }
  });

  test('a bar with fewer notes is the same width as its fuller neighbours', () => {
    // The user's report, comparing this engine's drum output against
    // MuseScore's: a bar of three quarter notes came out visibly
    // narrower than its neighbours of four, and a bar holding one whole
    // rest came out barely wider than the rest itself.
    const bars = [
      '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched><duration>1</duration><voice>1</voice><type>quarter</type></note>'.repeat(4),
      '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched><duration>1</duration><voice>1</voice><type>quarter</type></note>'.repeat(3) +
        '<note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note>',
      '<note><rest measure="yes"/><duration>4</duration><voice>1</voice></note>',
    ];
    const xml =
      '<score-partwise version="4.0"><part-list><score-part id="P1"/></part-list><part id="P1">' +
      bars
        .map(
          (body, i) =>
            `<measure number="${i + 1}">` +
            (i === 0
              ? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>' +
                '<clef><sign>percussion</sign><line>2</line></clef></attributes>'
              : '') +
            body +
            '</measure>',
        )
        .join('') +
      '</part></score-partwise>';
    const { playback } = NE.renderFromMusicXml(xml, { domParser });
    const noteAreas = [...playback.measureLayoutsByNumber.values()].map(
      (l) => l.width - l.headerWidth,
    );
    assert.equal(noteAreas.length, 3);
    for (const area of noteAreas) {
      assert.ok(
        Math.abs(area - noteAreas[0]) < 1e-9,
        `bar widths still vary: ${noteAreas.map((a) => a.toFixed(2)).join(', ')}`,
      );
    }
  });

  test('it is a MINIMUM, not a fixed width -- a busy bar still grows past it', () => {
    const busy = widths('beamed-eighths.musicxml', {
      spacing: { minMeasureWidth: 0.1 },
    });
    const floored = widths('beamed-eighths.musicxml');
    for (let i = 0; i < busy.length; i++) {
      const natural = busy[i][1];
      const withFloor = floored[i][1];
      assert.ok(withFloor >= natural - 1e-9, 'the floor never makes a measure narrower');
      if (natural - busy[i][2] > NE.DEFAULT_CONFIG.spacing.minMeasureWidth) {
        assert.equal(withFloor, natural, 'a measure already wider than the floor is untouched');
      }
    }
  });

  test('the floor scales with the measure s own notated length', () => {
    const shortBar =
      '<score-partwise version="4.0"><part-list><score-part id="P1"/></part-list><part id="P1">' +
      '<measure number="1"><attributes><divisions>1</divisions>' +
      '<time><beats>2</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>percussion</sign><line>2</line></clef></attributes>' +
      '<note><unpitched><display-step>F</display-step><display-octave>4</display-octave></unpitched>' +
      '<duration>2</duration><voice>1</voice><type>half</type></note>' +
      '</measure></part></score-partwise>';
    const { playback } = NE.renderFromMusicXml(shortBar, { domParser });
    const layout = playback.measureLayoutsByNumber.get(1);
    const noteArea = layout.width - layout.headerWidth;
    // Half a whole note, so half the floor -- not the full 4/4 width.
    assert.ok(Math.abs(noteArea - NE.DEFAULT_CONFIG.spacing.minMeasureWidth * 0.5) < 1e-9);
  });
});
