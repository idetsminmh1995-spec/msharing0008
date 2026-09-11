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

  test('Phase 11: D major (2 sharps) key signature on treble and bass staves render identically to the saved snapshot', () => {
    const rowHeight = 6;
    const rows = [
      { clef: NE.TREBLE_CLEF, clefName: 'treble' },
      { clef: NE.BASS_CLEF, clefName: 'bass' },
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
      const accidentals = NE.keySignatureAccidentals(2, row.clefName); // D major: F# C#
      parts.push(
        NE.renderKeySignature(accidentals, {
          x: 3,
          spacing: 1,
          staffBottomY: bottomY,
          color: '#000000',
          fontFamily: 'Bravura',
        }),
      );
    });
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: rowHeight * rows.length, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('key-signature-d-major', doc, SNAPSHOT_DIR);
  });

  test('Phase 12: common-time symbol, plain 7/8, and additive 3+2+2/8 time signatures render identically to the saved snapshot', () => {
    const rowHeight = 6;
    const sigs = [
      NE.timeSignature(4, 4, { symbol: 'common' }),
      NE.timeSignature(7, 8),
      NE.timeSignature(7, 8, { numeratorDisplay: '3+2+2' }),
    ];
    const parts = [];
    sigs.forEach((sig, i) => {
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
      parts.push(NE.renderClef(NE.TREBLE_CLEF, { x: 0.5, y: bottomY, color: '#000000', fontFamily: 'Bravura' }));
      parts.push(
        NE.renderTimeSignature(sig, { x: 3, staffBottomY: bottomY, color: '#000000', fontFamily: 'Bravura' }),
      );
    });
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: rowHeight * sigs.length, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('time-signature-variants', doc, SNAPSHOT_DIR);
  });

  test('Phase 13: every barline type + a bar number render identically to the saved snapshot', () => {
    const metrics = {
      thinThickness: NE.getEngravingDefault('thinBarlineThickness'),
      thickThickness: NE.getEngravingDefault('thickBarlineThickness'),
      separation: NE.getEngravingDefault('barlineSeparation'),
      dotWidth: 0.4,
      dashLength: NE.getEngravingDefault('dashedBarlineDashLength'),
      gapLength: NE.getEngravingDefault('dashedBarlineGapLength'),
    };
    const types = ['single', 'double', 'final', 'repeatBegin', 'repeatEnd', 'repeatBoth', 'dashed'];
    const staffBottomY = 4;
    const parts = [
      NE.renderStaff(NE.computeStaffGeometry(5), {
        x: 0,
        y: staffBottomY,
        width: 40,
        color: '#000000',
        lineThickness: NE.getEngravingDefault('staffLineThickness'),
      }),
    ];
    let x = 2;
    types.forEach((type) => {
      const g = NE.computeBarlineGeometry(type, metrics);
      parts.push(
        NE.renderBarline(g, { x, staffBottomY, height: 4, color: '#000000', fontFamily: 'Bravura' }),
      );
      x += g.width + 3;
    });
    parts.push(
      NE.renderBarNumber(12, {
        x: 2,
        staffBottomY,
        offsetAboveStaff: 1,
        staffHeight: 4,
        color: '#000000',
        fontFamily: 'serif',
        fontSize: 2,
      }),
    );
    const doc = NE.createSvgDocument(
      { viewBoxWidth: x + 2, viewBoxHeight: 10, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('barline-all-types', doc, SNAPSHOT_DIR);
  });

  test('Phase 14: middle C with a ledger line on both treble and bass staves render identically to the saved snapshot', () => {
    const rowHeight = 6;
    const rows = [
      { clef: NE.TREBLE_CLEF, clefName: 'treble' },
      { clef: NE.BASS_CLEF, clefName: 'bass' },
    ];
    const noteheadWidth = 1.18; // approx real noteheadBlack glyph width
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
      const position = NE.staffPositionForPitch(row.clef, 'C', 4);
      const noteX = 6;
      const ledgerLines = NE.computeLedgerLines(position, 5);
      parts.push(
        NE.renderLedgerLines(ledgerLines, {
          x: noteX,
          noteheadWidth,
          staffBottomY: bottomY,
          extension: NE.getEngravingDefault('legerLineExtension'),
          thickness: NE.getEngravingDefault('legerLineThickness'),
          color: '#000000',
        }),
      );
      const notehead = NE.getGlyph('noteheadBlack');
      parts.push(NE.svgGlyphText(noteX, bottomY + position, notehead.char, 'Bravura', { fill: '#000000' }));
    });
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: rowHeight * rows.length, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('ledger-line-middle-c', doc, SNAPSHOT_DIR);
  });

  test('Phase 15: notehead shape selection (default, config override, explicit XML override) render identically to the saved snapshot', () => {
    const bottomY = 4;
    const parts = [
      NE.renderStaff(NE.computeStaffGeometry(5), {
        x: 0,
        y: bottomY,
        width: 20,
        color: '#000000',
        lineThickness: NE.getEngravingDefault('staffLineThickness'),
      }),
      NE.renderClef(NE.PERCUSSION_CLEF, { x: 0.5, y: bottomY, color: '#000000', fontFamily: 'Bravura' }),
    ];
    // Three drum voices on the same staff: a kick (plain duration default),
    // a hi-hat (config override -> X notehead), and a note with an explicit
    // XML <notehead>diamond</notehead> overriding everything.
    const notes = [
      { pitch: NE.unpitchedPitch('F', 4), x: 3, overridesByKey: {} },
      { pitch: NE.unpitchedPitch('G', 5), x: 6, overridesByKey: { G5: 'x' } },
      { pitch: NE.unpitchedPitch('A', 4), x: 9, overridesByKey: { A4: 'x' }, explicitNotehead: 'diamond' },
    ];
    notes.forEach((n) => {
      const glyphName = NE.selectNoteheadGlyphName({
        pitch: n.pitch,
        durationType: 'quarter',
        overridesByKey: n.overridesByKey,
        explicitNotehead: n.explicitNotehead,
      });
      const y = bottomY + NE.staffPositionForPitch(NE.PERCUSSION_CLEF, n.pitch.displayStep, n.pitch.displayOctave);
      parts.push(NE.renderNotehead(glyphName, { x: n.x, y, color: '#000000', fontFamily: 'Bravura' }));
    });
    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: 8, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('notehead-selection-variants', doc, SNAPSHOT_DIR);
  });

  test('Phase 16: automatic up/down stems plus a forced-direction drum pair render identically to the saved snapshot', () => {
    const bottomY = 4;
    const numLines = 5;
    const parts = [
      NE.renderStaff(NE.computeStaffGeometry(numLines), {
        x: 0,
        y: bottomY,
        width: 20,
        color: '#000000',
        lineThickness: NE.getEngravingDefault('staffLineThickness'),
      }),
      NE.renderClef(NE.TREBLE_CLEF, { x: 0.5, y: bottomY, color: '#000000', fontFamily: 'Bravura' }),
    ];
    const notehead = NE.getGlyph('noteheadBlack');
    const stemThickness = NE.getEngravingDefault('stemThickness');

    function drawNote(x, position, direction) {
      const y = bottomY + position;
      parts.push(NE.renderNotehead('noteheadBlack', { x, y, color: '#000000', fontFamily: 'Bravura' }));
      const length = NE.computeStemLength(position, NE.middleLineY(numLines));
      parts.push(
        NE.renderStem({
          noteheadGlyphName: 'noteheadBlack',
          noteX: x,
          noteY: y,
          direction,
          length,
          thickness: stemThickness,
          color: '#000000',
        }),
      );
    }

    // Automatic: top-line note (above middle) -> down; bottom-line note (below middle) -> up.
    drawNote(4, -4, NE.automaticStemDirection(-4, NE.middleLineY(numLines)));
    drawNote(7, 0, NE.automaticStemDirection(0, NE.middleLineY(numLines)));
    // Forced direction pair, matching the drum hand/foot split: same
    // position, opposite forced directions regardless of what automatic
    // would have chosen.
    drawNote(11, -1, NE.resolveStemDirection({ positions: [-1], numLines, forcedDirection: 'up' }));
    drawNote(14, -1, NE.resolveStemDirection({ positions: [-1], numLines, forcedDirection: 'down' }));

    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: 10, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('stem-direction-variants', doc, SNAPSHOT_DIR);
  });

  test('Phase 17: an unbeamed eighth-note flag (up and down) plus a beam-suppressed note render identically to the saved snapshot', () => {
    const bottomY = 4;
    const numLines = 5;
    const parts = [
      NE.renderStaff(NE.computeStaffGeometry(numLines), {
        x: 0,
        y: bottomY,
        width: 20,
        color: '#000000',
        lineThickness: NE.getEngravingDefault('staffLineThickness'),
      }),
      NE.renderClef(NE.TREBLE_CLEF, { x: 0.5, y: bottomY, color: '#000000', fontFamily: 'Bravura' }),
    ];
    const stemThickness = NE.getEngravingDefault('stemThickness');

    function drawNote(x, position, durationType, isBeamed) {
      const y = bottomY + position;
      parts.push(NE.renderNotehead('noteheadBlack', { x, y, color: '#000000', fontFamily: 'Bravura' }));
      const direction = NE.automaticStemDirection(position, NE.middleLineY(numLines));
      const length = NE.computeStemLength(position, NE.middleLineY(numLines));
      parts.push(
        NE.renderStem({
          noteheadGlyphName: 'noteheadBlack',
          noteX: x,
          noteY: y,
          direction,
          length,
          thickness: stemThickness,
          color: '#000000',
        }),
      );
      if (NE.needsFlag(durationType, isBeamed)) {
        const anchor = NE.getGlyph('noteheadBlack').anchors[direction === 'up' ? 'stemUpSE' : 'stemDownNW'];
        const stemX = x + anchor[0];
        const attachY = y - anchor[1];
        const endY = direction === 'up' ? attachY - length : attachY + length;
        parts.push(
          NE.renderFlag(durationType, {
            x: stemX,
            y: endY,
            direction,
            color: '#000000',
            fontFamily: 'Bravura',
          }),
        );
      }
    }

    // Unbeamed eighth note high in the staff (down stem) -> gets a flag.
    drawNote(4, -4, 'eighth', false);
    // Unbeamed eighth note low in the staff (up stem) -> gets a flag.
    drawNote(8, 0, 'eighth', false);
    // Same duration, but beamed -> no flag drawn at all.
    drawNote(12, -4, 'eighth', true);

    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: 10, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('flag-variants', doc, SNAPSHOT_DIR);
  });

  test('Phase 18: whole/half/quarter rests plus a per-voice-offset collision fix render identically to the saved snapshot', () => {
    const bottomY = 4;
    const numLines = 5;
    const parts = [
      NE.renderStaff(NE.computeStaffGeometry(numLines), {
        x: 0,
        y: bottomY,
        width: 20,
        color: '#000000',
        lineThickness: NE.getEngravingDefault('staffLineThickness'),
      }),
      NE.renderClef(NE.TREBLE_CLEF, { x: 0.5, y: bottomY, color: '#000000', fontFamily: 'Bravura' }),
    ];

    function drawRest(x, durationType, voiceOffset) {
      const y = bottomY + NE.restY(durationType, numLines, voiceOffset);
      parts.push(NE.renderRest(NE.restGlyphName(durationType), { x, y, color: '#000000', fontFamily: 'Bravura' }));
    }

    // The three named cases: whole (hangs from the 4th line, one above
    // middle), half (sits at the middle line), quarter (also the middle
    // line, plain default).
    drawRest(3, 'whole', 0);
    drawRest(6, 'half', 0);
    drawRest(9, 'quarter', 0);

    // The multi-voice collision fix: two quarter rests at the SAME
    // instant in different voices, offset apart instead of both landing
    // on the shared middle line (the exact bug hit once in the
    // pre-Phase-1 prototype).
    drawRest(13, 'quarter', 1);
    drawRest(13, 'quarter', -1);

    const doc = NE.createSvgDocument(
      { viewBoxWidth: 20, viewBoxHeight: 8, pxPerStaffSpace: 20, backgroundColor: '#ffffff' },
      parts,
    );
    matchSnapshot('rest-variants', doc, SNAPSHOT_DIR);
  });
});
