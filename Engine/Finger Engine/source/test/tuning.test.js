// Plan Part 02/03. Phase 0 is "done when the string-numbering
// conversions (IN-X03, IN-E04) are unit-tested" -- this file is that.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/finger-engine.js', import.meta.url), 'utf8'), sandbox);
const E = sandbox.FingerEngine;

const guitar = E.defaultInstrument();

test('[DM-01] string 1 is the LOW E, and standard tuning is the plan’s', () => {
  assert.equal(E.STANDARD_TUNING.join(','), '40,45,50,55,59,64');
  assert.equal(E.openPitch(guitar, 1), 40, 'string 1 = E2');
  assert.equal(E.openPitch(guitar, 6), 64, 'string 6 = E4');
});

test('[IN-X03] MusicXML numbers strings the other way round', () => {
  // MusicXML's string 1 is the thin E; ours is the thick one. Every
  // pair below is the same physical string.
  const pairs = [
    [1, 6],
    [2, 5],
    [3, 4],
    [4, 3],
    [5, 2],
    [6, 1],
  ];
  for (const [xml, internal] of pairs) {
    assert.equal(E.musicXmlStringToInternal(xml, 6), internal, `xml ${xml}`);
    assert.equal(E.internalStringToMusicXml(internal, 6), xml, `internal ${internal}`);
  }
  // The conversion is its own inverse, and knows how many strings there are.
  assert.equal(E.musicXmlStringToInternal(1, 7), 7, 'a seven-string');
  assert.equal(E.musicXmlStringToInternal(7, 7), 1);
});

test('[IN-X03] a tab staff’s line 1 is the lowest string, which is ours', () => {
  // <staff-tuning line="1"> describes the BOTTOM line of the tab
  // staff, which carries the lowest string -- the same end we count
  // from, so this conversion is the identity and is written down
  // rather than assumed.
  for (const line of [1, 2, 3, 4, 5, 6]) {
    assert.equal(E.staffTuningLineToInternal(line), line);
  }
});

test('[IN-E04] the Notation Engine’s numbering is MusicXML’s', () => {
  // Checked in Phase 0 by reading the engine's parser: it stores
  // <string> exactly as written. So the adapter converts the same way
  // -- and if that ever changes, this test fails first.
  for (const xml of [1, 2, 3, 4, 5, 6]) {
    assert.equal(
      E.notationEngineStringToInternal(xml, 6),
      E.musicXmlStringToInternal(xml, 6),
      `notation string ${xml}`,
    );
  }
});

test('[OUT-05] the renderer draws string 1 at the top and means the thin one', () => {
  // The SVG fretboard numbers strings the way tab does. The timeline
  // does not, so the conversion belongs here rather than in the page.
  assert.equal(E.internalStringToRenderer(1, 6), 6, 'our low E is the renderer’s string 6');
  assert.equal(E.internalStringToRenderer(6, 6), 1, 'our high E is its string 1');
  for (let s = 1; s <= 6; s++) {
    assert.equal(E.internalStringToRenderer(E.internalStringToRenderer(s, 6), 6), s, 'round trip');
  }
});

test('[V-01] a string and a fret sound one pitch, and only one', () => {
  assert.equal(E.pitchAt(guitar, 1, 0), 40, 'open low E');
  assert.equal(E.pitchAt(guitar, 1, 5), 45, 'fifth fret of the low E is the A string’s pitch');
  assert.equal(E.pitchAt(guitar, 6, 12), 76, 'twelfth fret of the high E');
  assert.equal(E.pitchAt(guitar, 9, 0), undefined, 'a string this guitar does not have');
});

test('the same note in several places is the whole problem', () => {
  // Middle C on a guitar: five different places, which is why the
  // engine exists at all.
  const places = E.placementsForPitch(guitar, 60);
  assert.equal(places.map((p) => `${p.string}/${p.fret}`).join(' '), '1/20 2/15 3/10 4/5 5/1');
  // A capo takes the ones behind it away.
  const capoed = E.placementsForPitch({ ...guitar, capo: 5 }, 60);
  assert.equal(capoed.map((p) => `${p.string}/${p.fret}`).join(' '), '1/20 2/15 3/10 4/5');
  // And nothing outside the neck is offered.
  assert.equal(E.placementsForPitch(guitar, 20).length, 0, 'below the instrument');
  assert.equal(E.placementsForPitch(guitar, 120).length, 0, 'above it');
});

test('[IN-N] the instrument knows its own range', () => {
  const range = E.pitchRange(guitar);
  assert.equal(range.lowest, 40);
  assert.equal(range.highest, 64 + 22);
  assert.equal(E.pitchRange({ ...guitar, capo: 2 }).lowest, 42, 'a capo raises the floor');
});

test('the tuning presets are real tunings', () => {
  assert.equal(E.TUNING_PRESETS.standard.join(','), E.STANDARD_TUNING.join(','));
  assert.equal(E.TUNING_PRESETS.dropD[0], 38, 'drop D drops the sixth string a tone');
  assert.equal(E.TUNING_PRESETS.dropD.slice(1).join(','), E.STANDARD_TUNING.slice(1).join(','));
  assert.equal(E.TUNING_PRESETS.sevenString.length, 7);
  for (const [name, tuning] of Object.entries(E.TUNING_PRESETS)) {
    for (let i = 1; i < tuning.length; i++) {
      assert.ok(tuning[i] > tuning[i - 1], `${name} runs low to high [DM-01]`);
    }
  }
});
