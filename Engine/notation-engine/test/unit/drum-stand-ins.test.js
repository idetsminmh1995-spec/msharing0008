import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();

/** The toms, lowest to highest. */
const TOMS = [41, 43, 45, 47, 48, 50];
const KICKS = [35, 36];
const SNARES = [38, 40];
const HIHAT = [42, 44, 46];
const RIDES = [51, 53, 59];
const CRASHES = [49, 52, 55, 57];

const FAMILY = new Map();
for (const [name, members] of [
  ['kick', KICKS],
  ['snare', [...SNARES, 37]],
  ['tom', TOMS],
  ['hi-hat', HIHAT],
  ['ride', RIDES],
  ['crash', CRASHES],
]) {
  for (const note of members) FAMILY.set(note, name);
}

describe('a kit that has the written drum always uses it', () => {
  test('the written drum is first in the order, every time', () => {
    for (let note = 35; note <= 81; note++) {
      assert.equal(NE.drumChoiceOrder(note)[0], note, `drum ${note}`);
    }
  });

  test('a stand-in list never contains the drum it stands in for', () => {
    for (let note = 35; note <= 81; note++) {
      assert.ok(!NE.drumStandIns(note).includes(note), `drum ${note} stands in for itself`);
    }
  });

  test('a full kit never reaches for a stand-in at all', () => {
    const everything = new Set(Array.from({ length: 47 }, (_, i) => 35 + i));
    for (const note of everything) {
      assert.equal(NE.drumToLight(note, everything), note, `drum ${note}`);
    }
  });
});

describe('a stand-in is always something a player could actually hit instead', () => {
  test('nothing ever stands in for a drum of another family', () => {
    for (const [note, family] of FAMILY) {
      for (const standIn of NE.drumStandIns(note)) {
        assert.equal(
          FAMILY.get(standIn),
          family,
          `${note} (${family}) would light ${standIn} (${FAMILY.get(standIn) ?? 'unknown'})`,
        );
      }
    }
  });

  test('a sound with no near neighbour on a kit has no stand-in, rather than a wrong one', () => {
    // A tambourine, a cowbell, a hand clap. Lighting a snare for one of
    // these would be inventing a performance.
    for (const note of [39, 54, 56]) {
      assert.deepEqual([...NE.drumStandIns(note)], [], `drum ${note}`);
    }
  });

  test('every stand-in is a drum MuseScore itself defines', () => {
    for (let note = 35; note <= 81; note++) {
      for (const standIn of NE.drumStandIns(note)) {
        assert.ok(
          NE.DEFAULT_DRUM_MAPPING_TABLE[standIn],
          `${note} names ${standIn}, which is not in the kit at all`,
        );
      }
    }
  });
});

describe("the owner's case: a five-tom chart on a kit with two toms", () => {
  // A rack tom and a floor tom, which is what a small kit is.
  const twoToms = new Set([36, 38, 42, 48, 43, 49, 51]);

  test('each written tom lights the nearer of the two, not the same one every time', () => {
    const lit = TOMS.map((note) => NE.drumToLight(note, twoToms));
    assert.deepEqual(lit, [
      43, // 41 low floor  -> the floor tom
      43, // 43 high floor -> itself
      43, // 45 low        -> the floor tom
      48, // 47 low-mid    -> the rack tom
      48, // 48 hi-mid     -> itself
      48, // 50 high       -> the rack tom
    ]);
    assert.equal(new Set(lit).size, 2, 'both toms should be used, not just one');
  });

  test('a one-tom kit lights that tom for every written tom, and none goes dark', () => {
    const oneTom = new Set([36, 38, 42, 45]);
    for (const note of TOMS) {
      assert.equal(NE.drumToLight(note, oneTom), 45, `written tom ${note}`);
    }
  });

  test('and the toms a FIVE-tom kit does have are still its own', () => {
    const fiveToms = new Set([36, 38, 42, 41, 45, 47, 48, 50]);
    assert.equal(NE.drumToLight(43, fiveToms), 41, 'the one it lacks reaches for its neighbour');
    for (const note of [41, 45, 47, 48, 50]) {
      assert.equal(NE.drumToLight(note, fiveToms), note);
    }
  });
});

describe('the rest of the kit', () => {
  test('a kit with one kick lights it whichever number was written', () => {
    assert.equal(NE.drumToLight(35, new Set([36])), 36);
    assert.equal(NE.drumToLight(36, new Set([35])), 35);
    // And a kit with BOTH keeps them apart, which is the whole reason
    // the written drum wins first.
    assert.equal(NE.drumToLight(35, new Set([35, 36])), 35);
    assert.equal(NE.drumToLight(36, new Set([35, 36])), 36);
  });

  test('a side stick lights the snare, because that is the drum it is played on', () => {
    assert.equal(NE.drumToLight(37, new Set([38, 42, 36])), 38);
    assert.equal(NE.drumToLight(37, new Set([40, 42, 36])), 40);
  });

  test('a ride bell lights the ride, and a second ride the first', () => {
    assert.equal(NE.drumToLight(53, new Set([51])), 51);
    assert.equal(NE.drumToLight(59, new Set([51])), 51);
  });

  test('an open or pedal hi-hat lights the closed one before anything else', () => {
    assert.equal(NE.drumToLight(46, new Set([42, 44])), 42);
    assert.equal(NE.drumToLight(44, new Set([42, 46])), 42);
  });

  test('a china or a splash lights a crash, never a tom', () => {
    assert.equal(NE.drumToLight(52, new Set([49, 48])), 49);
    assert.equal(NE.drumToLight(55, new Set([57, 41])), 57);
  });

  test('a kit with nothing near enough lights nothing, and says so by returning undefined', () => {
    assert.equal(NE.drumToLight(50, new Set([36, 38, 42])), undefined);
    assert.equal(NE.drumToLight(54, new Set([36, 38, 42])), undefined);
  });
});

describe("the owner's own file, against a two-tom kit", () => {
  // Every MIDI number M_Sharing_Drum_Notes.musicxml actually plays.
  const WRITTEN = [35, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 54, 56, 57, 59];

  test('a small kit still lights almost all of it', () => {
    const kit = new Set([36, 38, 42, 44, 48, 43, 49, 51]);
    const dark = WRITTEN.filter((note) => NE.drumToLight(note, kit) === undefined);
    // Only the tambourine and the cowbell, which have no stand-in on
    // purpose -- every drum and cymbal in the file finds something.
    assert.deepEqual(dark, [54, 56]);
  });

  test('without stand-ins that same kit would leave half the file dark', () => {
    const kit = new Set([36, 38, 42, 44, 48, 43, 49, 51]);
    const dark = WRITTEN.filter((note) => !kit.has(note));
    assert.equal(dark.length, 12);
  });
});
