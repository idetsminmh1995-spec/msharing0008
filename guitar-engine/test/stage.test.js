import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/guitar-engine.js', import.meta.url), 'utf8'), sandbox);
const G = sandbox.GuitarEngine;

const STAGE = { width: 1200, height: 300, seconds: 0, firstFret: 0, lastFret: 12 };

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

test('the three guitars are three different instruments to look at', () => {
  const of = (instrument) => G.fretboardShapes({ ...STAGE, instrument });
  const electric = of('electric');
  const acoustic = of('acoustic');
  const singleCut = of('singleCut');

  // Each is recognisable by what is on its body.
  assert.ok(roled(acoustic, 'soundhole').length >= 2, 'an acoustic has a soundhole and a rosette');
  assert.equal(roled(electric, 'soundhole').length, 0);
  assert.ok(roled(electric, 'pickguard').length > 0, 'an electric has a scratchplate');
  assert.ok(roled(electric, 'pickup').length >= 3, 'and three single coils');
  assert.ok(roled(singleCut, 'pickup').length >= 2, 'the single-cut has two humbuckers');
  assert.equal(roled(singleCut, 'pickguard').length, 0);
  for (const shapes of [electric, acoustic, singleCut]) {
    assert.ok(roled(shapes, 'hardware').length > 0, 'and every one has a bridge');
    assert.ok(roled(shapes, 'tuner').length >= 6, 'and a tuner per string');
  }

  // The wood differs too, not only what is mounted on it.
  const boardOf = (shapes) => paintOf(roled(shapes, 'board')[0]);
  assert.equal(boardOf(electric), G.DEFAULT_COLORS.board, 'maple');
  assert.equal(boardOf(acoustic), G.ACOUSTIC_COLORS.board, 'rosewood');
  assert.equal(boardOf(singleCut), G.SINGLE_CUT_COLORS.board, 'ebony');
  assert.equal(new Set([boardOf(electric), boardOf(acoustic), boardOf(singleCut)]).size, 3);

  // And so do the inlays: dots on two of them, pearl blocks on the third.
  assert.ok(roled(acoustic, 'inlay').every((s) => s.kind === 'circle'));
  assert.ok(roled(singleCut, 'inlay').every((s) => s.kind === 'path'), 'blocks, not dots');
  // A bound neck has its cream edging; a bolt-on maple one does not.
  assert.equal(roled(electric, 'binding').length, 0);
  assert.equal(roled(singleCut, 'binding').length, 2);
});

const fretNumbers = (shapes) => shapes.filter((s) => s.role === 'fretNumber');

test('the fret numbers are drawn under the board, faint, and can be turned off', () => {
  const shapes = G.fretboardShapes(STAGE);
  const numbers = fretNumbers(shapes);
  assert.ok(numbers.length > 0);
  const layout = G.guitarLayout(STAGE);
  for (const number of numbers) {
    assert.ok(number.y > layout.board.height, 'below the strings');
    assert.equal(number.fill, G.DEFAULT_COLORS.fretNumber);
    assert.match(String(number.fill), /rgba/, 'faint enough to read past');
  }
  // Each sits over its own fret.
  const five = numbers.find((t) => t.text === '5');
  assert.ok(Math.abs(five.x - G.fretCenter(5, STAGE)) < 1e-9);
  assert.equal(fretNumbers(G.fretboardShapes({ ...STAGE, fretNumbers: false })).length, 0);
});

test('a crowded neck numbers the frets a player looks for, not every one', () => {
  const wide = fretNumbers(G.fretboardShapes({ ...STAGE, lastFret: 12 }));
  const narrow = fretNumbers(G.fretboardShapes({ ...STAGE, width: 420, lastFret: 22 }));
  assert.equal(wide.length, 12, 'room for all twelve');
  assert.ok(narrow.length < 22, 'no room for twenty-two');
  assert.ok(narrow.some((t) => t.text === '12'), 'the twelfth is always there');
});

test('each string is numbered at the head, and named', () => {
  const shapes = G.fretboardShapes(STAGE);
  // The role is on the circle and on the number inside it; the
  // numbers are the ones with text.
  const badges = shapes.filter((s) => s.role === 'stringLabel' && s.text !== undefined);
  const names = shapes.filter((s) => s.role === 'stringName');
  assert.equal(badges.map((b) => b.text).join(','), '1,2,3,4,5,6');
  // Drawn order: string 1 is the thin e at the top, string 6 the low E.
  assert.equal(names.map((n) => n.text).join(','), 'e,B,G,D,A,E');
  const strings = G.stringLines(STAGE);
  for (const badge of badges) {
    assert.equal(badge.y, strings.find((l) => String(l.string) === badge.text).offset);
    // In their own gutter, clear of the instrument: printed over the
    // headstock they would sit on top of the tuners.
    assert.ok(badge.x < G.guitarLayout(STAGE).headstock.x, 'left of the headstock');
  }
  assert.equal(G.fretboardShapes({ ...STAGE, stringLabels: false }).filter(
    (s) => s.role === 'stringLabel' || s.role === 'stringName',
  ).length, 0);
});

test('a different tuning names different strings', () => {
  // Drop D: the sixth string is a whole tone down, and nothing else moves.
  const dropD = G.fretboardShapes({ ...STAGE, tuning: [64, 59, 55, 50, 45, 38] });
  const names = dropD.filter((s) => s.role === 'stringName').map((s) => s.text);
  assert.equal(names.join(','), 'e,B,G,D,A,D');
  // The lower-case top string is not a typo: it is how guitarists write it.
  assert.equal(G.stringName(64, true), 'e');
  assert.equal(G.stringName(64, false), 'E');
  assert.equal(G.tuningFor(6).join(','), G.STANDARD_TUNING.join(','));
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
  // It sits where the picking hand is: over the body, past the frets.
  const layout = G.guitarLayout(STAGE);
  assert.ok(down[1].x >= layout.body.x - down[1].width, 'at the body end of the strings');
  assert.ok(down[1].x > layout.neck.x, 'and well past the nut');

  // It fades rather than blinking off, and is gone when it is over.
  assert.ok(withPick('down', 0.8)[1].opacity < down[1].opacity);
  assert.equal(withPick('down', 1).length, 0);
  assert.equal(
    G.stageShapes(STAGE).filter((s) => s.role === 'pickStroke').length,
    0,
    'none by default',
  );
});

test('fingers are written a letter at a time, on the string each one takes', () => {
  const shapes = roled(
    G.stageShapes({
      ...STAGE,
      picking: 'fingers',
      pick: { direction: 'down', strings: [1, 2, 3, 5], age: 0 },
    }),
    'pickStroke',
  );
  const letters = shapes.filter((shape) => shape.kind === 'text');
  // p the thumb, then i, m, a -- a on the first string, and the thumb
  // on everything below the third.
  assert.equal(letters.map((letter) => letter.text).join(','), 'a,m,i,p');
  // Each letter is ON its string, not in a row beside them.
  for (const [index, string] of [1, 2, 3, 5].entries()) {
    const letter = letters[index];
    assert.ok(
      Math.abs(letter.y - G.stringYAt(STAGE, string, letter.x)) < 1e-6,
      `${letter.text} is on string ${string}`,
    );
  }
  // One dark plaque behind them all, so no letter is lost against a
  // rosette -- and not a disc each, which would overlap into a blob
  // the moment three strings in a row are plucked.
  const plaques = shapes.filter((shape) => shape.kind === 'rect');
  assert.equal(plaques.length, 1);
  assert.ok(plaques[0].y < letters[0].y, 'it covers the first letter');
  assert.ok(
    plaques[0].y + plaques[0].height > letters[letters.length - 1].y,
    'and the last one',
  );
  // No plectrum stroke when the hand is not holding one.
  assert.equal(shapes.filter((shape) => shape.kind === 'path').length, 0);
  // And it fades out the same way the plectrum's mark does.
  const late = roled(
    G.stageShapes({
      ...STAGE,
      picking: 'fingers',
      pick: { direction: 'down', strings: [1], age: 0.8 },
    }),
    'pickStroke',
  );
  assert.ok(late[late.length - 1].opacity < letters[0].opacity);
});

test('the hand legend is the page\u2019s own drawing when there is one', () => {
  const banded = { ...STAGE, handLegend: true };
  const drawn = G.fretboardShapes(banded);
  assert.equal(roled(drawn, 'handLegend').length, 0, 'rectangles, with no file');
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
  assert.equal(roled(G.fretboardShapes({ ...STAGE, handImage: picture }), 'handLegend').length, 0);
});

test('a classical guitar has nothing in its board', () => {
  const classical = G.fretboardShapes({ ...STAGE, instrument: 'classical' });
  assert.equal(roled(classical, 'inlay').length, 0, 'not a marker in the wood');
  // The others do have them.
  assert.ok(roled(G.fretboardShapes({ ...STAGE, instrument: 'acoustic' }), 'inlay').length > 0);
  assert.ok(roled(G.fretboardShapes({ ...STAGE, instrument: 'singleCut' }), 'inlay').length > 0);
  // Nor a scratchplate, because nothing scratches it.
  assert.equal(roled(classical, 'pickguard').length, 0);
  assert.ok(roled(G.fretboardShapes({ ...STAGE, instrument: 'acoustic' }), 'pickguard').length > 0);
  // It is its own instrument to look at: pale spruce, not a sunburst.
  assert.equal(G.instrumentColors('classical').body, G.CLASSICAL_COLORS.body);
  assert.notEqual(G.CLASSICAL_COLORS.body, G.ACOUSTIC_COLORS.body);
  // A soundhole all the same.
  assert.ok(roled(classical, 'soundhole').length > 0);
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

test('a note outside the drawn frets or off the neck is not drawn', () => {
  assert.equal(G.markShapes(G.positionsAt([note({ fret: 20 })], 0.5), STAGE).length, 0);
  assert.equal(G.markShapes(G.positionsAt([note({ string: 9 })], 0.5), STAGE).length, 0);
});

test('the neck is drawn once, the notes on top of it', () => {
  const board = G.fretboardShapes(STAGE);
  const withNote = G.stageShapes({ ...STAGE, seconds: 0.5, notes: [note({ finger: 2 })] });
  assert.equal(withNote.length, board.length + 1);
  assert.equal(paintOf(withNote[withNote.length - 1]), G.DEFAULT_COLORS.middle, 'the note is last');
  // Drawn in the order the guitar is built: the body and the head
  // first, then the neck over them, the inlays in the wood, the fret
  // wire on top of those, and the strings over everything.
  const firstOf = (role) => board.findIndex((s) => s.role === role);
  assert.ok(firstOf('body') < firstOf('neck'));
  assert.ok(firstOf('neck') < firstOf('board'));
  assert.ok(firstOf('board') < firstOf('inlay'));
  assert.ok(firstOf('inlay') < firstOf('fret'));
  assert.ok(firstOf('fret') < firstOf('string'));
});

test('the SVG is the shape list written out', () => {
  const svg = G.renderGuitarStage({ ...STAGE, seconds: 0.5, notes: [note({ finger: 4 })] });
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('viewBox="0 0 1200 300"'));
  const shapes = G.stageShapes({ ...STAGE, seconds: 0.5, notes: [note({ finger: 4 })] });
  const drawn = (svg.match(/<(rect|circle|text|path)[ >]/g) ?? []).length;
  assert.equal(drawn, shapes.length, 'every shape is written, fret numbers included');
  assert.ok(svg.includes('>5</text>'), 'the numbers are real text, not drawn as boxes');
  assert.ok(svg.includes(G.DEFAULT_COLORS.little));
  // The gradients are defined before anything points at them.
  assert.ok(svg.indexOf('<defs>') < svg.indexOf('url(#'), 'defs first');
  assert.ok(/id="g[0-9a-z]+-\d+"/.test(svg), 'and their ids are this drawing\'s own');
});

test('the hand is plain, and the colour is on the fingers', () => {
  const shapes = G.handShapes({ width: 120, height: 160 });
  const c = G.FINGER_COLORS;
  const used = [c.index, c.middle, c.ring, c.little];
  // The top of each finger is painted in that finger's colour: at the
  // size this is drawn in a video frame, a dot on the tip is a speck.
  const coloured = shapes.filter((s) => used.includes(s.fill));
  assert.equal(coloured.length, 4, 'one coloured finger each');
  assert.equal(coloured.map((s) => s.fill).join(','), used.join(','), 'index through little');
  for (let i = 1; i < coloured.length; i++) {
    assert.ok(coloured[i].x > coloured[i - 1].x, 'left to right');
  }
  // The hand itself carries none of the four colours: the only colour
  // in the picture is the thing being explained.
  const plain = shapes.filter((s) => !used.includes(s.fill));
  assert.ok(plain.length >= 6, 'a palm, a thumb and four fingers');
  assert.ok(plain.every((s) => !used.includes(s.fill)));
});
