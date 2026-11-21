import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';
import { testDomParser } from '../helpers/dom.js';

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
function loadEditorPage({ url = 'https://example.test/notation-editor.html?intent=create', pendingXml, newScore, globals } = {}) {
  const html = fs.readFileSync(path.join(appDir, 'notation-editor.html'), 'utf8');
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    virtualConsole,
    url,
  });
  const { window } = dom;
  // Page globals the boot reads -- the SoundFont host config, a stubbed
  // `fetch`, a stand-in engine -- have to be in place BEFORE the scripts
  // run, because the boot fetches the manifest on its first tick.
  for (const [key, value] of Object.entries(globals ?? {})) window[key] = value;
  if (pendingXml !== undefined) {
    // The Lab hands a score over through sessionStorage and the page's boot
    // reads it before anything else, so seeding it is how a test opens a
    // specific score instead of the starter one.
    window.sessionStorage.setItem(
      'notation-lab-pending-file',
      JSON.stringify({
        name: 'score.musicxml',
        type: 'application/xml',
        data: Buffer.from(pendingXml, 'utf8').toString('base64'),
      }),
    );
  }
  if (newScore !== undefined) {
    // The new-score wizard leaves its answer here and the page builds the
    // score from it, so seeding this is how a test opens a chosen line-up.
    window.sessionStorage.setItem('notation-lab-new-score', JSON.stringify(newScore));
  }
  const context = dom.getInternalVMContext();
  for (const rel of ['assets/notation-engine.js', 'notation-doc.js', 'notation-newscore.js', 'notation-editor.js']) {
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

  test('a pasted note is fitted to the barline instead of running past the meter', () => {
    const { window, engine, doc } = loadEditor();
    const quarter = engine.TICKS_PER_QUARTER;
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    const written = doc.insertEvent(parsed, {
      partId: 'P1',
      measureNumber: 1,
      event: engine.note({
        pitch: { kind: 'pitched', step: 'C', octave: 5, alter: 0 },
        duration: engine.duration('whole', 0, 4 * quarter),
        voice: 1,
        staff: 1,
        startTick: 0,
      }),
    });
    const excerpt = doc.excerpt(written, [
      { partId: 'P1', measureNumber: 1, voiceId: 1, eventIndex: 0 },
    ]);
    // Last beat of bar 2: a whole note has one beat of room, not four.
    const pasted = doc.paste(written, excerpt, {
      partId: 'P1',
      measureNumber: 2,
      voiceId: 1,
      tick: 3 * quarter,
    });
    const events = pasted.score.parts[0].measures[1].voices[0].events;
    assert.equal(
      events.reduce((sum, event) => sum + event.duration.ticks, 0),
      4 * quarter,
      'the bar is still one bar long',
    );
    const note = events.find((event) => event.kind !== 'rest');
    assert.equal(note.startTick, 3 * quarter);
    assert.equal(note.duration.ticks, quarter, 'the note stops at the barline');
  });

  test('a slur and a sforzato survive the editor writing them back to MusicXML', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    const quarter = engine.TICKS_PER_QUARTER;
    let edited = parsed;
    for (let index = 0; index < 3; index += 1) {
      edited = doc.insertEvent(edited, {
        partId: 'P1',
        measureNumber: 1,
        event: engine.note({
          pitch: { kind: 'pitched', step: ['C', 'D', 'E'][index], octave: 5, alter: 0 },
          duration: engine.duration('quarter', 0, quarter),
          voice: 1,
          staff: 1,
          startTick: index * quarter,
        }),
      });
    }
    const patch = (eventIndex, values) => {
      edited = doc.patchEvent(edited, {
        partId: 'P1',
        measureNumber: 1,
        voiceId: 1,
        eventIndex,
        patch: values,
      });
    };
    patch(0, { slurStarts: [1] });
    patch(2, { slurStops: [1] });
    patch(1, { articulations: ['sforzato'] });

    const xml = doc.toMusicXml(edited);
    // MusicXML's own names, so another program reads the same marks.
    assert.match(xml, /<slur type="start" number="1"\/>/);
    assert.match(xml, /<slur type="stop" number="1"\/>/);
    assert.match(xml, /<soft-accent\/>/);

    // And the engine reads its own writing back, with no diagnostics --
    // without this a mark would draw once and vanish on reload.
    const reread = engine.parseMusicXml(xml, window.DOMParser);
    const events = reread.score.parts[0].measures[0].voices[0].events;
    // Spread: the engine's arrays come from the page's realm, not this one.
    assert.deepEqual([...events[0].slurStarts], [1]);
    assert.deepEqual([...events[2].slurStops], [1]);
    assert.deepEqual([...events[1].articulations], ['sforzato']);
    const rendered = engine.renderParsedMusicXml(reread, { config: { layout: { mode: 'page' } } });
    assert.equal((rendered.diagnostics ?? []).length, 0);
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

  test('the bottom bar carries playback, the score length, zoom and the two file controls', () => {
    const { window } = loadEditorPage();
    const bars = window.document.querySelectorAll('[data-editor-bottom-bar]');
    assert.equal(bars.length, 1, 'the editor has exactly one bottom bar');
    // The export menu's own items live in the bar's markup but only appear
    // once Export is pressed, so they are not counted as bar controls.
    const controls = [...bars[0].querySelectorAll('button, output, select, input')]
      .filter((control) => !control.closest('[data-editor-export-list]'));
    assert.deepEqual(
      controls.map((control) => control.getAttribute('aria-label')),
      ['Play', 'Stop', 'Metronome', 'Score length', 'Zoom out', 'Zoom level', 'Zoom in', 'Save', 'Export'],
    );

    // Save and Export are different promises, not two names for one thing:
    // Save keeps the score in the writer's own account, Export hands them a
    // file they keep.
    const save = bars[0].querySelector('[data-editor-save]');
    const exportToggle = bars[0].querySelector('[data-editor-export-toggle]');
    assert.match(save.getAttribute('title'), /account/, 'Save says where the score goes');
    assert.match(exportToggle.getAttribute('title'), /file/, 'Export says it makes a file');
    assert.equal(bars[0].querySelector('[data-editor-export-list]').hidden, true);

    // They sit at the right-hand end, after zoom.
    const groups = [...bars[0].children].filter((node) => node.classList.contains('editor-bottombar__group'));
    assert.deepEqual(
      groups.map((group) => group.getAttribute('aria-label')),
      ['Playback', 'Length', 'Zoom', 'File'],
    );

    // The length readout is the timeline's own end in minutes:seconds, so a
    // reader sees how long the score lasts next to the transport.
    const length = bars[0].querySelector('[data-editor-length]');
    assert.match(length.textContent, /^\d+:\d{2}$/);
  });

  test('the count-in bar is four clicks at the score\'s own tempo, and the music starts after it', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    // Count the clicks the editor schedules, and when. A click is an
    // oscillator with a start time, so a stand-in audio host records both.
    const clicks = [];
    class FakeParam {
      setValueAtTime() {}
      linearRampToValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }
    class FakeNode {
      constructor() { this.gain = new FakeParam(); this.frequency = { value: 0 }; this.type = ''; }
      connect() {}
      disconnect() {}
      start(at) { clicks.push({ at, freq: this.frequency.value }); }
      stop() {}
    }
    window.AudioContext = class {
      constructor() { this.destination = {}; this.currentTime = 0; }
      resume() { return Promise.resolve(); }
      createOscillator() { return new FakeNode(); }
      createGain() { return new FakeNode(); }
    };

    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(window.performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    window.NotationSoundFont = {
      R2SoundFontEngine: { create: async () => ({ play: () => {}, pause: () => {} }) },
    };

    const metronome = doc.querySelector('[data-editor-metronome]');
    const play = doc.querySelector('[data-editor-play]');
    metronome.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    // The switch has already clicked a bar; Play restarts the count from
    // beat one, so count only what Play itself schedules.
    clicks.length = 0;
    play.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // A 4/4 bar at the default 120 is two seconds, one beat every 0.5s.
    // Four clicks, at 0, 0.5, 1.0 and 1.5 -- and nothing at 2.0, where the
    // music starts. That stray fifth click landing on the first note is
    // exactly what the writer hears as "one more comes in".
    assert.equal(clicks.length, 4, 'one bar of 4/4 is four clicks, not five');
    assert.deepEqual(clicks.map((click) => click.at), [0, 0.5, 1, 1.5]);
    // The first beat is accented, the rest are not, so the bar is countable.
    assert.ok(clicks[0].freq > clicks[1].freq, 'the downbeat is the accented click');

    // The switch stays on, so the pulse carries on under the music.
    await new Promise((resolve) => window.setTimeout(resolve, 2100));
    assert.ok(clicks.length > 4, 'the pulse continues past the count-in bar');
    metronome.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  test('the metronome clicks as soon as it is switched on, with no Play behind it', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    // A click is an oscillator with a start time; a stand-in audio host
    // records every one, so "the switch makes a sound" is countable.
    const clicks = [];
    class FakeParam {
      setValueAtTime() {}
      linearRampToValueAtTime() {}
      exponentialRampToValueAtTime() {}
    }
    class FakeNode {
      constructor() { this.gain = new FakeParam(); this.frequency = { value: 0 }; this.type = ''; }
      connect() {}
      disconnect() {}
      start(at) { clicks.push({ at, freq: this.frequency.value }); }
      stop() {}
    }
    window.AudioContext = class {
      constructor() { this.destination = {}; this.currentTime = 0; }
      resume() { return Promise.resolve(); }
      createOscillator() { return new FakeNode(); }
      createGain() { return new FakeNode(); }
    };
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(window.performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);

    const metronome = doc.querySelector('[data-editor-metronome]');
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const toggle = () => metronome.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // The switch alone has to be audible: a writer who taps it wants to
    // hear the tempo, not to be told a count-in will happen later.
    toggle();
    assert.equal(metronome.getAttribute('aria-pressed'), 'true', 'the switch shows it is on');
    assert.ok(clicks.length >= 4, 'a 4/4 bar is heard at once, with no Play');
    assert.deepEqual(clicks.slice(0, 4).map((click) => click.at), [0, 0.5, 1, 1.5]);
    assert.ok(clicks[0].freq > clicks[1].freq, 'the downbeat is the accented click');

    // It is a metronome, not a one-bar flourish: the pulse keeps going
    // while the switch stays on.
    await new Promise((resolve) => window.setTimeout(resolve, 2200));
    assert.ok(clicks.length > 4, 'the pulse continues past the first bar');
    assert.equal(metronome.getAttribute('aria-pressed'), 'true', 'the switch stays on by itself');

    // And switching it off stops the sound.
    toggle();
    assert.equal(metronome.getAttribute('aria-pressed'), 'false', 'the switch shows it is off');
    const afterOff = clicks.length;
    await new Promise((resolve) => window.setTimeout(resolve, 2200));
    assert.equal(clicks.length, afterOff, 'no click is scheduled once it is switched off');
    assert.match(status(), /Metronome off/, 'the writer is told it went quiet');
  });

  test('the metronome counts one bar in before the notes, and the score waits for it', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    // jsdom has no animation clock; the editor asks for one on every frame,
    // so a timer-backed stand-in is enough to watch the count-in run.
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(window.performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    // The SoundFont bundle is not part of this test. The editor's contract
    // with it is `create`, `play` and `pause`, so a stand-in that honours
    // that contract lets the count-in be timed without a real font.
    const played = [];
    window.NotationSoundFont = {
      R2SoundFontEngine: {
        create: async () => ({ play: (...args) => played.push(args), pause: () => {} }),
      },
    };

    const metronome = doc.querySelector('[data-editor-metronome]');
    const play = doc.querySelector('[data-editor-play]');
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const playheadX = () => doc.querySelector('.editor-playhead')?.getAttribute('x') ?? null;
    assert.equal(metronome.getAttribute('aria-pressed'), 'false', 'the metronome starts off');

    // The metronome is a switch, not a transport: it says the next Play will
    // count in, and only Play starts anything.
    metronome.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(metronome.getAttribute('aria-pressed'), 'true', 'the button shows the metronome is on');
    assert.equal(play.dataset.playing, 'false', 'switching the metronome on does not start the score');

    play.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(play.dataset.playing, 'true', 'Play starts the count-in');
    assert.match(status(), /Counting in/, 'the writer is told the bar is counting');
    assert.equal(doc.querySelectorAll('.editor-cursor').length, 0, 'the entry cursor gives way to the playhead');
    assert.equal(doc.querySelectorAll('.editor-playhead').length, 1, 'the playhead holds the first beat through the count');

    // A 4/4 bar at the default 120 lasts two seconds. Half a second in, the
    // playhead must still be on the first beat: the notes have not started.
    const held = playheadX();
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    assert.match(status(), /Counting in/, 'half a second in, the bar is still counting');
    assert.equal(playheadX(), held, 'the playhead holds the first beat while the metronome counts');

    // Once the bar is over the notes start and the playhead moves.
    await new Promise((resolve) => window.setTimeout(resolve, 1900));
    assert.match(status(), /Playing/, 'after the bar, the score plays');
    assert.notEqual(playheadX(), held, 'the playhead moves once the count-in ends');
    assert.equal(played.length, 1, 'the notes start once, and only after the count-in');
    // The switch stays on through the music: the metronome is the pulse the
    // writer asked for, not a bar of clicks that hands over and quits.
    assert.equal(metronome.getAttribute('aria-pressed'), 'true', 'the metronome stays on while the score plays');
    assert.equal(metronome.dataset.metronome, undefined, 'no stray metronome flag is left on the button');
    metronome.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  test('one cursor while the score plays: the playhead takes over from the entry cursor', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    // Idle: the entry cursor is where the next note goes.
    assert.equal(doc.querySelectorAll('.editor-cursor').length, 1);
    assert.equal(doc.querySelectorAll('.editor-playhead').length, 0);

    doc.querySelector('[data-editor-play]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    // Two vertical lines on the staff, pointing at different beats, read as
    // the editor losing its place, so only the playhead is drawn.
    assert.equal(doc.querySelectorAll('.editor-cursor').length, 0, 'the entry cursor steps aside');
    assert.equal(doc.querySelectorAll('.editor-playhead').length, 1, 'the playhead is the one cursor');
  });

  test('the editor starts in note-input mode', () => {
    const { window } = loadEditorPage();
    const noteInput = window.document.querySelector('[data-editor-note-input]');
    // A writer must be able to write a note the moment the page opens.
    assert.equal(noteInput.getAttribute('aria-pressed'), 'true');
  });

  test('one toolbar row carries the note values, marks and slurs', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const bar = doc.querySelector('[data-editor-note-toolbar]');
    assert.ok(bar, 'the editor has no note-input toolbar');
    const rows = doc.querySelectorAll('[data-editor-toolbars] .editor-toolbar');
    assert.equal(rows.length, 1, 'the editor draws one toolbar row, not two');
    assert.equal(rows[0], bar, 'the note tools live on that one row');

    const within = (selector) => [...bar.querySelectorAll(selector)];
    // Every note value from a whole note down to a 64th, longest first --
    // the engine can write all of them, so the bar must offer all of them.
    assert.deepEqual(
      within('[data-editor-duration]').map((button) => button.dataset.editorDuration),
      ['64th', '32nd', '16th', 'eighth', 'quarter', 'half', 'whole'],
    );
    assert.deepEqual(within('[data-editor-dots]').map((b) => b.dataset.editorDots), ['1', '2', '3']);
    assert.deepEqual(
      within('[data-editor-accidental]').map((button) => button.dataset.editorAccidental),
      ['double-flat', 'flat', 'natural', 'sharp', 'double-sharp'],
    );
    assert.deepEqual(
      within('[data-editor-articulation]').map((button) => button.dataset.editorArticulation),
      ['marcato', 'sforzato', 'tenuto', 'staccato', 'accent'],
    );
    for (const selector of ['[data-editor-tie]', '[data-editor-slur]', '[data-editor-rest]', '[data-editor-flip]']) {
      assert.equal(within(selector).length, 1, `the note-input bar is missing ${selector}`);
    }

    // The articulation buttons are drawn with the engine's own font, not
    // with a codepoint copied into the markup, so they match the score.
    const sforzato = within('[data-editor-articulation="sforzato"] .editor-tool__glyph')[0];
    assert.equal(sforzato.textContent, window.NotationEngine.getGlyph('articSoftAccentAbove').char);
  });

  test('the note-input tool wears a pencil, and so does the pointer over the staff', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const button = doc.querySelector('[data-editor-note-input]');

    // The toolbar icon and the pointer over the staff are the same pencil:
    // one picture for "write here", whether it is the tool or the cursor.
    assert.ok(button.querySelector('[data-editor-pencil]'), 'the note-input tool shows a pencil');
    const style = doc.querySelector('link[rel="stylesheet"]').getAttribute('href');
    assert.ok(style, 'the editor has no stylesheet');
    const css = fs.readFileSync(path.join(appDir, style.split('?')[0]), 'utf8');
    const inputCursor = css.match(/\.editor-toolbars\[data-mode='input'\][^{]*\.editor-score\s*\{[^}]*cursor:url\(([^)]*)\)/);
    assert.ok(inputCursor, 'the staff has no pencil cursor in note-input mode');
    assert.match(inputCursor[1], /svg/, 'the cursor is an SVG pencil');
    assert.match(css, /cursor:default;/, 'the staff still falls back to the plain arrow');
  });

  test('undo and redo sit at the end of the row', () => {
    const { window } = loadEditorPage();
    const row = window.document.querySelector('[data-editor-toolbars] .editor-toolbar');
    // History is the last group on the row, and the box sits before it, so
    // neither the fold nor the tools it swallows can push history off the
    // end where a writer looks for it after a change.
    const groups = [...row.children].filter((node) => node.classList.contains('editor-toolbar__group'));
    const last = groups.at(-1);
    assert.equal(last.getAttribute('aria-label'), 'History', 'history closes the row');
    assert.equal(groups.at(-2).getAttribute('aria-label'), 'More tools', 'the box sits just before history');
    assert.deepEqual(
      [...last.querySelectorAll('.editor-tool')].map((node) => node.getAttribute('aria-label')),
      ['Undo', 'Redo'],
    );
    const labels = [...row.querySelectorAll('.editor-tool')].map((node) => node.getAttribute('aria-label'));
    assert.ok(labels.indexOf('Note input mode') < labels.indexOf('Undo'), 'history comes after the writing tools');
  });

  test('every tool keeps its written place on the row', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const row = doc.querySelector('[data-editor-toolbar]');
    const labels = [...row.children]
      .filter((node) => node.classList.contains('editor-toolbar__group'))
      .map((node) => node.getAttribute('aria-label'));
    assert.deepEqual(labels, [
      'Navigation',
      'Measure',
      'Note input',
      'Note value',
      'Augmentation dots',
      'Rest',
      'Accidentals',
      'Tie and slur',
      'Articulations',
      'Dynamics',
      'Stem',
      'Copy and delete',
      'More tools',
      'History',
    ]);
    // Nothing is folded away to begin with: the box starts empty and the
    // row is measured before anything moves into it.
    assert.equal(doc.querySelector('[data-editor-popover-panel="overflow"]').children.length, 0);
    assert.equal(doc.querySelector('[data-editor-overflow-group]').hidden, true);
  });

  test('the one box on the row holds whatever did not fit, in the same order', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const trigger = doc.querySelector('[data-editor-popover="overflow"]');
    const panel = doc.querySelector('[data-editor-popover-panel="overflow"]');
    assert.ok(trigger, 'the row has no box trigger');
    assert.ok(panel, 'the row has no box');
    assert.equal(panel.hidden, true, 'the box starts closed');

    trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false, 'the trigger opens the box');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');
    trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, true, 'a second press closes it again');
  });

  test('a tool taken from the box closes it and takes effect', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const panel = doc.querySelector('[data-editor-popover-panel="overflow"]');
    // Stand in for the fold: the box is empty until the row runs out of
    // room, so move a group in the way the script would.
    const stemGroup = [...doc.querySelectorAll('.editor-toolbar__group')]
      .find((node) => node.getAttribute('aria-label') === 'Stem');
    panel.append(stemGroup);
    doc.querySelector('[data-editor-popover="overflow"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false);

    const flip = doc.querySelector('[data-editor-flip]');
    flip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, true, 'using a tool from the box folds it away');
    assert.equal(doc.querySelector('[data-editor-popover="overflow"]').getAttribute('aria-expanded'), 'false');
  });

  test('the row carries the bar controls, the clipboard and the eraser', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const measure = doc.querySelector('.editor-toolbar__group[aria-label="Measure"]');
    const clipboard = doc.querySelector('.editor-toolbar__group[aria-label="Copy and delete"]');
    assert.ok(measure, 'the row has no bar controls');
    assert.ok(clipboard, 'the row has no copy, cut and delete');
    assert.deepEqual(
      [...measure.querySelectorAll('.editor-tool')].map((node) => node.getAttribute('aria-label')),
      ['Add measure', 'Remove measure'],
    );
    assert.deepEqual(
      [...clipboard.querySelectorAll('.editor-tool')].map((node) => node.getAttribute('aria-label')),
      ['Copy', 'Cut', 'Paste', 'Delete'],
    );
    // Every one of them is usable as soon as a score is on screen -- a
    // control that does nothing until something else happens is a dead
    // button, and the bar has no room for one.
    for (const label of ['Add measure', 'Remove measure', 'Copy', 'Cut', 'Paste', 'Delete']) {
      const button = [...doc.querySelectorAll('.editor-tool')]
        .find((node) => node.getAttribute('aria-label') === label);
      assert.equal(button.disabled, false, `${label} is disabled with a score loaded`);
      assert.match(button.getAttribute('title'), /\(|measure|bar|selection/, `${label} has no title`);
    }
  });

  test('the bar buttons add and remove a bar, and the length readout follows', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const length = () => doc.querySelector('[data-editor-length]').textContent;
    const click = (label) => [...doc.querySelectorAll('.editor-tool')]
      .find((node) => node.getAttribute('aria-label') === label)
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // The starter score is four bars of 4/4, which is eight seconds at the
    // tempo the file itself carries.
    assert.equal(length(), '0:08');

    click('Add measure');
    assert.equal(status(), 'Measure added after bar 1.');
    assert.equal(length(), '0:10', 'the fifth bar did not lengthen the score');

    // The cursor moved into the new bar, so the eraser takes that one away
    // again -- the two buttons act on the bar the writer is looking at.
    click('Remove measure');
    assert.equal(status(), 'Bar 2 removed.');
    assert.equal(length(), '0:08');
  });

  test('a bar inserted in the middle keeps the music after it in its own bar', () => {
    const { window, engine, doc } = loadEditor();
    const parsed = engine.parseMusicXml(STARTER_XML, window.DOMParser);
    const quarter = engine.TICKS_PER_QUARTER;

    // Bar 1 gets a note, bar 2 keeps its rest. Inserting after bar 1 must
    // push bar 2 down to 3 and leave both bars' music where it was -- a
    // measure number is a position, so every table keyed on one has to move
    // with the bars or a mark ends up over the wrong bar.
    const withNote = doc.insertEvent(parsed, {
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
    const grown = doc.insertMeasureAfter(withNote, 'P1', 1);

    const measures = grown.score.parts[0].measures;
    assert.deepEqual(JSON.parse(JSON.stringify(measures.map((m) => m.number))), [1, 2, 3]);
    const barOne = measures[0].voices[0].events;
    assert.equal(barOne.find((event) => event.kind === 'note').pitch.step, 'C');
    assert.equal(
      measures[1].voices[0].events.filter((event) => event.kind !== 'rest').length,
      0,
      'the new bar is not empty',
    );
    // The attributes followed the bars, so the new bar still knows its meter
    // and the bar that moved still has its own.
    assert.equal(doc.attributeFor(grown, 'P1', 1).timeNumerator, 4);
    assert.equal(doc.attributeFor(grown, 'P1', 2).timeNumerator, 4);
    assert.equal(doc.attributeFor(grown, 'P1', 3).timeNumerator, 4);

    // Removing bar 2 pulls bar 3 back down to 2, with its music intact.
    const shrunk = doc.removeMeasure(grown, 'P1', 2);
    assert.deepEqual(JSON.parse(JSON.stringify(shrunk.score.parts[0].measures.map((m) => m.number))), [1, 2]);
    assert.equal(
      doc.attributeFor(shrunk, 'P1', 2).timeNumerator,
      4,
      'the attributes did not come back with the bar',
    );

    // And the result still writes and renders: the round trip a save takes.
    for (const candidate of [grown, shrunk]) {
      const xml = doc.toMusicXml(candidate);
      const reread = engine.parseMusicXml(xml, window.DOMParser);
      assert.deepEqual(
        JSON.parse(JSON.stringify(reread.score.parts[0].measures.map((m) => m.number))),
        JSON.parse(JSON.stringify(candidate.score.parts[0].measures.map((m) => m.number))),
      );
      const { svg } = engine.renderParsedMusicXml(reread, { config: { layout: { mode: 'page' } } });
      assert.ok(svg.startsWith('<svg'));
      assert.ok(!svg.includes('NaN'));
    }
  });

  test('copy puts the selection on the clipboard as a file another program can read', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    let written = null;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text) => { written = text; } },
    });

    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const press = (key, init = {}) => doc.dispatchEvent(
      new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );

    press('D');
    assert.match(status(), /Inserted D/);
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Selected 1 note.');

    press('c', { ctrlKey: true });
    await new Promise((resolve) => { setTimeout(resolve, 0); });

    assert.equal(status(), 'Copied 1 note.');
    assert.ok(written, 'nothing reached the clipboard');
    // A copy that only the editor can read is half a copy: what lands on
    // the clipboard is a whole MusicXML document, so it can be pasted into
    // another notation program.
    const parsed = window.NotationEngine.parseMusicXml(written, { domParser: window.DOMParser });
    assert.equal(parsed.score.parts.length, 1);
    assert.equal(parsed.score.parts[0].measures.length, 1, 'the excerpt lost its bar');
    const notes = parsed.score.parts[0].measures[0].voices[0].events
      .filter((event) => event.kind !== 'rest');
    assert.equal(notes.length, 1);
    assert.equal(notes[0].pitch.step, 'D');
    // The bar still adds up, so the excerpt opens as a legal measure rather
    // than a stub the receiving program has to repair.
    const total = parsed.score.parts[0].measures[0].voices[0].events
      .reduce((sum, event) => sum + event.duration.ticks, 0);
    assert.equal(total, 4 * window.NotationEngine.TICKS_PER_QUARTER);
  });

  test('cut copies the selection and then clears it, and delete clears it alone', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    let written = null;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text) => { written = text; } },
    });

    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const press = (key, init = {}) => doc.dispatchEvent(
      new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
    const tool = (label) => [...doc.querySelectorAll('.editor-tool')]
      .find((node) => node.getAttribute('aria-label') === label);

    // Cut keeps the note on the clipboard and leaves a rest behind: with
    // nothing sounding left, "select all" has nothing to select.
    press('E');
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Selected 1 note.');
    press('x', { ctrlKey: true });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    assert.equal(status(), 'Deleted 1 note.');
    assert.match(written, /<step>E<\/step>/);
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Nothing to select.');

    // Delete does the same clearing without touching the clipboard.
    written = null;
    press('E');
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Selected 1 note.');
    tool('Delete').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(status(), 'Deleted 1 note.');
    assert.equal(written, null, 'delete must not write to the clipboard');
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Nothing to select.');
  });

  test('paste writes the clipboard back in at the cursor, so a copy round-trips', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    let written = null;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text) => { written = text; },
        readText: async () => written,
      },
    });

    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const press = (key, init = {}) => doc.dispatchEvent(
      new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
    const tool = (label) => [...doc.querySelectorAll('.editor-tool')]
      .find((node) => node.getAttribute('aria-label') === label);

    press('D');
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Selected 1 note.');
    press('c', { ctrlKey: true });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    assert.equal(status(), 'Copied 1 note.');

    // Paste lands the copied note at the entry cursor, which has rolled on
    // to the beat after the note that was just written.
    tool('Paste').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    assert.equal(status(), 'Pasted 1 note.');

    // The note is really in the score, not just announced: select-all now
    // counts two of them, and the page has drawn the second.
    press('a', { ctrlKey: true });
    assert.equal(status(), 'Selected 2 notes.');
  });

  test('paste refuses a clipboard that does not hold MusicXML', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {}, readText: async () => 'not music at all' },
    });
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const press = (key, init = {}) => doc.dispatchEvent(
      new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }),
    );
    press('v', { ctrlKey: true });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    assert.equal(status(), 'The clipboard does not hold MusicXML.');
  });

  test('paste over a sounding note replaces it instead of stacking on it', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const E = window.NotationEngine;
    const D = window.NotationDoc;
    const domParser = testDomParser();

    const score = (body) =>
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1"><attributes><divisions>4</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      body +
      '</measure></part></score-partwise>';
    const whole = (step) =>
      `<note><pitch><step>${step}</step><octave>4</octave></pitch>` +
      '<duration>16</duration><voice>1</voice><type>whole</type></note>';
    const quarter = (step) =>
      `<note><pitch><step>${step}</step><octave>4</octave></pitch>` +
      '<duration>4</duration><voice>1</voice><type>quarter</type></note>';

    const capacity = (document) => D.ticksPerMeasure(document, 'P1', 1);
    const total = (document) =>
      document.score.parts[0].measures[0].voices[0].events.reduce(
        (sum, event) => sum + event.duration.ticks,
        0,
      );
    // The document comes from the page's own realm, so its arrays carry
    // that realm's Array.prototype and `deepEqual` would compare prototypes
    // rather than contents. Copying into this realm is what makes the
    // comparison about the pitches.
    const pitches = (document) =>
      JSON.parse(JSON.stringify(
        document.score.parts[0].measures[0].voices[0].events
          .filter((event) => event.kind !== 'rest')
          .map((event) => event.pitch.step),
      ));

    const target = E.parseMusicXml(score(whole('C')), { domParser });
    const clip = E.parseMusicXml(score(whole('D')), { domParser });

    // A whole note pasted onto a whole note: the pasted one replaces it, so
    // the bar is still exactly one bar long and sounds one note, not two.
    const overWhole = D.paste(target, clip, { partId: 'P1', measureNumber: 1, voiceId: 1, tick: 0 });
    assert.deepEqual(pitches(overWhole), ['D']);
    assert.equal(total(overWhole), capacity(overWhole));

    // A quarter pasted onto a whole: the whole goes, the quarter lands, and
    // the rest of the bar becomes rests -- not the old note plus a new one.
    const quarterClip = E.parseMusicXml(score(quarter('E')), { domParser });
    const overQuarter = D.paste(target, quarterClip, {
      partId: 'P1', measureNumber: 1, voiceId: 1, tick: 0,
    });
    assert.deepEqual(pitches(overQuarter), ['E']);
    assert.equal(total(overQuarter), capacity(overQuarter));
    assert.equal(overQuarter.score.parts[0].measures[0].voices[0].events.length, 2, 'a quarter and one rest');
  });

  test('paste next to the barline drops the note rather than throwing', () => {
    const { window } = loadEditorPage();
    const E = window.NotationEngine;
    const D = window.NotationDoc;
    const domParser = testDomParser();

    const score = (body) =>
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      '<part id="P1"><measure number="1"><attributes><divisions>4</divisions>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>' +
      body +
      '</measure></part></score-partwise>';
    const target = E.parseMusicXml(
      score(
        '<note><pitch><step>C</step><octave>4</octave></pitch>' +
          '<duration>16</duration><voice>1</voice><type>whole</type></note>',
      ),
      { domParser },
    );
    const clip = E.parseMusicXml(
      score(
        '<note><pitch><step>E</step><octave>4</octave></pitch>' +
          '<duration>4</duration><voice>1</voice><type>quarter</type></note>',
      ),
      { domParser },
    );

    // 100 ticks of room is less than a 32nd note, so there is no value to
    // shorten the pasted quarter TO. The old code asked the engine for one,
    // got null, and threw a TypeError reading `.type` off it.
    const pasted = D.paste(target, clip, {
      partId: 'P1', measureNumber: 1, voiceId: 1, tick: D.ticksPerMeasure(target, 'P1', 1) - 100,
    });
    const events = pasted.score.parts[0].measures[0].voices[0].events;
    assert.equal(
      events.reduce((sum, event) => sum + event.duration.ticks, 0),
      D.ticksPerMeasure(pasted, 'P1', 1),
      'the bar is still exactly one bar long',
    );
  });

  test('the fold only happens when the row would run past the window', () => {
    const { window } = loadEditorPage();
    const row = window.document.querySelector('[data-editor-toolbar]');
    const style = window.document.querySelector('link[rel="stylesheet"]').getAttribute('href');
    const css = fs.readFileSync(path.join(appDir, style.split('?')[0]), 'utf8');

    // The row must not scroll: a tool that is out of room moves into the
    // box rather than off the edge, so there is nothing to scroll to.
    const rule = css.match(/\.editor-toolbar\s*\{[^}]*\}/);
    assert.ok(rule, 'the toolbar has no rule');
    assert.match(rule[0], /overflow:hidden/, 'the row clips instead of scrolling');
    assert.doesNotMatch(rule[0], /overflow-x:auto/, 'the row must not scroll sideways');
    // The box itself is a fixed panel placed against the window, so it
    // cannot be cut off by the row it hangs from.
    assert.match(css, /\.editor-popover\s*\{[^}]*position:fixed/, 'the box is not fixed');
    assert.equal(row.getAttribute('role'), 'toolbar');
  });

  test('the dynamics buttons mark the selected note and light up with it', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.SVGElement.prototype.getBoundingClientRect = () => ({
      x: 0, y: 0, width: 400, height: 200, top: 0, left: 0, right: 400, bottom: 200,
    });
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };

    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const button = (level) => doc.querySelector(`[data-editor-dynamic="${level}"]`);
    assert.ok(button('ff'), 'the note-input bar has no dynamics buttons');

    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', { clientX: 5, clientY: 9, bubbles: true }));
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'D', bubbles: true }));

    // A dynamic belongs to a tick, so it needs a note selected to attach to.
    doc.querySelector('[data-editor-note-input]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', { clientX: 5, clientY: 9, bubbles: true }));
    assert.equal(status(), 'Note selected.');

    button('ff').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Added ff/);
    assert.equal(button('ff').getAttribute('aria-pressed'), 'true');
    // Only the level in force lights: the others must not claim the note.
    assert.equal(button('p').getAttribute('aria-pressed'), 'false');

    // A second click on the same level takes it away again.
    button('ff').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Removed ff/);
    assert.equal(button('ff').getAttribute('aria-pressed'), 'false');
  });

  test('the slur button slurs the selected note to the next one, and clears it again', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.SVGElement.prototype.getBoundingClientRect = () => ({
      x: 0, y: 0, width: 400, height: 200, top: 0, left: 0, right: 400, bottom: 200,
    });
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });
    // Identity transform, so a client point is already a staff point: the
    // click lands on the beat the coordinate names.
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };

    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const click = () => scoreHost.dispatchEvent(
      new window.PointerEvent('pointerdown', { clientX: 5, clientY: 9, bubbles: true }),
    );
    const press = (key) => doc.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
    const slur = doc.querySelector('[data-editor-slur]');

    // A click puts the cursor on beat 1; two letter keys write a note each,
    // the second on the beat after the first -- the ordinary way a melody
    // gets entered, and the case the slur has something to join.
    click();
    press('D');
    press('E');
    assert.match(status(), /Inserted/);
    assert.equal(doc.querySelectorAll('[data-editor-score] svg').length, 1);

    // A staff click in note input WRITES, so selecting the note the slur
    // starts from means leaving note input first -- the same two-step a
    // writer takes in MuseScore.
    doc.querySelector('[data-editor-note-input]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    click(5);
    assert.equal(status(), 'Note selected.');

    slur.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Slur added/);
    assert.equal(slur.getAttribute('aria-pressed'), 'true');

    slur.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Slur removed/);
    assert.equal(slur.getAttribute('aria-pressed'), 'false');
  });

  test('writing a note in the editor changes the score it will play back', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    const svg = scoreHost.querySelector('svg');

    // jsdom has no layout engine, so the click path's SVG coordinate
    // helpers are stubbed to the identity transform -- the point then maps
    // straight to the staff geometry the click code already reads.
    window.DOMPoint = class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return new window.DOMPoint(this.x, this.y);
      }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });

    const before = svg.querySelectorAll('[data-id]').length;
    // Click where the page actually is, rather than at a fixed number of
    // user units: the page geometry is configurable, and a coordinate that
    // happens to sit inside it today would land on the margin tomorrow.
    const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const staffY = Number(
      [...svg.querySelectorAll('line')]
        .find((line) => line.getAttribute('y1') === line.getAttribute('y2')
          && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
        .getAttribute('y1'),
    );
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
      clientX: pageWidth * 0.1,
      clientY: staffY,
      bubbles: true,
    }));
    const after = doc.querySelector('[data-editor-score] svg').querySelectorAll('[data-id]').length;
    assert.equal(after, before + 1, 'a staff click in note-input mode must add a note');
    assert.match(doc.querySelector('[data-editor-status]').textContent, /Inserted|Replaced/);
  });

  test('a note auditioned while writing sounds on its own part, not on the first part', async () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');

    // The engine's contract with the sound bundle: it creates one engine,
    // hands it the score's tracks, and asks it to audition single notes.
    // What matters here is WHICH part the audition is attributed to -- a
    // note written on the second part must not be heard as the first
    // part's instrument.
    const previews = [];
    const trackSets = [];
    window.NotationSoundFont = {
      R2SoundFontEngine: {
        create: async () => ({
          play: () => {},
          pause: () => {},
          setTracks: (tracks) => trackSets.push(tracks),
          preview: (...args) => previews.push(args),
        }),
      },
    };
    window.DOMPoint = class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return new window.DOMPoint(this.x, this.y);
      }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });

    const svg = scoreHost.querySelector('svg');
    const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const staffY = Number(
      [...svg.querySelectorAll('line')]
        .find((line) => line.getAttribute('y1') === line.getAttribute('y2')
          && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
        .getAttribute('y1'),
    );
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
      clientX: pageWidth * 0.1,
      clientY: staffY,
      bubbles: true,
    }));
    // The preview resolves through a promise chain, so the click's own
    // turn has to end before the audition is recorded.
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    assert.equal(previews.length, 1, 'writing a note auditions it once');
    const [notes, , partId] = previews[0];
    assert.equal(notes.length, 1);
    assert.equal(typeof notes[0], 'number', 'a preview takes MIDI numbers');
    assert.equal(partId, 'P1', 'the audition is attributed to the part being written on');
    assert.ok(trackSets.length > 0, 'the score tracks reach the sound engine before the first note');
    assert.deepEqual(
      [...trackSets[trackSets.length - 1]].map((track) => track.id),
      ['P1'],
      'the engine is given the score it is about to sound',
    );
  });

  test('a note auditioned on a transposing part sounds at the pitch Play produces', async () => {
    // A guitar part is written an octave above where it sounds. The
    // audition must apply the part's `<transpose>` the way playback does,
    // or the writer hears a note an octave away from the one Play gives.
    const { window } = loadEditorPage({
      newScore: {
        title: 'Guitar',
        instrumentIds: ['acoustic-guitar'],
        key: 'C',
        time: '4/4',
        tempo: 120,
        measures: 1,
      },
    });
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');

    const previews = [];
    window.NotationSoundFont = {
      R2SoundFontEngine: {
        create: async () => ({
          play: () => {},
          pause: () => {},
          setTracks: () => {},
          preview: (...args) => previews.push(args),
        }),
      },
    };
    window.DOMPoint = class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return new window.DOMPoint(this.x, this.y);
      }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });

    const svg = scoreHost.querySelector('svg');
    const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const staffYs = [...svg.querySelectorAll('line')]
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
        && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
      .map((line) => Number(line.getAttribute('y1')))
      .sort((a, b) => a - b);
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
      clientX: pageWidth * 0.1,
      clientY: staffYs[Math.floor(staffYs.length / 2)],
      bubbles: true,
    }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    assert.equal(previews.length, 1, 'writing a note auditions it once');
    const auditioned = previews[0][0][0];

    // The score as the editor saved it, which is what Play reads.
    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const saved = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]');
    const xml = saved[0]?.xml ?? '';
    assert.match(xml, /<transpose>/, 'the guitar part must carry its octave transposition');

    const engine = window.NotationEngine;
    const parsed = engine.parseMusicXml(xml, { domParser: window.DOMParser });
    const written = parsed.score.parts[0].measures[0].voices[0].events.find((event) => event.kind === 'note');
    const asWritten = engine.midiNoteNumber(written.pitch);
    const played = engine.renderFromMusicXml(xml, { domParser: window.DOMParser })
      .playback.events[0].midiNotes[0];

    assert.notEqual(auditioned, asWritten, 'the audition must not be the written pitch');
    assert.equal(auditioned, played, 'the audition must be the pitch Play produces');
  });

  test('a fresh drum kit previews on the percussion channel before any drum is written', async () => {
    // A kit opens as rests, so nothing in the score is unpitched yet. The
    // routing has to come from the kit's declared GM keys, or the first
    // drum a writer places is auditioned as a piano.
    const { window } = loadEditorPage({
      newScore: {
        title: 'Kit',
        instrumentIds: ['drum-kit'],
        key: 'C',
        time: '4/4',
        tempo: 120,
        measures: 1,
      },
    });
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');

    const previews = [];
    const trackSets = [];
    window.NotationSoundFont = {
      R2SoundFontEngine: {
        create: async () => ({
          play: () => {},
          pause: () => {},
          setTracks: (tracks) => trackSets.push(tracks),
          preview: (...args) => previews.push(args),
        }),
      },
    };
    window.DOMPoint = class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return new window.DOMPoint(this.x, this.y);
      }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });

    const svg = scoreHost.querySelector('svg');
    const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const staffYs = [...svg.querySelectorAll('line')]
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
        && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
      .map((line) => Number(line.getAttribute('y1')))
      .sort((a, b) => a - b);
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
      clientX: pageWidth * 0.1,
      clientY: staffYs[Math.floor(staffYs.length / 2)],
      bubbles: true,
    }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    assert.ok(trackSets.length > 0, 'the score tracks reach the sound engine');
    const tracks = trackSets[trackSets.length - 1];
    assert.equal(tracks[0].percussion, true, 'a declared kit is a percussion track before its first note');
    assert.equal(
      window.NotationEngine.assignTrackRouting(tracks).get('P1').channel,
      9,
      'the kit must be routed to the GM percussion channel',
    );
    assert.equal(previews.length, 1, 'writing a drum auditions it once');
    assert.equal(previews[0][2], 'P1', 'the audition is attributed to the kit');
  });

  test('letter keys write drums on a kit part instead of pitches it cannot sound', async () => {
    // Step entry is how a writer types a part: the letters have to reach
    // the kit. Falling through to the pitched branch wrote a note with no
    // drum to sound it, so the part played silence and the score stopped
    // being a drum part at all.
    const { window } = loadEditorPage({
      newScore: {
        title: 'Kit',
        instrumentIds: ['drum-kit'],
        key: 'C',
        time: '4/4',
        tempo: 120,
        measures: 4,
      },
    });
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.DOMPoint = class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
      matrixTransform() {
        return new window.DOMPoint(this.x, this.y);
      }
    };

    const svg = scoreHost.querySelector('svg');
    const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const staffYs = [...svg.querySelectorAll('line')]
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
        && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
      .map((line) => Number(line.getAttribute('y1')))
      .sort((a, b) => a - b);
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const press = (key) => doc.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

    // Place the entry cursor in the kit, then type the kit's own lines.
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
      clientX: pageWidth * 0.1,
      clientY: staffYs[Math.floor(staffYs.length / 2)],
      bubbles: true,
    }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const written = [];
    for (const letter of ['F', 'C', 'G', 'B', 'D', 'A']) {
      press(letter);
      written.push(status());
    }

    for (const message of written) {
      assert.match(message, /Inserted /, `a kit letter must write a drum, got "${message}"`);
      assert.doesNotMatch(message, /Inserted [A-G]\d/, 'a kit letter must never write a pitched note');
    }

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    assert.equal((xml.match(/<pitch>/g) ?? []).length, 0, 'a drum part carries no pitched notes');

    const engine = window.NotationEngine;
    const { playback } = engine.renderFromMusicXml(xml, { domParser: window.DOMParser });
    // The click that placed the cursor wrote a drum of its own, so the
    // letters are the events after it.
    assert.deepEqual(
      JSON.parse(JSON.stringify(
        playback.events.map((event) => (event.midiNotes ? [...event.midiNotes] : [])).slice(-6),
      )),
      [[36], [38], [42], [45], [47], [49]],
      'each letter sounds its own drum',
    );
  });

  test('letter keys still write pitches on a pitched part', async () => {
    const { window } = loadEditorPage({
      newScore: {
        title: 'Piano',
        instrumentIds: ['piano'],
        key: 'C',
        time: '4/4',
        tempo: 120,
        measures: 2,
      },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'C', bubbles: true }));
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'D', bubbles: true }));
    assert.match(status(), /Inserted D\d/);

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    assert.equal((xml.match(/<unpitched/g) ?? []).length, 0, 'a pitched part carries no unpitched notes');
    assert.equal((xml.match(/<pitch>/g) ?? []).length, 2, 'the two notes typed, and no drum beside them');
  });

  test('a bare visit to the editor starts a score instead of showing nothing', () => {
    // No `?intent=` and no handed-over file: the page must still open a
    // writable score. An empty canvas with every control disabled reads as
    // "I cannot write a note here", which is the whole complaint.
    const { window, errors } = loadEditorPage({ url: 'https://example.test/notation-editor.html' });
    assert.deepEqual(errors, [], 'the page must start without a script error');
    const scoreHost = window.document.querySelector('[data-editor-score]');
    assert.equal(scoreHost.hidden, false, 'the score host must be visible');
    assert.equal(scoreHost.querySelectorAll('svg').length, 1, 'a starter score must be drawn');
    assert.equal(
      window.document.querySelector('[data-editor-status]').textContent,
      'Score ready.',
    );
  });

  test('clicking a note that is already there writes, and only selects with note input off', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    // Identity transform and a generous hit box, so the click always lands
    // on the first event in the measure -- the same thing a real click does
    // when the pointer is over a note.
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });

    const scoreHost = doc.querySelector('[data-editor-score]');
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const click = () => scoreHost.dispatchEvent(
      new window.PointerEvent('pointerdown', { clientX: 5, clientY: 9, bubbles: true }),
    );

    // First click: the beat holds only the placeholder rest, so a note is written.
    click();
    assert.match(status(), /Inserted/, 'the first click must write a note');
    // Second click: it now lands on that note. In note input that must
    // write (replace) it, not merely select it -- otherwise a writer who
    // clicks where the notes are sees the status change and no new note.
    click();
    assert.match(status(), /Replaced/, 'clicking an existing note must write, not just select');

    // Turning note input off is how a writer selects a note to transpose it.
    doc.querySelector('[data-editor-note-input]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    click();
    assert.equal(status(), 'Note selected.');
  });

  test('a click on the staff writes a note at that line, and a click off it writes nothing', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    // A tight hit box, so a click only hits a note it is actually over: the
    // note-at-a-line behaviour is the positional placement, not a selection.
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0.0001, height: 0.0001 });

    const svg = () => scoreHost.querySelector('svg');
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const press = (x, y) => scoreHost.dispatchEvent(
      new window.PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }),
    );
    // The staff geometry comes from the score itself, not a guess.
    const lines = [...svg().querySelectorAll('line')]
      .filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
        && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3);
    const staffYs = [...new Set(lines.map((line) => Number(line.getAttribute('y1'))))].sort((a, b) => a - b);
    const topY = staffYs[0];
    const bottomY = staffYs[staffYs.length - 1];
    const middleX = (Number(lines[0].getAttribute('x1')) + Number(lines[0].getAttribute('x2'))) / 2;

    // The five lines and the ledger space above them are writable, and each
    // one gives a different pitch: the line under the pointer is the pitch.
    const pitches = [];
    for (const y of [topY - 1, topY, (topY + bottomY) / 2, bottomY, bottomY + 1]) {
      press(middleX, y);
      pitches.push(status());
      assert.match(status(), /Inserted|Replaced/, `a click on the staff at y=${y} must write a note`);
    }
    assert.equal(new Set(pitches).size, pitches.length, 'each line must give its own pitch');

    // Away from the staff nothing is written and the cursor does not move.
    const written = svg().querySelectorAll('[data-id]').length;
    const before = status();
    press(middleX, topY - 12);
    assert.equal(svg().querySelectorAll('[data-id]').length, written, 'a click above the staff must not write');
    assert.equal(status(), before, 'a click above the staff must not move the cursor');

    press(1, (topY + bottomY) / 2);
    assert.equal(svg().querySelectorAll('[data-id]').length, written, 'a click left of the staff must not write');
    press(200, (topY + bottomY) / 2);
    assert.equal(svg().querySelectorAll('[data-id]').length, written, 'a click right of the staff must not write');
  });

  test('a click writes into the part and staff whose lines it landed on', async () => {
    // A piano's two staves plus a flute's one: three staff bands in a single
    // system, so the band a click lands in is not the same number as the
    // system the engine addresses.
    const twoStaves =
      '<attributes><divisions>4</divisions><key><fifths>0</fifths></key>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves>' +
      '<clef number="1"><sign>G</sign><line>2</line></clef>' +
      '<clef number="2"><sign>F</sign><line>4</line></clef></attributes>';
    const oneStaff =
      '<attributes><divisions>4</divisions><key><fifths>0</fifths></key>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>';
    const whole = (step, octave, staff) =>
      `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch>` +
      `<duration>16</duration><voice>1</voice><type>whole</type>` +
      (staff > 1 ? `<staff>${staff}</staff>` : '') + '</note>';
    const emptyMeasure = '<note><rest measure="yes"/><duration>16</duration><voice>1</voice></note>';
    const xml =
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>Piano</part-name></score-part>' +
      '<score-part id="P2"><part-name>Flute</part-name></score-part></part-list>' +
      `<part id="P1"><measure number="1">${twoStaves}${whole('C', 5, 1)}${whole('C', 3, 2)}</measure>` +
      `<measure number="2">${emptyMeasure}</measure></part>` +
      `<part id="P2"><measure number="1">${oneStaff}${whole('E', 5, 1)}</measure>` +
      `<measure number="2">${emptyMeasure}</measure></part></score-partwise>`;

    const { window, errors } = loadEditorPage({ pendingXml: xml });
    // The handoff is read through `File.text()`, which resolves off the
    // boot's own stack, so the first render lands a tick later.
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    assert.deepEqual(errors, [], 'the page must start without a script error');
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    // A tight hit box, so the click is the positional placement and not a
    // selection of the note the placeholder rest draws.
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0.0001, height: 0.0001 });

    const svg = () => scoreHost.querySelector('svg');
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const bands = () => {
      const lines = [...svg().querySelectorAll('line')].filter(
        (line) =>
          line.getAttribute('y1') === line.getAttribute('y2') &&
          Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3,
      );
      const ys = [...new Set(lines.map((line) => Number(line.getAttribute('y1'))))].sort((a, b) => a - b);
      const found = [];
      let run = [];
      const close = () => {
        if (run.length >= 5) found.push({ top: run[0], bottom: run[run.length - 1] });
        run = [];
      };
      for (const y of ys) {
        if (run.length === 0 || Math.abs(y - run[run.length - 1] - 1) < 0.01) run.push(y);
        else { close(); run = [y]; }
      }
      close();
      return found;
    };

    const staffBands = bands();
    assert.equal(staffBands.length, 3, 'a piano and a flute draw three staves');
    // Measure 2 is the empty bar, and it is where every click below lands.
    const press = (band, fraction) => {
      const lines = [...svg().querySelectorAll('line')].filter(
        (line) => line.getAttribute('y1') === line.getAttribute('y2'),
      );
      const right = Math.max(...lines.map((line) => Number(line.getAttribute('x2'))));
      scoreHost.dispatchEvent(
        new window.PointerEvent('pointerdown', {
          clientX: right * fraction,
          clientY: band.bottom,
          bubbles: true,
        }),
      );
    };

    // The bottom line of the piano's BASS staff is a low pitch in the bass
    // clef, and the entry cursor must sit on that staff and not the top one.
    press(staffBands[1], 0.55);
    assert.match(status(), /Inserted G2/, 'the bass staff bottom line is G2');
    let cursor = doc.querySelector('.editor-cursor');
    assert.ok(cursor, 'the entry cursor is drawn');
    assert.ok(
      Math.abs(Number(cursor.getAttribute('y')) - (staffBands[1].top - 4)) < 0.5,
      'the cursor sits on the bass staff, not the treble one',
    );

    // The flute's staff is a treble staff: the same line is a different
    // pitch, and the note belongs to the flute, not the piano.
    press(staffBands[2], 0.75);
    assert.match(status(), /Inserted E4/, 'the flute staff bottom line is E4');
    cursor = doc.querySelector('.editor-cursor');
    assert.ok(
      Math.abs(Number(cursor.getAttribute('y')) - (staffBands[2].top - 4)) < 0.5,
      'the cursor follows the flute staff',
    );
    // The note belongs to the FLUTE, which is the second part: a click on
    // its staff must not write into the piano instead.
    const ids = [...svg().querySelectorAll('[data-id]')].map((group) => group.getAttribute('data-id'));
    assert.ok(
      ids.some((id) => id.startsWith('P2#m2#')),
      'the note written on the flute staff belongs to the flute part',
    );
  });

  test('the playhead crosses into the next system instead of staying on the first', async () => {
    // Twenty-four bars in page mode spill over two systems, so playing
    // through the score has to move the marker down the page -- a frame
    // that only re-sets `x` leaves it on the row it started on.
    const attributes =
      '<attributes><divisions>4</divisions><key><fifths>0</fifths></key>' +
      '<time><beats>4</beats><beat-type>4</beat-type></time>' +
      '<clef><sign>G</sign><line>2</line></clef></attributes>';
    // Every bar is a rest: the marker then moves with no note to highlight,
    // which is the frame path that used to re-set only `x` and so left the
    // playhead on the system it started on.
    const measures = Array.from({ length: 24 }, (_, index) =>
      `<measure number="${index + 1}">${index === 0 ? attributes : ''}` +
      '<note><rest measure="yes"/><duration>16</duration><voice>1</voice></note></measure>',
    ).join('');
    const xml =
      '<?xml version="1.0"?><score-partwise version="4.0"><part-list>' +
      '<score-part id="P1"><part-name>M</part-name></score-part></part-list>' +
      `<part id="P1">${measures}</part></score-partwise>`;

    const { window } = loadEditorPage({ pendingXml: xml });
    await new Promise((resolve) => window.setTimeout(resolve, 50));
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');

    const staffTops = () => {
      const lines = [...scoreHost.querySelectorAll('svg line')].filter(
        (line) =>
          line.getAttribute('y1') === line.getAttribute('y2') &&
          Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3,
      );
      const ys = [...new Set(lines.map((line) => Number(line.getAttribute('y1'))))].sort((a, b) => a - b);
      const found = [];
      let run = [];
      const close = () => {
        if (run.length >= 5) found.push(run[0]);
        run = [];
      };
      for (const y of ys) {
        if (run.length === 0 || Math.abs(y - run[run.length - 1] - 1) < 0.01) run.push(y);
        else { close(); run = [y]; }
      }
      close();
      return found;
    };
    assert.equal(staffTops().length, 2, 'twenty-four bars span two systems');

    // A clock the test owns, so the playhead can be moved to the second
    // system without waiting out the music in real time.
    let clock = 0;
    window.performance.now = () => clock;
    let pending = [];
    window.requestAnimationFrame = (callback) => { pending.push(callback); return pending.length; };
    window.cancelAnimationFrame = () => { pending = []; };
    const runFrame = () => {
      const due = pending;
      pending = [];
      for (const callback of due) callback(clock);
    };

    doc.querySelector('[data-editor-play]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    runFrame();
    const first = doc.querySelector('.editor-playhead');
    assert.ok(first, 'the playhead is drawn while the score plays');
    const firstY = Number(first.getAttribute('y'));

    // The second system starts halfway through: jump the clock there, then
    // let one more frame draw.
    clock += 30000;
    runFrame();
    const later = doc.querySelector('.editor-playhead');
    assert.ok(later, 'the playhead is still drawn');
    assert.ok(
      Number(later.getAttribute('y')) > firstY,
      'the playhead moved down to the system the music reached',
    );
    doc.querySelector('[data-editor-stop]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });

  describe('writing more than one note on a beat', () => {
    /**
     * jsdom has no layout, so the pointer is given a 20x scale from SVG
     * units to client pixels and each note's box comes from the glyphs it
     * actually drew -- which is exactly what the editor's hit test reads.
     */
    const SCALE = 20;

    function installPointer(window) {
      window.SVGElement.prototype.getScreenCTM = () => ({
        a: SCALE, b: 0, c: 0, d: SCALE, e: 0, f: 0,
        inverse: () => ({ a: 1 / SCALE, b: 0, c: 0, d: 1 / SCALE, e: 0, f: 0 }),
      });
      window.DOMPoint = class {
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        matrixTransform(m) { return new window.DOMPoint(this.x * m.a + m.e, this.y * m.d + m.f); }
      };
      window.SVGElement.prototype.getBBox = function () {
        const points = [...this.querySelectorAll('text')].map((text) => ({
          x: Number(text.getAttribute('x')),
          y: Number(text.getAttribute('y')),
        }));
        if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
        const xs = points.map((point) => point.x);
        const ys = points.map((point) => point.y);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        return { x: x - 0.3, y: y - 0.3, width: Math.max(...xs) - x + 0.6, height: Math.max(...ys) - y + 0.6 };
      };
    }

    /** The page, plus the three gestures a test needs: press, read, save. */
    function openForClicking(options = {}) {
      const { window } = loadEditorPage(options);
      installPointer(window);
      const doc = window.document;
      const host = doc.querySelector('[data-editor-score]');
      return {
        window,
        doc,
        status: () => doc.querySelector('[data-editor-status]').textContent,
        press: (x, y, shiftKey = false) => host.dispatchEvent(
          new window.PointerEvent('pointerdown', {
            clientX: x * SCALE, clientY: y * SCALE, shiftKey, bubbles: true,
          }),
        ),
        /** Saves through the page's own Save button and returns the XML. */
        saved: () => {
          doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
          return JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
        },
      };
    }

    /** Measure 1's noteheads, top to bottom, with a `+` on the chord members. */
    const barOneNotes = (xml) => {
      const measure = (xml.match(/<measure number="1">[\s\S]*?<\/measure>/) || [''])[0];
      return [...measure.matchAll(/<note>[\s\S]*?<\/note>/g)]
        .map((match) => match[0].replace(/\s+/g, ''))
        .filter((note) => !note.includes('<rest'))
        .map((note) => {
          const pitch = note.match(/<step>(\w)<\/step>(?:<alter>(-?\d+)<\/alter>)?<octave>(\d)/);
          const name = pitch === null ? '?' : `${pitch[1]}${pitch[2] ?? ''}${pitch[3]}`;
          return note.includes('<chord/>') ? `+${name}` : name;
        });
    };

    test('Chord mode stacks plain clicks, so a triad needs no Shift', () => {
      const page = openForClicking();
      // Three lines, three plain clicks: a writer who turns the mode on has
      // said "these belong together", so the second and third must stack
      // rather than replace. Shift still works and means the same thing.
      const chordButton = page.doc.querySelector('[data-editor-chord]');
      assert.ok(chordButton, 'the row has no chord control');
      chordButton.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      assert.equal(chordButton.getAttribute('aria-pressed'), 'true', 'the control shows chord mode is on');

      page.press(9, 11.7);
      assert.equal(page.status(), 'Inserted B4.');
      page.press(9, 10.7);
      assert.equal(page.status(), 'Note added to chord.');
      page.press(9, 12.7);
      assert.equal(page.status(), 'Note added to chord.');
      assert.deepEqual(barOneNotes(page.saved()), ['B4', '+D5', '+G4']);

      // Turning it off gives the beat back to replacement: the chord is
      // replaced by the one note written on it.
      chordButton.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      assert.equal(chordButton.getAttribute('aria-pressed'), 'false');
      page.press(9, 12.7);
      assert.match(page.status(), /^Replaced with /);
      assert.deepEqual(barOneNotes(page.saved()), ['G4']);
    });

    test('Shift-clicking a second line stacks it on the first instead of replacing it', () => {
      const page = openForClicking();
      // The starter staff's middle line, then one line above and one below.
      page.press(9, 11.7);
      assert.equal(page.status(), 'Inserted B4.');
      page.press(9, 10.7, true);
      assert.equal(page.status(), 'Note added to chord.');
      page.press(9, 12.7, true);
      assert.equal(page.status(), 'Note added to chord.');
      assert.deepEqual(barOneNotes(page.saved()), ['B4', '+D5', '+G4']);
    });

    test('Shift-clicking a line already in the chord leaves the chord alone', () => {
      const page = openForClicking();
      page.press(9, 11.7);
      page.press(9, 10.7, true);
      page.press(9, 10.7, true);
      assert.equal(page.status(), 'D5 is already in the chord.');
      assert.deepEqual(barOneNotes(page.saved()), ['B4', '+D5']);
    });

    test('Shift and a note letter stacks a note on the beat the cursor is on', () => {
      const page = openForClicking();
      page.press(9, 11.7);
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', {
        key: 'E', shiftKey: true, bubbles: true,
      }));
      assert.equal(page.status(), 'Note added to chord.');
      assert.deepEqual(barOneNotes(page.saved()), ['B4', '+E4']);
    });

    test('a drum kit stacks two drums on one beat', () => {
      const page = openForClicking({
        newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 1 },
      });
      // The kit's staff has its bottom line at y 14, so a drum's staff
      // position p is drawn at y = 14 + p: bass drum -0.5, snare -2.5.
      page.press(9, 14 - 0.5);
      assert.equal(page.status(), 'Inserted Bass Drum 1.');
      page.press(9, 14 - 2.5, true);
      assert.match(page.status(), /^Added .+ to the chord\.$/);
      const instruments = [...(page.saved().match(/<measure number="1">[\s\S]*?<\/measure>/) || [''])[0]
        .matchAll(/<instrument id="([^"]+)"\/>/g)].map((match) => match[1]);
      assert.equal(instruments.length, 2, 'both drums are written on the one beat');
      assert.notEqual(instruments[0], instruments[1], 'and they are different drums');
    });

    test('the staff does not move while a drum groove is written', () => {
      // The staff is what the writer clicks. Every drum written above the
      // old one used to push the whole staff down, so the next click
      // landed on a line that was no longer where it had been aimed --
      // which is what made kick + hi-hat chords impossible.
      const page = openForClicking({
        newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 4 },
      });
      const staffLines = () => {
        const lines = [...page.doc.querySelectorAll('[data-editor-score] svg line')]
          .map((line) => ({
            y: Number(line.getAttribute('y1')),
            end: Number(line.getAttribute('y2')),
            x1: Number(line.getAttribute('x1')),
            x2: Number(line.getAttribute('x2')),
          }))
          .filter((line) => line.y === line.end);
        const widest = Math.max(...lines.map((line) => Math.abs(line.x2 - line.x1)));
        return [...new Set(lines.filter((l) => Math.abs(l.x2 - l.x1) > widest * 0.8).map((l) => l.y))]
          .sort((a, b) => a - b);
      };
      const before = staffLines();
      assert.equal(before.length, 5);
      const bottom = before[before.length - 1];
      // From the crash down to the kick, each drum on its own beat.
      for (const position of [-5, -4.5, -4, -3, -2.5, -2, -0.5]) {
        page.press(9, bottom + position);
      }
      assert.deepEqual(staffLines(), before, 'the staff must stay on the same lines');
    });

    test('both drums sharing a staff line can be written', () => {
      // Closed and open hi-hat share one line, and so do the high tom and
      // the ride. Keying the kit by line alone kept only the last drum of
      // each pair, so the other could never be reached at all.
      const page = openForClicking({
        newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 1 },
      });
      page.press(9, 14 - 4.5);
      assert.equal(page.status(), 'Inserted Closed Hi-Hat.');
      page.press(9, 14 - 4.5, true);
      assert.equal(page.status(), 'Added Open Hi-Hat to the chord.');
      page.press(9, 14 - 4, true);
      assert.equal(page.status(), 'Added High Tom to the chord.');
      page.press(9, 14 - 4, true);
      assert.equal(page.status(), 'Added Ride Cymbal 1 to the chord.');
      const instruments = [...(page.saved().match(/<measure number="1">[\s\S]*?<\/measure>/) || [''])[0]
        .matchAll(/<instrument id="([^"]+)"\/>/g)].map((match) => match[1]);
      assert.equal(instruments.length, 4, 'all four drums are on the one beat');
      assert.equal(new Set(instruments).size, 4, 'and they are four different drums');
    });
  });

  describe('the SoundFont the host asks for', () => {
    /** A manifest shaped like the one on R2: the paths live under `runtime`, not on each asset. */
    const MANIFEST = {
      schemaVersion: 1,
      assets: [
        { id: 'ms-basic', displayName: 'MS Basic', format: 'sf3', version: 'deprecated' },
        { id: 'musescore-general-sf3', displayName: 'MuseScore General', format: 'sf3', version: '0.2' },
        { id: 'generaluser-gs', displayName: 'GeneralUser GS', format: 'sf2', version: '1.472' },
      ],
      runtime: {
        defaultAssetId: 'musescore-general-sf3',
        assetPaths: {
          'ms-basic': 'ms-basic/official-deprecated-master/MS Basic.sf3',
          'musescore-general-sf3': 'musescore-general/v0.2/MuseScore_General.sf3',
          'generaluser-gs': 'generaluser-gs/v1.472/GeneralUser GS v1.472.sf2',
        },
      },
    };

    /** Opens the page with a stubbed manifest and captures what `create()` was handed. */
    function openWithManifest({ manifest = MANIFEST, configure = {}, fetchOk = true } = {}) {
      const created = [];
      const page = loadEditorPage({
        globals: {
          MSHARING_SOUNDFONT_CONFIG: {
            manifestUrl: 'https://fonts.test/soundfonts/manifest.json',
            assetBaseUrl: 'https://fonts.test/soundfonts',
            ...configure,
          },
          fetch: async () => (fetchOk
            ? { ok: true, status: 200, json: async () => manifest }
            : { ok: false, status: 503, json: async () => ({}) }),
          NotationSoundFont: {
            R2SoundFontEngine: {
              create: async (options) => {
                created.push(options);
                return { play: () => {}, pause: () => {}, setTracks: () => {}, preview: () => {} };
              },
            },
          },
        },
      });
      return { ...page, created };
    }

    /** Presses Play and lets the manifest fetch and the engine creation settle. */
    async function playAndSettle(window) {
      window.document
        .querySelector('[data-editor-play]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      for (let i = 0; i < 40; i += 1) await new Promise((resolve) => window.setTimeout(resolve, 5));
    }

    test("the manifest's own default asset is the one created, not the first asset it lists", async () => {
      const { window, created } = openWithManifest();
      await playAndSettle(window);

      assert.equal(created.length, 1, 'one engine is created for the first playback');
      assert.equal(
        created[0].assetId,
        'musescore-general-sf3',
        "the manifest's defaultAssetId wins over the first listed asset",
      );
    });

    test("the manifest's asset paths reach the engine, so its own table stays a fallback", async () => {
      const { window, created } = openWithManifest();
      await playAndSettle(window);

      assert.equal(created.length, 1);
      assert.deepEqual(
        created[0].assetPaths,
        MANIFEST.runtime.assetPaths,
        'the host passes runtime.assetPaths through untouched',
      );
    });

    test('a configured asset id wins over the manifest default', async () => {
      const { window, created } = openWithManifest({ configure: { assetId: 'generaluser-gs' } });
      await playAndSettle(window);

      assert.equal(created[0].assetId, 'generaluser-gs', 'an explicit host choice is honoured');
    });

    test('a manifest that names no default falls back to its first asset', async () => {
      const manifest = { ...MANIFEST, runtime: { assetPaths: MANIFEST.runtime.assetPaths } };
      const { window, created } = openWithManifest({ manifest });
      await playAndSettle(window);

      assert.equal(created[0].assetId, 'ms-basic', 'with no default stated, the first listed asset is used');
    });

    test('an unreachable manifest still lets the score play', async () => {
      const { window, created } = openWithManifest({ fetchOk: false });
      await playAndSettle(window);

      assert.equal(created.length, 1, 'a failed manifest must not stop playback');
      assert.equal(created[0].assetPaths, undefined, 'and it must not invent paths');
      assert.equal(created[0].assetId, undefined, 'nor an asset id it never learned');
    });
  });

  describe('the workspace', () => {
    test('the score is the only thing beside the status line', () => {
      const { window, errors } = loadEditorPage();
      const doc = window.document;
      assert.deepEqual(errors, [], 'the page must start without a script error');

      assert.equal(doc.querySelector('[data-editor-sidebar]'), null, 'the sidebar must be gone');
      assert.equal(doc.querySelector('[data-editor-palette]'), null, 'the palette went with the sidebar');
      assert.equal(doc.querySelector('[data-editor-canvas]'), null, 'the canvas is folded into the score host');

      const workspace = doc.querySelector('main.editor-workspace');
      assert.deepEqual(
        [...workspace.children].map((node) => node.className),
        ['editor-score', 'editor-status'],
      );
      assert.equal(doc.querySelector('[data-editor-score]').dataset.layout, 'page', 'the score host carries the layout');
    });
  });
});
