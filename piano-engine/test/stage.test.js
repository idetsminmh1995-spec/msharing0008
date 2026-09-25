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

const gridStage = { size: 88, width: 1920, height: 600, seconds: 0, leadSeconds: 2.5 };
const bars = (times) => times.map((seconds, i) => ({ seconds, kind: i % 4 === 0 ? 'bar' : 'beat' }));

test('the grid is ruled where the music is, in the same time the notes fall in', () => {
  const board = P.keyboardBox(gridStage);
  const lines = [{ seconds: 1.25, kind: 'bar' }];
  const [shape] = P.gridShapes(lines, gridStage);
  // Due in half the lead -> half way down the fall.
  assert.ok(Math.abs(shape.y + shape.height / 2 - board.y / 2) < 1);
  assert.equal(shape.x, 0);
  assert.equal(shape.width, gridStage.width, 'a line rules the whole stage');

  const landing = P.gridShapes(lines, { ...gridStage, seconds: 1.25 });
  assert.ok(Math.abs(landing[0].y + landing[0].height / 2 - board.y) < 1, 'arrives at the keyboard');
});

test('a barline is drawn stronger than a beat line, and both are faint', () => {
  const both = P.gridShapes([{ seconds: 1, kind: 'bar' }, { seconds: 1, kind: 'beat' }], gridStage);
  assert.ok(both[0].height > both[1].height, 'the bar is thicker');
  assert.equal(both[0].fill, P.DEFAULT_COLORS.barLine);
  assert.equal(both[1].fill, P.DEFAULT_COLORS.beatLine);
  // Faint enough to read past: both are translucent by default.
  assert.match(P.DEFAULT_COLORS.barLine, /rgba/);
  assert.match(P.DEFAULT_COLORS.beatLine, /rgba/);
});

test('a line already played, or not yet on stage, is not drawn', () => {
  const lines = bars([0.5, 1, 2, 3, 9, 40]);
  const shapes = P.gridShapes(lines, { ...gridStage, seconds: 1 });
  // From 1s with a 2.5s lead: 1, 2, 3 are on stage; 0.5 is past; 9 and 40 are not yet.
  assert.equal(shapes.length, 3);
  for (const shape of shapes) {
    assert.ok(shape.y >= -shape.height, 'not above the stage');
    assert.ok(shape.y <= P.keyboardBox(gridStage).y, 'not over the keyboard');
  }
});

test('the grid is behind the notes, and absent when nobody asks for one', () => {
  const notes = [{ midi: 60, startSeconds: 1, endSeconds: 1.5, hand: 'right' }];
  const without = P.stageShapes({ ...gridStage, notes });
  const withGrid = P.stageShapes({ ...gridStage, notes, gridLines: bars([0.5, 1, 1.5, 2]) });
  assert.equal(withGrid.length, without.length + 4, 'one shape per line');
  // The grid comes first: the falling note is drawn over it.
  assert.equal(withGrid[0].fill, P.DEFAULT_COLORS.barLine);
  assert.equal(withGrid[4].fill, P.DEFAULT_COLORS.rightHand, 'the note, after the grid');
  assert.equal(without[0].fill, P.DEFAULT_COLORS.rightHand, 'no grid, no lines');
});

test('a caller can recolour the grid for a light frame', () => {
  const [bar] = P.gridShapes([{ seconds: 0.5, kind: 'bar' }], {
    ...gridStage,
    colors: { barLine: 'rgba(0,0,0,0.2)' },
  });
  assert.equal(bar.fill, 'rgba(0,0,0,0.2)');
});

test('a colour can be read as a page writes it, or not at all', () => {
  assert.deepEqual({ ...P.parseColor('#17110E') }, { r: 23, g: 17, b: 14 });
  assert.deepEqual({ ...P.parseColor('#abc') }, { r: 170, g: 187, b: 204 });
  assert.deepEqual({ ...P.parseColor('rgb(23, 17, 14)') }, { r: 23, g: 17, b: 14 });
  assert.deepEqual({ ...P.parseColor('rgba(23, 17, 14, 0.5)') }, { r: 23, g: 17, b: 14 });
  assert.equal(P.parseColor('rebeccapurple'), null, 'a name is not guessed at');
  assert.equal(P.parseColor(''), null);
});

test('the fade covers the top of the fall and nothing else', () => {
  const board = P.keyboardBox(gridStage);
  const shapes = P.fadeShapes({ ...gridStage, fade: { color: '#17110E' } });
  assert.ok(shapes.length > 8, 'drawn in bands, not one block');
  const top = shapes[0];
  const bottom = shapes[shapes.length - 1];
  assert.equal(top.y, 0, 'starts at the top of the stage');
  assert.ok(bottom.y + bottom.height < board.y, 'ends well above the keyboard');
  for (const shape of shapes) {
    assert.equal(shape.x, 0);
    assert.equal(shape.width, gridStage.width);
    assert.match(shape.fill, /^rgba\(23,17,14,/);
  }
});

test('the fade is strongest at the top and gone at the bottom of its band', () => {
  const shapes = P.fadeShapes({ ...gridStage, fade: { color: '#17110E' } });
  const alpha = (shape) => Number(/rgba\([^)]*,([0-9.]+)\)/.exec(shape.fill)[1]);
  for (let i = 1; i < shapes.length; i++) {
    assert.ok(alpha(shapes[i]) < alpha(shapes[i - 1]), 'each band is fainter than the one above');
  }
  assert.ok(alpha(shapes[0]) < 1, 'a note appears dim, never hidden outright');
  assert.ok(alpha(shapes[shapes.length - 1]) < 0.1, 'and is at full colour by the end of the fade');
});

test('no fade is asked for, none is drawn; an unreadable colour is not guessed at', () => {
  assert.equal(P.fadeShapes({ ...gridStage }).length, 0);
  assert.equal(P.fadeShapes({ ...gridStage, fade: { color: 'thistle' } }).length, 0);
});

test('the fade dims the notes and the grid, never the keyboard', () => {
  const notes = [{ midi: 60, startSeconds: 1, endSeconds: 1.5, hand: 'right' }];
  const options = { ...gridStage, notes, gridLines: bars([1, 1.5]), fade: { color: '#17110E' } };
  const shapes = P.stageShapes(options);
  const fadeAt = shapes.findIndex((s) => /rgba\(23,17,14/.test(s.fill));
  const noteAt = shapes.findIndex((s) => s.fill === P.DEFAULT_COLORS.rightHand);
  const keyAt = shapes.findIndex((s) => s.fill === P.DEFAULT_COLORS.whiteKey);
  const lineAt = shapes.findIndex((s) => s.fill === P.DEFAULT_COLORS.strikeLine);
  assert.ok(noteAt < fadeAt, 'the note is behind the fade');
  assert.ok(fadeAt < keyAt, 'the keyboard is in front of it');
  assert.ok(keyAt < lineAt, 'and the strike line in front of that');
});
