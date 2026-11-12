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
});
