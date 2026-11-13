import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

describe('multi-voice per staff (Phase 25)', () => {
  test('voiceForcedDirection: odd voices always up, even voices always down', () => {
    assert.equal(NE.voiceForcedDirection(1), 'up');
    assert.equal(NE.voiceForcedDirection(2), 'down');
    assert.equal(NE.voiceForcedDirection(3), 'up');
    assert.equal(NE.voiceForcedDirection(4), 'down');
  });

  test('voiceForcedDirection ignores note position entirely -- it is purely voice identity', () => {
    // Same function signature regardless of any note data; confirmed by
    // simply calling it with only a voice id, no position parameter exists.
    assert.equal(NE.voiceForcedDirection(1), 'up');
  });

  test('voiceRestOffset: upper (odd) voice shifts up, lower (even) voice shifts down, landing 2 staff-spaces apart at the shared default', () => {
    const upperOffset = NE.voiceRestOffset(1);
    const lowerOffset = NE.voiceRestOffset(2);
    assert.equal(upperOffset, -1);
    assert.equal(lowerOffset, 1);
    assert.equal(Math.abs(upperOffset - lowerOffset), 2);
  });

  test('two voices\' rests actually land 2sp apart via Phase 18\'s restY, not just the offsets in isolation', () => {
    const numLines = 5;
    const upperY = NE.restY('quarter', numLines, NE.voiceRestOffset(1));
    const lowerY = NE.restY('quarter', numLines, NE.voiceRestOffset(2));
    assert.equal(Math.abs(upperY - lowerY), 2);
  });

  test('resolveNoteheadCollision: notes 0.5sp apart (adjacent line/space) collide -- higher voice number moves', () => {
    const r = NE.resolveNoteheadCollision(0, 1, 0.5, 2, 1.2);
    assert.equal(r.offsetA, 0);
    assert.equal(r.offsetB, 1.2);
  });

  test('resolveNoteheadCollision: a unison (identical position) also collides', () => {
    const r = NE.resolveNoteheadCollision(-2, 1, -2, 2, 1.2);
    assert.notEqual(r.offsetA, r.offsetB);
  });

  test('resolveNoteheadCollision: notes 2sp apart do not collide -- neither moves', () => {
    const r = NE.resolveNoteheadCollision(0, 1, -2, 2, 1.2);
    assert.equal(r.offsetA, 0);
    assert.equal(r.offsetB, 0);
  });

  test('resolveNoteheadCollision: exactly at the threshold (1.0sp) does NOT collide -- the rule is strictly less-than', () => {
    const r = NE.resolveNoteheadCollision(0, 1, 1.0, 2, 1.2);
    assert.equal(r.offsetA, 0);
    assert.equal(r.offsetB, 0);
  });

  test('resolveNoteheadCollision: the higher voice number always moves, regardless of argument order', () => {
    const r1 = NE.resolveNoteheadCollision(0, 1, 0.2, 3, 1.2); // voice 1 first, voice 3 second
    const r2 = NE.resolveNoteheadCollision(0.2, 3, 0, 1, 1.2); // voice 3 first, voice 1 second
    assert.equal(r1.offsetB, 1.2); // voice 3 (arg B) moves
    assert.equal(r1.offsetA, 0);
    assert.equal(r2.offsetA, 1.2); // voice 3 (arg A) moves
    assert.equal(r2.offsetB, 0);
  });
});
