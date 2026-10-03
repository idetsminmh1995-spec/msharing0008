import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/piano-engine.js', import.meta.url), 'utf8'), sandbox);
const P = sandbox.PianoEngine;

const STAGE = { size: 88, width: 1920, height: 600 };
const BOARD = P.keyboardBox(STAGE);

const note = (midi, start, hand = 'right', length = 0.4) => ({
  midi,
  startSeconds: start,
  endSeconds: start + length,
  hand,
});

/** The fingers a plan gave, keyed by midi, for one hand. */
const fingersOf = (plan, hand) =>
  new Map(plan.notes.filter((n) => n.hand === hand).map((n) => [n.midi, n.finger]));

const handsFor = (notes, seconds, over = {}) => {
  const plan = P.planFingering(notes);
  return P.handsShapes({
    size: 88,
    board: BOARD,
    seconds,
    notes: plan.notes,
    anchors: plan.anchors,
    colors: P.DEFAULT_HAND_COLORS,
    ...over,
  });
};

test('every note gets a finger, and only ever one of the five', () => {
  const notes = [
    note(60, 0),
    note(64, 0.5),
    note(67, 1),
    note(72, 1.5),
    note(48, 0, 'left'),
    note(55, 0.5, 'left'),
  ];
  const plan = P.planFingering(notes);
  assert.equal(plan.notes.length, notes.length, 'no note lost, none invented');
  for (const n of plan.notes) {
    assert.ok(P.FINGERS.includes(n.finger), `finger ${n.finger} is not 1..5`);
  }
});

test('a right-hand five-finger scale is played thumb to little, in order', () => {
  // C D E F G under one hand: the textbook 1-2-3-4-5.
  const notes = [60, 62, 64, 65, 67].map((midi, i) => note(midi, i * 0.5));
  const fingers = fingersOf(P.planFingering(notes), 'right');
  assert.deepEqual(
    [60, 62, 64, 65, 67].map((m) => fingers.get(m)),
    [1, 2, 3, 4, 5],
  );
});

test("the left hand's fingers run the other way: the thumb takes the highest note", () => {
  // The same five keys in the left hand: 5-4-3-2-1 going up.
  const notes = [60, 62, 64, 65, 67].map((midi, i) => note(midi, i * 0.5, 'left'));
  const fingers = fingersOf(P.planFingering(notes), 'left');
  assert.deepEqual(
    [60, 62, 64, 65, 67].map((m) => fingers.get(m)),
    [5, 4, 3, 2, 1],
  );
});

test('a chord is one reach: each note its own finger, lowest to highest', () => {
  const chord = [60, 64, 67].map((midi) => note(midi, 1));
  const fingers = fingersOf(P.planFingering(chord), 'right');
  assert.deepEqual([60, 64, 67].map((m) => fingers.get(m)), [1, 3, 5]);
});

test('the hand stays put while the music stays under it, and moves when it does not', () => {
  const still = P.planFingering([60, 62, 64, 62, 60].map((m, i) => note(m, i * 0.5)));
  const anchors = still.anchors.right.map((a) => a.anchor);
  assert.equal(new Set(anchors).size, 1, 'a run under the hand does not slide it');

  const far = P.planFingering([note(60, 0), note(84, 1)]);
  const moved = far.anchors.right.map((a) => a.anchor);
  assert.ok(moved[1] > moved[0], 'an octave and a half up moves the hand up');
});

test('a hand arrives exactly as the chord sounds, and waits where it was until then', () => {
  const plan = P.planFingering([note(60, 0), note(84, 2)]);
  const path = plan.anchors.right;
  const from = path[0].anchor;
  const to = path[1].anchor;

  assert.equal(P.anchorAt(path, -1), from, 'before the first note it is already there');
  assert.equal(P.anchorAt(path, 1.5), from, 'still waiting, well before the move');
  assert.equal(P.anchorAt(path, 2), to, 'arrived as the note speaks');
  const mid = P.anchorAt(path, 2 - 0.09);
  assert.ok(mid > from && mid < to, 'on the way, half through the travel');
  assert.equal(P.anchorAt(path, 10), to, 'and stays there afterwards');
});

test('only the notes actually sounding have a finger down', () => {
  const plan = P.planFingering([note(60, 1, 'right', 1), note(67, 3, 'right', 1)]);
  assert.equal(P.fingersDownAt(plan.notes, 'right', 0.5).size, 0, 'before');
  assert.equal(P.fingersDownAt(plan.notes, 'right', 1.5).size, 1, 'during');
  assert.equal(P.fingersDownAt(plan.notes, 'right', 2.5).size, 0, 'between');
  assert.equal(P.fingersDownAt(plan.notes, 'left', 1.5).size, 0, 'not this hand');
});

test('both hands are drawn, left first, and a hand with no notes is not invented', () => {
  const two = handsFor([note(60, 0), note(43, 0, 'left')], 0);
  const one = handsFor([note(60, 0)], 0);
  assert.ok(two.length > one.length, 'two hands are more shapes than one');
  assert.ok(one.length > 0, 'the hand that plays is drawn');

  // Left first: the first skin it uses is the left hand's tint.
  const lefts = two.filter((s) => s.stroke === P.DEFAULT_HAND_COLORS.left.edge);
  const rights = two.filter((s) => s.stroke === P.DEFAULT_HAND_COLORS.right.edge);
  assert.ok(lefts.length > 0 && rights.length > 0, 'each hand carries its own edge');
  assert.ok(
    two.indexOf(lefts[0]) < two.indexOf(rights[0]),
    'the left is painted first, so the right covers it where they meet',
  );
});

test('a hand is five fingers: five strokes a side, each a drawn path', () => {
  const shapes = handsFor([note(60, 0)], 0);
  const fingers = shapes.filter((s) => s.path !== undefined && s.fill === 'none');
  // Each finger is an edge stroke and a skin stroke over it.
  assert.equal(fingers.length, 10);
  for (const f of fingers) {
    assert.match(f.path, /^M [-\d.]+ [-\d.]+ Q [-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+$/);
    assert.ok(f.strokeWidth > 0);
  }
});

test('the middle finger is longer than the thumb and the little finger', () => {
  // At rest, every finger hangs from the same palm, so the tip's depth
  // down the key IS the finger's length.
  const shapes = handsFor([note(60, 0)], 5); // long after the note: resting
  const tips = shapes
    .filter((s) => s.path !== undefined)
    .map((s) => Number(s.path.split(' ').at(-1)));
  const deepest = Math.max(...tips);
  const shallowest = Math.min(...tips);
  assert.ok(deepest - shallowest > 1, 'the fingers are not a row of equal bars');
});

/** The pad drawn on a fingertip that is pressing. */
const padColor = (hand = 'right') => P.darken(P.DEFAULT_HAND_COLORS[hand].skin, 0.17);
const pad = (set, hand = 'right') => set.find((s) => s.fill === padColor(hand));
/** Every fingertip's y, read back off the drawn finger paths. */
const tipYs = (set) =>
  set.filter((s) => s.path !== undefined).map((s) => Number(s.path.split(' ').at(-1)));

test('a pressing finger reaches up its own key, and only that finger', () => {
  const notes = [note(60, 1, 'right', 2)];
  const resting = handsFor(notes, 0.2);
  const pressing = handsFor(notes, 1.5);

  const mark = pad(pressing);
  assert.ok(mark !== undefined, 'the pressing fingertip is marked');
  assert.equal(pad(resting), undefined, 'nothing is marked when nothing is playing');

  const keys = P.keyboardGeometry(88, BOARD);
  const middleC = keys.find((k) => k.midi === 60);
  const centre = mark.x + mark.width / 2;
  assert.ok(
    centre > middleC.x && centre < middleC.x + middleC.width,
    'the fingertip is on middle C, not near it',
  );

  // Up the key, away from the player: a smaller y than the knuckles.
  assert.ok(mark.y + mark.height / 2 < BOARD.y + BOARD.height * 0.5, 'well up the key');
  // A single note is played with the middle finger, which is the
  // longest -- so its tip is the furthest up in both poses, and
  // playing has to take it further still.
  assert.ok(mark.y + mark.height / 2 < Math.min(...tipYs(resting)), 'further than at rest');
});

test('the hand points away from the player: fingertips above the palm', () => {
  const shapes = handsFor([note(60, 1, 'right', 2)], 1.5);
  const palm = shapes.filter((s) => s.path === undefined && s.label === undefined && s.radius > 0);
  // The palm is the widest box in the hand.
  const widest = palm.reduce((a, b) => (b.width > a.width ? b : a));
  assert.ok(
    Math.max(...tipYs(shapes)) < widest.y + widest.height,
    'every fingertip is above the bottom of the palm',
  );
  assert.ok(widest.y + widest.height > BOARD.y + BOARD.height * 0.8, 'the heel is down at the front');
});

test('a finger on a black key reaches further up the board than one on a white', () => {
  const white = handsFor([note(60, 1, 'right', 2)], 1.5);
  const black = handsFor([note(61, 1, 'right', 2)], 1.5);
  assert.ok(pad(black).y < pad(white).y, 'the black key is shorter, so the finger reaches past it');
});

test('three fingers down at once are three separate keys', () => {
  const chord = [60, 64, 67].map((m) => note(m, 1, 'right', 2));
  const shapes = handsFor(chord, 1.5);
  const pads = shapes.filter((s) => s.fill === padColor());
  assert.equal(pads.length, 3);
  const keys = P.keyboardGeometry(88, BOARD);
  for (const midi of [60, 64, 67]) {
    const key = keys.find((k) => k.midi === midi);
    assert.ok(
      pads.some((d) => d.x + d.width / 2 > key.x && d.x + d.width / 2 < key.x + key.width),
      `a finger is on ${midi}`,
    );
  }
});

test('the hand is one silhouette: an outline pass under a skin pass, no seams', () => {
  const shapes = handsFor([note(60, 0)], 0);
  const fingers = shapes.filter((s) => s.path !== undefined);
  const edge = fingers.filter((s) => s.stroke === P.DEFAULT_HAND_COLORS.right.edge);
  const skin = fingers.filter((s) => s.stroke === P.DEFAULT_HAND_COLORS.right.skin);
  assert.equal(edge.length, skin.length, 'every part is drawn twice');
  assert.ok(edge.length >= 5, 'five fingers at least');
  // The dark pass comes first and is fatter, so what shows of it is the
  // outline and nothing else.
  assert.ok(shapes.indexOf(edge[0]) < shapes.indexOf(skin[0]));
  for (let i = 0; i < edge.length; i += 1) {
    assert.ok(edge[i].strokeWidth > skin[i].strokeWidth, 'the outline pass is the fatter one');
    assert.equal(edge[i].path, skin[i].path, 'and the same shape');
  }
});

test('smaller hands are smaller, and the scale changes nothing else', () => {
  const full = handsFor([note(60, 0)], 0);
  const small = handsFor([note(60, 0)], 0, { scale: 0.6 });
  assert.equal(full.length, small.length, 'the same hand, drawn smaller');
  const widest = (set) => Math.max(...set.filter((s) => s.strokeWidth).map((s) => s.strokeWidth));
  assert.ok(widest(small) < widest(full));
});

test('the stage draws hands only in the design that is about them', () => {
  const notes = [note(60, 1, 'right', 2), note(48, 1, 'left', 2)];
  const plan = P.planFingering(notes);
  const base = {
    ...STAGE,
    seconds: 1.5,
    notes,
    hands: { notes: plan.notes, anchors: plan.anchors },
  };
  const falling = P.renderPianoStage(base);
  const hands = P.renderPianoStage({ ...base, design: 'hands' });
  assert.ok(!falling.includes('<path'), 'the falling design is the stage it always was');
  assert.ok(hands.includes('<path'), 'the hands design has fingers');
  assert.ok(hands.includes('stroke-linecap="round"'), 'round caps: a fingertip, not a stick');
});

test('a fingering offered to the falling design changes nothing at all', () => {
  const notes = [note(60, 1, 'right', 2), note(48, 1, 'left', 2)];
  const plan = P.planFingering(notes);
  const base = { ...STAGE, seconds: 1.5, notes };
  assert.equal(
    P.renderPianoStage({ ...base, hands: { notes: plan.notes, anchors: plan.anchors } }),
    P.renderPianoStage(base),
    'the first design is byte-for-byte the one that was shipped',
  );
});

test('the hands design drops the falling notes, the grid, the fade and the strike line', () => {
  const notes = [note(60, 4, 'right', 1)]; // still falling at t=3
  const plan = P.planFingering(notes);
  const base = {
    ...STAGE,
    seconds: 3,
    notes,
    gridLines: [{ seconds: 3.2, kind: 'bar' }],
    fade: { color: '#17110E' },
    hands: { notes: plan.notes, anchors: plan.anchors },
  };
  const falling = P.stageShapes(base);
  const hands = P.stageShapes({ ...base, design: 'hands' });

  const red = P.DEFAULT_COLORS.strikeLine;
  assert.ok(falling.some((s) => s.fill === red), 'the falling design lands notes on a line');
  assert.ok(!hands.some((s) => s.fill === red), 'nothing lands in the hands design');

  const blue = P.DEFAULT_COLORS.rightHand;
  const fullWidth = (s) => s.width === STAGE.width;
  assert.ok(
    falling.some((s) => s.fill === blue && !fullWidth(s)),
    'a bar is on its way down',
  );
  assert.ok(
    !hands.some((s) => s.fill === blue && !fullWidth(s) && s.y < 100),
    'no bar is on its way down in the hands design',
  );
  assert.ok(!hands.some((s) => s.fill === P.DEFAULT_COLORS.barLine), 'and no grid');
});

test('the hands design gives the keyboard more of the stage, and the hands room above it', () => {
  const falling = P.keyboardBox({ width: 1920, height: 600 });
  const hands = P.keyboardBox({ width: 1920, height: 600, design: 'hands' });
  assert.ok(hands.height > falling.height * 2, 'much taller keys with nothing falling onto them');
  assert.ok(hands.y > 0, 'but not the whole box: the palms sit above the keys');
  assert.equal(hands.y + hands.height, 600, 'still along the bottom');
});

test('a pressed key wears its finger number, up where the hand is not', () => {
  const notes = [note(60, 1, 'right', 2)];
  const plan = P.planFingering(notes);
  const base = {
    ...STAGE,
    seconds: 1.5,
    notes,
    design: 'hands',
    hands: { notes: plan.notes, anchors: plan.anchors },
  };
  const shapes = P.stageShapes(base);
  const badge = shapes.find((s) => s.label !== undefined);
  assert.ok(badge !== undefined, 'the badge is drawn');
  assert.equal(badge.label, String(plan.notes[0].finger));

  const board = P.keyboardBox({ ...STAGE, design: 'hands', notes });
  const key = P.keyboardGeometry(P.handsRange({ ...STAGE, design: 'hands', notes }), board).find(
    (k) => k.midi === 60,
  );
  const centre = badge.x + badge.width / 2;
  assert.ok(centre > key.x && centre < key.x + key.width, 'on middle C');
  // The palm is at the front of the keyboard, so the number is not.
  assert.ok(badge.y < board.y + board.height * 0.65, 'up the key, clear of the hand');
  assert.equal(shapes.at(-1), badge, 'and drawn last, so nothing covers it');

  const svg = P.renderPianoStage(base);
  assert.ok(svg.includes('>' + badge.label + '<'), 'and it reaches the markup');
  assert.ok(svg.includes('text-anchor="middle"'), 'centred on its badge');

  const off = P.stageShapes({ ...base, hands: { ...base.hands, fingerNumbers: false } });
  assert.equal(off.filter((s) => s.label !== undefined).length, 0, 'turned off when asked');
});

test('a scale longer than the hand is played in reaches, not a crawl', () => {
  // Eight notes up: a hand covers five, then moves once for the rest.
  const notes = [60, 62, 64, 65, 67, 69, 71, 72].map((m, i) => note(m, i * 0.4));
  const plan = P.planFingering(notes);
  assert.equal(plan.anchors.right.length, 2, 'two positions, not eight');
  const fingers = fingersOf(plan, 'right');
  assert.deepEqual(
    [60, 62, 64, 65, 67].map((m) => fingers.get(m)),
    [1, 2, 3, 4, 5],
    'the first reach is the whole hand',
  );
  assert.ok(fingers.get(69) < fingers.get(71), 'and the second reach carries on upward');
});

test('the hands wear the note colours: the tip is the hand colour, the edge a darker one', () => {
  const colors = P.handColorsFor({ leftHand: '#FFC400', rightHand: '#4FA3FF' });
  assert.equal(colors.left.tip, '#FFC400');
  assert.equal(colors.right.tip, '#4FA3FF');
  assert.equal(colors.left.skin, colors.right.skin, 'one player, one skin');
  const edge = P.parseColor(colors.left.edge);
  const tip = P.parseColor(colors.left.tip);
  assert.ok(edge.r < tip.r && edge.g < tip.g, 'the edge is darker than the colour it came from');
  // Anything unreadable comes back as it was, rather than as a guess.
  assert.equal(P.darken('var(--accent)', 0.4), 'var(--accent)');
});

/** How long the white keys are, in their own widths. */
const keyShape = (options) => {
  const box = P.keyboardBox(options);
  const range = P.handsRange(options);
  return box.height / (box.width / P.whiteKeysBetween(range.first, range.last));
};

test('a key stays a key in every frame shape, however tall the stage is', () => {
  const piece = [60, 64, 67, 72].map((m) => note(m, 0));
  const shapes = {
    '16:9': { width: 1856, height: 240, design: 'hands', size: 88, notes: piece },
    '9:16': { width: 531, height: 300, design: 'hands', size: 88, notes: piece },
    '1:1': { width: 1856, height: 430, design: 'hands', size: 88, notes: piece },
  };
  for (const [name, options] of Object.entries(shapes)) {
    const ratio = keyShape(options);
    assert.ok(ratio > 3 && ratio < 12, `${name}: a key is ${ratio.toFixed(1)} of its own widths`);
    const box = P.keyboardBox(options);
    assert.ok(Math.abs(box.y + box.height - options.height) < 1e-6, `${name}: along the bottom`);
  }
});

test('a tall frame shows a window of the keyboard, a wide one shows all of it', () => {
  const piece = [60, 64, 67, 72].map((m) => note(m, 0));
  const wide = P.handsRange({ width: 1856, height: 240, design: 'hands', size: 88, notes: piece });
  const tall = P.handsRange({ width: 531, height: 300, design: 'hands', size: 88, notes: piece });
  const wideKeys = P.whiteKeysBetween(wide.first, wide.last);
  const tallKeys = P.whiteKeysBetween(tall.first, tall.last);
  assert.ok(wideKeys > 2 * tallKeys, `16:9 carries most of the piano, got ${wideKeys}`);
  assert.ok(tallKeys >= 14 && tallKeys < 32, `9:16 carries a few octaves, got ${tallKeys}`);

  // Whatever the window is, it covers every note in the piece and
  // starts and ends on a white key.
  for (const range of [wide, tall]) {
    assert.ok(range.first <= 60 && range.last >= 72, 'the music is inside the window');
    assert.ok(!P.isBlackKey(range.first) && !P.isBlackKey(range.last), 'both ends are white');
  }
});

test('a piece wider than the window widens the window, not the other way round', () => {
  const narrow = [60, 62].map((m) => note(m, 0));
  const wide = [28, 100].map((m) => note(m, 0));
  const shape = { width: 531, height: 300, design: 'hands', size: 88 };
  const small = P.handsRange({ ...shape, notes: narrow });
  const big = P.handsRange({ ...shape, notes: wide });
  assert.ok(
    P.whiteKeysBetween(big.first, big.last) > P.whiteKeysBetween(small.first, small.last),
    'a hand is never left pressing a key that is not drawn',
  );
  assert.ok(big.first <= 28 && big.last >= 100);
});

test('the falling design keeps the keyboard it has always had', () => {
  const tall = { width: 1080, height: 1400, design: 'falling-notes', size: 88 };
  assert.ok(Math.abs(P.keyboardBox(tall).height - 1400 / 3) < 1e-6);
  assert.equal(
    P.renderPianoStage({ ...tall, seconds: 0, notes: [] }),
    P.renderPianoStage({ width: 1080, height: 1400, size: 88, seconds: 0, notes: [] }),
    'and the design is what it was before there was a design to pick',
  );
});
