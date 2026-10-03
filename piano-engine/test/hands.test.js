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

test('a pressing finger goes down the key, and lands on the key it is playing', () => {
  const notes = [note(60, 1, 'right', 2)];
  const resting = handsFor(notes, 0.2);
  const pressing = handsFor(notes, 1.5);

  const tipDot = pressing.find((s) => s.fill === P.DEFAULT_HAND_COLORS.right.edge);
  assert.ok(tipDot !== undefined, 'the pressing fingertip is marked');

  const keys = P.keyboardGeometry(88, BOARD);
  const middleC = keys.find((k) => k.midi === 60);
  const centre = tipDot.x + tipDot.width / 2;
  assert.ok(
    centre > middleC.x && centre < middleC.x + middleC.width,
    'the fingertip is on middle C, not near it',
  );

  // And it is further down the key than the same finger at rest.
  const tipY = (set) =>
    Math.min(...set.filter((s) => s.path !== undefined).map((s) => Number(s.path.split(' ').at(-1))));
  assert.ok(
    Math.max(...pressing.filter((s) => s.path !== undefined).map((s) => Number(s.path.split(' ').at(-1)))) >
      tipY(resting),
    'pressed is lower than resting',
  );
  assert.equal(
    resting.filter((s) => s.fill === P.DEFAULT_HAND_COLORS.right.edge).length,
    0,
    'nothing is marked as pressing when nothing is',
  );
});

test('a finger on a black key stops higher up the board than one on a white', () => {
  const white = handsFor([note(60, 1, 'right', 2)], 1.5);
  const black = handsFor([note(61, 1, 'right', 2)], 1.5);
  const dot = (set, hand = 'right') =>
    set.find((s) => s.fill === P.DEFAULT_HAND_COLORS[hand].edge);
  assert.ok(dot(black).y < dot(white).y, 'the black key is shorter, so the finger stops sooner');
});

test('three fingers down at once are three separate keys', () => {
  const chord = [60, 64, 67].map((m) => note(m, 1, 'right', 2));
  const shapes = handsFor(chord, 1.5);
  const dots = shapes.filter((s) => s.fill === P.DEFAULT_HAND_COLORS.right.edge);
  assert.equal(dots.length, 3);
  const keys = P.keyboardGeometry(88, BOARD);
  for (const midi of [60, 64, 67]) {
    const key = keys.find((k) => k.midi === midi);
    assert.ok(
      dots.some((d) => d.x + d.width / 2 > key.x && d.x + d.width / 2 < key.x + key.width),
      `a finger is on ${midi}`,
    );
  }
});

test('smaller hands are smaller, and the scale changes nothing else', () => {
  const full = handsFor([note(60, 0)], 0);
  const small = handsFor([note(60, 0)], 0, { scale: 0.6 });
  assert.equal(full.length, small.length, 'the same hand, drawn smaller');
  const widest = (set) => Math.max(...set.filter((s) => s.strokeWidth).map((s) => s.strokeWidth));
  assert.ok(widest(small) < widest(full));
});

test('the stage draws hands only when it is given a fingering', () => {
  const notes = [note(60, 1, 'right', 2), note(48, 1, 'left', 2)];
  const base = { ...STAGE, seconds: 1.5, notes };
  const without = P.renderPianoStage(base);
  const plan = P.planFingering(notes);
  const withHands = P.renderPianoStage({
    ...base,
    hands: { notes: plan.notes, anchors: plan.anchors },
  });
  assert.ok(!without.includes('<path'), 'the stage without hands is the stage it always was');
  assert.ok(withHands.includes('<path'), 'and with them it has fingers');
  assert.ok(withHands.includes('stroke-linecap="round"'), 'round caps: a fingertip, not a stick');
  assert.ok(withHands.length > without.length);
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
