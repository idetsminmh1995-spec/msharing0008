import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';
import { loadEngine } from '../helpers/load-engine.js';
import { matchSnapshot } from '../helpers/snapshot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NE = loadEngine();
const SNAPSHOT_DIR = path.join(__dirname, '__snapshots__');

describe('visual regression (Phase 8)', () => {
  test('a basic 5-line staff + gClef + notehead-with-stem renders identically to the saved snapshot', () => {
    const lines = [];
    for (let i = 0; i <= 4; i++) {
      lines.push(
        NE.svgLine(0, i, 20, i, {
          stroke: '#000000',
          'stroke-width': NE.getEngravingDefault('staffLineThickness'),
        }),
      );
    }

    const gClef = NE.getGlyph('gClef');
    const clefGlyph = NE.svgGlyphText(0.5, 4, gClef.char, 'Bravura', { fill: '#000000' });

    const notehead = NE.getGlyph('noteheadBlack');
    const noteheadGlyph = NE.svgGlyphText(5, 2, notehead.char, 'Bravura', { fill: '#000000' });
    const stemAnchor = notehead.anchors.stemUpSE;
    const stem = NE.svgLine(
      5 + stemAnchor[0],
      2 - stemAnchor[1],
      5 + stemAnchor[0],
      2 - stemAnchor[1] - 3.5,
      { stroke: '#000000', 'stroke-width': NE.getEngravingDefault('stemThickness') },
    );

    const group = NE.svgGroup([...lines, clefGlyph, noteheadGlyph, stem]);
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: 8, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      [group],
    );

    // This is the "headless SVG render -> DOM/string snapshot compare"
    // PLAN.md Phase 8 asks test/visual to do: our renderer's output IS
    // SVG markup text (no separate raster/canvas step needed), so the
    // markup string itself is the snapshot. If a future phase changes
    // this rendering's output, this test fails and shows a diff -- run
    // with UPDATE_SNAPSHOTS=1 to accept an intentional change.
    matchSnapshot('basic-staff-clef-notehead', doc, SNAPSHOT_DIR);
  });
});
