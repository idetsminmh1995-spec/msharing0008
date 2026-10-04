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

test('the keyboard sits along the bottom, and is the taller share of the stage it was raised to', () => {
  // It was a third. The keys are what a viewer actually watches -- the
  // note lands there, the key lights there, every C is named there --
  // and a third left those names too small to read at video size.
  const box = P.keyboardBox({ width: 1920, height: 600 });
  assert.equal(box.height, 252);
  assert.equal(box.y, 348);
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
  // 88 keys, one falling bar, that bar's own note name, the strike
  // line, seven standing C names, and the name on the key that is
  // down. A label is drawn on a rect with no fill, which is why the
  // names are counted here too. Seven and not eight because the key
  // held here IS a C: while it sounds it says 'C', not 'C4'.
  assert.equal(
    rects.length,
    88 + 1 + 1 + 1 + 7 + 1,
    '88 keys, one bar, its name, one strike line, seven C names, one held key named',
  );
  // The held key is painted in the left hand's colour -- twice over:
  // once as the falling bar, once as the key itself.
  assert.equal((svg.match(/#AA0011/g) ?? []).length, 2);
  // And both say what it is: middle C on the bar, and C on the key it
  // has landed on.
  assert.equal((svg.match(/>C<\/text>/g) ?? []).length, 2, 'the bar and the key both say C');
  assert.ok(!svg.includes('>C4</text>'), 'a sounding C says C, not C4 -- one name per key');
});

test('the empty keyboard is the same keys with nothing lit', () => {
  const svg = P.renderKeyboardSvg({ size: 61, width: 1080, height: 300 });
  // 61 keys, the strike line, and a name on each of the six Cs a
  // 61-key board spans.
  assert.equal((svg.match(/<rect/g) ?? []).length, 61 + 1 + 6);
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
  // one bar, its note name, 88 keys, eight C names, one strike line
  assert.equal(shapes.length, 1 + 1 + 88 + 8 + 1);
  assert.ok(shapes[0].radius > 0, 'the bar has rounded corners');
  assert.equal(shapes[1].label, 'C', "and its own name right behind it");
  const firstKey = shapes[2];
  assert.equal(firstKey.radius, undefined, 'keys are square');
  assert.ok(firstKey.stroke !== undefined, 'white keys carry their edge');
  const line = shapes[shapes.length - 1];
  assert.equal(line.fill, P.DEFAULT_COLORS.strikeLine);
  assert.equal(line.x, 0);
  assert.equal(line.width, STAGE.width, 'the line spans the stage');

  // Black keys come after every white one, and the lit key carries the
  // hand's colour in BOTH the bar and the key.
  const keys = shapes.slice(2, 2 + 88);
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

test('every falling bar says which note it is: D on a D, D# on the black key above it', () => {
  assert.equal(P.noteName(62), 'D');
  assert.equal(P.noteName(63), 'D#');
  assert.equal(P.noteName(60), 'C');
  assert.equal(P.noteName(71), 'B');
  // Sharps throughout, because this names a KEY and not a note in a
  // score: the black key between D and E is one key.
  for (let midi = 21; midi <= 108; midi += 1) {
    assert.ok(!P.noteName(midi).includes('b'), `${midi} is named with a sharp or not at all`);
  }
  // And with the octave, it is what is written on the keyboard's own Cs.
  assert.equal(P.noteName(60, { octave: true }), 'C4');
  assert.equal(P.noteName(48, { octave: true }), 'C3');
  assert.equal(P.noteName(63, { octave: true }), 'D#4');

  const shapes = P.stageShapes({
    ...STAGE,
    seconds: 1,
    notes: [
      { midi: 62, startSeconds: 1, endSeconds: 2, hand: 'right' },
      { midi: 63, startSeconds: 1, endSeconds: 2, hand: 'left' },
    ],
  });
  // Both keys are down at this moment, so each name appears twice: once
  // on the bar still in the air, once on the key under it. The bars are
  // the ones above the keyboard.
  const board = P.keyboardBox({ width: STAGE.width, height: STAGE.height });
  const named = shapes.filter((s) => s.label === 'D' || s.label === 'D#');
  const onBars = named.filter((s) => s.y < board.y);
  assert.equal(onBars.length, 2, 'one name per bar');
  assert.equal(named.length - onBars.length, 2, 'and one on each key being held');
  for (const name of onBars) {
    assert.equal(name.fill, 'none', 'the name is drawn on the bar, not over it in a box');
    assert.equal(name.labelColor, P.DEFAULT_COLORS.noteName);
  }
});

test('a bar too small for its name goes without one, rather than carrying a smudge', () => {
  // A run of sixteenths in a narrow frame is a row of short bars, and a
  // row of smudges would read worse than the bars alone.
  const tiny = P.stageShapes({
    size: 88,
    width: 300,
    height: 200,
    seconds: 1,
    notes: [{ midi: 62, startSeconds: 1, endSeconds: 1.02, hand: 'right' }],
  });
  // The KEY is still named -- a key's name is sized from the key, which
  // has not got any shorter -- so it is the bar's name that is counted
  // here, by looking above the keyboard.
  const tinyBoard = P.keyboardBox({ width: 300, height: 200 });
  assert.equal(tiny.filter((s) => s.label === 'D' && s.y < tinyBoard.y).length, 0);

  // The same note, with room for the name, gets it.
  const roomy = P.stageShapes({
    size: 88,
    width: 1920,
    height: 1080,
    seconds: 1,
    notes: [{ midi: 62, startSeconds: 1, endSeconds: 1.6, hand: 'right' }],
  });
  const roomyBoard = P.keyboardBox({ width: 1920, height: 1080 });
  assert.equal(roomy.filter((s) => s.label === 'D' && s.y < roomyBoard.y).length, 1);
});

test('the name sits at the BOTTOM of its bar, the end that lands', () => {
  const shapes = P.stageShapes({
    size: 88,
    width: 1920,
    height: 1080,
    seconds: 1,
    // A long held note: a name centred in this would float half a
    // screen above the key it is about to light.
    notes: [{ midi: 62, startSeconds: 0.5, endSeconds: 3, hand: 'right' }],
  });
  const bar = shapes.find((s) => s.radius !== undefined && s.label === undefined);
  const name = shapes.find((s) => s.label === 'D');
  assert.ok(bar !== undefined && name !== undefined);
  // Centred on its own bar. The box may be WIDER than a narrow bar --
  // it exists only to centre the label in, and a sharp's two
  // characters would otherwise be cramped onto a black key.
  assert.ok(Math.abs(name.x + name.width / 2 - (bar.x + bar.width / 2)) < 0.02, 'over its own bar');
  assert.ok(name.width >= bar.width - 0.02);
  assert.ok(name.y + name.height <= bar.y + bar.height + 0.02, 'inside the bar');
  assert.ok(
    name.y > bar.y + bar.height / 2,
    'in the lower half of it, not centred in the whole stripe',
  );
});

test('every C is named on its own key in BOTH designs, not only where the hands are', () => {
  const falling = P.stageShapes({ ...STAGE, notes: [] });
  const named = falling.filter((s) => /^C\d$/.test(s.label ?? ''));
  assert.deepEqual(
    [...named].map((s) => s.label),
    ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
  );
  // Still switchable off, and still off in the same way in both.
  assert.equal(
    P.stageShapes({ ...STAGE, notes: [], keyNames: false }).filter((s) =>
      /^C\d$/.test(s.label ?? ''),
    ).length,
    0,
  );
});

test('a key says its own name for as long as it is held, and goes quiet again after', () => {
  const held = {
    size: 88,
    width: 1920,
    height: 600,
    notes: [
      { midi: 62, startSeconds: 1, endSeconds: 2, hand: 'right' },
      { midi: 63, startSeconds: 1, endSeconds: 2, hand: 'left' },
    ],
  };
  const board = P.keyboardBox({ width: held.width, height: held.height });
  const onKeys = (seconds) =>
    P.stageShapes({ ...held, seconds })
      .filter((s) => s.label !== undefined && s.y >= board.y)
      .map((s) => s.label);

  // While they sound: the natural and the sharp, each on its own key.
  const during = onKeys(1.5);
  assert.ok(during.includes('D'), 'the white key says D');
  assert.ok(during.includes('D#'), 'the black key says D#');

  // After they stop, the keyboard is back to its standing C names only.
  const after = onKeys(2.5);
  assert.ok(!after.includes('D'), 'a key that is not down says nothing');
  assert.ok(!after.includes('D#'));
  assert.ok(
    after.every((label) => /^C-?\d$/.test(label)),
    `only the Cs are left, got ${after.join(',')}`,
  );
});

test("a held key's name sits at the front edge, where a hand reaching over it does not cover it", () => {
  const shapes = P.stageShapes({
    size: 88,
    width: 1920,
    height: 600,
    seconds: 1.5,
    notes: [{ midi: 62, startSeconds: 1, endSeconds: 2, hand: 'right' }],
  });
  const board = P.keyboardBox({ width: 1920, height: 600 });
  const name = shapes.find((s) => s.label === 'D' && s.y >= board.y);
  assert.ok(name, 'the key is named');
  const whiteBottom = board.y + board.height;
  // Inside the key, in its front quarter.
  assert.ok(name.y + name.height <= whiteBottom, 'the name stays on the key');
  assert.ok(name.y > whiteBottom - board.height * 0.25, 'and down at the front of it');
  assert.equal(name.fill, 'none', 'drawn on the key, not as a box over it');
  assert.equal(name.labelColor, P.DEFAULT_COLORS.noteName);
});

test('a sharp fits on its own black key rather than overhanging onto the whites either side', () => {
  const shapes = P.stageShapes({
    size: 88,
    width: 1920,
    height: 600,
    seconds: 1.5,
    notes: [{ midi: 63, startSeconds: 1, endSeconds: 2, hand: 'left' }],
  });
  const board = P.keyboardBox({ width: 1920, height: 600 });
  const name = shapes.find((s) => s.label === 'D#' && s.y >= board.y);
  assert.ok(name, 'the black key is named');
  const key = P.keyboardGeometry(88, board).find((k) => k.midi === 63);
  assert.equal(name.x, key.x);
  assert.equal(name.width, key.width);
  // Two characters at roughly 0.62 em each have to fit the key's width.
  assert.ok(name.labelSize * 0.62 * 2 <= key.width, 'the name fits the key it is on');
});
