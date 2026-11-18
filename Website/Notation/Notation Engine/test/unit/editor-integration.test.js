import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoDir = path.resolve(packageDir, '..', '..');
const appDir = path.join(repoDir, 'Website');

/**
 * The Notation Lab editor's own scripts, run against the built engine.
 *
 * The engine ships standalone and the editor is the one host in this
 * repo. `notation-doc.js` owns the edit commands and the MusicXML
 * writer; `notation-editor.js` owns the toolbar and the render loop.
 * Both talk to the engine through `window.NotationEngine` and nothing
 * else, so this test loads them the way the page does -- into a browser
 * window -- and drives the round trip the page drives: a score is
 * parsed, edited, serialized back to MusicXML, re-parsed, and rendered
 * again. A break in any link of that chain is a broken editor.
 */
function loadEditor() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
  });
  const { window } = dom;
  // Run each file the way a <script> tag does -- as a top-level Script in
  // the page's own realm -- rather than through `window.eval`. The engine
  // bundle opens with "use strict", and a strict eval scopes its `var
  // NotationEngine` to the eval itself, so nothing would reach the global.
  const context = dom.getInternalVMContext();
  vm.runInContext(
    fs.readFileSync(path.join(packageDir, 'dist', 'notation-engine.js'), 'utf8'),
    context,
  );
  vm.runInContext(fs.readFileSync(path.join(appDir, 'notation-doc.js'), 'utf8'), context);
  return { window, engine: window.NotationEngine, doc: window.NotationDoc };
}

const STARTER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Untitled score</work-title></work>
  <part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef>
      </attributes>
      <note><rest measure="yes"/><duration>16</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><rest measure="yes"/><duration>16</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;

/**
 * The real `notation-editor.html`, with its own scripts run against the
 * built engine. This is the whole page, toolbar and all: it exercises the
 * editor's startup path -- `restoreHandoff`, the starter score, the first
 * render -- which the doc-layer tests above never touch. jsdom cannot run
 * `requestAnimationFrame` on its own, so the page is opened with the
 * `?intent=create` handoff, whose `loadXml` renders synchronously.
 */
function loadEditorPage() {
  const html = fs.readFileSync(path.join(appDir, 'notation-editor.html'), 'utf8');
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    virtualConsole,
    url: 'https://example.test/notation-editor.html?intent=create',
  });
  const { window } = dom;
  const context = dom.getInternalVMContext();
  for (const rel of ['assets/notation-engine.js', 'notation-doc.js', 'notation-editor.js']) {
    vm.runInContext(fs.readFileSync(path.join(appDir, rel), 'utf8'), context, { filename: rel });
  }
  return { window, errors };
}

describe('the editor and the engine agree, end to end', () => {
  test('the page scripts load and expose exactly what the editor expects', () => {
    const { engine, doc } = loadEditor();
    // notation-doc.js reads these off the engine at load time; a missing
    // one is a broken page, not a subtle bug.
    for (const name of ['TICKS_PER_QUARTER', 'TREBLE_CLEF', 'BASS_CLEF', 'ALTO_CLEF']) {
      assert.notEqual(engine[name], undefined, `engine is missing ${name}`);
    }
    for (const name of ['duration', 'rest', 'measure', 'voice', 'note', 'chord']) {
      assert.equal(typeof engine[name], 'function', `engine is missing ${name}()`);
    }
    assert.equal(typeof doc.toMusicXml, 'function');
    assert.equal(typeof doc.insertEvent, 'function');
  });

  test('the editor parses a score, edits it, and serializes it back to MusicXML', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    assert.equal(parsed.score.parts.length, 1);
    assert.equal(parsed.score.parts[0].measures.length, 2);

    // The same edit the toolbar's note entry makes: a quarter note C5
    // into measure 1, voice 1, replacing the placeholder rest.
    const quarter = engine.TICKS_PER_QUARTER;
    const inserted = doc.insertEvent(parsed, {
      partId: 'P1',
      measureNumber: 1,
      event: engine.note({
        pitch: { kind: 'pitched', step: 'C', octave: 5, alter: 0 },
        duration: engine.duration('quarter', 0, quarter),
        voice: 1,
        staff: 1,
        startTick: 0,
      }),
    });
    // The written note is there, and the measure is still exactly one bar
    // long -- the rest of it is padded with rests so the renderer draws it
    // full width rather than a quarter-note-wide stub.
    const events = inserted.score.parts[0].measures[0].voices[0].events;
    const note = events.find((event) => event.kind === 'note');
    assert.equal(note.pitch.step, 'C');
    assert.equal(note.startTick, 0);
    assert.equal(
      events.reduce((sum, event) => sum + event.duration.ticks, 0),
      4 * quarter,
    );

    const xml = doc.toMusicXml(inserted);
    assert.match(xml, /<step>C<\/step>/);
    assert.match(xml, /<octave>5<\/octave>/);
    assert.match(xml, /<type>quarter<\/type>/);
    assert.match(xml, /<duration>4<\/duration>/);
  });

  test('what the editor writes, the engine reads back to the same note', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    const quarter = engine.TICKS_PER_QUARTER;
    const edited = doc.insertEvent(parsed, {
      partId: 'P1',
      measureNumber: 1,
      event: engine.note({
        pitch: { kind: 'pitched', step: 'G', octave: 4, alter: 1 },
        duration: engine.duration('quarter', 0, quarter),
        voice: 1,
        staff: 1,
        startTick: 0,
      }),
    });

    // Out to a file and back in through the engine's own parser -- the
    // export path a user actually takes.
    const reparsed = engine.parseMusicXml(doc.toMusicXml(edited), window.DOMParser);
    const event = reparsed.score.parts[0].measures[0].voices[0].events[0];
    assert.equal(event.kind, 'note');
    assert.equal(event.pitch.step, 'G');
    assert.equal(event.pitch.octave, 4);
    assert.equal(event.pitch.alter, 1);
    assert.equal(event.duration.type, 'quarter');
    assert.equal(event.duration.ticks, quarter);
  });

  test('a score the editor edited still renders to a real, parseable SVG', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    const edited = doc.insertEvent(parsed, {
      partId: 'P1',
      measureNumber: 1,
      event: engine.note({
        pitch: { kind: 'pitched', step: 'E', octave: 5, alter: 0 },
        duration: engine.duration('quarter', 0, engine.TICKS_PER_QUARTER),
        voice: 1,
        staff: 1,
        startTick: 0,
      }),
    });

    // This is the editor's own render call: render the PARSED document,
    // not the XML.
    const { svg, diagnostics } = engine.renderParsedMusicXml(edited, {
      config: { layout: { mode: 'page' } },
    });
    assert.ok(svg.startsWith('<svg'), 'the editor must get an SVG back');
    assert.ok(!svg.includes('NaN'));
    assert.ok(!svg.includes('undefined'));
    assert.deepEqual(
      [...diagnostics].filter((d) => d.severity !== 'info'),
      [],
    );

    // And the note the user typed is really drawn.
    const dom = new JSDOM(svg, { contentType: 'image/svg+xml' });
    const text = dom.window.document.querySelectorAll('text');
    assert.ok(text.length > 0, 'the drawing has no glyphs at all');
  });

  test("the editor's own setup control round-trips through the engine", () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    const set = doc.setSetup(parsed, {
      partId: 'P1',
      clef: { sign: 'F', line: 4 },
      fifths: -2,
      numerator: 3,
      denominator: 4,
    });
    const attr = doc.attributeFor(set, 'P1', 1);
    assert.equal(attr.clefSign, 'F');
    assert.equal(attr.fifths, -2);
    assert.equal(attr.timeNumerator, 3);
    assert.equal(attr.timeDenominator, 4);

    const xml = doc.toMusicXml(set);
    const reparsed = engine.parseMusicXml(xml, window.DOMParser);
    const back = doc.attributeFor(reparsed, 'P1', 1);
    assert.equal(back.clefSign, 'F');
    assert.equal(back.fifths, -2);
    assert.equal(back.timeNumerator, 3);
  });

  test('the editor can add and remove measures and the engine renders either', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);

    const grown = doc.appendMeasure(parsed, 'P1');
    assert.equal(grown.score.parts[0].measures.length, 3);

    const shrunk = doc.removeLastMeasure(parsed, 'P1');
    assert.equal(shrunk.score.parts[0].measures.length, 1);

    for (const candidate of [grown, shrunk]) {
      const { svg } = engine.renderParsedMusicXml(candidate, {
        config: { layout: { mode: 'page' } },
      });
      assert.ok(svg.startsWith('<svg'));
      assert.ok(!svg.includes('NaN'));
    }
  });

  test('a note written into a later beat is preceded by rests, and the measure stays a full bar', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = doc.padMeasure(engine.parseMusicXml(STARTER_XML, window.DOMParser), 'P1');
    const quarter = engine.TICKS_PER_QUARTER;

    // Beat 3 of a 4/4 bar -- the case the user could not reach by clicking.
    const edited = doc.insertEvent(parsed, {
      partId: 'P1',
      measureNumber: 1,
      event: engine.note({
        pitch: { kind: 'pitched', step: 'E', octave: 5, alter: 0 },
        duration: engine.duration('quarter', 0, quarter),
        voice: 1,
        staff: 1,
        startTick: 2 * quarter,
      }),
    });

    const events = edited.score.parts[0].measures[0].voices[0].events;
    const note = events.find((event) => event.kind === 'note');
    assert.equal(note.startTick, 2 * quarter, 'the note keeps the beat it was written on');
    // Everything before it is a real rest, not a hole the renderer would
    // collapse to the barline.
    const before = events.filter((event) => event.startTick < 2 * quarter);
    assert.ok(before.length > 0, 'the gap before the note is filled with rests');
    assert.ok(before.every((event) => event.kind === 'rest'));
    assert.equal(
      events.reduce((sum, event) => sum + event.duration.ticks, 0),
      4 * quarter,
      'the measure is still exactly one bar long',
    );

    // And it survives the export/reparse round trip the way a save does.
    const back = engine.parseMusicXml(doc.toMusicXml(edited), window.DOMParser);
    const backNote = back.score.parts[0].measures[0].voices[0].events.find(
      (event) => event.kind === 'note',
    );
    assert.equal(backNote.startTick, 2 * quarter);
  });

  test('padding keeps every measure full width, so a click maps to the beat under it', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = doc.padMeasure(engine.parseMusicXml(STARTER_XML, window.DOMParser), 'P1');
    const { playback } = engine.renderParsedMusicXml(parsed, {
      config: { layout: { mode: 'page' } },
    });

    const placement = playback.placementByMeasureNumber.get(1);
    const header = playback.measureLayoutsByNumber.get(1).headerWidth;
    const left = placement.x + header;
    const right = placement.x + placement.width;

    // Four clicks across the bar's note area must land on four different
    // beats -- the bug was that all of them returned tick 0.
    const ticks = [0.1, 0.35, 0.6, 0.85].map((f) =>
      engine.xToTick(playback, left + (right - left) * f, placement.systemIndex),
    );
    assert.equal(new Set(ticks).size, 4, `clicks collapsed to ${JSON.stringify(ticks)}`);
    for (let i = 1; i < ticks.length; i += 1) {
      assert.ok(ticks[i] > ticks[i - 1], 'ticks increase across the measure');
    }
  });

  test('the whole editor page starts up, loads its score, and draws it', () => {
    const { window, errors } = loadEditorPage();
    assert.deepEqual(errors, [], 'the page must start without a script error');
    assert.ok(window.NotationEngine && window.NotationDoc);

    const scoreHost = window.document.querySelector('[data-editor-score]');
    assert.ok(scoreHost, 'the editor has no score host');
    const svgs = scoreHost.querySelectorAll('svg');
    assert.equal(svgs.length, 1, 'the starter score must be drawn exactly once');
    assert.ok(!svgs[0].outerHTML.includes('NaN'));

    // The page announces readiness; anything else means a step failed.
    assert.equal(window.document.querySelector('[data-editor-status]').textContent, 'Score ready.');
  });

  test('the editor exposes a SoundFont picker and two sound-test buttons', () => {
    const { window } = loadEditorPage();
    const select = window.document.querySelector('[data-editor-soundfont]');
    const testBuilt = window.document.querySelector('[data-editor-test-note]');
    const testRendered = window.document.querySelector('[data-editor-test-score]');
    assert.ok(select, 'the editor has no SoundFont picker');
    assert.ok(testBuilt, 'the editor has no built-scale test button');
    assert.ok(testRendered, 'the editor has no rendered-score test button');

    // jsdom implements no `fetch`, so the picker cannot list assets and
    // must degrade to a disabled control rather than throw -- the same
    // thing a browser does when the R2 manifest is unreachable.
    assert.equal(select.disabled, true);
    assert.equal(testBuilt.disabled, true);
    assert.equal(testRendered.disabled, true);
    assert.match(select.textContent, /unavailable/i);
  });
});
