import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

/** Sandbox objects come from another realm, so their prototype differs; normalize before a strict deepEqual. */
const plain = (value) => JSON.parse(JSON.stringify(value));

describe('SoundFont track routing (pure decision)', () => {
  test('percussion always takes the GM percussion channel, whatever the file says', () => {
    const routing = NE.assignTrackRouting([{ id: 'P1', percussion: true, channel: 3 }]);
    assert.deepEqual(plain(routing.get('P1')), { channel: 9, program: 0 });
  });

  test("a pitched part honors the file's own channel, program and bank", () => {
    const routing = NE.assignTrackRouting([{ id: 'P1', channel: 4, program: 40, bank: 2 }]);
    assert.deepEqual(plain(routing.get('P1')), { channel: 4, program: 40, bank: 2 });
  });

  test('a pitched part with no channel takes the first free melodic channel, skipping percussion', () => {
    const routing = NE.assignTrackRouting([{ id: 'P1' }, { id: 'P2' }]);
    assert.equal(routing.get('P1').channel, 0);
    assert.equal(routing.get('P2').channel, 1);
  });

  test('two parts never share a channel: a taken preferred channel falls through to the next free one', () => {
    const routing = NE.assignTrackRouting([
      { id: 'P1', channel: 4 },
      { id: 'P2', channel: 4 },
    ]);
    assert.equal(routing.get('P1').channel, 4);
    assert.equal(routing.get('P2').channel, 0);
  });

  test('a percussion part does not consume a melodic channel, and a pitched part never lands on channel 9', () => {
    const routing = NE.assignTrackRouting([
      { id: 'Drums', percussion: true },
      { id: 'P1' },
      { id: 'P2', channel: 9 },
    ]);
    assert.equal(routing.get('Drums').channel, 9);
    assert.equal(routing.get('P1').channel, 0);
    assert.notEqual(routing.get('P2').channel, 9);
  });

  test('every track gets an entry, so no part is left unrouted', () => {
    const routing = NE.assignTrackRouting([{ id: 'A' }, { id: 'B', percussion: true }]);
    assert.equal(routing.size, 2);
    assert.ok(routing.has('A'));
    assert.ok(routing.has('B'));
  });
});
