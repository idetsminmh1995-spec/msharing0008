import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { loadEngine } from './helper.js';

const E = loadEngine();
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !== ${b}`);

describe('the one clock', () => {
  test('a frame is the START of its interval, which is where every other clock points', () => {
    near(E.frameTimeMs(0, 60), 0);
    near(E.frameTimeMs(60, 60), 1000);
    near(E.frameTimeMs(1, 30), 1000 / 30);
  });

  test('frame times are deterministic: the same render twice is the same render', () => {
    const a = E.frameTimes({ fps: 30, durationMs: 1000 });
    const b = E.frameTimes({ fps: 30, durationMs: 1000 });
    assert.equal(a.length, 30);
    assert.deepEqual([...a], [...b]);
  });

  test('every supported frame rate covers the whole performance', () => {
    for (const fps of [24, 25, 30, 50, 60]) {
      const times = E.frameTimes({ fps, durationMs: 2500 });
      assert.equal(times.length, Math.ceil((2500 / 1000) * fps), `${fps}fps`);
      assert.ok(times[times.length - 1] < 2500, `${fps}fps overruns the content`);
    }
  });

  test('a note sounds from its onset up to but not including its end', () => {
    const note = { timeMs: 100, durationMs: 50 };
    assert.equal(E.isSoundingAt(note, 99), false);
    assert.equal(E.isSoundingAt(note, 100), true, 'the onset itself is sounding');
    assert.equal(E.isSoundingAt(note, 149), true);
    assert.equal(E.isSoundingAt(note, 150), false, 'and the end is not');
  });

  test('the cursor finds everything held at an instant, not only what just started', () => {
    const events = [
      { id: 'pedal', timeMs: 0, durationMs: 4000 },
      { id: 'a', timeMs: 1000, durationMs: 100 },
      { id: 'b', timeMs: 1050, durationMs: 100 },
    ];
    const cursor = new E.TimelineCursor(events);
    const at = (t) => cursor.soundingAt(t).map((e) => String(e.id));
    assert.deepEqual([...at(1060)], ['pedal', 'a', 'b']);
    assert.deepEqual([...at(1120)], ['pedal', 'b']);
    assert.deepEqual([...at(3000)], ['pedal']);
  });

  test('the cursor survives a seek backwards', () => {
    const events = [
      { timeMs: 0, durationMs: 100 },
      { timeMs: 1000, durationMs: 100 },
    ];
    const cursor = new E.TimelineCursor(events);
    assert.equal(cursor.soundingAt(1050).length, 1);
    assert.equal(cursor.soundingAt(50).length, 1, 'scrubbing back finds the earlier note again');
  });

  test('looking ahead finds the next onset, which is what anticipation needs', () => {
    const events = [
      { id: 'a', timeMs: 100, durationMs: 50 },
      { id: 'b', timeMs: 400, durationMs: 50 },
    ];
    assert.equal(String(E.nextAfter(events, 0).id), 'a');
    assert.equal(String(E.nextAfter(events, 150).id), 'b');
    assert.equal(E.nextAfter(events, 500), undefined);
  });
});
