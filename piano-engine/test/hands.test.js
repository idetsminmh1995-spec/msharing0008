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

/** Where the fingers are, straight from the engine. */
const tipsFor = (notes, seconds, hand = 'right', over = {}) => {
  const plan = P.planFingering(notes);
  return P.handFingertips(hand, {
    size: 88,
    board: BOARD,
    seconds,
    notes: plan.notes,
    anchors: plan.anchors,
    colors: P.DEFAULT_HAND_COLORS,
    ...over,
  });
};

/** Every fingertip's y. */
const tipYs = (tips) => tips.map((t) => t.y);

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

test('a hand is five fingers, and the whole of it is one drawn shape', () => {
  const tips = tipsFor([note(60, 0)], 0);
  assert.equal(tips.length, 5, 'five fingers');
  assert.deepEqual(
    [...tips].map((t) => t.finger).sort(),
    [1, 2, 3, 4, 5],
    'one of each, no finger used twice',
  );

  const shapes = handsFor([note(60, 0)], 0).filter((s) => s.path !== undefined);
  // Two parts -- the hand and its thumb -- each painted twice: dark and
  // fat underneath, skin at its true size on top. What shows of the
  // dark pass is the outline of the two together, and nothing else.
  const [edgeHand, edgeThumb, skinHand, skinThumb] = shapes;
  const { edge, skin } = P.DEFAULT_HAND_COLORS.right;
  // Both dark passes come first, so neither of them can show up as a
  // seam inside the skin that is painted over them.
  assert.equal(edgeHand.fill, edge);
  assert.equal(edgeThumb.stroke, edge);
  assert.equal(skinHand.fill, skin);
  assert.equal(skinThumb.stroke, skin);
  assert.equal(edgeHand.path, skinHand.path, 'the same shape, twice');
  assert.equal(edgeThumb.path, skinThumb.path);
  assert.ok(edgeHand.strokeWidth > 0, 'the dark pass is the fatter one');
  assert.equal(skinHand.stroke, undefined, 'and the skin pass is not stroked at all');
  assert.ok(edgeThumb.strokeWidth > skinThumb.strokeWidth);
  // The hand's own outline is a closed path: up each finger, round its
  // tip, down into the web, and back along the heel.
  assert.match(skinHand.path, /^M [-\d.]+ [-\d.]+ .*A .* Z$/, 'closed, and with arcs in it');

  // Then the creases between the fingers and a nail on each tip: the
  // two details that tell a hand from a mitten.
  const creases = shapes.filter((s) => s.fill === 'none' && s.path.startsWith('M') && s !== edgeThumb && s !== skinThumb);
  assert.equal(creases.length, 3, 'three gaps between four fingers');
  assert.equal(shapes.filter((s) => s.fill === P.darken(skin, 0.1)).length, 5, 'five nails');
});

test('the middle finger is longer than the thumb and the little finger', () => {
  const by = new Map(tipsFor([note(60, 0)], 5).map((t) => [t.finger, t.y]));
  assert.ok(by.get(3) < by.get(2), 'middle reaches past index');
  assert.ok(by.get(2) < by.get(5), 'index reaches past the little finger');
  assert.ok(by.get(5) < by.get(1), 'and every finger reaches past the thumb');
});

test('a pressing finger reaches up its own key, and only that finger', () => {
  const notes = [note(60, 1, 'right', 2)];
  const resting = tipsFor(notes, 0.2);
  const pressing = tipsFor(notes, 1.5);
  const playing = pressing.find((t) => t.pressed);
  assert.ok(playing !== undefined, 'one finger is playing');
  assert.equal(pressing.filter((t) => t.pressed).length, 1, 'and only one');
  assert.equal(playing.midi, 60);

  const keys = P.keyboardGeometry(88, BOARD);
  const middleC = keys.find((k) => k.midi === 60);
  assert.ok(playing.x > middleC.x && playing.x < middleC.x + middleC.width, 'on middle C');

  // A finger already over its key does not have to reach further for
  // it -- that is the whole point of the hand being where it is -- but
  // it never pulls BACK towards the player to play one.
  const was = resting.find((t) => t.finger === playing.finger);
  assert.ok(playing.y <= was.y + 0.5, 'playing never retreats from resting');
  assert.ok(playing.y > BOARD.y, 'and never off the back of the keyboard');

  // Nothing is drawn ON the finger to say it is playing: the key under
  // it is lit, the finger has reached for it, and the number is on the
  // key. Three cues for one fact, and a grey dot would be a fourth.
  const numbered = handsFor(notes, 1.5).filter((s) => s.label !== undefined);
  assert.equal(numbered.length, 1, 'one badge, for the one finger playing');
  assert.equal(numbered[0].label, String(playing.finger));
  assert.equal(handsFor(notes, 0.2).filter((s) => s.label !== undefined).length, 0, 'none at rest');
});

test('the hand points away from the player: the heel is at the front of the keys', () => {
  const tips = tipsFor([note(60, 1, 'right', 2)], 1.5);
  // Every fingertip is up the keyboard, away from the player.
  for (const tip of tips) {
    assert.ok(tip.y < BOARD.y + BOARD.height, `finger ${tip.finger} is on the keys`);
  }
  // And the hand's own drawing reaches past the front edge of the keys,
  // because that is where the heel of a palm rests.
  const shapes = handsFor([note(60, 1, 'right', 2)], 1.5).filter((s) => s.path !== undefined);
  const lowest = Math.max(
    ...shapes[0].path.match(/-?\d+(\.\d+)?/g).filter((_, i) => i % 2 === 1).map(Number),
  );
  assert.ok(lowest > BOARD.y + BOARD.height, 'the heel is past the front edge of the keys');
});

test('a finger on a black key never reaches past the end of it', () => {
  // The four long fingers already rest up among the black keys, which
  // is why a player leaves them there. It is the THUMB, which plays
  // out at the front, that a black key has to pull back -- and the
  // hand with it, because a finger can only stretch so far.
  const chord = [48, 61].map((m) => note(m, 1, 'left', 2));
  const plan = P.planFingering(chord);
  assert.equal(
    plan.notes.find((n) => n.midi === 61).finger,
    1,
    'this chord really is played with the thumb on the black key',
  );

  for (const height of [120, 200, 320, 480]) {
    const board = P.keyboardBox({ size: 88, width: 1920, height, design: 'hands' });
    const tips = P.handFingertips('left', {
      size: 88,
      board,
      seconds: 1.5,
      notes: plan.notes,
      anchors: plan.anchors,
      colors: P.DEFAULT_HAND_COLORS,
    });
    const thumb = tips.find((t) => t.finger === 1);
    assert.ok(thumb.pressed && thumb.onBlack, `${height}: the thumb is on the black key`);
    // A black key ends 62% of the way down the board. A finger on one
    // cannot be out in front of the key it is pressing.
    assert.ok(
      thumb.y < board.y + board.height * 0.62,
      `${height}: the thumb stays on the black key`,
    );
  }
});

test('three fingers down at once are three separate keys', () => {
  const chord = [60, 64, 67].map((m) => note(m, 1, 'right', 2));
  const down = tipsFor(chord, 1.5).filter((t) => t.pressed);
  assert.equal(down.length, 3);
  assert.deepEqual([...down].map((t) => t.midi).sort((a, b) => a - b), [60, 64, 67]);

  const keys = P.keyboardGeometry(88, BOARD);
  for (const tip of down) {
    const key = keys.find((k) => k.midi === tip.midi);
    assert.ok(tip.x > key.x && tip.x < key.x + key.width, `finger ${tip.finger} is on its key`);
  }
  // And each one is numbered, on its own key.
  const badges = handsFor(chord, 1.5).filter((s) => s.label !== undefined);
  assert.equal(badges.length, 3);
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

test('the hands design keeps a strip in FRONT of the keys for the hands', () => {
  const box = { width: 1920, height: 600, size: 88 };
  const falling = P.keyboardBox(box);
  const hands = P.keyboardBox({ ...box, design: 'hands' });
  assert.ok(hands.height > falling.height, 'deeper keys with nothing falling onto them');
  // Not flush with the bottom any more: the heel of a palm rests past
  // the front edge of the keys, and that is where it goes.
  assert.ok(hands.y + hands.height < 600, 'the strip in front is left empty of keyboard');
  const unit = 1920 / P.whiteKeyCount(88);
  assert.ok(600 - (hands.y + hands.height) > unit, 'and it is wide enough for a heel');
  // A white key is 150mm long and 23mm wide, and is never drawn much
  // longer than that however much room the frame has.
  assert.ok(hands.height / unit < 8, 'a key stays a key');
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
  const badge = shapes.filter((s) => s.label !== undefined).at(-1);
  assert.ok(badge !== undefined, 'the badge is drawn');
  assert.equal(badge.label, String(plan.notes[0].finger));

  const board = P.keyboardBox({ ...STAGE, design: 'hands', notes });
  const key = P.keyboardGeometry(88, board).find((k) => k.midi === 60);
  const centre = badge.x + badge.width / 2;
  assert.ok(centre > key.x && centre < key.x + key.width, 'on middle C');
  // The palm is at the front of the keyboard, so the number is not.
  assert.ok(badge.y < board.y + board.height * 0.65, 'up the key, clear of the hand');
  assert.equal(shapes.at(-1), badge, 'and drawn last, so nothing covers it');

  const svg = P.renderPianoStage(base);
  assert.ok(svg.includes('>' + badge.label + '<'), 'and it reaches the markup');
  assert.ok(svg.includes('text-anchor="middle"'), 'centred on its badge');

  const off = P.stageShapes({ ...base, hands: { ...base.hands, fingerNumbers: false } });
  assert.equal(
    off.filter((s) => s.labelColor === badge.labelColor).length,
    0,
    'turned off when asked',
  );
  // The keyboard's own C marks are a separate thing and stay.
  assert.ok(off.some((s) => /^C-?\d$/.test(s.label ?? '')), 'the C names are not finger numbers');
  const quiet = P.stageShapes({ ...base, keyNames: false });
  assert.equal(quiet.filter((s) => /^C-?\d$/.test(s.label ?? '')).length, 0, 'and can be hidden');
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

test('88 Keys means 88 keys, in every frame shape', () => {
  const piece = [60, 64, 67, 72].map((m) => note(m, 0));
  for (const [name, options] of Object.entries({
    '16:9': { width: 1856, height: 240, design: 'hands', size: 88, notes: piece },
    '9:16': { width: 531, height: 300, design: 'hands', size: 88, notes: piece },
    '1:1': { width: 1856, height: 430, design: 'hands', size: 88, notes: piece },
  })) {
    const box = P.keyboardBox(options);
    const keys = P.keyboardGeometry(88, box);
    assert.equal(keys.filter((k) => !k.black).length, 52, `${name}: all 52 white keys`);
    assert.equal(keys.length, 88, `${name}: all 88`);
    // A white key is 150mm long and 23mm wide. Never drawn much longer
    // than that, however tall the stage is -- past that it stops being
    // a keyboard and the hand on it stops being a hand.
    const ratio = box.height / (box.width / 52);
    assert.ok(ratio > 2 && ratio < 8, `${name}: a key is ${ratio.toFixed(1)} of its own widths`);
    assert.ok(box.y >= 0 && box.y + box.height < options.height, `${name}: inside, with a strip`);
  }

  // A smaller instrument is a smaller instrument, not a window on a big one.
  const sixtyOne = P.keyboardGeometry(61, P.keyboardBox({ width: 1856, height: 240, size: 61 }));
  assert.equal(sixtyOne.length, 61);
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

test('a thumb reaching a distant key moves the WHOLE hand, not just the thumb', () => {
  // The same left hand, playing one note with its thumb and then one a
  // fourth lower with its little finger. A hand that only stretched
  // its thumb would leave the other four fingers where they were.
  const high = tipsFor([note(60, 1, 'left', 2)], 1.5, 'left');
  const low = tipsFor([note(53, 1, 'left', 2)], 1.5, 'left');
  const moved = (finger) =>
    Math.abs(
      low.find((t) => t.finger === finger).x - high.find((t) => t.finger === finger).x,
    );
  for (const finger of [2, 3, 4, 5]) {
    assert.ok(moved(finger) > 10, `finger ${finger} went with the hand (${moved(finger)}px)`);
  }
});

test('the hand turns on the keys, and turns back', () => {
  // Reading the turn off the drawing: the line from the little
  // finger's knuckle to the index finger's IS the knuckle line, and
  // the angle of it is the hand's turn.
  const turnOf = (notes, seconds) => {
    const tips = tipsFor(notes, seconds, 'left');
    const a = tips.find((t) => t.finger === 5);
    const b = tips.find((t) => t.finger === 2);
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  // A chord that wants the thumb well past where it sits turns the
  // hand; a comfortable five-finger position does not.
  const easy = turnOf([48, 52, 55].map((m) => note(m, 1, 'left', 2)), 1.5);
  const reach = turnOf([48, 64].map((m) => note(m, 1, 'left', 2)), 1.5);
  assert.ok(Math.abs(reach - easy) > 0.04, 'reaching turns the hand');
  // And never past what a wrist can do.
  for (const t of [easy, reach]) assert.ok(Math.abs(t) < 0.6, 'no hand turns that far');
});

test('the fingers fan for a wide chord and close for a narrow one', () => {
  const span = (notes) => {
    const tips = tipsFor(notes, 1.5, 'right').filter((t) => t.finger !== 1);
    const xs = tips.map((t) => t.x);
    return Math.max(...xs) - Math.min(...xs);
  };
  const close = span([60, 62].map((m) => note(m, 1, 'right', 2)));
  const wide = span([60, 64, 67, 72].map((m) => note(m, 1, 'right', 2)));
  assert.ok(wide > close, 'a wider chord spreads the fingers further');
  // But a hand is a hand: the four fingers never spread past a hand's
  // own span, however wide the chord.
  const unit = BOARD.width / P.whiteKeyCount(88);
  assert.ok(wide < unit * 7, 'and never past what four fingers can cover');
});

test('a finger never swings further from the hand than a finger can', () => {
  // An octave in one hand is the widest thing it is ever asked for.
  const tips = tipsFor([60, 72].map((m) => note(m, 1, 'right', 2)), 1.5, 'right');
  for (const tip of tips) {
    assert.ok(Number.isFinite(tip.x) && Number.isFinite(tip.y), `finger ${tip.finger} is placed`);
    assert.ok(tip.y > BOARD.y - BOARD.height, `finger ${tip.finger} is on the keyboard`);
  }
  // The two played keys are covered, which is the test of the whole
  // thing: a hand that cannot reach its own chord is not a hand.
  const keys = P.keyboardGeometry(88, BOARD);
  for (const midi of [60, 72]) {
    const key = keys.find((k) => k.midi === midi);
    const tip = tips.find((t) => t.midi === midi);
    assert.ok(tip !== undefined, `${midi} is played`);
    assert.ok(Math.abs(tip.x - (key.x + key.width / 2)) < key.width, `${midi} is reached`);
  }
});
