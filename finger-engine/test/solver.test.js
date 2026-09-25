// The left hand: what it cannot do (Plan Part 05), what things cost
// (Part 06 §3/§4) and the search that puts them together (§5).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console, TextDecoder };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const guitar = E.defaultInstrument();
const geometry = { fingertipBehindFret: 0.3 };
const leftHand = E.DEFAULTS.leftHand;
const feasibility = { instrument: guitar, geometry, leftHand, spanFactor: 1 };
const place = (string, fret, finger, noteId = `n${string}${fret}`) => ({ noteId, string, fret, finger });

// ------------------------------------------------------- the hard rules

test('[LH-15] two notes at once cannot share a string', () => {
  const reason = E.infeasibleReason([place(3, 5, 1), place(3, 7, 3)], feasibility);
  assert.equal(reason.rule, 'LH-15');
});

test('[LH-03] one finger is in one place', () => {
  const twoFrets = E.infeasibleReason([place(3, 5, 1), place(4, 7, 1)], feasibility);
  assert.equal(twoFrets.rule, 'LH-03');
  // The same finger across two strings at one fret is a barre, which
  // Phase 2 builds -- and until it does, it is refused rather than
  // quietly drawn as two dots.
  const barre = E.infeasibleReason([place(3, 5, 1), place(4, 5, 1)], feasibility);
  assert.equal(barre.rule, 'LH-10');
});

test('[LH-05] the index finger is always nearest the nut', () => {
  const backwards = E.infeasibleReason([place(3, 7, 1), place(4, 5, 2)], feasibility);
  assert.equal(backwards.rule, 'LH-05');
  assert.equal(E.infeasibleReason([place(3, 5, 1), place(4, 7, 2)], feasibility), undefined);
  // Two fingers at the SAME fret may be in any order: that is an
  // ordinary chord shape, not a mistake.
  assert.equal(E.infeasibleReason([place(3, 5, 2), place(4, 5, 1)], feasibility), undefined);
});

test('[LH-04] a stretch has a limit, and the limit moves up the neck', () => {
  // Index at fret 1 and little finger at fret 6 is five frets where
  // the frets are widest: past the 120 mm the defaults allow.
  assert.equal(E.infeasibleReason([place(3, 1, 1), place(4, 6, 4)], feasibility).rule, 'LH-04');
  // The same five frets at the 9th is a stretch a hand really makes --
  // which is the whole reason the engine measures millimetres and not
  // fret numbers.
  assert.equal(E.infeasibleReason([place(3, 9, 1), place(4, 14, 4)], feasibility), undefined);
  // [SV-14] and the limit can be loosened when the file leaves no
  // choice: frets 1 to 5 is 129 mm, past the 120 the hand likes and
  // inside the 138 it will manage when the music insists.
  const relaxed = { ...feasibility, spanFactor: E.DEFAULTS.solver.relaxSpanFactor };
  assert.equal(E.infeasibleReason([place(3, 1, 1), place(4, 5, 4)], feasibility).rule, 'LH-04');
  assert.equal(E.infeasibleReason([place(3, 1, 1), place(4, 5, 4)], relaxed), undefined);
});

test('[LH-01] the thumb only frets when it is allowed to', () => {
  assert.equal(E.allowedFingers(leftHand).join(','), '1,2,3,4');
  assert.equal(E.allowedFingers({ ...leftHand, allowThumb: true }).join(','), '1,2,3,4,T');
});

test('[LH-07] the hand position is read off the index finger', () => {
  assert.equal(E.handPosition([place(3, 5, 1)], 1), 5);
  assert.equal(E.handPosition([place(3, 7, 3)], 1), 5, 'finger 3 at fret 7 is the hand at 5');
  assert.equal(E.handPosition([place(3, 0, null)], 4), 4, 'an open string says nothing about the hand');
});

// ------------------------------------------------------ the cost model

function context(notes) {
  return {
    instrument: guitar,
    geometry,
    leftHand,
    solver: E.DEFAULTS.solver,
    weights: E.DEFAULTS.weights,
    pitchReturnsSoon: new Set(),
    noteById: new Map((notes ?? []).map((note) => [note.noteId, note])),
  };
}

test('[LH-08] the pinky costs more than the index', () => {
  const index = E.staticFeatures([place(3, 5, 1)], context()).cost;
  const little = E.staticFeatures([place(3, 5, 4)], context()).cost;
  assert.ok(little > index, `${little} should be dearer than ${index}`);
});

test('[LH-13] an open string is cheaper than any fretted note', () => {
  const open = E.staticFeatures([place(3, 0, null)], context()).cost;
  assert.ok(open < 0, 'the default weight is a bonus, not a cost');
  assert.ok(open < E.staticFeatures([place(3, 5, 1)], context()).cost);
});

test('[LH-09] a note past the twelfth fret costs a little more', () => {
  const low = E.staticFeatures([place(3, 5, 1)], context()).cost;
  const high = E.staticFeatures([place(3, 17, 1)], context()).cost;
  assert.ok(high > low);
});

test('[Ct] the same shift costs more when there is less time for it', () => {
  const stage = (freeTime) => ({
    index: 1,
    time: 1,
    onsets: [],
    sustained: [],
    dt: freeTime,
    freeTime,
    openWindow: Infinity,
    segmentStart: false,
  });
  const move = (freeTime) =>
    E.transitionFeatures(
      {
        previous: [place(3, 2, 1)],
        previousHandPos: 2,
        next: [place(3, 9, 1)],
        nextHandPos: 9,
        stage: stage(freeTime),
      },
      context(),
    ).cost;
  assert.ok(move(0.05) > move(0.8), 'a rushed shift is the expensive one');
  assert.ok(move(0.8) > 0);
});

test('[LH-32] rolling to the next string at the same fret is cheap; jumping is not', () => {
  const stage = { index: 1, time: 1, onsets: [], sustained: [], dt: 0.25, freeTime: 0.25, openWindow: Infinity, segmentStart: false };
  const roll = E.transitionFeatures(
    { previous: [place(3, 5, 1)], previousHandPos: 5, next: [place(4, 5, 1)], nextHandPos: 5, stage },
    context(),
  );
  const jump = E.transitionFeatures(
    { previous: [place(3, 5, 1)], previousHandPos: 5, next: [place(6, 5, 1)], nextHandPos: 5, stage },
    context(),
  );
  assert.equal(roll.features.roll, 1);
  assert.equal(jump.features.sameFingerJump > 0, true);
  assert.ok(jump.cost > roll.cost);
});

test('[LH-20/22] a legato link off its own string is impossible, not expensive', () => {
  const from = { noteId: 'a', pitch: 52, tick: 0, durationTicks: 480, time: 0, duration: 0.5, techniques: [], sourceRef: { format: 'musicxml', part: 'P1', index: 0 } };
  const to = {
    noteId: 'b',
    pitch: 53,
    tick: 480,
    durationTicks: 480,
    time: 0.5,
    duration: 0.5,
    techniques: [],
    techniqueLinks: [{ type: 'slide', fromNoteId: 'a' }],
    sourceRef: { format: 'musicxml', part: 'P1', index: 1 },
  };
  const stage = { index: 1, time: 0.5, onsets: [to], sustained: [], dt: 0.5, freeTime: 0.5, openWindow: Infinity, segmentStart: false };
  const sameString = E.transitionFeatures(
    { previous: [place(3, 2, 1, 'a')], previousHandPos: 2, next: [place(3, 3, 1, 'b')], nextHandPos: 3, stage },
    context([from, to]),
  );
  const otherString = E.transitionFeatures(
    { previous: [place(3, 2, 1, 'a')], previousHandPos: 2, next: [place(4, 0, null, 'b')], nextHandPos: 2, stage },
    context([from, to]),
  );
  const otherFinger = E.transitionFeatures(
    { previous: [place(3, 2, 1, 'a')], previousHandPos: 2, next: [place(3, 3, 2, 'b')], nextHandPos: 2, stage },
    context([from, to]),
  );
  assert.ok(Number.isFinite(sameString.cost));
  assert.equal(otherString.cost, Infinity, 'a slide cannot change string');
  assert.equal(otherFinger.cost, Infinity, 'or finger');
});

// ---------------------------------------------------------- the search

test('[SV-12/SV-13] merging keeps the cheaper twin, and the beam keeps the best', () => {
  const nodes = [
    { state: 'a', key: 'x', cost: 3, parent: -1, edgeCost: 0, backward: 0 },
    { state: 'b', key: 'x', cost: 1, parent: -1, edgeCost: 0, backward: 0 },
    { state: 'c', key: 'y', cost: 2, parent: -1, edgeCost: 0, backward: 0 },
  ];
  const merged = E.mergeByKey(nodes);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((node) => node.key === 'x').cost, 1);
  assert.equal(E.pruneBeam(merged, 1).length, 1);
  assert.equal(E.pruneBeam(merged, 1)[0].cost, 1);
});

test('[SV-20..22] the search really finds the cheapest path, not a cheap one', () => {
  // A trap: the cheapest FIRST step leads to an expensive rest.
  // Anything that picks greedily fails this; a shortest path does not.
  const stages = [0, 1, 2];
  const solution = E.solveStages({
    stages,
    expand: () => ['L', 'R'],
    staticCost: (state, stage) => (stage === 0 ? (state === 'L' ? 0 : 1) : 0),
    transitionCost: (previous, next, stage) => {
      if (stage === 1) return previous === 'L' ? 10 : next === 'R' ? 0 : 0.5;
      return previous === next ? 0 : 1;
    },
    key: (state) => state,
    beamWidth: 8,
    maxRelax: 0,
  });
  assert.equal(solution.path.join(''), 'RRR');
  assert.equal(solution.totalCost, 1);
  assert.ok(solution.margins[0] > 0, 'and it says how much better that was');
});

test('[SV-14] a stage that cannot be played is retried with the rules loosened', () => {
  const relaxed = [];
  const solution = E.solveStages({
    stages: [0, 1],
    expand: (previous, stage, index, relax) => {
      if (index === 1 && relax === 0) return [];
      if (index === 1) relaxed.push(relax);
      return ['x'];
    },
    staticCost: () => 1,
    transitionCost: () => 0,
    key: () => 'x',
    beamWidth: 4,
    maxRelax: 3,
  });
  assert.equal(solution.path.length, 2, 'the stage still produced something');
  assert.equal(solution.relaxedStages.get(1), 1, 'and the engine remembers it had to give way');
  assert.equal(relaxed[0], 1);
});

test('[SV-11] every place a note can be played, minus what the file already decided', () => {
  const note = (extra) => ({
    noteId: 'n',
    pitch: 52,
    tick: 0,
    durationTicks: 480,
    time: 0,
    duration: 0.5,
    techniques: [],
    sourceRef: { format: 'musicxml', part: 'P1', index: 0 },
    ...extra,
  });
  const free = E.placementsFor(note({}), guitar, leftHand);
  // E3 is playable in three places on a 22-fret guitar -- string 3
  // fret 2, string 2 fret 7, string 1 fret 12 -- and each one can be
  // taken by any of the four fingers.
  assert.equal([...new Set(free.map((p) => `${p.string}/${p.fret}`))].sort().join(' '), '1/12 2/7 3/2');
  assert.equal(free.length, 12);

  // An open string is a place too, and it is played by no finger.
  const openE = E.placementsFor(note({ pitch: 40 }), guitar, leftHand);
  assert.ok(openE.some((p) => p.fret === 0 && p.finger === null));

  const locked = E.placementsFor(note({ lockedString: 3, lockedFret: 2 }), guitar, leftHand);
  assert.equal(new Set(locked.map((p) => `${p.string}/${p.fret}`)).size, 1);
  assert.equal(locked.length, 4, 'the position is fixed; the finger is not');

  const fingered = E.placementsFor(note({ lockedString: 3, lockedFret: 2, lockedFinger: 2 }), guitar, leftHand);
  assert.equal(fingered.length, 1, 'and a written fingering fixes that too');
  assert.equal(fingered[0].finger, 2);
});
