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

const DIAGS = [
  { severity: 'error', code: 'E' },
  { severity: 'warning', code: 'W' },
  { severity: 'info', code: 'I' },
];

describe('Phase 51: debug overlays and the diagnostics surface (§18.3)', () => {
  describe('logLevel filtering', () => {
    test('each level lets exactly the severities at or above it through', () => {
      const codes = (level) => [...NE.filterDiagnostics(DIAGS, level)].map((d) => d.code);
      assert.deepEqual(codes('silent'), []);
      assert.deepEqual(codes('error'), ['E']);
      assert.deepEqual(codes('warn'), ['E', 'W']);
      assert.deepEqual(codes('info'), ['E', 'W', 'I']);
      assert.deepEqual(codes('debug'), ['E', 'W', 'I']);
    });

    test('severityPassesLogLevel agrees with the filter, severity by severity', () => {
      for (const level of ['silent', 'error', 'warn', 'info', 'debug']) {
        const passed = [...NE.filterDiagnostics(DIAGS, level)].map((d) => d.severity);
        for (const d of DIAGS) {
          assert.equal(
            NE.severityPassesLogLevel(d.severity, level),
            passed.includes(d.severity),
            `${d.severity} @ ${level}`,
          );
        }
      }
    });

    test("the 'info' default returns the very same array, allocating nothing", () => {
      assert.equal(NE.filterDiagnostics(DIAGS, 'info'), DIAGS);
    });

    test('order is preserved through a filter that drops entries', () => {
      const mixed = [
        { severity: 'info', code: 'a' },
        { severity: 'error', code: 'b' },
        { severity: 'warning', code: 'c' },
        { severity: 'error', code: 'd' },
      ];
      assert.deepEqual(
        [...NE.filterDiagnostics(mixed, 'warn')].map((d) => d.code),
        ['b', 'c', 'd'],
      );
    });

    test('renderFromMusicXml honours config.debug.logLevel on its own diagnostics', () => {
      // This fixture emits one warning and two errors -- all three
      // severities' worth of behaviour from a single real file.
      const count = (level) =>
        render('malformed-notes.musicxml', level ? { debug: { logLevel: level } } : undefined)
          .diagnostics.length;
      assert.equal(count(), 3, 'the default passes everything');
      assert.equal(count('info'), 3);
      assert.equal(count('warn'), 3);
      assert.equal(count('error'), 2, 'the warning is dropped, the two errors stay');
      assert.equal(count('silent'), 0);
    });

    test('an info-only file goes empty at warn, not just at silent', () => {
      assert.equal(render('guitar-two-part-tab.musicxml').diagnostics.length, 3);
      assert.deepEqual(
        [...render('guitar-two-part-tab.musicxml', { debug: { logLevel: 'warn' } }).diagnostics],
        [],
      );
    });

    test('filtering diagnostics never changes the SVG or the playback data', () => {
      const a = render('malformed-notes.musicxml');
      const b = render('malformed-notes.musicxml', { debug: { logLevel: 'silent' } });
      assert.equal(b.svg, a.svg);
      assert.deepEqual(
        [...NE.getEventStream(b.playback)].map((e) => e.tick),
        [...NE.getEventStream(a.playback)].map((e) => e.tick),
      );
    });
  });

  describe('data-id on every rendered event', () => {
    test('every note and rest is wrapped in a group carrying its own id', () => {
      const { svg } = render('simple-single-voice.musicxml');
      const ids = [...svg.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
      // 4 quarters in measure 1; a half note and a half rest in measure 2.
      assert.deepEqual(ids, [
        'P1#m1#v1#e0',
        'P1#m1#v1#e1',
        'P1#m1#v1#e2',
        'P1#m1#v1#e3',
        'P1#m2#v1#e0',
        'P1#m2#v1#e1',
      ]);
    });

    test('the ids are exactly the ones the playback event stream reports', () => {
      const { svg, playback } = render('two-voice-drum-groove.musicxml');
      const drawn = new Set([...svg.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]));
      for (const event of NE.getEventStream(playback)) {
        for (const noteId of event.noteIds) {
          const elementId = NE.elementIdForNoteId(noteId);
          assert.ok(drawn.has(elementId), `${noteId} -> ${elementId} is not in the SVG`);
        }
      }
    });

    test('a chord member resolves to its chord s own group', () => {
      assert.equal(NE.elementIdForNoteId('P1#m1#v1#e3#n2'), 'P1#m1#v1#e3');
      assert.equal(NE.elementIdForNoteId('P1#m1#v1#e3'), 'P1#m1#v1#e3');
    });

    test('notationEventId is the single source of the format', () => {
      assert.equal(NE.notationEventId('P2', 7, 3, 11), 'P2#m7#v3#e11');
    });

    test('each member of a BEAM GROUP gets its own id, not one for the group', () => {
      const { svg } = render('beamed-eighths.musicxml');
      const ids = [...svg.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(ids.length, 8, 'eight beamed eighths, eight ids');
      assert.equal(new Set(ids).size, 8, 'and no two share one');
    });

    test('ids are stable across renders of the same file (§4.4)', () => {
      const a = [...render('v2-elements.musicxml').svg.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
      const b = [...render('v2-elements.musicxml').svg.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
      assert.deepEqual(b, a);
    });
  });

  describe('measureSvgBoxes', () => {
    test('a SMuFL glyph is measured from its real bounding box, y flipped', () => {
      const bBox = NE.getGlyph('noteheadBlack').bBox;
      const char = NE.getGlyph('noteheadBlack').char;
      const svg = `<text x="10" y="8" font-family="Bravura" font-size="4">${char}</text>`;
      const [box] = NE.measureSvgBoxes(svg);
      assert.equal(box.kind, 'glyph');
      const close = (actual, expected, what) =>
        assert.ok(Math.abs(actual - expected) < 1e-9, `${what}: ${actual} vs ${expected}`);
      close(box.x, 10 + bBox.bBoxSW[0], 'x');
      close(box.y, 8 - bBox.bBoxNE[1], 'y');
      close(box.width, bBox.bBoxNE[0] - bBox.bBoxSW[0], 'width');
      close(box.height, bBox.bBoxNE[1] - bBox.bBoxSW[1], 'height');
      assert.equal(box.approximate, undefined, 'a glyph box is exact');
    });

    test('a line is measured from its endpoints, widened by half its stroke', () => {
      const [box] = NE.measureSvgBoxes('<line x1="2" y1="4" x2="2" y2="9" stroke-width="0.12" />');
      assert.equal(box.kind, 'line');
      assert.ok(Math.abs(box.x - (2 - 0.06)) < 1e-9);
      assert.ok(Math.abs(box.y - (4 - 0.06)) < 1e-9);
      assert.ok(Math.abs(box.width - 0.12) < 1e-9);
      assert.ok(Math.abs(box.height - (5 + 0.12)) < 1e-9);
    });

    test('a rect is measured directly', () => {
      const [box] = NE.measureSvgBoxes('<rect x="1" y="2" width="3" height="4" />');
      assert.deepEqual(
        { x: box.x, y: box.y, width: box.width, height: box.height, kind: box.kind },
        { x: 1, y: 2, width: 3, height: 4, kind: 'rect' },
      );
    });

    test('a path is an over-estimate from every coordinate, and says so', () => {
      const [box] = NE.measureSvgBoxes('<path d="M 0 10 Q 5 2 10 10 Z" />');
      assert.equal(box.kind, 'path');
      assert.equal(box.approximate, true);
      assert.equal(box.x, 0);
      assert.equal(box.width, 10);
      // The control point at y=2 is included -- the curve itself never
      // reaches it, which is exactly what `approximate` is declaring.
      assert.equal(box.y, 2);
    });

    test('plain text is measured from its font size, and says so', () => {
      const [box] = NE.measureSvgBoxes('<text x="0" y="3" font-size="2">12</text>');
      assert.equal(box.kind, 'text');
      assert.equal(box.approximate, true);
      assert.equal(box.y, 1);
      assert.ok(box.width > 0);
    });

    test('a box carries the data-id of its nearest enclosing group', () => {
      const svg = [
        '<g data-id="outer">',
        '<rect x="0" y="0" width="1" height="1" />',
        '<g data-id="inner">',
        '<rect x="5" y="5" width="1" height="1" />',
        '</g>',
        '<rect x="9" y="9" width="1" height="1" />',
        '</g>',
        '<rect x="20" y="20" width="1" height="1" />',
      ].join('\n');
      const boxes = [...NE.measureSvgBoxes(svg)];
      assert.deepEqual(
        boxes.map((b) => b.id ?? null),
        ['outer', 'inner', 'outer', null],
      );
    });

    test('a group with no data-id does not shadow the one above it', () => {
      const svg = '<g data-id="a">\n<g class="plain">\n<rect x="0" y="0" width="1" height="1" />\n</g>\n</g>';
      assert.equal(NE.measureSvgBoxes(svg)[0].id, 'a');
    });

    test('measuring a real render finds every drawn element and attributes most of them', () => {
      const { svg } = render('two-voice-drum-groove.musicxml');
      const boxes = NE.measureSvgBoxes(svg);
      const drawn = (svg.match(/<(text|line|rect|path)[ >]/g) ?? []).length;
      assert.equal(boxes.length, drawn, 'one box per drawn element, none missed');
      assert.ok(boxes.some((b) => b.id !== undefined), 'notes carry their event id');
      assert.ok(
        boxes.some((b) => b.id === undefined),
        'staff lines and barlines belong to no single event',
      );
    });
  });

  describe('computeDebugSkylines', () => {
    const boxes = [
      { x: 0, y: 2, width: 1, height: 1, kind: 'rect' }, // above staff at 8
      { x: 0, y: 9, width: 1, height: 2, kind: 'rect' }, // below it
    ];

    test('north is the highest edge and south the lowest, per x', () => {
      const [sky] = NE.computeDebugSkylines(boxes, [8], 1);
      assert.equal(sky.staffBottomY, 8);
      assert.deepEqual(JSON.parse(JSON.stringify(sky.north)), [{ xStart: 0, xEnd: 1, y: 2 }]);
      assert.deepEqual(JSON.parse(JSON.stringify(sky.south)), [{ xStart: 0, xEnd: 1, y: 11 }]);
    });

    test('a flat run is merged into ONE segment rather than one per sample', () => {
      const [sky] = NE.computeDebugSkylines([{ x: 0, y: 5, width: 10, height: 1 }], [8], 1);
      assert.equal(sky.north.length, 1);
      assert.deepEqual(JSON.parse(JSON.stringify(sky.north[0])), { xStart: 0, xEnd: 10, y: 5 });
    });

    test('a step in the content produces a step in the skyline', () => {
      const [sky] = NE.computeDebugSkylines(
        [
          { x: 0, y: 5, width: 2, height: 1 },
          { x: 2, y: 3, width: 2, height: 1 },
        ],
        [8],
        1,
      );
      assert.deepEqual(
        [...sky.north].map((s) => s.y),
        [5, 3],
      );
    });

    test('each box lands on the staff its own centre is nearest', () => {
      const skies = NE.computeDebugSkylines(
        [
          { x: 0, y: 2, width: 1, height: 1 }, // centre 2.5 -> staff at 8
          { x: 0, y: 24, width: 1, height: 1 }, // centre 24.5 -> staff at 24
        ],
        [8, 24],
        1,
      );
      assert.equal(skies[0].north[0].y, 2);
      assert.equal(skies[1].north[0].y, 24);
    });

    test('no staves means no skylines, rather than one averaged over nothing', () => {
      assert.equal(NE.computeDebugSkylines(boxes, []).length, 0);
    });
  });

  describe('the overlay renderers', () => {
    test('one stroked rect per box, in a class-named group', () => {
      const svg = NE.renderBoundingBoxOverlay([{ x: 1, y: 2, width: 3, height: 4 }], {
        color: '#00f',
      });
      assert.match(svg, /<g class="debug-bounding-boxes">/);
      assert.match(svg, /<rect x="1" y="2" width="3" height="4" fill="none" stroke="#00f"/);
    });

    test('an approximate box is dashed, an exact one is not', () => {
      const svg = NE.renderBoundingBoxOverlay(
        [
          { x: 0, y: 0, width: 1, height: 1 },
          { x: 2, y: 0, width: 1, height: 1, approximate: true },
        ],
        { color: '#00f' },
      );
      const rects = svg.split('\n').filter((l) => l.startsWith('<rect'));
      assert.ok(!rects[0].includes('stroke-dasharray'));
      assert.ok(rects[1].includes('stroke-dasharray'));
    });

    test('a skyline is a stepped polyline, with a gap where content stops', () => {
      const svg = NE.renderSkylineOverlay(
        [
          {
            north: [
              { xStart: 0, xEnd: 1, y: 5 },
              { xStart: 1, xEnd: 2, y: 3 },
              { xStart: 9, xEnd: 10, y: 4 },
            ],
            south: [],
          },
        ],
        { color: '#f00' },
      );
      assert.match(svg, /<g class="debug-skyline">/);
      // Step down at x=1, then a NEW sub-path at x=9 rather than a line
      // drawn across the empty stretch between.
      assert.match(svg, /M 0 5 L 1 5 L 1 3 L 2 3 M 9 4 L 10 4/);
    });

    test('an empty skyline draws nothing but still returns a well-formed group', () => {
      const svg = NE.renderSkylineOverlay([{ north: [], south: [] }], { color: '#f00' });
      assert.match(svg, /^<g class="debug-skyline">/);
      assert.ok(!svg.includes('<path'));
    });
  });

  describe('the overlays wired into a render', () => {
    test('both are off by default and add nothing to the SVG', () => {
      const { svg } = render('simple-single-voice.musicxml');
      assert.ok(!svg.includes('debug-bounding-boxes'));
      assert.ok(!svg.includes('debug-skyline'));
    });

    test('drawBoundingBoxes adds the overlay and leaves the music untouched', () => {
      const plain = render('simple-single-voice.musicxml').svg;
      const withBoxes = render('simple-single-voice.musicxml', {
        debug: { drawBoundingBoxes: true },
      }).svg;
      assert.ok(withBoxes.includes('debug-bounding-boxes'));
      // Everything before the overlay group is byte-identical.
      const cut = withBoxes.indexOf('<g class="debug-bounding-boxes">');
      assert.ok(plain.startsWith(withBoxes.slice(0, cut)));
    });

    test('drawSkyline adds the skyline overlay only', () => {
      const svg = render('simple-single-voice.musicxml', { debug: { drawSkyline: true } }).svg;
      assert.ok(svg.includes('debug-skyline'));
      assert.ok(!svg.includes('debug-bounding-boxes'));
    });

    test('the overlay colours come from config', () => {
      const svg = render('simple-single-voice.musicxml', {
        debug: {
          drawBoundingBoxes: true,
          drawSkyline: true,
          boundingBoxColor: '#abcdef',
          skylineColor: '#fedcba',
        },
      }).svg;
      assert.ok(svg.includes('#abcdef'));
      assert.ok(svg.includes('#fedcba'));
    });

    test('a grand staff gets a skyline per staff, not one for the pair', () => {
      const svg = render('piano-grand-staff.musicxml', { debug: { drawSkyline: true } }).svg;
      const group = /<g class="debug-skyline">([\s\S]*?)<\/g>/.exec(svg)[1];
      // Two staves x two sides.
      assert.equal((group.match(/<path/g) ?? []).length, 4);
    });
  });

  describe('the debug config section', () => {
    test('it resolves and merges per field like every other section', () => {
      const c = NE.resolveConfig({ debug: { drawSkyline: true } });
      assert.equal(c.debug.drawSkyline, true);
      assert.equal(c.debug.drawBoundingBoxes, false);
      assert.equal(c.debug.logLevel, NE.DEFAULT_CONFIG.debug.logLevel);
      assert.deepEqual(c.colors, NE.DEFAULT_CONFIG.colors);
    });

    test("the default logLevel keeps every diagnostic, as callers had before the section existed", () => {
      assert.equal(NE.DEFAULT_CONFIG.debug.logLevel, 'info');
      assert.equal(NE.DEFAULT_CONFIG.debug.drawBoundingBoxes, false);
      assert.equal(NE.DEFAULT_CONFIG.debug.drawSkyline, false);
    });
  });
});
