import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

// The guitar is a PICTURE now -- the engine stopped drawing
// instruments out of shapes and gradients -- so a stage without one
// has no guitar on it at all.
const PHOTO = G.guitarPhoto('guitar.svg');
const STAGE = {
  width: 1200,
  height: 300,
  seconds: 0,
  photo: PHOTO,
  bleed: true,
  handLegend: true,
};

/**
 * The colour a shape really is.
 *
 * Wood, metal and a fingertip are gradients now, not flat colours, so
 * a test that asks "what colour is this" wants the one in the middle
 * of the gradient -- the colour the eye actually reads.
 */
const paintOf = (shape) =>
  typeof shape.fill === 'string'
    ? shape.fill
    : shape.fill.stops[Math.floor(shape.fill.stops.length / 2)].color;
const roled = (shapes, role) => shapes.filter((s) => s.role === role);
const note = (over = {}) => ({ string: 3, fret: 5, startSeconds: 0, endSeconds: 1, ...over });

test('the thumb over the top is a finger too, and it is amber', () => {
  // The fingering engine writes a thumb-over bass note as 'T'. It
  // used to come through as a number that was not a number and land
  // in the "nobody has said" white, which is the one colour the
  // legend does not explain.
  const [mark] = G.markShapes(
    G.positionsAt([note({ string: 6, fret: 2, finger: 'T' })], 0.5),
    STAGE,
  );
  assert.equal(paintOf(mark), G.FINGER_COLORS.thumb);
  // And a note nobody has answered for is still its own colour.
  const [plain] = G.markShapes(G.positionsAt([note({ fret: 2 })], 0.5), STAGE);
  assert.equal(paintOf(plain), G.DEFAULT_COLORS.unassigned);
});

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

test('the finger colours are the ones on the hand, and the marks use them', () => {
  const notes = [
    note({ string: 1, fret: 1, finger: 1 }),
    note({ string: 2, fret: 2, finger: 2 }),
    note({ string: 3, fret: 3, finger: 3 }),
    note({ string: 4, fret: 4, finger: 4 }),
  ];
  const marks = G.markShapes(G.positionsAt(notes, 0.5), STAGE);
  assert.equal(marks.length, 4);
  const c = G.FINGER_COLORS;
  assert.equal(marks.map(paintOf).join(','), [c.index, c.middle, c.ring, c.little].join(','));
  // Fixed, not pickable: the whole point is that they are learnt once.
  assert.equal(G.DEFAULT_COLORS.index, c.index);
  assert.equal(G.DEFAULT_COLORS.little, c.little);
});

test('without a picture there is no guitar, and nothing is drawn', () => {
  // The engine used to draw an instrument out of shapes and
  // gradients: wood, binding, tuners, a soundhole or a pair of
  // humbuckers. It does not any more -- every guitar the page offers
  // is a drawing of a real one -- so a stage with no picture gets its
  // background and nothing else.
  const bare = G.fretboardShapes({ width: 1200, height: 300, colors: { background: '#111' } });
  assert.equal(bare.length, 1);
  assert.equal(bare[0].kind, 'rect');
  assert.equal(bare[0].fill, '#111');
  assert.equal(G.fretboardShapes({ width: 1200, height: 300 }).length, 0, 'not even that');
});

const fretNumbers = (shapes) => shapes.filter((s) => s.role === 'fretNumber');

test('the fret numbers are drawn under the board, faint, and can be turned off', () => {
  const shapes = G.fretboardShapes(STAGE);
  const numbers = fretNumbers(shapes);
  assert.ok(numbers.length > 0);
  for (const number of numbers) {
    const board = G.boardEdgesAt(STAGE, number.x);
    assert.ok(number.y > board.bottom, 'below the board it belongs to');
    assert.equal(number.fill, G.DEFAULT_COLORS.fretNumber);
    assert.match(String(number.fill), /rgba/, 'faint enough to read past');
  }
  // Each sits over its own fret.
  const five = numbers.find((t) => t.text === '5');
  assert.ok(Math.abs(five.x - G.fretCenter(5, STAGE)) < 1e-9);
  assert.equal(fretNumbers(G.fretboardShapes({ ...STAGE, fretNumbers: false })).length, 0);
});

test('a crowded neck numbers the frets a player looks for, not every one', () => {
  // Everything about the picture scales together -- the frets, the
  // board's depth, the size a number is drawn at -- so the same frets
  // get numbered whatever size the frame is. What is NOT the same is
  // that the high frets, a quarter the width of the first, never have
  // room.
  const shaped = (width) => ({
    ...STAGE,
    width,
    height: Math.round(width * (PHOTO.height / PHOTO.width)),
  });
  const at = (width) => fretNumbers(G.fretboardShapes(shaped(width))).map((t) => t.text);
  const small = at(420);
  assert.ok(small.length < G.photoFretCount(PHOTO), 'no room for all of them');
  assert.ok(small.includes('12'), 'the twelfth is always there');
  assert.equal(at(1200).join(','), small.join(','), 'and the same ones at any size');
  assert.equal(at(2400).join(','), small.join(','));
  // None of them lands on its neighbour.
  const numbers = fretNumbers(G.fretboardShapes(shaped(1200)));
  for (let i = 1; i < numbers.length; i++) {
    assert.ok(numbers[i].x - numbers[i - 1].x > numbers[i].fontSize * 0.6, `${small[i]} has room`);
  }
});

test('the engine still knows what each string is called', () => {
  // Nothing draws the numbered badges and note names any more: they
  // lived on the drawn headstock, and there is no drawn headstock.
  // The naming itself is still here, because a page's own legend
  // wants it.
  assert.equal(G.tuningFor(6).join(','), G.STANDARD_TUNING.join(','));
  const names = G.tuningFor(6).map((midi, i) => G.stringName(midi, i === 0));
  assert.equal(names.join(','), 'e,B,G,D,A,E');
  // Drop D: the sixth string is a whole tone down, and nothing else moves.
  const dropD = [64, 59, 55, 50, 45, 38].map((midi, i) => G.stringName(midi, i === 0));
  assert.equal(dropD.join(','), 'e,B,G,D,A,D');
  // The lower-case top string is not a typo: it is how guitarists write it.
  assert.equal(G.stringName(64, true), 'e');
  assert.equal(G.stringName(64, false), 'E');
});

test('the picking hand draws the two marks a guitarist already reads', () => {
  const withPick = (direction, age) =>
    roled(G.stageShapes({ ...STAGE, pick: { direction, strings: [1, 2, 3], age } }), 'pickStroke');
  const down = withPick('down', 0);
  const up = withPick('up', 0);
  // Two shapes each: a dark halo, and the mark on top of it, so the
  // stroke reads on a black scratchplate and on a spruce top alike.
  assert.equal(down.length, 2);
  assert.notEqual(down[1].d, up[1].d, 'a down-stroke and an up-stroke are different marks');
  assert.match(String(down[0].fill), /rgba\(0,0,0/, 'the halo is the dark one');
  // It sits where the picking hand is: past the end of the board,
  // over the body.
  const place = G.photoPlacement(STAGE);
  const boardEnd = place.x + PHOTO.boardEndX * place.scale;
  assert.ok(down[1].x >= boardEnd - down[1].width, 'at the body end of the strings');
  assert.ok(down[1].x > G.fretCenter(0, STAGE), 'and well past the nut');

  // It fades rather than blinking off, and is gone when it is over.
  assert.ok(withPick('down', 0.8)[1].opacity < down[1].opacity);
  assert.equal(withPick('down', 1).length, 0);
  assert.equal(
    G.stageShapes(STAGE).filter((s) => s.role === 'pickStroke').length,
    0,
    'none by default',
  );
});

test('fingers are drawn in their own colour, on the string each one takes', () => {
  const shapes = roled(
    G.stageShapes({
      ...STAGE,
      picking: 'fingers',
      pick: { direction: 'down', strings: [1, 2, 3, 5], age: 0 },
    }),
    'pickStroke',
  );
  // One mark per string, in the colour of the digit that takes it: a
  // on the first, m on the second, i on the third, and the thumb on
  // everything below. Same legend as the fretting hand's marks.
  const marks = shapes.filter((shape) => shape.kind === 'circle');
  const c = G.FINGER_COLORS;
  assert.equal(marks.length, 4);
  assert.equal(
    marks.map((mark) => paintOf(mark)).join(','),
    [c.ring, c.middle, c.index, c.thumb].join(','),
  );
  // Each mark is ON its string, not in a row beside them.
  for (const [index, string] of [1, 2, 3, 5].entries()) {
    const mark = marks[index];
    assert.ok(
      Math.abs(mark.y - G.stringYAt(STAGE, string, mark.x)) < 1e-6,
      `the mark for string ${string} is on it`,
    );
  }
  // No letters any more: a viewer who has learnt the hand in the
  // corner already knows amber for the thumb.
  assert.equal(shapes.filter((shape) => shape.kind === 'text').length, 0);

  // And one arrow beside them, saying which way the hand travelled.
  // String 1 is drawn at the top, as on a stave of tab, so a
  // down-stroke climbs the picture.
  const arrows = shapes.filter((shape) => shape.kind === 'path');
  assert.equal(arrows.length, 2, 'the arrow, and a dark one behind it');
  assert.ok(arrows[0].x > marks[0].x, 'beside the marks, not over them');
  const up = G.stageShapes({
    ...STAGE,
    picking: 'fingers',
    pick: { direction: 'up', strings: [1, 2, 3, 5], age: 0 },
  }).filter((shape) => shape.role === 'pickStroke' && shape.kind === 'path');
  assert.notEqual(up[0].d, arrows[0].d, 'and it turns round for an up-stroke');

  // It fades out the same way the plectrum's mark does.
  const late = roled(
    G.stageShapes({
      ...STAGE,
      picking: 'fingers',
      pick: { direction: 'down', strings: [1], age: 0.8 },
    }),
    'pickStroke',
  );
  assert.ok(late[0].opacity < marks[0].opacity);
});

test('the hand legend is the page\u2019s own drawing when there is one', () => {
  const banded = { ...STAGE, handLegend: true };
  const drawn = G.fretboardShapes(banded);
  assert.equal(roled(drawn, 'handLegend').length, 0, 'rectangles, with no file');
  assert.ok(drawn.length > 0, 'and a guitar under them');
  const picture = G.handPicture('hand.webp');
  const shapes = G.fretboardShapes({ ...banded, handImage: picture });
  const [hand, ...rest] = roled(shapes, 'handLegend');
  assert.equal(rest.length, 0, 'one picture, not a pile of them');
  assert.equal(hand.kind, 'image');
  assert.equal(hand.href, 'hand.webp');
  // Its own shape survives being fitted into the band: a hand
  // squashed to fill a box stops looking like a hand.
  assert.ok(
    Math.abs(hand.width / hand.height - picture.width / picture.height) < 1e-6,
    'drawn at the shape it was made at',
  );
  // In the band above the neck, at the left, clear of the strings.
  const band = G.guitarLayout(banded).hand;
  assert.ok(hand.x >= band.x && hand.x < band.width * 0.1, 'at the left');
  assert.ok(hand.width < STAGE.width * 0.19, 'never across the frame');
  // And the rectangle hand is gone: two hands is one too many.
  assert.ok(
    shapes.filter((shape) => shape.fill === G.FINGER_COLORS.index).length === 0,
    'the drawn one stands down',
  );
  // No band, no legend, picture or not.
  const unbanded = { ...STAGE, handLegend: false, handImage: picture };
  assert.equal(roled(G.fretboardShapes(unbanded), 'handLegend').length, 0);
});

test('a mark sits on its own string, in its own fret', () => {
  for (const string of [1, 3, 6]) {
    const [mark] = G.markShapes(G.positionsAt([note({ string, fret: 7 })], 0.5), STAGE);
    const x = G.fretCenter(7, STAGE);
    assert.equal(mark.kind, 'circle');
    assert.ok(Math.abs(mark.x - x) < 1e-9, 'in the 7th fret');
    // On the string WHERE IT IS at that fret: the strings fan out as
    // they go, so the nut's spacing is the wrong answer by the time
    // the seventh fret comes round.
    assert.equal(mark.y, G.stringYAt(STAGE, string, x), `string ${string}`);
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

test('a note outside the picture\u2019s frets or off the neck is not drawn', () => {
  const past = G.photoFretCount(PHOTO) + 3;
  assert.equal(G.markShapes(G.positionsAt([note({ fret: past })], 0.5), STAGE).length, 0);
  assert.equal(G.markShapes(G.positionsAt([note({ string: 9 })], 0.5), STAGE).length, 0);
});

test('the guitar goes down once, the notes on top of it', () => {
  const board = G.fretboardShapes(STAGE);
  const withNote = G.stageShapes({ ...STAGE, seconds: 0.5, notes: [note({ finger: 2 })] });
  assert.equal(withNote.length, board.length + 1);
  assert.equal(paintOf(withNote[withNote.length - 1]), G.DEFAULT_COLORS.middle, 'the note is last');
  // The picture first, then everything about the PLAYING on top of
  // it. Nothing of the instrument itself is drawn: the picture is one.
  const firstOf = (role) => board.findIndex((s) => s.role === role);
  assert.equal(firstOf('photo'), 0);
  assert.ok(firstOf('fretNumber') > firstOf('photo'));
  for (const gone of ['body', 'neck', 'board', 'inlay', 'fret', 'string', 'headstock', 'tuner']) {
    assert.equal(firstOf(gone), -1, `nothing is drawn as a ${gone}`);
  }
});

test('the SVG is the shape list written out', () => {
  const svg = G.renderGuitarStage({ ...STAGE, seconds: 0.5, notes: [note({ finger: 4 })] });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 1200 300"'));
  const shapes = G.stageShapes({ ...STAGE, seconds: 0.5, notes: [note({ finger: 4 })] });
  const drawn = (svg.match(/<(rect|circle|text|path|image)[ >]/g) ?? []).length;
  assert.equal(drawn, shapes.length, 'every shape is written, the picture included');
  assert.ok(svg.includes('>5</text>'), 'the numbers are real text, not drawn as boxes');
  assert.ok(svg.includes(G.DEFAULT_COLORS.little));
  // The gradients are defined before anything points at them.
  assert.ok(svg.indexOf('<defs>') < svg.indexOf('url(#'), 'defs first');
  assert.ok(/id="g[0-9a-z]+-\d+"/.test(svg), 'and their ids are this drawing\'s own');
});

test('the hand is five coloured digits on a plain palm', () => {
  const shapes = G.handShapes({ width: 120, height: 160 });
  const c = G.FINGER_COLORS;
  const used = [c.thumb, c.index, c.middle, c.ring, c.little];
  const coloured = shapes.filter((s) => used.includes(s.fill));
  assert.equal(coloured.length, 5, 'the thumb and the four fingers');
  assert.equal(coloured.map((s) => s.fill).join(','), used.join(','), 'thumb through little');
  // The thumb is out to the LEFT of the fingers, and the fingers run
  // index to little across.
  const fingers = coloured.slice(1);
  assert.ok(coloured[0].x < fingers[0].x, 'the thumb is furthest left');
  for (let i = 1; i < fingers.length; i++) {
    assert.ok(fingers[i].x > fingers[i - 1].x, 'left to right');
  }
  // The palm carries none of the five: the only colours in the
  // picture are the things being explained.
  const plain = shapes.filter((s) => !used.includes(s.fill));
  assert.equal(plain.length, 1, 'one palm');
  // It keeps its own shape in a box of any proportion.
  const wide = G.handShapes({ width: 400, height: 160 });
  const tall = G.handShapes({ width: 120, height: 400 });
  const ratio = (list) => list[1].width / list[1].height;
  assert.ok(Math.abs(ratio(wide) - ratio(tall)) < 1e-6, 'never squashed to fill');
});

test('the hand is the traced drawing, and it can be moved', () => {
  const shapes = G.handShapes({ width: 120, height: 160 });
  // Straight lines and nothing else. The legend is built here and
  // then shifted into its corner, and the shift walks every number in
  // a path alternating x, y -- which is right for M and L and wrong
  // for an arc, whose radii and flags are not coordinates.
  for (const shape of shapes) {
    assert.equal(shape.kind, 'path');
    assert.ok(/^M[-\d.,]+(L[-\d.,]+)+Z$/.test(shape.d), 'only M, L and Z');
  }
  // Every digit is cut out of the hand, so no digit can stick out of
  // the outline it is meant to be part of.
  const [palm, ...digits] = shapes;
  for (const digit of digits) {
    assert.ok(digit.x >= palm.x - 0.01 && digit.y >= palm.y - 0.01, 'inside the hand');
    assert.ok(digit.x + digit.width <= palm.x + palm.width + 0.01, 'inside the hand');
    assert.ok(digit.y + digit.height <= palm.y + palm.height + 0.01, 'inside the hand');
  }
  // It is the OWNER'S hand: the thumb comes off the palm low and to
  // the left, and the middle finger is the tallest of the four.
  const [thumb, index, middle, ring, little] = digits;
  assert.ok(thumb.y > index.y, 'the thumb starts below the fingers');
  assert.ok(middle.y < index.y && middle.y < ring.y, 'the middle finger is tallest');
  assert.ok(little.y > ring.y, 'the little finger is shortest');
  // The numbers in the path really do run x, y, x, y -- which is the
  // thing the shift assumes, and the thing an arc would break.
  for (const shape of shapes) {
    const numbers = (shape.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    assert.equal(numbers.length % 2, 0, 'pairs');
    const xs = numbers.filter((_, i) => i % 2 === 0);
    const ys = numbers.filter((_, i) => i % 2 === 1);
    assert.ok(Math.abs(Math.min(...xs) - shape.x) < 0.01, 'the bounds are the path\'s own');
    assert.ok(Math.abs(Math.min(...ys) - shape.y) < 0.01, 'the bounds are the path\'s own');
  }
});
