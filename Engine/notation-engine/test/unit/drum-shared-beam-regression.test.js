import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, '..', 'fixtures', 'musicxml', '44130-drum-source.musicxml');
const NE = loadEngine();
const domParser = testDomParser();

function notesIn(score) {
  return score.parts.flatMap((part) =>
    part.measures.flatMap((measure) =>
      measure.voices.flatMap((voice) =>
        voice.events.flatMap((event) =>
          event.kind === 'note' ? [event] : event.kind === 'chord' ? event.notes : [],
        ),
      ),
    ),
  );
}

const glyphCount = (svg, name) => svg.split(NE.getGlyph(name).char).length - 1;

describe('44130 mixed shared/local drum beams preserve every notehead', () => {
  test('renders every parsed snare and hi-hat head, including local chords after shared attacks', () => {
    const xml = fs.readFileSync(fixture, 'utf8');
    const parsed = NE.parseMusicXml(xml, { domParser });
    const sourceNotes = notesIn(parsed.score);
    const result = NE.renderParsedMusicXml(parsed);
    const xHeads = sourceNotes.filter((note) => note.explicitNotehead === 'x').length;
    const normalHeads = sourceNotes.length - xHeads;

    assert.equal(sourceNotes.length, 794, 'all source notes are retained by MusicXML parsing');
    assert.equal(xHeads, 353, 'all explicit hi-hat X heads are counted');
    assert.equal(normalHeads, 441, 'all remaining drum heads, including snares, are counted');
    assert.equal(glyphCount(result.svg, 'noteheadXBlack'), xHeads);
    assert.equal(glyphCount(result.svg, 'noteheadBlack'), normalHeads);

    // The source has two intentionally overfull events in measure 88. They
    // must remain warnings, not a reason to drop any of the measure's notes.
    assert.equal(
      result.diagnostics.filter((diagnostic) => diagnostic.code === 'MEASURE_OVERRUN').length,
      2,
    );
  });

  test('keeps each continuous four-beat drum groove in one beam group per measure', () => {
    const xml = fs.readFileSync(fixture, 'utf8');
    const parsed = NE.parseMusicXml(xml, { domParser });
    const result = NE.renderParsedMusicXml(parsed);
    const primaryBeamLines = [
      ...result.svg.matchAll(
        /<line x1="[-\d.]+" y1="[-\d.]+" x2="[-\d.]+" y2="[-\d.]+" stroke="[^"]*" stroke-width="0\.5" \/>/g,
      ),
    ];

    assert.equal(parsed.score.parts[0].measures.length, 88);
    assert.equal(
      primaryBeamLines.length,
      parsed.score.parts[0].measures.length,
      'shared and voice-local drum attacks must not split one continuous bar into partial beams',
    );
    assert.ok(result.svg.includes('data-id="P1#m5#v1#e1"'));
    assert.ok(result.svg.includes('data-id="P1#m5#v1#e3"'));
  });
});
