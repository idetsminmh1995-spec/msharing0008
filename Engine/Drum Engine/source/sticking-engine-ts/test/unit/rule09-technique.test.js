import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const SE = loadEngine();
const style = SE.drummerStyle();

function rimEvent(velocity) {
  return {
    eventId: 'rim-test',
    sourceId: 'source-rim-test',
    timeSeconds: 0,
    instrument: 'snare_rim',
    target: SE.target('snare_rim', 0, 0),
    velocity,
    isPlayable: true,
    mappingNotes: '',
  };
}

describe('Rule 09 SNARE_RIM technique', () => {
  test('accent-level SNARE_RIM selects a rim shot', () => {
    const plan = SE.selectTechnique(rimEvent(100), 'RH', style, undefined);
    assert.equal(plan.strokeType, 'rim_shot');
  });

  test('below the accent threshold remains an ordinary single', () => {
    const plan = SE.selectTechnique(rimEvent(90), 'RH', style, undefined);
    assert.equal(plan.strokeType, 'single');
  });
});
