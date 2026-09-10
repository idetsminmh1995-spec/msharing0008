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

  test('Phase 9: 1-line, 5-line, and 6-line staves side by side render identically to the saved snapshot', () => {
    const oneLine = NE.renderStaff(NE.computeStaffGeometry(1), {
      x: 0,
      y: 0,
      width: 20,
      color: '#000000',
      lineThickness: NE.getEngravingDefault('staffLineThickness'),
    });
    const fiveLine = NE.renderStaff(NE.computeStaffGeometry(5), {
      x: 0,
      y: 6,
      width: 20,
      color: '#000000',
      lineThickness: NE.getEngravingDefault('staffLineThickness'),
    });
    const sixLine = NE.renderStaff(NE.computeStaffGeometry(6), {
      x: 0,
      y: 15,
      width: 20,
      color: '#000000',
      lineThickness: NE.getEngravingDefault('staffLineThickness'),
    });
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: 16, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      [oneLine, fiveLine, sixLine],
    );
    matchSnapshot('staff-line-count-variants', doc, SNAPSHOT_DIR);
  });

  test('Phase 10: treble, bass, alto, and percussion clefs on their own staves render identically to the saved snapshot', () => {
    const rowHeight = 6;
    const rows = [
      { clef: NE.TREBLE_CLEF, note: ['G', 4] },
      { clef: NE.BASS_CLEF, note: ['F', 3] },
      { clef: NE.ALTO_CLEF, note: ['C', 4] },
      { clef: NE.PERCUSSION_CLEF, note: null },
    ];
    const parts = [];
    rows.forEach((row, i) => {
      const bottomY = i * rowHeight + 4;
      parts.push(
        NE.renderStaff(NE.computeStaffGeometry(5), {
          x: 0,
          y: bottomY,
          width: 20,
          color: '#000000',
          lineThickness: NE.getEngravingDefault('staffLineThickness'),
        }),
      );
      parts.push(NE.renderClef(row.clef, { x: 0.5, y: bottomY, color: '#000000', fontFamily: 'Bravura' }));
      if (row.note) {
        const [step, octave] = row.note;
        const noteY = bottomY + NE.staffPositionForPitch(row.clef, step, octave);
        const notehead = NE.getGlyph('noteheadBlack');
        parts.push(NE.svgGlyphText(6, noteY, notehead.char, 'Bravura', { fill: '#000000' }));
      }
    });
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: rowHeight * rows.length, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('clef-engine-all-clefs', doc, SNAPSHOT_DIR);
  });
});
