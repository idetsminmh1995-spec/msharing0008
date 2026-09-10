import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('SVG primitives layer (Phase 6)', () => {
  test('createSvgDocument scales width/height from viewBox x pxPerStaffSpace', () => {
    const doc = NE.createSvgDocument({ viewBoxWidth: 20, viewBoxHeight: 8, pxPerStaffSpace: 20 }, []);
    assert.match(doc, /width="400"/);
    assert.match(doc, /height="160"/);
    assert.match(doc, /viewBox="0 0 20 8"/);
  });

  test('svgGlyphText uses the correct SMuFL font-size (4x staff-space)', () => {
    const text = NE.svgGlyphText(0, 0, 'X', 'Bravura');
    assert.match(text, /font-size="4"/);
    assert.match(text, /font-family="Bravura"/);
  });

  test('a real glyph codepoint survives into the rendered SVG uncorrupted', () => {
    const gClef = NE.getGlyph('gClef');
    const text = NE.svgGlyphText(0.5, 4, gClef.char, 'Bravura');
    const match = /<text[^>]*>([^<]*)<\/text>/.exec(text);
    assert.ok(match);
    assert.equal(match[1].codePointAt(0), 0xe050);
  });

  test('svgText escapes XML special characters in content', () => {
    const text = NE.svgText(0, 0, 'A & B <script>alert(1)</script>');
    assert.ok(!text.includes('<script>'));
    assert.match(text, /A &amp; B &lt;script&gt;/);
  });

  test('svgRect escapes XML special characters in attribute values', () => {
    const rect = NE.svgRect(0, 0, 10, 10, { 'data-note': 'a "quoted" value & more' });
    assert.ok(!rect.includes('value"'));
    assert.match(rect, /&quot;quoted&quot;/);
    assert.match(rect, /&amp; more/);
  });

  test('svgGroup wraps its children in a single <g>', () => {
    const group = NE.svgGroup([NE.svgLine(0, 0, 1, 1), NE.svgLine(1, 1, 2, 2)]);
    assert.match(group, /^<g>/);
    assert.match(group, /<\/g>$/);
    assert.equal((group.match(/<line/g) || []).length, 2);
  });
});
