import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEngine } from '../helpers/load-engine.js';
import { testDomParser } from '../helpers/dom.js';

const NE = loadEngine();
const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
  path.join(here, '..', 'fixtures', 'musicxml', '44130-drum-source.musicxml'),
  'utf8',
);
const domParser = testDomParser();
const parsed = NE.parseMusicXml(source, { domParser });

function hatInstrument(partId) {
  const instruments = parsed.midiInstrumentsByPart.get(partId);
  const match = Array.from(instruments.entries()).find(([, gmNote]) => gmNote === 42);
  assert.ok(match, `part ${partId} has a GM closed-hi-hat instrument`);
  return match[0];
}

function measureOf(score, partId, number) {
  const part = score.parts.find((candidate) => candidate.id === partId);
  assert.ok(part, `part ${partId} exists`);
  const measure = part.measures.find((candidate) => candidate.number === number);
  assert.ok(measure, `measure ${number} exists`);
  return measure;
}

function notesIn(measure) {
  return measure.voices.flatMap((voice) =>
    voice.events.flatMap((event) =>
      event.kind === 'note' ? [event] : event.kind === 'chord' ? event.notes : [],
    ),
  );
}

function countGmNotes(measure, partId, gmNote) {
  const instruments = parsed.midiInstrumentsByPart.get(partId);
  return notesIn(measure).filter(
    (note) => note.instrumentId !== undefined && instruments.get(note.instrumentId) === gmNote,
  ).length;
}

function primaryBeamLineCount(svg) {
  return (
    svg.match(
      /<line x1="[-\d.]+" y1="[-\d.]+" x2="[-\d.]+" y2="[-\d.]+" stroke="[^"]*" stroke-width="0\.5" \/>/g,
    ) ?? []
  ).length;
}

describe('engine-side closed-hi-hat eighth-pulse mode', () => {
  const partId = parsed.score.parts[0].id;
  const hatId = hatInstrument(partId);

  test('default and explicit as-written modes render identically', () => {
    const defaultRender = NE.renderParsedMusicXml(parsed);
    const explicitAsWritten = NE.renderParsedMusicXml(parsed, {
      config: { drums: { closedHiHatPulse: 'as-written' } },
    });
    assert.equal(defaultRender.svg, explicitAsWritten.svg);
  });

  test('opt-in creates two groups of four eighth-note hi-hats across the source score', () => {
    const normalized = NE.expandClosedHiHatQuarterNotesToEighthPulse(
      parsed.score,
      parsed.attributes,
      parsed.midiInstrumentsByPart,
    );

    for (let number = 1; number < 88; number += 1) {
      const measure = measureOf(normalized, partId, number);
      const pulseVoice = measure.voices.find((voice) => voice.id === 3);
      assert.ok(pulseVoice, `measure ${number} has a dedicated hi-hat voice`);
      const hats = pulseVoice.events.filter(
        (event) => event.kind === 'note' && event.instrumentId === hatId,
      );
      assert.equal(hats.length, 8, `measure ${number} has eight closed-hi-hat notes`);
      assert.deepEqual(
        Array.from(hats, (note) => note.startTick),
        [0, 240, 480, 720, 960, 1200, 1440, 1680],
      );
      assert.ok(hats.every((note) => note.duration.type === 'eighth' && note.duration.ticks === 240));
    }

    const overfull = measureOf(normalized, partId, 88);
    const finalPulse = overfull.voices.find((voice) => voice.id === 3);
    assert.ok(finalPulse);
    const finalHats = finalPulse.events.filter(
      (event) => event.kind === 'note' && event.instrumentId === hatId,
    );
    assert.equal(finalHats.length, 9, 'the source extra hit in measure 88 is retained');
    assert.deepEqual(
      Array.from(finalHats, (note) => note.startTick),
      [0, 240, 480, 720, 960, 1200, 1440, 1680, 1920],
    );
    assert.equal(finalHats[8].duration.type, 'quarter');
    assert.equal(finalHats[8].duration.ticks, 480);
  });

  test('render config activates the engine transform while preserving snare hits and source score', () => {
    const before = measureOf(parsed.score, partId, 2);
    const snareCountBefore = countGmNotes(before, partId, 38);
    const sourceChordCount = before.voices.flatMap((voice) => voice.events).filter(
      (event) => event.kind === 'chord',
    ).length;

    const asWritten = NE.renderParsedMusicXml(parsed);
    const rendered = NE.renderParsedMusicXml(parsed, {
      config: { drums: { closedHiHatPulse: 'quarter-to-eighths' } },
    });

    assert.ok(
      primaryBeamLineCount(rendered.svg) > primaryBeamLineCount(asWritten.svg),
      'the engine option adds the connected eighth-note hi-hat beams to the actual render',
    );
    assert.equal(countGmNotes(measureOf(parsed.score, partId, 2), partId, 38), snareCountBefore);
    assert.equal(
      measureOf(parsed.score, partId, 2).voices.flatMap((voice) => voice.events).filter(
        (event) => event.kind === 'chord',
      ).length,
      sourceChordCount,
      'rendering does not mutate the originally parsed MusicXML score',
    );
  });
});
