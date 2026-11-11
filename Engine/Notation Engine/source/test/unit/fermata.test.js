import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('fermata glyph selection', () => {
  test('normal fermata selects the exact glyph above and below', () => {
    assert.equal(NE.fermataGlyphName('normal', 'above'), 'fermataAbove');
    assert.equal(NE.fermataGlyphName('normal', 'below'), 'fermataBelow');
    assert.ok(NE.getGlyph('fermataAbove'), 'fermataAbove exists in the bundled font');
    assert.ok(NE.getGlyph('fermataBelow'), 'fermataBelow exists in the bundled font');
  });

  test('omitted shape and placement use the upright normal fermata', () => {
    assert.equal(NE.fermataGlyphName(undefined, undefined), 'fermataAbove');
  });
});
