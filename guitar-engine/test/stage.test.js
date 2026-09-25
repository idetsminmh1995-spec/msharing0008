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
  assert.equal(marks.map((m) => m.fill).join(','), [c.index, c.middle, c.ring, c.little].join(','));
  // Fixed, not pickable: the whole point is that they are learnt once.
  assert.equal(G.DEFAULT_COLORS.index, c.index);
  assert.equal(G.DEFAULT_COLORS.little, c.little);
});

test('an acoustic and an electric are different instruments to look at', () => {
  const electric = G.fretboardShapes({ ...STAGE, instrument: 'electric' });
  const acoustic = G.fretboardShapes({ ...STAGE, instrument: 'acoustic' });
  const fills = (shapes) => shapes.map((s) => s.fill);
  assert.ok(fills(acoustic).includes(G.DEFAULT_COLORS.soundhole), 'an acoustic has a soundhole');
  assert.ok(fills(acoustic).includes(G.DEFAULT_COLORS.rosette));
  assert.ok(!fills(electric).includes(G.DEFAULT_COLORS.soundhole));
  assert.ok(fills(electric).includes(G.DEFAULT_COLORS.pickup), 'an electric has pickups');
  assert.ok(fills(electric).includes(G.DEFAULT_COLORS.hardware), 'and a bridge');
  // The wood differs too, not only what is mounted on it.
  assert.notEqual(
    acoustic.find((s) => s.fill === G.ACOUSTIC_COLORS.board),
    undefined,
  );
  assert.ok(fills(electric).includes(G.DEFAULT_COLORS.board));
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
  const badges = shapes.filter((s) => s.role === 'stringLabel');
  const names = shapes.filter((s) => s.role === 'stringName');
  assert.equal(badges.map((b) => b.text).join(','), '1,2,3,4,5,6');
  // Drawn order: string 1 is the thin e at the top, string 6 the low E.
  assert.equal(names.map((n) => n.text).join(','), 'e,B,G,D,A,E');
  const strings = G.stringLines(STAGE);
  for (const badge of badges) {
    assert.equal(badge.y, strings.find((l) => String(l.string) === badge.text).offset);
    assert.ok(badge.x < G.guitarLayout(STAGE).neck.x, 'on the headstock, not the neck');
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
    G.stageShapes({ ...STAGE, pick: { direction, strings: [1, 2, 3], age } }).filter(
      (s) => s.kind === 'path',
    );
  const [down] = withPick('down', 0);
  const [up] = withPick('up', 0);
  assert.ok(down.d.length > 0 && up.d.length > 0);
  assert.notEqual(down.d, up.d, 'a down-stroke and an up-stroke are different marks');
  // It sits where the hand is: past the frets, before the body.
  const layout = G.guitarLayout(STAGE);
  assert.ok(down.x < layout.body.x, 'clear of the body');
  assert.ok(down.x > layout.neck.x, 'and past the nut');

  // It fades rather than blinking off, and is gone when it is over.
  assert.ok(withPick('down', 0.8)[0].opacity < down.opacity);
  assert.equal(withPick('down', 1).length, 0);
  assert.equal(G.stageShapes(STAGE).filter((s) => s.kind === 'path').length, 0, 'none by default');
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
  const drawn = (svg.match(/<(rect|circle|text)/g) ?? []).length;
  assert.equal(drawn, shapes.length, 'every shape is written, fret numbers included');
  assert.ok(svg.includes('>5</text>'), 'the numbers are real text, not drawn as boxes');
  assert.ok(svg.includes(G.DEFAULT_COLORS.little));
});

test('the hand is plain, and the colour is on the fingertips', () => {
  const shapes = G.handShapes({ width: 120, height: 160 });
  const c = G.FINGER_COLORS;
  const dots = shapes.filter((s) => s.kind === 'circle');
  assert.equal(dots.length, 4, 'a dot per finger');
  // Index on the left through little on the right.
  assert.equal(dots.map((d) => d.fill).join(','), [c.index, c.middle, c.ring, c.little].join(','));
  for (let i = 1; i < dots.length; i++) {
    assert.ok(dots[i].x > dots[i - 1].x, 'left to right');
  }
  // The hand itself carries none of the four colours: the only colour
  // in the picture is the thing being explained.
  const hand = shapes.filter((s) => s.kind === 'rect');
  assert.equal(hand.length, 6, 'four fingers, a palm and a thumb');
  for (const part of hand) {
    assert.ok(![c.index, c.middle, c.ring, c.little].includes(part.fill));
  }
  const fingers = hand.slice(2);
  assert.ok(fingers[1].height > fingers[3].height, 'the middle finger is longer than the little one');
  // Each dot sits on its own finger.
  for (let i = 0; i < 4; i++) {
    assert.ok(Math.abs(dots[i].x - (fingers[i].x + fingers[i].width / 2)) < 1e-9);
  }
  const svg = G.renderHand({ width: 120, height: 160 });
  assert.equal((svg.match(/<(rect|circle)/g) ?? []).length, shapes.length);
});
