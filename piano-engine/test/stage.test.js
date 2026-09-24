import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/piano-engine.js', import.meta.url), 'utf8'), sandbox);
const P = sandbox.PianoEngine;

const STAGE = { size: 88, width: 1920, height: 600, seconds: 0 };
const note = (over = {}) => ({ midi: 60, startSeconds: 2, endSeconds: 2.5, hand: 'right', ...over });

test('the keyboard sits along the bottom, a third of the stage tall by default', () => {
  const box = P.keyboardBox({ width: 1920, height: 600 });
  assert.equal(box.height, 200);
  assert.equal(box.y, 400);
  assert.equal(box.width, 1920);
  const asked = P.keyboardBox({ width: 1920, height: 600, keyboardHeight: 120 });
  assert.equal(asked.height, 120);
  assert.equal(asked.y, 480);
});

test('a bar falls in time: halfway through its lead it is halfway down', () => {
  const notes = [note({ startSeconds: 2.5, endSeconds: 2.6 })];
  const board = P.keyboardBox(STAGE);
  const half = P.fallingBars(notes, { ...STAGE, seconds: 1.25, leadSeconds: 2.5 });
  assert.equal(half.length, 1);
  // Due in 1.25s of a 2.5s fall -> its head is half way down the fall.
  assert.ok(Math.abs(half[0].y + half[0].height - board.y / 2) < 1, 'half way');
  const landing = P.fallingBars(notes, { ...STAGE, seconds: 2.5, leadSeconds: 2.5 });
  assert.ok(Math.abs(landing[0].y + landing[0].height - board.y) < 1, 'lands on the keyboard');
});

test('a long note is a long bar', () => {
  const short = P.fallingBars([note({ startSeconds: 1, endSeconds: 1.2 })], { ...STAGE, seconds: 0 });
  const long = P.fallingBars([note({ startSeconds: 1, endSeconds: 3 })], { ...STAGE, seconds: 0 });
  assert.ok(long[0].height > short[0].height * 5);
});

test('nothing is drawn before it is due, after it is played, or off this keyboard', () => {
  assert.equal(P.fallingBars([note({ startSeconds: 60, endSeconds: 61 })], STAGE).length, 0, 'too early');
  assert.equal(
    P.fallingBars([note({ startSeconds: 0, endSeconds: 0.5 })], { ...STAGE, seconds: 1 }).length,
    0,
    'already played',
  );
  // C8 + 1 is above an 88, and every note is below a 61's bottom C.
  assert.equal(P.fallingBars([note({ midi: 109, startSeconds: 1, endSeconds: 2 })], STAGE).length, 0);
  assert.equal(
    P.fallingBars([note({ midi: 24, startSeconds: 1, endSeconds: 2 })], { ...STAGE, size: 61 }).length,
    0,
    'below a 61-key keyboard',
  );
});

test('a bar is clipped to the fall, never drawn above the stage or over the keys', () => {
  const held = [note({ startSeconds: 0.2, endSeconds: 30 })];
  const bars = P.fallingBars(held, { ...STAGE, seconds: 0, leadSeconds: 2.5 });
  const board = P.keyboardBox(STAGE);
  assert.equal(bars.length, 1);
  assert.ok(bars[0].y >= 0, 'not above the top');
  assert.ok(bars[0].y + bars[0].height <= board.y + 1e-9, 'not over the keyboard');
});

test('a bar is exactly as wide as the key it lands on, and sits over it', () => {
  const keys = P.keyboardGeometry(88, { width: 1920, height: 200 });
  for (const midi of [21, 60, 61, 108]) {
    const bar = P.fallingBars([note({ midi, startSeconds: 1, endSeconds: 1.5 })], STAGE)[0];
    const key = keys.find((k) => k.midi === midi);
    assert.equal(bar.width, key.width, `${midi} width`);
    assert.equal(bar.x, key.x, `${midi} position`);
  }
});

test('each hand gets its own colour, and a caller can pick both', () => {
  const colors = P.resolveColors({ leftHand: '#123456', rightHand: '#654321' });
  assert.equal(P.handColor('left', colors), '#123456');
  assert.equal(P.handColor('right', colors), '#654321');
  // The defaults are two different colours, or the hands could not be told apart.
  assert.notEqual(P.DEFAULT_COLORS.leftHand, P.DEFAULT_COLORS.rightHand);
});

test('the stage SVG draws the bars, the keys and the strike line, in that order', () => {
  const svg = P.renderPianoStage({
    ...STAGE,
    seconds: 1,
    notes: [note({ midi: 60, startSeconds: 1, endSeconds: 2, hand: 'left' })],
    colors: { leftHand: '#AA0011' },
  });
  assert.ok(svg.startsWith('<svg'), 'an SVG document');
  assert.ok(svg.includes('viewBox="0 0 1920 600"'));
  const rects = svg.match(/<rect/g) ?? [];
  assert.equal(rects.length, 88 + 1 + 1, '88 keys, one bar, one strike line');
  // The held key is painted in the left hand's colour -- twice over:
  // once as the falling bar, once as the key itself.
  assert.equal((svg.match(/#AA0011/g) ?? []).length, 2);
});

test('the empty keyboard is the same keys with nothing lit', () => {
  const svg = P.renderKeyboardSvg({ size: 61, width: 1080, height: 300 });
  assert.equal((svg.match(/<rect/g) ?? []).length, 61 + 1);
  assert.ok(!svg.includes(P.DEFAULT_COLORS.leftHand));
  assert.ok(!svg.includes(P.DEFAULT_COLORS.rightHand));
  assert.ok(svg.includes(P.DEFAULT_COLORS.strikeLine), 'the line is part of the still half');
});

test('a background of none paints nothing behind the stage', () => {
  const clear = P.renderPianoStage({ ...STAGE, notes: [] });
  const painted = P.renderPianoStage({ ...STAGE, notes: [], colors: { background: '#010203' } });
  assert.equal((painted.match(/<rect/g) ?? []).length, (clear.match(/<rect/g) ?? []).length + 1);
  assert.ok(painted.includes('#010203'));
});

test('the shape list is what both renderers draw, in paint order', () => {
  const notes = [{ midi: 60, startSeconds: 1, endSeconds: 2, hand: 'left' }];
  const shapes = P.stageShapes({ ...STAGE, seconds: 1, notes });
  // one bar, 88 keys, one strike line
  assert.equal(shapes.length, 1 + 88 + 1);
  assert.ok(shapes[0].radius > 0, 'the bar has rounded corners');
  const firstKey = shapes[1];
  assert.equal(firstKey.radius, undefined, 'keys are square');
  assert.ok(firstKey.stroke !== undefined, 'white keys carry their edge');
  const line = shapes[shapes.length - 1];
  assert.equal(line.fill, P.DEFAULT_COLORS.strikeLine);
  assert.equal(line.x, 0);
  assert.equal(line.width, STAGE.width, 'the line spans the stage');

  // Black keys come after every white one, and the lit key carries the
  // hand's colour in BOTH the bar and the key.
  const keys = shapes.slice(1, 1 + 88);
  const lastWhite = keys.map((s) => s.stroke !== undefined).lastIndexOf(true);
  const firstBlack = keys.findIndex((s) => s.stroke === undefined);
  assert.ok(firstBlack > lastWhite);
  assert.equal(keys.filter((s) => s.fill === P.DEFAULT_COLORS.leftHand).length, 1);
});

test('every shape is inside the stage box', () => {
  const notes = [
    { midi: 21, startSeconds: 0, endSeconds: 9, hand: 'left' },
    { midi: 108, startSeconds: 0.2, endSeconds: 0.4, hand: 'right' },
  ];
  for (const seconds of [0, 0.3, 1, 5]) {
    for (const shape of P.stageShapes({ ...STAGE, seconds, notes })) {
      assert.ok(shape.x >= -0.001, 'left edge');
      assert.ok(shape.x + shape.width <= STAGE.width + 0.001, 'right edge');
      assert.ok(shape.y >= -0.001, 'top edge');
      assert.ok(shape.y + shape.height <= STAGE.height + 0.001, 'bottom edge');
    }
  }
});

test('the SVG is exactly the shape list written out', () => {
  const notes = [{ midi: 72, startSeconds: 0.5, endSeconds: 1.5, hand: 'right' }];
  const options = { ...STAGE, seconds: 0.6, notes, size: 61 };
  const shapes = P.stageShapes(options);
  const svg = P.renderPianoStage(options);
  assert.equal((svg.match(/<rect/g) ?? []).length, shapes.length);
  for (const shape of shapes.slice(0, 4)) {
    assert.ok(svg.includes(`fill="${shape.fill}"`), `${shape.fill} is drawn`);
  }
});
