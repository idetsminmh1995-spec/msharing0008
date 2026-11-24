import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/video-engine.js', import.meta.url), 'utf8');

function loadEngine() {
  const window = {};
  const context = vm.createContext({
    window,
    document: { createElement: () => ({ getContext: () => ({}), captureStream: () => ({ getTracks: () => [] }) }) },
    navigator: { deviceMemory: 8 },
    Blob,
    Uint8Array,
    Float32Array,
    DataView,
    TextEncoder,
    TextDecoder,
    DOMException,
    performance,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    console,
    Math,
    Number,
    Array,
    Object,
    Set,
    Map,
    Promise,
    Error,
    TypeError,
    RangeError,
  });
  vm.runInContext(source, context, { filename: 'video-engine.js' });
  return window.VideoEngine;
}

const segment = (seconds, name) => ({ seconds, draw: async () => name });

test('segments start where the previous one ended, in whole frames', () => {
  const { timelinePlan } = loadEngine();
  // 1/3 of a second is ten frames at 30 fps; 1/7 is four and a bit. Rounding
  // each segment on its own would leave a gap between them.
  const plan = timelinePlan([segment(1 / 3, 'a'), segment(1 / 7, 'b'), segment(0.5, 'c')], 30);
  assert.equal(plan.fps, 30);
  // The engine runs in its own VM realm, so its arrays are spread into this
  // one before comparison.
  assert.deepEqual([...plan.segments.map((entry) => entry.startFrame)], [0, 10, 14]);
  assert.deepEqual([...plan.segments.map((entry) => entry.frames)], [10, 4, 15]);
  assert.equal(plan.frames, 29);
});

test('the plan covers the whole timeline with no gap and no overlap', () => {
  const { timelinePlan } = loadEngine();
  const plan = timelinePlan([segment(2, 'count-in'), segment(4.37, 'score'), segment(1.93, 'thanks')], 30);
  let expected = 0;
  for (const entry of plan.segments) {
    assert.equal(entry.startFrame, expected, `${entry.segment.seconds}s segment does not start where the last ended`);
    expected += entry.frames;
  }
  assert.equal(expected, plan.frames);
  assert.ok(Math.abs(plan.seconds - (2 + 4.37 + 1.93)) < 1 / 30, 'the plan lost time');
});

test('a time inside a segment maps to that segment and its own frame clock', () => {
  const { timelinePlan, frameAt } = loadEngine();
  const plan = timelinePlan([segment(2, 'count-in'), segment(4, 'score')], 30);

  const first = frameAt(plan, 0);
  assert.equal(first.segment.seconds, 2);
  assert.equal(first.at, 0);
  assert.equal(first.frame, 0);

  // 2.5 s is half a second into the score, which starts at frame 60.
  const inside = frameAt(plan, 2.5);
  assert.equal(inside.segment.seconds, 4);
  assert.equal(inside.frame, 75);
  assert.equal(inside.at, 0.5);

  // The boundary belongs to the second segment: frame 60 is its frame 0.
  const boundary = frameAt(plan, 2);
  assert.equal(boundary.segment.seconds, 4);
  assert.equal(boundary.at, 0);
});

test('a time past the end holds the last frame instead of running off', () => {
  const { timelinePlan, frameAt } = loadEngine();
  const plan = timelinePlan([segment(1, 'only')], 30);
  const last = frameAt(plan, 99);
  assert.equal(last.segment.seconds, 1);
  assert.equal(last.frame, plan.frames - 1);
  assert.equal(last.at, (plan.frames - 1) / 30);

  const negative = frameAt(plan, -5);
  assert.equal(negative.frame, 0);
  assert.equal(negative.at, 0);
});

test('the frame a preview asks for is drawn by the segment that owns it', async () => {
  const { timelinePlan, drawFrameAt } = loadEngine();
  const drawn = [];
  const plan = timelinePlan([
    { seconds: 1, draw: async (ctx, at) => drawn.push(['count', at]) },
    { seconds: 1, draw: async (ctx, at) => drawn.push(['score', at]) },
  ], 30);

  await drawFrameAt({}, plan, 1.5);
  assert.deepEqual([...drawn], [['score', 0.5]]);
});

test('a timeline with no drawable segment is refused rather than shown blank', () => {
  const { timelinePlan } = loadEngine();
  assert.throws(() => timelinePlan([], 30), TypeError);
  assert.throws(() => timelinePlan([{ seconds: 1 }], 30), TypeError);
  assert.throws(() => timelinePlan([segment(1, 'a')], 0), RangeError);
});
