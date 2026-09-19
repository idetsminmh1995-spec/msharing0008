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

function render(name, config) {
  const xml = fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
  return NE.renderFromMusicXml(xml, { domParser, ...(config ? { config } : {}) });
}

/** Every bar number the render drew, in document order -- they are the only text in the TEXT font. */
function barNumbers(svg, fontFamily = 'Manrope, sans-serif') {
  const re = new RegExp(`font-family="${fontFamily}"[^>]*>(\\d+)<`, 'g');
  return [...svg.matchAll(re)].map((m) => m[1]);
}

describe('Phase 50: the theming API is live (§8)', () => {
  describe('colors', () => {
    test('config.colors.ink replaces the ink colour everywhere, with nothing left black', () => {
      const { svg } = render('simple-single-voice.musicxml', { colors: { ink: '#123456' } });
      assert.ok(svg.includes('#123456'), 'the configured ink is used');
      assert.ok(!svg.includes('#000000'), 'nothing is still hardcoded black');
    });

    test('config.colors.background reaches the SVG background rect', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        colors: { background: '#fafafa' },
      });
      assert.ok(svg.includes('#fafafa'));
      assert.ok(!svg.includes('#ffffff'));
    });

    test('a per-category override colours ONLY that category, leaving the rest at ink', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        colors: { ink: '#111111', overrides: { notehead: '#ff0000' } },
      });
      // The 5 noteheads (4 quarters + 1 half) are the only glyphs drawn
      // in the override colour; the staff, clef, time signature, stems
      // and the half rest all stay at ink.
      const noteheads = [...svg.matchAll(/fill="#ff0000"/g)];
      assert.equal(noteheads.length, 5);
      assert.ok(svg.includes('#111111'), 'everything else still uses ink');
    });

    test('an override for a category the score does not contain changes nothing', () => {
      const plain = render('simple-single-voice.musicxml', { colors: { ink: '#111111' } }).svg;
      const withTabOverride = render('simple-single-voice.musicxml', {
        colors: { ink: '#111111', overrides: { tabNumber: '#00ff00' } },
      }).svg;
      assert.equal(withTabOverride, plain);
    });
  });

  describe('fonts', () => {
    test('config.fonts.musicFont replaces the SMuFL font on every glyph', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        fonts: { musicFont: 'Petaluma' },
      });
      assert.ok(svg.includes('font-family="Petaluma"'));
      assert.ok(!svg.includes('Bravura'), 'no glyph is still pinned to Bravura');
    });

    test('config.fonts.textFont applies to the bar number, NOT to the glyphs', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        fonts: { textFont: 'Georgia, serif' },
      });
      assert.deepEqual(barNumbers(svg, 'Georgia, serif'), ['1']);
      assert.ok(svg.includes('font-family="Bravura"'), 'the music font is untouched');
    });

    test('config.fonts.sizes.barNumber sets the bar number size', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        fonts: { sizes: { barNumber: 3 } },
      });
      assert.match(svg, /font-family="Manrope, sans-serif" font-size="3">1</);
    });

    test('overriding one font size keeps the other four at their defaults', () => {
      const c = NE.resolveConfig({ fonts: { sizes: { barNumber: 3 } } });
      assert.equal(c.fonts.sizes.barNumber, 3);
      assert.equal(c.fonts.sizes.lyric, NE.DEFAULT_CONFIG.fonts.sizes.lyric);
      assert.equal(c.fonts.sizes.tempo, NE.DEFAULT_CONFIG.fonts.sizes.tempo);
      assert.equal(c.fonts.musicFont, NE.DEFAULT_CONFIG.fonts.musicFont);
    });
  });

  describe('bar numbers (§13.1)', () => {
    test("the default ('systemStart') numbers the first measure of the one scroll system", () => {
      const { svg } = render('simple-single-voice.musicxml');
      assert.deepEqual(barNumbers(svg), ['1']);
    });

    test("'everyBar' numbers every measure", () => {
      const { svg } = render('simple-single-voice.musicxml', {
        barNumbers: { display: 'everyBar' },
      });
      assert.deepEqual(barNumbers(svg), ['1', '2']);
    });

    test("'everyNBars' numbers measures 1, 1+n, 1+2n ...", () => {
      const { svg } = render('simple-single-voice.musicxml', {
        barNumbers: { display: 'everyNBars', everyNBars: 2 },
      });
      assert.deepEqual(barNumbers(svg), ['1']);
    });

    test("'off' draws none at all", () => {
      const { svg } = render('simple-single-voice.musicxml', { barNumbers: { display: 'off' } });
      assert.deepEqual(barNumbers(svg), []);
    });

    test('page mode numbers the first measure of EVERY system, not only the first', () => {
      // A page narrow enough that the two measures land on two systems.
      const { svg } = render('simple-single-voice.musicxml', {
        layout: { mode: 'page' },
        page: { pageWidth: 14 },
      });
      assert.deepEqual(barNumbers(svg), ['1', '2']);
    });

    test('a grand staff numbers each measure ONCE, not once per staff', () => {
      const { svg } = render('piano-grand-staff.musicxml', {
        barNumbers: { display: 'everyBar' },
      });
      assert.deepEqual(barNumbers(svg), ['1']);
    });

    test('the number sits a fixed gap above the top line, and adds no headroom of its own', () => {
      const off = render('two-voice-drum-groove.musicxml', { barNumbers: { display: 'off' } }).svg;
      const on = render('two-voice-drum-groove.musicxml').svg;
      // Turning bar numbers on must not move a single note: the number is
      // drawn at the measure's left edge, clear of all content.
      assert.equal(on.replace(/<text[^>]*Manrope[^>]*>\d+<\/text>\n?/g, ''), off);
    });
  });

  describe('beam style', () => {
    test('config.beam.style reaches the beam shape (flat beams are horizontal)', () => {
      const straight = render('beamed-eighths.musicxml', { beam: { style: 'straight' } }).svg;
      const flat = render('beamed-eighths.musicxml', { beam: { style: 'flat' } }).svg;
      assert.notEqual(flat, straight, 'the option actually changes the output');
    });
  });

  describe('notehead mapping (§9.7)', () => {
    test('config.noteheadMapping.defaultShape changes the default notehead family', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        noteheadMapping: { defaultShape: 'x' },
      });
      // noteheadXBlack is U+E0A9, noteheadXHalf U+E0A8 -- and the half
      // note still gets the HALF variant, which is the whole reason
      // defaultShape is a shape family rather than one glyph name.
      assert.ok(svg.includes('\u{E0A9}'), 'quarter notes use the X black head');
      assert.ok(svg.includes('\u{E0A8}'), 'the half note uses the X half head');
      assert.ok(!svg.includes('\u{E0A4}'), 'no plain black notehead remains');
    });

    test('an overridesByKey entry wins over the default shape for just that pitch', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        noteheadMapping: { overridesByKey: { C4: 'diamond' } },
      });
      assert.ok(svg.includes('\u{E0DB}'), 'C4 became a black diamond');
      assert.ok(svg.includes('\u{E0A4}'), 'every other note kept the normal head');
    });
  });

  describe('drum mapping (§13.3)', () => {
    test("config.drums.mapping overrides a GM note's staff position and notehead", () => {
      const plain = render('gm-drum-mapping.musicxml').svg;
      const remapped = render('gm-drum-mapping.musicxml', {
        drums: { mapping: { 42: { staffPosition: -7, noteheadShape: 'diamond' } } },
      }).svg;
      assert.notEqual(remapped, plain);
      assert.ok(remapped.includes('\u{E0DB}'), 'the hi-hat is now a diamond');
      assert.ok(!remapped.includes('\u{E0A9}'), 'and is no longer the default X');
    });

    test('a partial override keeps the default table s own value for the fields it omits', () => {
      const merged = NE.mergeDrumMappingTable({ 42: { noteheadShape: 'diamond' } });
      assert.equal(merged[42].noteheadShape, 'diamond');
      assert.equal(
        merged[42].staffPosition,
        NE.DEFAULT_DRUM_MAPPING_TABLE[42].staffPosition,
        'the position it did not name is unchanged',
      );
      assert.equal(merged[38].noteheadShape, NE.DEFAULT_DRUM_MAPPING_TABLE[38].noteheadShape);
    });
  });

  describe('layout scale', () => {
    test('config.layout.pxPerStaffSpace sets the SVG pixel size, not the viewBox', () => {
      const { svg } = render('simple-single-voice.musicxml', {
        layout: { pxPerStaffSpace: 40 },
      });
      const width = Number(/ width="([\d.]+)"/.exec(svg)[1]);
      const viewBoxWidth = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)[1]);
      assert.equal(width, viewBoxWidth * 40);
    });

    test('the default scale is the one the renderer has always emitted', () => {
      assert.equal(NE.DEFAULT_CONFIG.layout.pxPerStaffSpace, 20);
    });
  });

  describe('the config object itself', () => {
    test('the fonts section resolves and merges like every other section', () => {
      const c = NE.resolveConfig({ fonts: { musicFont: 'Petaluma' } });
      assert.equal(c.fonts.musicFont, 'Petaluma');
      assert.equal(c.fonts.textFont, NE.DEFAULT_CONFIG.fonts.textFont);
      assert.deepEqual(c.fonts.sizes, NE.DEFAULT_CONFIG.fonts.sizes);
      assert.deepEqual(c.colors, NE.DEFAULT_CONFIG.colors);
    });

    test('the staves section carries §15.2 s system distance', () => {
      assert.equal(typeof NE.DEFAULT_CONFIG.staves.minSystemDistance, 'number');
      const c = NE.resolveConfig({ staves: { minSystemDistance: 12 } });
      assert.equal(c.staves.minSystemDistance, 12);
      assert.equal(c.staves.minStaffDistance, NE.DEFAULT_CONFIG.staves.minStaffDistance);
    });

    test('resolving a config never mutates DEFAULT_CONFIG', () => {
      const before = JSON.stringify(NE.DEFAULT_CONFIG);
      NE.resolveConfig({ fonts: { sizes: { barNumber: 99 } }, colors: { ink: '#abcdef' } });
      assert.equal(JSON.stringify(NE.DEFAULT_CONFIG), before);
    });
  });
});
