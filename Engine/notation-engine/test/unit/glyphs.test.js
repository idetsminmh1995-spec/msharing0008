import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadEngine } from '../helpers/load-engine.js';

const glyphnames = JSON.parse(
  readFileSync(new URL('../../src/glyphs/data/glyphnames.json', import.meta.url), 'utf8'),
);
const bravuraMetadata = JSON.parse(
  readFileSync(new URL('../../src/glyphs/data/bravura_metadata.json', import.meta.url), 'utf8'),
);
const fontMetrics = JSON.parse(
  readFileSync(new URL('../../src/glyphs/data/bravura_font_metrics.json', import.meta.url), 'utf8'),
);
const NE = loadEngine();

describe('SMuFL glyph table (Phase 5)', () => {
  test('font metadata and both bundled fonts agree on Bravura 1.482', () => {
    const info = NE.getFontInfo();
    assert.equal(info.name, 'Bravura');
    assert.equal(info.version, '1.482');
    assert.equal(bravuraMetadata.fontName, fontMetrics.fontName);
    assert.equal(bravuraMetadata.fontVersion, fontMetrics.fontVersion);
    for (const relativePath of [
      '../../dist/fonts/Bravura.woff2',
      '../../../../website/assets/fonts/Bravura.woff2',
    ]) {
      const bytes = readFileSync(new URL(relativePath, import.meta.url));
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      assert.equal(sha256, fontMetrics.fontSha256, relativePath);
    }
  });

  test('getGlyph resolves real, spec-correct codepoints', () => {
    assert.equal(NE.getGlyph('gClef').codepoint, 'U+E050');
    assert.equal(NE.getGlyph('noteheadBlack').codepoint, 'U+E0A4');
    assert.equal(NE.getGlyph('noteheadXBlack').codepoint, 'U+E0A9');
  });

  test('getGlyph returns real Bravura stem anchors for a notehead', () => {
    const anchors = NE.getGlyph('noteheadBlack').anchors;
    assert.ok(anchors.stemUpSE);
    assert.ok(anchors.stemDownNW);
  });

  test('getGlyph returns undefined for an unknown name, never throws', () => {
    assert.equal(NE.getGlyph('thisIsNotARealGlyphName'), undefined);
  });

  test('newly covered SMuFL 1.4 glyph resolves, while absent names/codepoints stay missing', () => {
    const addedGlyph = NE.getGlyph('accidentalCombiningLower29LimitComma');
    assert.equal(addedGlyph.codepoint, 'U+EE50');
    assert.equal(NE.getGlyphByChar(addedGlyph.char).name, addedGlyph.name);
    assert.equal(NE.getGlyph('tupletBracketLeftItalic'), undefined);
    assert.equal(NE.getGlyphByChar(String.fromCodePoint(0xf000)), undefined);
  });

  test('every accepted SMuFL name is present in the bundled Bravura cmap', () => {
    const acceptedOutsideFont = [];
    for (const [name, entry] of Object.entries(glyphnames)) {
      const glyph = NE.getGlyph(name);
      if (glyph !== undefined) {
        assert.equal(glyph.codepoint, entry.codepoint, name);
        if (!Object.hasOwn(fontMetrics.cmapAdvanceWidths, entry.codepoint)) {
          acceptedOutsideFont.push(name);
        }
      }
    }
    assert.deepEqual(acceptedOutsideFont, []);
    assert.equal(
      Object.keys(glyphnames).filter((name) => NE.getGlyph(name) !== undefined).length,
      2932,
    );
  });

  test('timeSig1 advance width matches Bravura 1.482 hmtx in staff spaces', () => {
    const glyph = NE.getGlyph('timeSig1');
    const rawFontUnits = fontMetrics.cmapAdvanceWidths[glyph.codepoint];
    assert.equal(glyph.advanceWidth, bravuraMetadata.glyphAdvanceWidths.timeSig1);
    assert.equal(glyph.advanceWidth, 1.336);
    assert.equal(glyph.advanceWidth * fontMetrics.staffSpaceUnits, rawFontUnits);
    assert.equal(rawFontUnits, 334);
  });

  test("getEngravingDefault matches Bravura's published defaults", () => {
    assert.equal(NE.getEngravingDefault('stemThickness'), 0.12);
    assert.equal(NE.getEngravingDefault('beamThickness'), 0.5);
    assert.equal(NE.getEngravingDefault('staffLineThickness'), 0.13);
  });

  test('getEngravingDefault returns undefined for an unknown key', () => {
    assert.equal(NE.getEngravingDefault('notARealMetric'), undefined);
  });

  test('codepointToChar round-trips with getGlyph().char', () => {
    const gClef = NE.getGlyph('gClef');
    assert.equal(NE.codepointToChar('U+E050'), gClef.char);
  });
});
