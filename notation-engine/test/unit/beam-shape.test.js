import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('beam shape geometry (Phase 24)', () => {
  test('flat style has zero slope, both ends at the extreme natural stem tip', () => {
    // Up-stem group; natural tips (position - 3.5) for positions [0, -1, 1]:
    // -3.5, -4.5, -2.5 -- the most extreme (most negative, furthest "up") is -4.5.
    const shape = NE.computeBeamShape([0, -1, 1], [0, 5, 10], 'up', 'flat', 3.5);
    assert.equal(shape.startY, shape.endY);
    assert.equal(shape.startY, -4.5);
  });

  test('straight style with a small interval keeps its natural (unclamped) slope', () => {
    // positions [0, -0.5] (a small, half-space difference) -- natural tips -3.5, -4.
    const shape = NE.computeBeamShape([0, -0.5], [0, 10], 'up', 'straight', 3.5);
    assert.equal(shape.startY, -3.5);
    assert.equal(shape.endY, -4); // NOT clamped -- the natural difference (0.5) is under the 1.0 cap
  });

  test('straight style with a large interval gets its slope clamped to exactly 1.0sp', () => {
    // positions [0, -5] (a large interval) -- natural tips -3.5, -8.5 (a 5sp difference).
    const shape = NE.computeBeamShape([0, -5], [0, 10], 'up', 'straight', 3.5);
    assert.ok(Math.abs(shape.endY - shape.startY) <= 1.0 + 1e-9, 'the SLOPE is clamped');
    // And the beam still clears the high note by a full stem: anchored
    // on the note NEAREST it, which for a rising run is the last one.
    assert.equal(shape.endY, -8.5);
    assert.equal(shape.startY, -7.5);
  });

  test('a downward-sloping straight beam clamps in the correct (positive) direction', () => {
    const shape = NE.computeBeamShape([0, 5], [0, 10], 'down', 'straight', 3.5);
    assert.ok(shape.endY > shape.startY, 'sloping the right way');
    assert.ok(Math.abs(shape.endY - shape.startY) <= 1.0 + 1e-9);
    // Clearing the LOWEST note by a full stem, the mirror of the rule above.
    assert.equal(shape.endY, 8.5);
    assert.equal(shape.startY, 7.5);
  });

  test('every stem in a beamed group is at least a full stem long', () => {
    // A rising run anchored on its first note used to leave its last
    // note with almost no stem; the beam is anchored on whichever note
    // is nearest it instead.
    const positions = [0, -1, -2, -3];
    const xs = [0, 3, 6, 9];
    const shape = NE.computeBeamShape(positions, xs, 'up', 'straight', 3.5);
    positions.forEach((position, i) => {
      const length = position - NE.beamYAtX(shape, xs[i]);
      assert.ok(length >= 3.5 - 1e-9, `stem ${i} is ${length.toFixed(2)}sp, under a full stem`);
    });
  });

  test('curved style has EXACTLY the same endpoints as straight (only the drawing differs)', () => {
    const straight = NE.computeBeamShape([0, -5], [0, 10], 'up', 'straight', 3.5);
    const curved = NE.computeBeamShape([0, -5], [0, 10], 'up', 'curved', 3.5);
    assert.equal(curved.startY, straight.startY);
    assert.equal(curved.endY, straight.endY);
    assert.equal(curved.startX, straight.startX);
    assert.equal(curved.endX, straight.endX);
  });

  test('beamYAtX interpolates linearly along the beam', () => {
    const shape = NE.computeBeamShape([0, -1], [0, 10], 'up', 'straight', 3.5);
    // startY=-3.5 at x=0, endY=-4.5 at x=10 -- halfway (x=5) should be -4.0.
    assert.ok(Math.abs(NE.beamYAtX(shape, 5) - -4.0) < 1e-9);
    assert.equal(NE.beamYAtX(shape, 0), shape.startY);
    assert.equal(NE.beamYAtX(shape, 10), shape.endY);
  });

  test('numBeamLines matches the flag count for every beamable duration', () => {
    assert.equal(NE.numBeamLines('eighth'), 1);
    assert.equal(NE.numBeamLines('16th'), 2);
    assert.equal(NE.numBeamLines('32nd'), 3);
    assert.equal(NE.numBeamLines('1024th'), 8);
  });

  test('numBeamLines throws for a duration that is never beamed', () => {
    assert.throws(() => NE.numBeamLines('quarter'), /never beamed/);
  });

  test('computeBeamShape throws on an empty group', () => {
    assert.throws(() => NE.computeBeamShape([], [], 'up', 'straight', 3.5));
  });
});

describe('beam segments -- which lines a group actually gets (Integration W)', () => {
  // The engine runs in a vm sandbox, so the objects it returns carry
  // that realm's Object.prototype and deepStrictEqual refuses them even
  // when every field matches. Copied into this realm first.
  const plain = (segments) => [...segments].map((s) => ({ ...s }));
  const levels = (...n) => plain(NE.computeBeamSegments(n));

  test('a group of plain eighths gets ONE line, running the whole group', () => {
    assert.deepEqual(levels(1, 1, 1, 1), [{ level: 1, fromIndex: 0, toIndex: 3 }]);
  });

  test('a group of sixteenths gets two full lines', () => {
    assert.deepEqual(levels(2, 2, 2, 2), [
      { level: 1, fromIndex: 0, toIndex: 3 },
      { level: 2, fromIndex: 0, toIndex: 3 },
    ]);
  });

  test('a dotted eighth + a sixteenth: ONE full beam and a BACKWARD hook, not two full beams', () => {
    // The real defect this closes. The engine used to draw as many full
    // lines as the group's shortest note needed, which put a sixteenth
    // beam across the dotted eighth as well.
    assert.deepEqual(levels(1, 2), [
      { level: 1, fromIndex: 0, toIndex: 1 },
      { level: 2, fromIndex: 1, toIndex: 1, hook: 'backward' },
    ]);
  });

  test('a sixteenth + a dotted eighth: the hook points FORWARD, since nothing is behind it', () => {
    assert.deepEqual(levels(2, 1), [
      { level: 1, fromIndex: 0, toIndex: 1 },
      { level: 2, fromIndex: 0, toIndex: 0, hook: 'forward' },
    ]);
  });

  test("the file's own <beam> wins over the inferred hook direction (Sec10.8)", () => {
    const hints = [undefined, [{ number: 2, value: 'forward hook' }]];
    assert.deepEqual(plain(NE.computeBeamSegments([1, 2], hints)), [
      { level: 1, fromIndex: 0, toIndex: 1 },
      { level: 2, fromIndex: 1, toIndex: 1, hook: 'forward' },
    ]);
  });

  test('two sixteenths inside a group of eighths share a real second line, not two hooks', () => {
    assert.deepEqual(levels(1, 2, 2, 1), [
      { level: 1, fromIndex: 0, toIndex: 3 },
      { level: 2, fromIndex: 1, toIndex: 2 },
    ]);
  });

  test('separate runs at the same level each get their own line', () => {
    assert.deepEqual(levels(2, 2, 1, 2, 2), [
      { level: 1, fromIndex: 0, toIndex: 4 },
      { level: 2, fromIndex: 0, toIndex: 1 },
      { level: 2, fromIndex: 3, toIndex: 4 },
    ]);
  });

  test('a 32nd in a group of eighths stacks a hook at every level it needs', () => {
    assert.deepEqual(levels(1, 3), [
      { level: 1, fromIndex: 0, toIndex: 1 },
      { level: 2, fromIndex: 1, toIndex: 1, hook: 'backward' },
      { level: 3, fromIndex: 1, toIndex: 1, hook: 'backward' },
    ]);
  });

  test('an empty group draws nothing rather than throwing', () => {
    assert.deepEqual(levels(), []);
  });
});

describe('beam rendering (Phase 24)', () => {
  const full = (count, level = 1) => [{ level, fromIndex: 0, toIndex: count - 1 }];

  test('renderBeam draws one line per segment for a straight/flat beam', () => {
    const shape = NE.computeBeamShape([0, -1], [0, 10], 'up', 'straight', 3.5);
    const svg = NE.renderBeam(shape, {
      segments: [...full(2), ...full(2, 2)],
      stemXs: [0, 10],
      thickness: 0.5,
      spacing: 0.25,
      color: '#000000',
    });
    assert.equal((svg.match(/<line/g) || []).length, 2);
  });

  test('renderBeam draws paths (not lines) for a curved beam', () => {
    const shape = NE.computeBeamShape([0, -1], [0, 10], 'up', 'curved', 3.5);
    const svg = NE.renderBeam(shape, {
      segments: full(2),
      stemXs: [0, 10],
      thickness: 0.5,
      spacing: 0.25,
      color: '#000000',
    });
    assert.equal((svg.match(/<path/g) || []).length, 1);
    assert.equal((svg.match(/<line/g) || []).length, 0);
  });

  test('secondary beam centres are thickness+spacing apart, NOT spacing alone (they must not overlap)', () => {
    const shape = NE.computeBeamShape([0, 0], [0, 10], 'up', 'flat', 3.5); // flat at y=-3.5
    const svg = NE.renderBeam(shape, {
      segments: [...full(2), ...full(2, 2)],
      stemXs: [0, 10],
      thickness: 0.5,
      spacing: 0.25,
      color: '#000000',
    });
    // SMuFL's beamSpacing is the GAP between beams, not their centre-to-
    // centre distance, so with thickness 0.5 the centres sit 0.75 apart.
    // Up-stem: primary at y=-3.5, secondary toward the notehead at y=-2.75.
    assert.match(svg, /y1="-3\.5"/);
    assert.match(svg, /y1="-2\.75"/);
    // The bug this guards against: using spacing (0.25) as the centre step
    // would put the second beam at -3.25, overlapping the first by half its
    // own thickness. Assert that value is specifically absent.
    assert.ok(!svg.includes('y1="-3.25"'), 'second beam must not overlap the first');

    // Independent check of the same property: the two centres' gap must be
    // at least the beam thickness, or they visually merge.
    const ys = [...svg.matchAll(/y1="(-?[\d.]+)"/g)].map((m) => Number(m[1]));
    assert.equal(ys.length, 2);
    assert.ok(Math.abs(ys[0] - ys[1]) >= 0.5, 'beam centres must be at least one thickness apart');
  });

  test('a hook is drawn as a stub of its own, on the correct side of its stem', () => {
    const shape = NE.computeBeamShape([0, 0], [0, 10], 'up', 'flat', 3.5);
    const svg = NE.renderBeam(shape, {
      segments: [
        { level: 1, fromIndex: 0, toIndex: 1 },
        { level: 2, fromIndex: 1, toIndex: 1, hook: 'backward' },
      ],
      stemXs: [0, 10],
      thickness: 0.5,
      spacing: 0.25,
      color: '#000000',
    });
    const lines = [...svg.matchAll(/<line x1="([-\d.]+)" y1="[-\d.]+" x2="([-\d.]+)"/g)].map(
      (m) => [Number(m[1]), Number(m[2])],
    );
    assert.equal(lines.length, 2);
    assert.deepEqual(lines[0], [0, 10], 'the primary beam spans both stems');
    // The hook ends ON its own stem and runs back toward the previous one.
    assert.equal(lines[1][1], 10);
    assert.equal(lines[1][0], 10 - NE.BEAM_HOOK_LENGTH);
  });
});
