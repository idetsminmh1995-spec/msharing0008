import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

const STAGE = { width: 1200, height: 300, seconds: 0, firstFret: 0, lastFret: 12 };
const note = (over = {}) => ({ string: 3, fret: 5, startSeconds: 0, endSeconds: 1, ...over });

test('every finger has its own colour, and an unanswered note has none of them', () => {
  const c = G.DEFAULT_COLORS;
  const used = [c.index, c.middle, c.ring, c.little];
  assert.equal(new Set(used).size, 4, 'four fingers, four colours');
  assert.equal(G.fingerColor(1, c), c.index);
  assert.equal(G.fingerColor(2, c), c.middle);
  assert.equal(G.fingerColor(3, c), c.ring);
  assert.equal(G.fingerColor(4, c), c.little);
  assert.equal(G.fingerColor(0, c), c.open, 'an open string is played by no finger');
  // A note nobody has assigned must not borrow a finger's colour.
  assert.equal(G.fingerColor(undefined, c), c.unassigned);
  assert.ok(!used.includes(c.unassigned));
  assert.ok(!used.includes(c.open));
});

test('a caller can set each finger, and the marks follow', () => {
  const colors = { index: '#111111', middle: '#222222', ring: '#333333', little: '#444444' };
  const notes = [
    note({ string: 1, fret: 1, finger: 1 }),
    note({ string: 2, fret: 2, finger: 2 }),
    note({ string: 3, fret: 3, finger: 3 }),
    note({ string: 4, fret: 4, finger: 4 }),
  ];
  const marks = G.markShapes(G.positionsAt(notes, 0.5), { ...STAGE, colors });
  assert.equal(marks.length, 4);
  assert.equal(marks.map((m) => m.fill).join(','), '#111111,#222222,#333333,#444444');
});

test('a mark sits on its own string, in its own fret', () => {
  const strings = G.stringLines(STAGE);
  for (const string of [1, 3, 6]) {
    const [mark] = G.markShapes(G.positionsAt([note({ string, fret: 7 })], 0.5), STAGE);
    assert.equal(mark.kind, 'circle');
    assert.equal(mark.y, strings.find((s) => s.string === string).offset, `string ${string}`);
    assert.ok(Math.abs(mark.x - G.fretCenter(7, STAGE)) < 1e-9, 'in the 7th fret');
  }
});

test('a slide draws the road it has travelled, with the mark at its head', () => {
  const notes = [note({ string: 2, fret: 3, slideToFret: 9, startSeconds: 0, endSeconds: 1 })];
  const shapes = G.markShapes(G.positionsAt(notes, 0.5), STAGE);
  assert.equal(shapes.length, 2, 'the trail and the mark');
  const [trail, mark] = shapes;
  assert.equal(trail.kind, 'rect');
  assert.ok(trail.opacity < 1, 'the trail is fainter than the mark');
  assert.ok(Math.abs(trail.x - G.fretCenter(3, STAGE)) < 1e-9, 'it starts where the note did');
  assert.ok(Math.abs(trail.x + trail.width - G.fretCenter(6, STAGE)) < 1e-9, 'and reaches where it is now');
  assert.ok(Math.abs(mark.x - G.fretCenter(6, STAGE)) < 1e-9, 'the mark is at the head');
  // Backwards slides are drawn the same way, not with a negative width.
  const back = G.markShapes(G.positionsAt([note({ fret: 9, slideToFret: 3, startSeconds: 0, endSeconds: 1 })], 0.5), STAGE);
  assert.ok(back[0].width > 0);
});

test('a note outside the drawn frets or off the neck is not drawn', () => {
  assert.equal(G.markShapes(G.positionsAt([note({ fret: 20 })], 0.5), STAGE).length, 0);
  assert.equal(G.markShapes(G.positionsAt([note({ string: 9 })], 0.5), STAGE).length, 0);
});

test('the neck is drawn once, the notes on top of it', () => {
  const board = G.fretboardShapes(STAGE);
  const withNote = G.stageShapes({ ...STAGE, seconds: 0.5, notes: [note({ finger: 2 })] });
  assert.equal(withNote.length, board.length + 1);
  assert.equal(withNote[withNote.length - 1].fill, G.DEFAULT_COLORS.middle, 'the note is last');
  // The strings are drawn over the inlays, as they are on a guitar.
  const stringAt = board.findIndex((s) => s.fill === G.DEFAULT_COLORS.string);
  const inlayAt = board.findIndex((s) => s.fill === G.DEFAULT_COLORS.inlay);
  assert.ok(inlayAt < stringAt);
});

test('the SVG is the shape list written out', () => {
  const svg = G.renderGuitarStage({ ...STAGE, seconds: 0.5, notes: [note({ finger: 4 })] });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 1200 300"'));
  const shapes = G.stageShapes({ ...STAGE, seconds: 0.5, notes: [note({ finger: 4 })] });
  const drawn = (svg.match(/<(rect|circle)/g) ?? []).length;
  assert.equal(drawn, shapes.length);
  assert.ok(svg.includes(G.DEFAULT_COLORS.little));
});

test('the hand shows four fingers in the four colours, and a palm that is not one of them', () => {
  const shapes = G.handShapes({ width: 120, height: 160 });
  const c = G.DEFAULT_COLORS;
  const fingers = shapes.filter((s) => [c.index, c.middle, c.ring, c.little].includes(s.fill));
  assert.equal(fingers.length, 4);
  // Index on the left, little on the right, as a left hand seen from
  // the back has them.
  const order = fingers.map((f) => f.fill);
  assert.equal(order.join(','), [c.index, c.middle, c.ring, c.little].join(','));
  for (let i = 1; i < fingers.length; i++) {
    assert.ok(fingers[i].x > fingers[i - 1].x, 'left to right');
  }
  assert.ok(fingers[1].height > fingers[3].height, 'the middle finger is longer than the little one');
  assert.equal(shapes.length, fingers.length + 2, 'a palm and a thumb as well');
  const svg = G.renderHand({ width: 120, height: 160 });
  assert.equal((svg.match(/<rect/g) ?? []).length, shapes.length);
});
