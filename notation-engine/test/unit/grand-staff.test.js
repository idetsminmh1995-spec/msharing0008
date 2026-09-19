import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'musicxml');

const NE = loadEngine();
const domParser = testDomParser();

function load(name) {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

describe('grand staff parsing (Integration A)', () => {
  test('<staves> is read, and BOTH clefs are captured per staff -- not just the first', () => {
    const { attributes } = NE.parseMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    const attrs = attributes[0];
    assert.equal(attrs.staves, 2);
    assert.equal(attrs.clefsByStaff[1].sign, 'G');
    assert.equal(attrs.clefsByStaff[2].sign, 'F');
    assert.equal(attrs.clefsByStaff[2].line, 4);
  });

  test("staff 1's clef stays mirrored onto clefSign/clefLine, so every pre-Integration-A caller is unaffected", () => {
    const { attributes } = NE.parseMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    assert.equal(attributes[0].clefSign, 'G');
    assert.equal(attributes[0].clefLine, 2);
  });

  test('a single-staff file still reports staves=1 and one clef', () => {
    const { attributes } = NE.parseMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.equal(attributes[0].staves, 1);
    assert.equal(attributes[0].clefsByStaff[1].sign, 'G');
  });

  test('each note keeps its own <staff> number', () => {
    const { score } = NE.parseMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    const events = score.parts[0].measures[0].voices.flatMap((v) => [...v.events]);
    const staves = new Set(events.map((e) => e.staff));
    assert.ok(staves.has(1));
    assert.ok(staves.has(2));
  });
});

describe('grand staff rendering (Integration A)', () => {
  function renderPiano() {
    return NE.renderFromMusicXml(load('piano-grand-staff.musicxml'), { domParser });
  }

  test('renders with no diagnostics', () => {
    assert.deepEqual([...renderPiano().diagnostics], []);
  });

  test('draws TWO five-line staves, not one', () => {
    const { svg } = renderPiano();
    const staffLines = svg.match(/stroke-width="0\.13"/g) ?? [];
    assert.equal(staffLines.length, 10);
  });

  test('draws BOTH a treble and a bass clef', () => {
    const { svg } = renderPiano();
    assert.match(svg, /\uE050/); // gClef
    assert.match(svg, /\uE062/); // fClef
  });

  test('draws a brace joining the two staves (§9.18: one instrument, multiple staves)', () => {
    const { svg } = renderPiano();
    assert.match(svg, /\uE000/); // brace
  });

  test('the brace spans the two staves rather than sitting above them', () => {
    const { svg } = renderPiano();
    // Bravura's brace grows UPWARD from its own origin (bBoxSW y = 0,
    // bBoxNE y = 3.988), so the glyph must be anchored at the BOTTOM
    // staff's bottom line and scaled up from there. Anchoring it at the
    // top -- which this engine did until Phase 52 read back an exported
    // PDF and saw it -- puts the whole brace above the music.
    const m = /<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(1 ([\d.]+)\)"><text[^>]*>\uE000</.exec(svg);
    assert.ok(m !== null, 'the brace is drawn with a scale transform');
    const originY = Number(m[2]);
    const scaleY = Number(m[3]);
    const nominal = NE.getGlyph('brace').bBox.bBoxNE[1] - NE.getGlyph('brace').bBox.bBoxSW[1];
    const top = originY - nominal * scaleY;

    // The staff lines this render actually drew, so the assertion is
    // against the real geometry rather than a remembered constant.
    const staffLineYs = [
      ...new Set(
        [...svg.matchAll(/<line x1="[\d.]+" y1="([\d.]+)"[^>]*stroke-width="0\.13"/g)].map((x) =>
          Number(x[1]),
        ),
      ),
    ].sort((a, b) => a - b);
    const topLine = staffLineYs[0];
    const bottomLine = staffLineYs[staffLineYs.length - 1];
    assert.ok(Math.abs(top - topLine) < 1e-6, `brace top ${top} vs top staff line ${topLine}`);
    assert.ok(
      Math.abs(originY - bottomLine) < 1e-6,
      `brace bottom ${originY} vs bottom staff line ${bottomLine}`,
    );
  });

  test('a single-staff file draws NO brace', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    assert.doesNotMatch(svg, /\uE000/);
  });

  test('the viewBox grows tall enough to contain the second staff', () => {
    const { svg } = renderPiano();
    const m = svg.match(/viewBox="0 0 [\d.]+ ([\d.]+)"/);
    assert.ok(Number(m[1]) > 16, `expected a taller viewBox, got ${m?.[1]}`);
  });

  test('bass-staff notes render on the BASS staff, not as ledger-line notes on the treble staff', () => {
    const { svg } = renderPiano();
    // C3 on a bass staff sits inside the staff (no ledger lines). Before
    // this fix it landed far below a treble staff, generating a stack of
    // ledger lines -- the exact symptom this phase set out to remove.
    // Ledger lines are HORIZONTAL (y1 === y2); a barline shares the same
    // 0.16 thickness but is vertical, so match on shape, not thickness.
    const horizontal016 = [
      ...svg.matchAll(/<line x1="[\d.]+" y1="([\d.]+)" x2="[\d.]+" y2="([\d.]+)" stroke="#000000" stroke-width="0\.16"/g),
    ].filter((m) => m[1] === m[2]);
    assert.equal(horizontal016.length, 0);
  });

  test('ONE continuous barline runs through both staves and the gap between them (§9.18)', () => {
    const { svg } = renderPiano();
    const verticals = [
      ...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="\1" y2="([\d.]+)" stroke="#000000" stroke-width="0\.16"/g),
    ];
    assert.equal(verticals.length, 1, 'expected exactly one barline, not one per staff');
    const [, , yA, yB] = verticals[0];
    const top = Math.min(Number(yA), Number(yB));
    const bottom = Math.max(Number(yA), Number(yB));
    // Must reach from the top staff's top line (y=4) to the bottom
    // staff's bottom line (y=16) -- i.e. through the gap, not stopping
    // at the first staff.
    assert.equal(top, 4);
    assert.equal(bottom, 16);
  });

  test('every note of a staff renders only once, on its own staff', () => {
    const { svg } = renderPiano();
    // 3 treble notes + 2 bass notes = 5 noteheads total, no duplicates
    // from the staff loop running twice.
    const noteheads = svg.match(/[\uE0A2\uE0A3\uE0A4]/g) ?? [];
    assert.equal(noteheads.length, 5);
  });
});

describe('clef glyph placement (Integration A bug fix)', () => {
  test('a treble clef sits on the G line (one space above the bottom line), not on the bottom line', () => {
    const { svg } = NE.renderFromMusicXml(load('simple-single-voice.musicxml'), { domParser });
    // Staff bottom is y=8; the G line is y=7.
    assert.match(svg, /x="0\.5" y="7"[^>]*>\uE050/);
  });

  test('a bass clef sits on the F line (three spaces above its own bottom line)', () => {
    const { svg } = NE.renderFromMusicXml(load('piano-grand-staff.musicxml'), { domParser });
    // The second staff's bottom is y=16; its F line is y=13.
    assert.match(svg, /x="0\.5" y="13"[^>]*>\uE062/);
  });

  test('a percussion clef is centred on the middle line, per its own symmetric SMuFL bounding box', () => {
    const { svg } = NE.renderFromMusicXml(load('gm-drum-mapping.musicxml'), { domParser });
    // Staff bottom is y=8; the middle line is y=6.
    assert.match(svg, /x="0\.5" y="6"[^>]*>\uE069/);
  });

  test('every clef definition carries an explicit glyphY, and it only differs from referenceY for percussion', () => {
    assert.equal(NE.TREBLE_CLEF.glyphY, NE.TREBLE_CLEF.referenceY);
    assert.equal(NE.BASS_CLEF.glyphY, NE.BASS_CLEF.referenceY);
    assert.equal(NE.ALTO_CLEF.glyphY, NE.ALTO_CLEF.referenceY);
    // Percussion deliberately diverges: referenceY borrows treble's line
    // for pitch mapping, but the glyph belongs on the middle line.
    assert.equal(NE.PERCUSSION_CLEF.referenceY, -1);
    assert.equal(NE.PERCUSSION_CLEF.glyphY, -2);
  });
});
