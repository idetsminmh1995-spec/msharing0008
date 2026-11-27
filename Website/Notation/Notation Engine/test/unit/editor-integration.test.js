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
function loadEditorPage({ url = 'https://example.test/notation-editor.html?intent=create', pendingXml, newScore, globals, localStorage: stored } = {}) {
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
  // Anything the boot reads out of storage on its first tick -- the dock's
  // own palette list, say -- has to be in place before the scripts run.
  for (const [key, value] of Object.entries(stored ?? {})) {
    window.localStorage.setItem(key, value);
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
    // once Export is pressed, so they are not counted as bar controls. The
    // instrument and mixer boxes hang off the bar the same way.
    const controls = [...bars[0].querySelectorAll('button, output, select, input')]
      .filter((control) => !control.closest('[data-editor-export-list]'))
      .filter((control) => !control.closest('[data-editor-popover-panel]'));
    assert.deepEqual(
      controls.map((control) => control.getAttribute('aria-label')),
      ['Play', 'Stop', 'Metronome', 'MIDI keyboard', 'Inst.', 'Mixer', 'Page view', 'Horizontal view', 'Score length', 'Zoom out', 'Zoom level', 'Zoom in', 'Save', 'Export'],
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
      ['Playback', 'Instrument', 'View', 'Length', 'Zoom', 'File'],
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
      'Tuplets',
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

  test('a grand staff keeps a treble note and a bass note on the same beat', () => {
    const { window } = loadEditorPage({
      newScore: {
        title: 'Piano',
        instrumentIds: ['piano'],
        staffKind: 'grand',
        key: 'C',
        time: '4/4',
        tempo: 120,
        measures: 1,
      },
    });
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });

    const staffYs = () => {
      const svg = doc.querySelector('[data-editor-score] svg');
      const ys = [...svg.querySelectorAll('line')]
        .filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
          && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
        .map((line) => Number(line.getAttribute('y1')));
      return [...new Set(ys)].sort((a, b) => a - b);
    };
    const click = (clientY) => {
      const svg = doc.querySelector('[data-editor-score] svg');
      const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
        clientX: pageWidth * 0.1,
        clientY,
        bubbles: true,
      }));
    };
    const groups = () => {
      const svg = doc.querySelector('[data-editor-score] svg');
      return [...svg.querySelectorAll('[data-id]')]
        .filter((group) => /m1#/.test(group.getAttribute('data-id')));
    };

    const ys = staffYs();
    assert.ok(ys.length >= 10, `a grand staff draws two five-line staves, got ${ys.length} lines`);

    click(ys[1]);
    const afterTreble = groups().length;
    assert.match(doc.querySelector('[data-editor-status]').textContent, /Inserted/);

    click(ys[ys.length - 2]);
    assert.equal(
      groups().length,
      afterTreble + 1,
      'the bass note must be added, not replace the treble note',
    );
  });

  test('chord mode on a grand staff never joins notes from two staves', () => {
    const { window } = loadEditorPage({
      newScore: {
        title: 'Piano',
        instrumentIds: ['piano'],
        staffKind: 'grand',
        key: 'C',
        time: '4/4',
        tempo: 120,
        measures: 1,
      },
    });
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });

    const staffYs = () => {
      const svg = doc.querySelector('[data-editor-score] svg');
      const ys = [...svg.querySelectorAll('line')]
        .filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
          && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3)
        .map((line) => Number(line.getAttribute('y1')));
      return [...new Set(ys)].sort((a, b) => a - b);
    };
    const click = (clientY) => {
      const svg = doc.querySelector('[data-editor-score] svg');
      const [, , pageWidth] = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
        clientX: pageWidth * 0.1,
        clientY,
        bubbles: true,
      }));
    };

    doc.querySelector('[data-editor-chord]').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );

    const ys = staffYs();
    click(ys[1]);
    click(ys[ys.length - 2]);

    // Read the score itself, not the SVG: an empty grand staff already
    // draws a placeholder rest on each staff, so counting groups would pass
    // whether or not a note was written. Save writes the score as MusicXML,
    // which names each note's staff.
    doc.querySelector('[data-editor-save]').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );
    const saved = JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]');
    const xml = saved[0]?.xml ?? '';
    const measure = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
    const pitched = [...measure.matchAll(/<note>([\s\S]*?)<\/note>/g)]
      .map((match) => match[1])
      .filter((note) => /<pitch>/.test(note));
    const staves = [...new Set(
      pitched.map((note) => note.match(/<staff>(\d+)<\/staff>/)?.[1] ?? '1'),
    )].sort();
    assert.deepEqual(
      staves,
      ['1', '2'],
      'a chord click on each staff must leave a note on that staff',
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

  test('the Inst. box shows a keyboard for a pitched part and writes the key that was pressed', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const inst = doc.querySelector('[data-editor-popover="inst"]');
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');
    assert.equal(inst.disabled, false, 'a loaded score can open the instrument box');

    inst.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false, 'the box opens under its button');

    const whites = panel.querySelectorAll('.editor-inst__white');
    assert.equal(whites.length, 52, 'a piano has 52 white keys');
    assert.equal(panel.querySelectorAll('.editor-inst__black').length, 36, 'and 36 black ones');
    assert.match(panel.querySelector('.editor-inst__title').textContent, /88 keys/);

    // The whole instrument, not a window onto it: A0 is the lowest key and
    // C8 the highest, which is what makes a bass line and a high melody
    // both reachable from the panel.
    const keys = [...panel.querySelectorAll('[data-editor-inst-key]')].map(
      (node) => node.dataset.editorInstKey,
    );
    assert.equal(keys[0], 'A0');
    assert.equal(keys[keys.length - 1], 'C8');

    // A key press writes the note it names, at the cursor.
    const key = [...whites].find((node) => node.dataset.editorInstKey === 'G4');
    key.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Inserted G4/);

    // A black key writes its accidental.
    const sharp = [...panel.querySelectorAll('.editor-inst__black')]
      .find((node) => node.dataset.editorInstKey === 'C#4');
    sharp.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Inserted C#4/);
  });

  test('Shift-clicking the Inst. keys stacks a chord instead of replacing the beat', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');
    const key = (name) => panel.querySelector(`[data-editor-inst-key="${name}"]`);
    const click = (node, init = {}) =>
      node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, ...init }));

    // A C major triad is three presses on the panel, the same Shift
    // gesture the staff uses. Without it each press landed on the beat and
    // replaced the note before, so a chord could never be written here.
    click(key('C4'));
    assert.match(status(), /Inserted C4/);
    click(key('E4'), { shiftKey: true });
    assert.match(status(), /chord/i);
    click(key('G4'), { shiftKey: true });
    assert.match(status(), /chord/i);

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    const measure = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
    assert.equal((measure.match(/<chord\/>/g) ?? []).length, 2, 'E and G join the beat C started');
    const steps = [...measure.matchAll(/<step>([A-G])<\/step>/g)].map((match) => match[1]);
    assert.deepEqual(steps, ['C', 'E', 'G'], `the triad is written, got ${steps}`);
  });

  test('Shift-clicking a drum pad stacks Kick and Hi-Hat on one beat', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');
    const pad = (name) => [...panel.querySelectorAll('.editor-inst__drum')].find((node) => node.textContent === name);
    const click = (node, init = {}) =>
      node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, ...init }));

    click(pad('Bass Drum 1'));
    assert.match(status(), /Inserted Bass Drum 1/);
    click(pad('Closed Hi-Hat'), { shiftKey: true });
    assert.match(status(), /chord/i);

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    const measure = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
    assert.equal((measure.match(/<chord\/>/g) ?? []).length, 1, 'the hi-hat joins the kick');
    // The kit states each drum as its instrument id: GM 36 is Bass Drum 1
    // and GM 42 is Closed Hi-Hat, both written 1-based.
    assert.match(measure, /<instrument id="P1-I36"\/>/);
    assert.match(measure, /<instrument id="P1-I42"\/>/);
  });

  test('a toolbar tool leaves the Inst. box open, so a chord can be built from it', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');
    const chord = doc.querySelector('[data-editor-chord]');
    const press = (node) => node.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));

    doc.querySelector('[data-editor-popover="inst"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false);

    // Chord mode and the note values are settings you change while writing
    // on the keys. Folding the panel on the press made the two gestures
    // unusable together: reaching for chord mode closed the keyboard.
    press(chord);
    chord.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false, 'pressing chord mode keeps the keyboard open');
    assert.equal(chord.getAttribute('aria-pressed'), 'true');

    // A press on the score still folds it away, so the staff stays one tap
    // away.
    doc.body.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.equal(panel.hidden, true);
  });

  test('the Inst. box shows the guitar\'s own strings and frets, and a fret writes that pitch', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Guitar', instrumentIds: ['acoustic-guitar'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');

    // Six strings, each with an open string and twelve frets, and the top
    // line is string 1 -- the highest string, as a player counts them.
    const strings = panel.querySelectorAll('.editor-inst__string');
    assert.equal(strings.length, 6);
    assert.equal(strings[0].querySelectorAll('.editor-inst__fret').length, 13);
    assert.match(strings[0].querySelector('.editor-inst__string-label').textContent, /S1 E4/);
    assert.match(strings[5].querySelector('.editor-inst__string-label').textContent, /S6 E2/);

    // A fret states the string and the fret, so the note lands where a tab
    // staff would draw it, and the pitch is the open string plus the fret.
    const fifthFret = panel.querySelector('[data-editor-inst-fret="1:5"]');
    assert.equal(fifthFret.title, 'A4');
    fifthFret.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Inserted A4/);

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    assert.match(xml, /<string>1<\/string>/, 'the string is written into the file');
    assert.match(xml, /<fret>5<\/fret>/, 'and so is the fret');
  });

  test('Shift-clicking a fret stacks a chord on a fretted part', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Guitar', instrumentIds: ['acoustic-guitar'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');
    const click = (node, init = {}) =>
      node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, ...init }));

    // Three strings stopped at the same fret are a chord, and the fretboard
    // is where a guitarist shapes one -- so it needs the same Shift gesture
    // the keys and the staff already honour.
    click(panel.querySelector('[data-editor-inst-fret="6:3"]'));
    assert.match(status(), /Inserted/);
    click(panel.querySelector('[data-editor-inst-fret="5:2"]'), { shiftKey: true });
    assert.match(status(), /chord/i);

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    const measure = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
    assert.equal((measure.match(/<chord\/>/g) ?? []).length, 1, 'the second string joins the beat');
    assert.match(measure, /<string>6<\/string>/);
    assert.match(measure, /<string>5<\/string>/);
  });

  test('the Inst. box shows drum pads for a kit part, and a pad writes that drum', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const status = () => doc.querySelector('[data-editor-status]').textContent;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');

    assert.equal(panel.querySelector('.editor-inst__title').textContent, 'Percussion');
    const pads = [...panel.querySelectorAll('.editor-inst__drum')];
    assert.equal(pads.length, 9, 'the nine drums a new kit declares');
    const names = pads.map((pad) => pad.textContent);
    assert.ok(names.includes('Bass Drum 1') && names.includes('Acoustic Snare'), `unexpected pads: ${names}`);

    // The pad writes its own drum, not whichever drum happens to share the
    // line: Open Hi-Hat and Closed Hi-Hat sit on one line.
    const open = pads.find((pad) => pad.textContent === 'Open Hi-Hat');
    open.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(status(), /Inserted Open Hi-Hat/);

    doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const xml = JSON.parse(window.localStorage.getItem('msharing-notation-scores') ?? '[]')[0]?.xml ?? '';
    // GM key 46 is Open Hi-Hat, stated 1-based as 47.
    assert.match(xml, /<midi-unpitched>47<\/midi-unpitched>|Open Hi-Hat/);
  });

  test('the Inst. box takes the editor\'s width instead of a box under its button', () => {
    // MuseScore's instrument panel is a strip across the window: a keyboard,
    // a fretboard or a row of pads does not fit a narrow popover, and a box
    // sized to its contents would force every one of them to wrap. The panel
    // is placed from the score workspace's own width instead.
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const panel = doc.querySelector('[data-editor-popover-panel="inst"]');
    const workspace = doc.querySelector('[data-editor-score]');
    const style = doc.querySelector('link[rel="stylesheet"]').getAttribute('href');
    const css = fs.readFileSync(path.join(appDir, style.split('?')[0]), 'utf8');

    // jsdom has no layout, so the widths are stated: the workspace is 900
    // wide and starts at x=20, and the box is opened against it.
    workspace.getBoundingClientRect = () => ({
      x: 20, y: 0, width: 900, height: 400, top: 0, left: 20, right: 920, bottom: 400,
    });
    doc.querySelector('[data-editor-popover="inst"]').dispatchEvent(
      new window.MouseEvent('click', { bubbles: true }),
    );
    assert.equal(panel.hidden, false);
    assert.equal(panel.style.width, '900px', 'the box spans the score workspace, not its contents');
    assert.equal(panel.style.left, '20px', 'and it lines up with the workspace');

    // The rule that lets it grow past a popover's ceiling, and the strip
    // that fills it, both have to be in the stylesheet -- a fixed max-width
    // is what kept the box small before.
    const rule = css.match(/\.editor-popover--inst\s*\{[^}]*\}/);
    assert.ok(rule, 'the instrument box has no rule of its own');
    assert.match(rule[0], /max-width:none/, 'the instrument box is not capped to a popover width');
    assert.match(css, /\.editor-inst__piano\s*\{[^}]*width:100%/, 'the keyboard fills the box');
  });

  test('the Inst. box shows a percussion strip for a kit and a fretboard for a guitar', () => {
    // The box follows the part being written, which is what makes one
    // panel serve every instrument: a kit gets pads, a guitar gets its own
    // strings and frets, and the pitch instruments get the keyboard.
    const kit = loadEditorPage({
      newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const kitPanel = kit.window.document.querySelector('[data-editor-popover-panel="inst"]');
    assert.equal(kitPanel.querySelector('.editor-inst__title').textContent, 'Percussion');
    assert.equal(kitPanel.querySelectorAll('.editor-inst__drum').length, 9);

    const guitar = loadEditorPage({
      newScore: { title: 'Guitar', instrumentIds: ['acoustic-guitar'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const guitarPanel = guitar.window.document.querySelector('[data-editor-popover-panel="inst"]');
    assert.match(guitarPanel.querySelector('.editor-inst__title').textContent, /Acoustic Guitar/);
    assert.equal(guitarPanel.querySelectorAll('.editor-inst__string').length, 6);
    assert.equal(guitarPanel.querySelectorAll('.editor-inst__piano').length, 0, 'a guitar is not given a keyboard');
  });

  test('the sidebar opens from its handle and closes on a press anywhere else', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const sidebar = doc.querySelector('[data-editor-sidebar]');
    const handle = doc.querySelector('[data-editor-sidebar-handle]');
    const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // Hidden by default: the score owns the window, and only an arrow is
    // left on the edge, which is how MuseScore's dock behaves.
    assert.equal(sidebar.hidden, true);
    click(handle);
    assert.equal(sidebar.hidden, false, 'the handle opens the dock');
    assert.equal(handle.getAttribute('aria-expanded'), 'true');
    assert.equal(handle.getAttribute('aria-label'), 'Close sidebar');

    // The handle is a toggle, so the same control puts it away again.
    click(handle);
    assert.equal(sidebar.hidden, true);
    assert.equal(handle.getAttribute('aria-expanded'), 'false');

    // A press on the score is what closes it, so writing is never behind
    // a panel the writer has to find a button for.
    click(handle);
    assert.equal(sidebar.hidden, false);
    doc.body.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.equal(sidebar.hidden, true, 'a press outside the dock folds it away');

    // A press INSIDE the dock leaves it open -- that is where the panels
    // are used from.
    click(handle);
    sidebar.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    assert.equal(sidebar.hidden, false, 'using the dock keeps it open');
  });

  test('the Inst. box and the sidebar are never open together', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const sidebar = doc.querySelector('[data-editor-sidebar]');
    const handle = doc.querySelector('[data-editor-sidebar-handle]');
    const instButton = doc.querySelector('[data-editor-popover="inst"]');
    const instPanel = doc.querySelector('[data-editor-popover-panel="inst"]');
    const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // Two panels over one score: the second one opened is the one that
    // stays, so the writer is never looking past a panel to find another.
    click(instButton);
    assert.equal(instPanel.hidden, false);
    click(handle);
    assert.equal(sidebar.hidden, false, 'the dock opens');
    assert.equal(instPanel.hidden, true, 'and the Inst. box folds away behind it');

    click(instButton);
    assert.equal(instPanel.hidden, false, 'the Inst. box opens');
    assert.equal(sidebar.hidden, true, 'and the dock folds away behind it');
  });

  test('the dock comes back open on the tab it was left on', () => {
    const { window } = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
    });
    const doc = window.document;
    const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    click(doc.querySelector('[data-editor-sidebar-handle]'));
    click(doc.querySelector('[data-sidebar-tab="instruments"]'));

    // A reload is a fresh page reading the same storage, so the dock is
    // asked to come back where the writer left it.
    const reopened = loadEditorPage({
      newScore: { title: 'Piano', instrumentIds: ['piano'], key: 'C', time: '4/4', tempo: 120, measures: 2 },
      localStorage: { 'notation-lab-sidebar': window.localStorage.getItem('notation-lab-sidebar') },
    });
    const again = reopened.window.document;
    assert.equal(again.querySelector('[data-editor-sidebar]').hidden, false, 'the dock is still open');
    assert.equal(
      again.querySelector('[data-sidebar-tab="instruments"]').getAttribute('aria-selected'),
      'true',
      'and still on the tab it was left on',
    );
    assert.equal(
      again.querySelector('[data-editor-sidebar-handle]').getAttribute('aria-expanded'),
      'true',
      'the handle agrees with it',
    );
  });

  test('a first visit still starts with the dock put away', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    assert.equal(doc.querySelector('[data-editor-sidebar]').hidden, true, 'nothing is open over the score');
    assert.equal(doc.querySelector('[data-sidebar-tab="palettes"]').getAttribute('aria-selected'), 'true');
    assert.equal(window.localStorage.getItem('notation-lab-sidebar'), null, 'and no state is invented');
  });

  test('the Mixer box lists the score\'s parts and says its levels are not wired yet', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const mixer = doc.querySelector('[data-editor-popover="mixer"]');
    const panel = doc.querySelector('[data-editor-popover-panel="mixer"]');
    assert.equal(mixer.disabled, false);

    mixer.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false, 'the box opens under its button');
    assert.equal(panel.querySelector('.editor-inst__title').textContent, 'Mixer');
    assert.match(panel.textContent, /not wired up yet/);

    // One row per part, and its level control is inert until the mixer is
    // real -- a slider that moves but changes nothing would be a lie.
    const rows = panel.querySelectorAll('.editor-inst__row');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].querySelector('.editor-inst__slider').disabled, true);

    // Pressing the button again folds it away.
    mixer.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, true);
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

    test('chord mode leaves the beat it is not on alone, so a chord can move on', () => {
      // Chord mode used to pin every click to the beat the last note was
      // written on, wherever the pointer went. A triad could be built, but
      // the next chord landed on the same beat -- the mode had no way out
      // of the beat it was on.
      const page = openForClicking();
      const chordButton = page.doc.querySelector('[data-editor-chord]');
      chordButton.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));

      page.press(9, 11.7);
      assert.equal(page.status(), 'Inserted B4.');
      page.press(9, 10.7);
      assert.equal(page.status(), 'Note added to chord.');
      // A different beat: the cursor moves there and starts a new chord.
      page.press(15, 11.7);
      assert.equal(page.status(), 'Inserted B4.');
      const notes = barOneNotes(page.saved());
      assert.deepEqual(notes.slice(0, 3), ['B4', '+D5', 'B4'], 'a second chord opens on the next beat');
    });

    test('the beat under the pointer decides, so an eighth-note offbeat is reachable', () => {
      // A note's hit box is a notehead wide plus padding, which in a dense
      // bar overlaps the beat beside it. Every hit used to count as "you
      // clicked this note", so the press aimed at the '&' replaced the
      // note on the beat and an eighth-note groove could never be written.
      const page = openForClicking();
      page.doc.querySelector('[data-editor-duration="eighth"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));

      page.press(9, 11.7);
      assert.equal(page.status(), 'Inserted B4.');
      // 13.5 is inside the first note's hit box but a whole eighth to its
      // right: the beat under the pointer is the '&', so this writes a new
      // note rather than replacing the one on beat 1.
      page.press(13.5, 11.7);
      assert.equal(page.status(), 'Inserted B4.');
      const notes = barOneNotes(page.saved());
      assert.equal(notes.length, 2, 'two eighth notes, not one replaced note');
      assert.ok(!notes[1].startsWith('+'), 'the second note is not a chord member');
    });

    test('a drum groove writes kick and hi-hat on 1 and the hi-hat on the &', () => {
      const page = openForClicking({
        newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 1 },
      });
      page.doc.querySelector('[data-editor-duration="eighth"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      const chordButton = page.doc.querySelector('[data-editor-chord]');
      chordButton.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));

      // The kit's staff has its bottom line at y 14: the kick sits half a
      // space below it, the closed hi-hat four and a half spaces above.
      page.press(9, 14 - 0.5);
      assert.equal(page.status(), 'Inserted Bass Drum 1.');
      page.press(9, 14 - 4.5);
      assert.equal(page.status(), 'Added Closed Hi-Hat to the chord.');
      // The '&' of beat 1 is one eighth to the right.
      page.press(13.5, 14 - 4.5);
      assert.equal(page.status(), 'Inserted Closed Hi-Hat.');

      const measure = (page.saved().match(/<measure number="1">[\s\S]*?<\/measure>/) || [''])[0];
      const events = [...measure.matchAll(/<note>[\s\S]*?<\/note>/g)].map((match) => match[0].replace(/\s+/g, ''));
      const onBeatOne = events.filter((note) => !note.includes('<rest'));
      assert.equal(onBeatOne.length, 3, 'kick, hi-hat and the offbeat hi-hat are three notes');
      assert.equal(onBeatOne.filter((note) => note.includes('<chord/>')).length, 1,
        'the kick and the hi-hat share beat 1, and the offbeat stands alone');
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

  describe('the export menu', () => {
    test('Export offers the score file as well as pictures of it', () => {
      const { window } = loadEditorPage();
      const doc = window.document;
      const items = [...doc.querySelectorAll('[data-editor-export-list] [role="menuitem"]')];
      assert.deepEqual(
        items.map((item) => item.textContent),
        ['PDF', 'SVG', 'PNG', 'MusicXML', 'MXL'],
      );
    });

    test('MXL downloads an archive another program can open', async () => {
      const { window } = loadEditorPage();
      const doc = window.document;
      const saved = [];
      window.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:test'; };
      window.URL.revokeObjectURL = () => {};
      window.HTMLAnchorElement.prototype.click = function click() { saved.filename = this.download; };

      doc.querySelector('[data-editor-export-toggle]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      doc.querySelector('[data-editor-export-mxl]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => { setTimeout(resolve, 0); });

      assert.match(saved.filename, /^Untitled score\.mxl$/, 'the file is named after the score');
      const bytes = new Uint8Array(await saved[0].arrayBuffer());
      const { xmlText, diagnostics } = window.NotationEngine.unzipMxl(bytes, window.DOMParser);
      assert.deepEqual([...diagnostics], []);
      assert.match(xmlText, /<score-partwise/, 'the archive holds the score itself, not a picture');
    });
  });

  describe('the workspace', () => {
    test('the view switch draws the same score as pages or one row', () => {
      const { window } = loadEditorPage();
      const doc = window.document;
      const score = doc.querySelector('[data-editor-score]');
      const page = doc.querySelector('[data-editor-layout="page"]');
      const scroll = doc.querySelector('[data-editor-layout="scroll"]');
      const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      assert.equal(score.dataset.layout, 'page', 'the editor opens on pages');
      assert.equal(page.getAttribute('aria-pressed'), 'true');
      assert.equal(scroll.getAttribute('aria-pressed'), 'false');
      assert.ok(score.querySelector('svg'), 'and a score is drawn');

      click(scroll);
      assert.equal(score.dataset.layout, 'scroll', 'Horizontal redraws the score as one row');
      assert.equal(scroll.getAttribute('aria-pressed'), 'true');
      assert.equal(page.getAttribute('aria-pressed'), 'false');
      assert.ok(score.querySelector('svg'), 'the score is still there');
      assert.match(doc.querySelector('[data-editor-status]').textContent, /Horizontal view/);

      // The two modes are one document drawn two ways, so going back does
      // not lose the score.
      click(page);
      assert.equal(score.dataset.layout, 'page');
      assert.ok(score.querySelector('svg'), 'and Page view draws it again');
    });

    test('the workspace holds the score, the status line and a dock that stays out of the way', () => {
      const { window, errors } = loadEditorPage();
      const doc = window.document;
      assert.deepEqual(errors, [], 'the page must start without a script error');

      // The dock is part of the editor again, but it does not take a column
      // of the score to be there: it starts hidden behind an arrow handle on
      // the left edge, which is the only control that opens it.
      const sidebar = doc.querySelector('[data-editor-sidebar]');
      const handle = doc.querySelector('[data-editor-sidebar-handle]');
      assert.ok(sidebar, 'the dock is in the page');
      assert.equal(sidebar.hidden, true, 'and it starts out of the way');
      assert.ok(handle, 'the handle is what opens it');
      assert.equal(handle.getAttribute('aria-expanded'), 'false');
      assert.equal(handle.getAttribute('aria-controls'), sidebar.id, 'the handle names the dock it opens');
      assert.equal(doc.querySelector('[data-editor-canvas]'), null, 'the canvas is folded into the score host');

      const workspace = doc.querySelector('main.editor-workspace');
      assert.deepEqual(
        [...workspace.children].map((node) => node.className),
        ['editor-sidebar__handle', 'editor-sidebar', 'editor-score', 'editor-status'],
      );
      assert.equal(doc.querySelector('[data-editor-score]').dataset.layout, 'page', 'the score host carries the layout');
    });
  });

  describe('the palette edit commands', () => {
    /** A two-bar score parsed by the engine, ready for a doc-layer edit. */
    function parsedScore() {
      const { window, engine, doc } = loadEditor();
      return { window, engine, doc, parsed: engine.parseMusicXml(STARTER_XML, window.DOMParser) };
    }

    test('a clef change is written into both the bar state and the change timeline', () => {
      const { doc, parsed } = parsedScore();
      const next = doc.setAttributesFrom(parsed, {
        partId: 'P1',
        measureNumber: 2,
        patch: { clefSign: 'F', clefLine: 4, clefsByStaff: { 1: { sign: 'F', line: 4 } } },
      });

      // The bar rows carry the change from that bar on, so a later bar does
      // not silently fall back to the old clef.
      for (const number of [2]) {
        assert.equal(next.attributes.find((a) => a.measureNumber === number).clefSign, 'F');
      }
      assert.equal(next.attributes.find((a) => a.measureNumber === 1).clefSign, 'G', 'the bars before it keep theirs');
      // The renderer draws from `attributeChanges`, so the change has to be
      // there as well or nothing moves on the page.
      const change = next.attributeChanges.find((entry) => entry.measureNumber === 2);
      assert.equal(change.clefSign, 'F');
      assert.equal(change.clefLine, 4);
    });

    test('a meter change refills every bar to its own new width', () => {
      const { doc, parsed } = parsedScore();
      const next = doc.setAttributesFrom(parsed, {
        partId: 'P1',
        measureNumber: 1,
        patch: { timeNumerator: 3, timeDenominator: 4 },
      });
      const attribute = next.attributes.find((a) => a.measureNumber === 1);
      assert.equal(attribute.timeNumerator, 3);
      assert.equal(doc.ticksPerMeasure(next, 'P1', 1), 3 * 480, 'three quarters, not four');
    });

    test('a barline is written onto that one bar and nowhere else', () => {
      const { doc, parsed } = parsedScore();
      const next = doc.setBarline(parsed, {
        partId: 'P1',
        measureNumber: 2,
        patch: { barlineStyle: 'light-heavy', repeatDirection: 'backward' },
      });
      const bar = next.attributes.find((a) => a.measureNumber === 2);
      assert.equal(bar.barlineStyle, 'light-heavy');
      assert.equal(bar.repeatDirection, 'backward');
      assert.equal(next.attributes.find((a) => a.measureNumber === 1).barlineStyle, undefined);
    });

    test('a tempo mark replaces the one on its own beat and clears again', () => {
      const { doc, parsed } = parsedScore();
      const sixty = doc.setTempo(parsed, { partId: 'P1', measureNumber: 1, perMinute: 60 });
      assert.equal(sixty.tempoMarks.length, 1);
      const ninety = doc.setTempo(sixty, { partId: 'P1', measureNumber: 1, perMinute: 90 });
      assert.equal(ninety.tempoMarks.length, 1, 'one mark per beat, not a growing list');
      assert.equal(ninety.tempoMarks[0].perMinute, 90);
      const cleared = doc.setTempo(ninety, { partId: 'P1', measureNumber: 1, perMinute: null });
      assert.equal(cleared.tempoMarks.length, 0);
    });

    test('marks at one beat share one direction and it goes when it empties', () => {
      const { doc, parsed } = parsedScore();
      const withWord = doc.setDirection(parsed, {
        partId: 'P1',
        measureNumber: 1,
        tick: 0,
        merge: (direction) => ({ ...direction, words: ['dolce'] }),
      });
      assert.equal(withWord.directions.length, 1);
      const withPedal = doc.setDirection(withWord, {
        partId: 'P1',
        measureNumber: 1,
        tick: 0,
        merge: (direction) => ({ ...direction, pedals: [{ type: 'start', number: 1 }] }),
      });
      assert.equal(withPedal.directions.length, 1, 'a word and a pedal on one beat are one direction');
      assert.deepEqual(withPedal.directions[0].words, ['dolce']);
      assert.deepEqual(withPedal.directions[0].pedals, [{ type: 'start', number: 1 }]);

      // Taking the last mark away drops the direction rather than leaving an
      // empty one the writer can never see or delete.
      const emptied = doc.setDirection(withPedal, {
        partId: 'P1',
        measureNumber: 1,
        tick: 0,
        merge: (direction) => ({ ...direction, words: [], pedals: [] }),
      });
      assert.equal(emptied.directions.length, 0);
    });

    test('a page or system break is set and cleared per bar', () => {
      const { doc, parsed } = parsedScore();
      const broken = doc.setPrint(parsed, { partId: 'P1', measureNumber: 2, newPage: true });
      assert.equal(broken.prints.length, 1);
      assert.equal(broken.prints[0].measureNumber, 2);
      assert.equal(broken.prints[0].newPage, true);
      const cleared = doc.setPrint(broken, { partId: 'P1', measureNumber: 2 });
      assert.equal(cleared.prints.length, 0);
    });

    test('every palette command survives a round trip through MusicXML', () => {
      const { window, engine, doc, parsed } = parsedScore();
      let next = doc.setAttributesFrom(parsed, {
        partId: 'P1',
        measureNumber: 1,
        patch: { clefSign: 'F', clefLine: 4, clefsByStaff: { 1: { sign: 'F', line: 4 } } },
      });
      next = doc.setBarline(next, { partId: 'P1', measureNumber: 2, patch: { barlineStyle: 'light-heavy' } });
      next = doc.setTempo(next, { partId: 'P1', measureNumber: 1, perMinute: 72 });
      next = doc.setDirection(next, {
        partId: 'P1',
        measureNumber: 1,
        tick: 0,
        merge: (direction) => ({ ...direction, words: ['dolce'], pedals: [{ type: 'start', number: 1 }] }),
      });
      next = doc.setPrint(next, { partId: 'P1', measureNumber: 2, newSystem: true });

      const xml = doc.toMusicXml(next);
      assert.match(xml, /<sign>F<\/sign>/, 'the clef is in the file');
      assert.match(xml, /<bar-style>light-heavy<\/bar-style>/, 'the barline is in the file');
      assert.match(xml, /<sound tempo="72"/, 'the tempo is in the file');
      assert.match(xml, /<words>dolce<\/words>/, 'the text is in the file');
      assert.match(xml, /<pedal type="start"/, 'the pedal is in the file');
      assert.match(xml, /<print new-system="yes"/, 'the break is in the file');

      // And the engine reads it all back, so the writer sees what was saved.
      const reread = engine.parseMusicXml(xml, window.DOMParser);
      assert.equal(reread.attributes.find((a) => a.measureNumber === 1).clefSign, 'F');
      assert.equal(reread.tempoMarks[0].perMinute, 72);
      // The writer emits one `<direction>` per mark, so the words and the
      // pedal come back as two entries on the same beat.
      assert.ok(reread.directions.some((direction) => direction.words.includes('dolce')));
      assert.ok(reread.directions.some((direction) => direction.pedals.length === 1));
      assert.equal(reread.prints[0].newSystem, true);
    });
  });

  describe('the Palettes tab', () => {
    const PALETTE_SCORE = {
      title: 'Palettes',
      instrumentIds: ['piano'],
      key: 'C',
      time: '4/4',
      tempo: 120,
      measures: 4,
    };

    /** Opens the dock and hands back its Palettes panel. */
    function openPalettes() {
      const opened = loadEditorPage({ newScore: PALETTE_SCORE });
      const doc = opened.window.document;
      doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new opened.window.MouseEvent('click', { bubbles: true }));
      return { ...opened, doc, panel: doc.querySelector('.editor-sidebar__panel') };
    }

    /** A four-bar score with a whole note in every bar. */
    const NOTED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    ${[1, 2, 3, 4].map((number) => `<measure number="${number}">
      ${number === 1 ? `<attributes><divisions>4</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>` : ''}
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note>
    </measure>`).join('')}
  </part>
</score-partwise>`;

    /** Opens the dock on a score that has notes to select. */
    function openPalettesWithNotes() {
      const opened = loadEditorPage({ pendingXml: NOTED_XML });
      const doc = opened.window.document;
      doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new opened.window.MouseEvent('click', { bubbles: true }));
      return { ...opened, doc };
    }

    /** Clicks one palette item by the id the catalogue gave it. */
    const clickItem = (window, doc, id) => {
      const button = doc.querySelector(`[data-palette-item="${id}"]`);
      assert.ok(button, `the palette has ${id}`);
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      return button;
    };

    test('the dock opens on Palettes with its tabs, search and Add Palettes', () => {
      const { doc, panel } = openPalettes();
      assert.ok(panel, 'the dock renders a panel');

      const tabs = [...doc.querySelectorAll('[data-sidebar-tab]')].map((tab) => tab.dataset.sidebarTab);
      assert.deepEqual(tabs, ['palettes', 'more', 'properties', 'instruments']);
      assert.equal(doc.querySelector('[data-sidebar-tab="palettes"]').getAttribute('aria-selected'), 'true');
      assert.ok(doc.querySelector('[data-palette-search]'), 'the search field is there');
      assert.ok(doc.querySelector('[data-palette-add]'), 'and the Add Palettes button');

      // MuseScore's own thirteen groups in its own order, and every one folds.
      const groups = [...doc.querySelectorAll('[data-palette-group]')].map((group) => group.dataset.paletteGroup);
      assert.deepEqual(groups, [
        'clefs', 'keys', 'times', 'tempo', 'pitch', 'accidentals', 'dynamics',
        'articulations', 'text', 'pedal', 'repeats', 'barlines', 'breaks',
      ]);
      for (const header of doc.querySelectorAll('[data-palette-toggle]')) {
        assert.equal(header.getAttribute('aria-expanded'), 'true');
      }

      // Folding a group hides its items without losing the group itself.
      const clefs = doc.querySelector('[data-palette-group="clefs"]');
      const clefHeader = clefs.querySelector('[data-palette-toggle]');
      clefHeader.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles: true }));
      assert.equal(clefHeader.getAttribute('aria-expanded'), 'false');
      assert.equal(clefs.querySelector('.editor-palette__items').hidden, true);
    });

    test('a palette mark is written onto the selection and lights its button', async () => {
      const { window, doc } = openPalettesWithNotes();
      // The handoff is read through `File.text()`, so the score lands a tick
      // after the boot's own stack returns.
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      assert.ok(doc.querySelector('[data-editor-score] svg'), 'the score is drawn');

      // Ctrl+A selects the score's notes; a palette mark acts on all of them.
      doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));

      const button = clickItem(window, doc, 'staccato');
      assert.equal(button.getAttribute('aria-pressed'), 'true', 'the button shows the mark is on');

      // The same button takes it away again -- a palette item is a toggle.
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.equal(button.getAttribute('aria-pressed'), 'false');

      // And the mark really reached the notes, not just the button: the
      // saved MusicXML is what the engine would read back.
      clickItem(window, doc, 'staccato');
      doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const saved = JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
      assert.match(saved, /<staccato\/>/, 'the articulation is in the score');
    });

    test('Add Palettes brings in a group the dock does not hold yet', () => {
      const { window } = loadEditorPage({
        newScore: PALETTE_SCORE,
        localStorage: { 'notation-lab-palette-groups': JSON.stringify(['clefs']) },
      });
      const doc = window.document;
      doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.deepEqual(
        [...doc.querySelectorAll('[data-palette-group]')].map((group) => group.dataset.paletteGroup),
        ['clefs'],
        'a trimmed dock opens with only what it was left holding',
      );

      doc.querySelector('[data-palette-add]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const choice = doc.querySelector('[data-palette-add-group="noteheads"]');
      assert.ok(choice, 'the groups the dock is missing are offered');
      choice.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const groups = [...doc.querySelectorAll('[data-palette-group]')].map((group) => group.dataset.paletteGroup);
      assert.ok(groups.includes('noteheads'), 'the added palette is in the dock');
      assert.deepEqual(
        JSON.parse(window.localStorage.getItem('notation-lab-palette-groups')),
        ['clefs', 'noteheads'],
        'and the choice survives the next visit',
      );
    });

    test('an ottava is written as a start/stop pair and toggles away', async () => {
      const { window, doc } = openPalettesWithNotes();
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));

      const button = clickItem(window, doc, 'ottava-8va');
      assert.match(doc.querySelector('[data-editor-status]').textContent, /8va added\./);
      assert.equal(button.getAttribute('aria-pressed'), 'true');

      // The bracket only draws when the stop exists too, so the saved score
      // has to hold both halves of the pair.
      doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const saved = JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
      assert.match(saved, /<octave-shift type="down" size="8" number="1"\/>/, 'the start is written');
      assert.match(saved, /<octave-shift type="stop" size="8" number="1"\/>/, 'and its stop');

      // Clicking the same item takes the whole bracket away again.
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      assert.match(doc.querySelector('[data-editor-status]').textContent, /8va removed\./);
      doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const cleared = JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
      assert.doesNotMatch(cleared, /<octave-shift/, 'both halves are gone');
    });

    test('the search narrows the dock to the marks it names', () => {
      const { window, doc } = openPalettes();
      const search = doc.querySelector('[data-palette-search]');
      search.value = 'staccato';
      search.dispatchEvent(new window.Event('input', { bubbles: true }));

      const visible = (id) => !doc.querySelector(`[data-palette-item="${id}"]`).hidden;
      assert.equal(visible('staccato'), true);
      assert.equal(visible('accent'), false, 'an unmatched mark is hidden');
      assert.equal(doc.querySelector('[data-palette-group="clefs"]').hidden, true,
        'a group with nothing left is hidden too');
    });
  });

  describe('the `⋯` tab', () => {
    const SCORE = {
      title: 'More',
      instrumentIds: ['piano'],
      key: 'C',
      time: '4/4',
      tempo: 120,
      measures: 2,
    };

    const openMore = () => {
      const opened = loadEditorPage({ newScore: SCORE });
      const doc = opened.window.document;
      doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new opened.window.MouseEvent('click', { bubbles: true }));
      doc.querySelector('[data-sidebar-tab="more"]')
        .dispatchEvent(new opened.window.MouseEvent('click', { bubbles: true }));
      return { ...opened, doc, panel: doc.querySelector('.editor-sidebar__panel') };
    };

    test('it is a tab of its own, not a placeholder', () => {
      const { doc, panel } = openMore();
      const tab = doc.querySelector('[data-sidebar-tab="more"]');
      assert.equal(tab.getAttribute('aria-selected'), 'true');
      assert.equal(tab.dataset.pending, undefined, 'the tab no longer says it is unwired');
      assert.doesNotMatch(doc.querySelector('[data-editor-status]').textContent, /not wired up/);
      assert.ok(panel.querySelector('.editor-more'), 'and it draws a panel rather than folding away');
    });

    test('it holds the instrument surface and the mixer', () => {
      const { doc, panel } = openMore();
      assert.ok(panel.querySelector('[data-more-panel="instrument"]'), 'the instrument surface is there');
      assert.ok(panel.querySelector('[data-more-panel="instrument"] [data-editor-piano]'),
        'a piano part gets the 88-key strip');
      assert.ok(panel.querySelector('[data-more-panel="mixer"]'), 'and the mixer');
      assert.equal(panel.querySelectorAll('[data-more-panel="mixer"] .editor-inst__row').length, 1,
        'one row per part');
    });

    test('it is remembered across a reload, like the other tabs', () => {
      const { window, doc } = openMore();
      assert.match(window.localStorage.getItem('notation-lab-sidebar') ?? '', /"tab":"more"/);
      assert.equal(doc.querySelector('[data-sidebar-tab="palettes"]').getAttribute('aria-selected'), 'false');
    });
  });

  describe('the Properties tab', () => {
    const NOTED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    ${[1, 2].map((number) => `<measure number="${number}">
      ${number === 1 ? `<attributes><divisions>4</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>` : ''}
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note>
    </measure>`).join('')}
  </part>
</score-partwise>`;

    /** Opens the dock on a noted score, selects everything, shows Properties. */
    async function openProperties() {
      const opened = loadEditorPage({ pendingXml: NOTED_XML });
      const { window } = opened;
      const doc = window.document;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      doc.querySelector('[data-sidebar-tab="properties"]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const panel = doc.querySelector('.editor-sidebar__panel');
      return {
        window,
        doc,
        panel,
        field: (name) => panel.querySelector(`[data-props-field="${name}"]`),
        saved: () => {
          doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
          return JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
        },
      };
    }

    test('it reads the selected note and offers the fields that can change', async () => {
      const page = await openProperties();
      assert.ok(page.panel.querySelector('.editor-props'), 'the Properties panel is drawn');
      assert.match(page.panel.textContent, /Bar 1/, 'it names where the selection sits');
      assert.equal(page.field('step-0').value, 'C');
      assert.equal(page.field('octave-0').value, '4');
      assert.equal(page.field('duration').value, 'whole:0');
      assert.equal(page.field('voice').value, '1');

      // A score with nothing selected says so rather than showing blank
      // fields that would write nowhere.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      page.doc.querySelector('[data-sidebar-tab="instruments"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.querySelector('[data-sidebar-tab="properties"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      const empty = page.doc.querySelector('.editor-sidebar__panel');
      assert.match(empty.textContent, /Select a note/, 'an empty selection is stated plainly');
    });

    test('a pitch change is written into the score and undoes once', async () => {
      const page = await openProperties();
      const step = page.field('step-0');
      step.value = 'E';
      step.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      assert.match(page.doc.querySelector('[data-editor-status]').textContent, /Wrote E4/);
      assert.match(page.saved(), /<step>E<\/step>/, 'the note is re-pitched in the file');

      // The edit went through the same command path as every other one, so
      // one undo puts the note back.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
      assert.match(page.saved(), /<step>C<\/step>/, 'undo restores the old pitch');
    });

    test('a duration change refills the bar to its own meter', async () => {
      const page = await openProperties();
      const duration = page.field('duration');
      duration.value = 'half:0';
      duration.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      const measure = page.saved().match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
      assert.match(measure, /<type>half<\/type>/, 'the note is now a half note');
      // A shorter note leaves the rest of the bar as rests, so the bar still
      // holds exactly four beats.
      assert.match(measure, /<rest(\s*\/)?>/, 'the gap became a rest');
      assert.equal((measure.match(/<type>half<\/type>/g) ?? []).length, 2, 'two halves fill the bar');
    });

    test('a syllable typed into the panel becomes a lyric in the file', async () => {
      const page = await openProperties();
      const lyrics = page.field('lyric-1');
      assert.ok(lyrics, 'a note with no lyrics still offers the field');
      assert.equal(lyrics.value, '');

      lyrics.value = 'Twin-';
      lyrics.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      assert.match(page.doc.querySelector('[data-editor-status]').textContent, /Wrote "Twin-"/);
      const measure = page.saved().match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
      assert.match(measure, /<lyric number="1">/, 'the syllable is written as a lyric');
      assert.match(measure, /<text>Twin<\/text>/, 'the continuation hyphen is not part of the word');
      // A trailing hyphen is the writer's way of saying "this word carries
      // on", which is exactly what <syllabic>begin</syllabic> means.
      assert.match(measure, /<syllabic>begin<\/syllabic>/, 'the hyphen became the syllabic value');

      // The edit is a command like any other, so one undo takes it away.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
      assert.doesNotMatch(page.saved(), /<lyric/, 'undo removes the syllable');
    });

    test('a second verse gets its own row, and an empty field removes a verse', async () => {
      const page = await openProperties();
      const first = page.field('lyric-1');
      first.value = 'Twin';
      first.dispatchEvent(new page.window.Event('change', { bubbles: true }));

      // Re-opening the panel lists the verse that exists and offers the next.
      page.doc.querySelector('[data-sidebar-tab="instruments"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.querySelector('[data-sidebar-tab="properties"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      const panel = page.doc.querySelector('.editor-sidebar__panel');
      const verse2 = panel.querySelector('[data-props-field="lyric-2"]');
      assert.ok(verse2, 'the next verse is offered without an Add button');
      assert.equal(panel.querySelector('[data-props-field="lyric-1"]').value, 'Twin');

      verse2.value = 'kle';
      verse2.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      const both = page.saved();
      assert.match(both, /<lyric number="2">/, 'the second verse is written');
      assert.match(both, /<text>kle<\/text>/);

      // Clearing a verse removes it rather than writing an empty <text>,
      // which would still reserve a lyric row under the staff.
      const clear = page.doc.querySelector('[data-props-field="lyric-2"]');
      clear.value = '';
      clear.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      const after = page.saved();
      assert.doesNotMatch(after, /<lyric number="2">/, 'the cleared verse is gone');
      assert.match(after, /<text>Twin<\/text>/, 'the other verse is untouched');
    });
  });

  describe('a guitar part that prints notation and tab', () => {
    /** A guitar written as notation over tab: one part, two staves. */
    const GUITAR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Acoustic Guitar</part-name>
      <score-instrument id="P1-I1"><instrument-name>Acoustic Guitar</instrument-name></score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel><midi-program>26</midi-program>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>4</divisions>
        <key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>TAB</sign><line>5</line></clef>
        <staff-details number="2"><staff-lines>6</staff-lines></staff-details>
        <transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>
      </attributes>
      <note><rest measure="yes"/><duration>16</duration><voice>1</voice><staff>1</staff></note>
    </measure>
  </part>
</score-partwise>`;

    /** Measure 1's sounding notes, with the staff, string and fret each names. */
    function soundingNotes(xml) {
      const measure = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
      return [...measure.matchAll(/<note>([\s\S]*?)<\/note>/g)]
        .map((match) => match[1].replace(/\s+/g, ''))
        .filter((note) => !note.startsWith('<rest'))
        .map((note) => ({
          staff: note.match(/<staff>(\d+)<\/staff>/)?.[1] ?? '1',
          string: note.match(/<string>(\d+)<\/string>/)?.[1] ?? null,
          fret: note.match(/<fret>(\d+)<\/fret>/)?.[1] ?? null,
        }));
    }

    /** Opens the guitar score, the Inst. box, and gives the pointer a 20x scale. */
    async function openGuitar() {
      const { window } = loadEditorPage({ pendingXml: GUITAR_XML });
      const doc = window.document;
      // The handoff is read through `File.text()`, so the score lands a tick
      // after the boot's own stack returns.
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      window.DOMPoint = class {
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        matrixTransform() { return new window.DOMPoint(this.x, this.y); }
      };
      window.SVGElement.prototype.getScreenCTM = () => ({
        a: 20, b: 0, c: 0, d: 20, e: 0, f: 0,
        inverse: () => ({ a: 1 / 20, b: 0, c: 0, d: 1 / 20, e: 0, f: 0 }),
      });
      window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 1, height: 1 });
      doc.querySelector('[data-editor-popover="inst"]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      return {
        window,
        doc,
        panel: doc.querySelector('[data-editor-popover-panel="inst"]'),
        status: () => doc.querySelector('[data-editor-status]').textContent,
        saved: () => {
          doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
          return JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
        },
      };
    }

    test('a note written from the fretboard lands on both staves', async () => {
      const page = await openGuitar();
      // The fretboard writes a string and a fret; the notation staff above
      // it has to carry the same note, or the two staves disagree.
      page.panel.querySelector('[data-editor-inst-fret="1:5"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      assert.match(page.status(), /Inserted A4/);

      // One sounding note on each staff, and both name the same string and
      // fret: the notation staff and the tab staff say the same thing.
      const sounding = soundingNotes(page.saved());
      assert.deepEqual(sounding.map((note) => note.staff), ['1', '2'], 'one note on each staff');
      assert.deepEqual(sounding.map((note) => note.fret), ['5', '5'], 'both name the fret');
      assert.deepEqual(sounding.map((note) => note.string), ['1', '1'], 'and the string');
    });

    test('a note written from the notation staff reaches the tab staff', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="1:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      // The cursor moved on to the next beat; write a second note there.
      page.panel.querySelector('[data-editor-inst-fret="2:3"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      assert.match(page.status(), /Inserted /);

      // Both beats are written twice: once per staff.
      const sounding = soundingNotes(page.saved());
      assert.equal(sounding.filter((note) => note.staff === '1').length, 2, 'two notes on the notation staff');
      assert.equal(sounding.filter((note) => note.staff === '2').length, 2, 'and two on the tab staff');
    });

    test('a rest clears both staves', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="1:5"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      // Deleting the beat has to clear the tab note too, or the tab staff
      // would keep sounding a note the notation staff no longer holds.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));

      const measure = page.saved().match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
      assert.equal((measure.match(/<fret>5<\/fret>/g) ?? []).length, 0, 'the note is gone from both staves');
      assert.match(measure, /<rest/, 'and the beat is a rest');
    });

    test('the Staff field moves a note between the two staves', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="1:5"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      // The fretboard leaves the cursor on the next beat, so select the
      // note that was just written before asking Properties about it.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      page.doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.querySelector('[data-sidebar-tab="properties"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      const staff = page.doc.querySelector('[data-props-field="staff"]');
      assert.ok(staff, 'a two-staff part offers the Staff field');

      // Move the notation note down to the tab staff: the beat is one note
      // on the tab staff, and the notation staff keeps a rest.
      staff.value = '2';
      staff.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      assert.match(page.status(), /Moved to staff 2/);

      const sounding = soundingNotes(page.saved());
      assert.deepEqual(sounding.map((note) => note.staff), ['2'], 'the note sits on the tab staff');
      assert.equal(sounding[0].fret, '5', 'and still names its fret');
    });

    /**
     * The notes of bar 1 as a writer reads them, one entry per staff.
     *
     * `alter` is kept because a pitch edit has to reach BOTH staves -- a
     * note written by the fretboard and then re-pitched in Properties used
     * to leave the tab drawing the old pitch, which is two different notes
     * on one beat.
     */
    function pitches(xml) {
      const measure = xml.match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
      return [...measure.matchAll(/<note>([\s\S]*?)<\/note>/g)]
        .map((match) => match[1].replace(/\s+/g, ''))
        .filter((note) => !note.startsWith('<rest'))
        .map((note) => ({
          staff: note.match(/<staff>(\d+)<\/staff>/)?.[1] ?? '1',
          name: `${note.match(/<step>(\w)<\/step>/)?.[1] ?? '?'}`
            + `${note.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? ''}`
            + `${note.match(/<octave>(\d)<\/octave>/)?.[1] ?? ''}`,
          type: note.match(/<type>(\w+)<\/type>/)?.[1] ?? null,
          fret: note.match(/<fret>(\d+)<\/fret>/)?.[1] ?? null,
        }));
    }

    /** Selects every note, then opens the Properties tab on the selection. */
    function openProperties(page) {
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      page.doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.querySelector('[data-sidebar-tab="properties"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
    }

    test('a pitch typed into Properties reaches the tab staff', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="1:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      openProperties(page);

      // E4 open first string becomes G4: the tab has to move with it, and
      // its fret has to be worked out again (G4 sits at fret 3 there).
      const step = page.doc.querySelector('[data-props-field="step-0"]');
      step.value = 'G';
      step.dispatchEvent(new page.window.Event('change', { bubbles: true }));

      const written = pitches(page.saved());
      assert.deepEqual(written.map((note) => note.name), ['G4', 'G4'], 'both staves say G4');
      assert.deepEqual(written.map((note) => note.fret), [null, '3'], 'and the tab names the new fret');
    });

    test('a duration chosen in Properties reaches the tab staff', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="1:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      openProperties(page);

      const duration = page.doc.querySelector('[data-props-field="duration"]');
      duration.value = 'half:0';
      duration.dispatchEvent(new page.window.Event('change', { bubbles: true }));

      const written = pitches(page.saved());
      assert.deepEqual(written.map((note) => note.type), ['half', 'half'], 'both staves hold a half note');
    });

    test('an accidental applied to the selection reaches the tab staff', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="3:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      page.doc.querySelector('[data-palette-item="sharp"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));

      // Open G3 becomes G sharp 3, which is fret 1 on the same string.
      const written = pitches(page.saved());
      assert.deepEqual(written.map((note) => note.name), ['G13', 'G13'], 'both staves carry the sharp');
      assert.deepEqual(written.map((note) => note.fret), [null, '1'], 'and the tab names the new fret');
    });

    test('transposing the selection moves the tab with it', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="3:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      // MuseScore's Up is a semitone, so the diatonic step is Alt+Shift+Up.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', {
        key: 'ArrowUp', altKey: true, shiftKey: true, bubbles: true,
      }));

      // Open G3 up one step is A3, fret 2 on the same string.
      const written = pitches(page.saved());
      assert.deepEqual(written.map((note) => note.name), ['A3', 'A3'], 'both staves move up');
      assert.deepEqual(written.map((note) => note.fret), [null, '2'], 'and the tab follows the new pitch');
    });

    test('Up moves a semitone and spells it with a sharp', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="3:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      assert.match(page.doc.querySelector('[data-editor-status]').textContent, /Moved 2 notes up a semitone/);

      const written = pitches(page.saved());
      assert.deepEqual(written.map((note) => note.name), ['G13', 'G13'], 'G3 up a semitone is G sharp 3');
      assert.deepEqual(written.map((note) => note.fret), [null, '1'], 'and the tab names fret 1');
    });

    test('Down moves a semitone and spells it with a flat', async () => {
      const page = await openGuitar();
      page.panel.querySelector('[data-editor-inst-fret="3:0"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      assert.match(page.doc.querySelector('[data-editor-status]').textContent, /Moved 2 notes down a semitone/);

      const written = pitches(page.saved());
      assert.deepEqual(written.map((note) => note.name), ['G-13', 'G-13'], 'G3 down a semitone is G flat 3');
      // Below the open G string, so the fretboard moves to the D string:
      // D3 plus four frets is G flat 3.
      assert.deepEqual(written.map((note) => note.fret), [null, '4'], 'and the tab finds the fret that sounds it');
    });
  });

  describe('the Instruments tab', () => {
    const TWO_PART_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
    <score-part id="P2"><part-name>Flute</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      <note><rest measure="yes"/><duration>16</duration></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>4</divisions><key><fifths>0</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
        <clef><sign>G</sign><line>2</line></clef></attributes>
      <note><rest measure="yes"/><duration>16</duration></note>
    </measure>
  </part>
</score-partwise>`;

    /** Opens the dock on its Instruments tab. */
    async function openInstruments(xml = TWO_PART_XML) {
      const opened = loadEditorPage({ pendingXml: xml });
      const { window } = opened;
      const doc = window.document;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      doc.querySelector('[data-editor-sidebar-handle]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      doc.querySelector('[data-sidebar-tab="instruments"]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      return {
        window,
        doc,
        panel: () => doc.querySelector('.editor-sidebar__panel'),
        saved: () => {
          doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
          return JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
        },
      };
    }

    test('it lists the score\u2019s parts and switches which one is written into', async () => {
      const page = await openInstruments();
      const rows = [...page.panel().querySelectorAll('[data-part-row]')].map((row) => row.dataset.partRow);
      assert.deepEqual(rows, ['P1', 'P2'], 'one row per part, in score order');
      assert.equal(page.panel().querySelector('[data-part-name="P1"]').value, 'Piano');
      assert.equal(page.panel().querySelector('[data-part-name="P2"]').value, 'Flute');
      assert.equal(page.panel().querySelector('[data-part-row="P1"]').dataset.active, 'true');

      page.panel().querySelector('[data-part-select="P2"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      assert.equal(
        page.doc.querySelector('[data-editor-part]')?.value ?? 'P2',
        'P2',
        'the part selector follows the switch',
      );
      assert.equal(page.panel().querySelector('[data-part-row="P2"]').dataset.active, 'true');
    });

    test('renaming a part reaches the saved file', async () => {
      const page = await openInstruments();
      const name = page.panel().querySelector('[data-part-name="P2"]');
      name.value = 'Oboe';
      name.dispatchEvent(new page.window.Event('change', { bubbles: true }));
      assert.match(page.doc.querySelector('[data-editor-status]').textContent, /Renamed to Oboe/);
      assert.match(page.saved(), /<part-name>Oboe<\/part-name>/, 'the file carries the new name');
    });

    test('a part can be added and removed, and the last one is kept', async () => {
      const page = await openInstruments();
      const select = page.panel().querySelector('[data-instrument-add-select]');
      select.value = 'violin';
      page.panel().querySelector('[data-instrument-add]')
        .dispatchEvent(new page.window.Event('submit', { bubbles: true, cancelable: true }));

      let rows = [...page.panel().querySelectorAll('[data-part-row]')].map((row) => row.dataset.partRow);
      assert.deepEqual(rows, ['P1', 'P2', 'P3'], 'the new part is appended');
      assert.match(page.saved(), /<part-name>Violin<\/part-name>/, 'and it is in the file');

      page.panel().querySelector('[data-part-remove="P3"]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      rows = [...page.panel().querySelectorAll('[data-part-row]')].map((row) => row.dataset.partRow);
      assert.deepEqual(rows, ['P1', 'P2'], 'the part is taken away again');

      // Two more removals leave the score with its first part and a disabled
      // button: a score with no parts has nothing to draw.
      for (const id of ['P2', 'P1']) {
        page.panel().querySelector(`[data-part-remove="${id}"]`)
          ?.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      }
      rows = [...page.panel().querySelectorAll('[data-part-row]')].map((row) => row.dataset.partRow);
      assert.deepEqual(rows, ['P1'], 'the last part stays');
      assert.equal(page.panel().querySelector('[data-part-remove="P1"]').disabled, true);
    });
  });

  describe('a MIDI keyboard', () => {
    /**
     * A stand-in for Web MIDI.
     *
     * The real API hands back an `inputs` map of ports whose
     * `onmidimessage` the page assigns. Nothing about that is testable
     * without a browser and a keyboard, so the fake keeps the same shape
     * -- a Map of ports plus a `send` the test drives -- and the page is
     * exercised exactly as it would be with hardware attached.
     */
    function fakeMidiAccess() {
      const port = { id: 'kbd', name: 'Test keyboard', onmidimessage: null };
      const access = {
        inputs: new Map([[port.id, port]]),
        listeners: [],
        addEventListener(type, listener) { if (type === 'statechange') this.listeners.push(listener); },
        removeEventListener(type, listener) {
          if (type !== 'statechange') return;
          this.listeners = this.listeners.filter((entry) => entry !== listener);
        },
      };
      return { access, port };
    }

    /** Opens the editor with Web MIDI present, and switches the keyboard on. */
    async function openWithMidi({ xml, request } = {}) {
      const fake = fakeMidiAccess();
      const opened = loadEditorPage(xml !== undefined ? { pendingXml: xml } : {});
      const { window } = opened;
      // jsdom's window has no Web MIDI at all, so the request function is
      // what stands in for a browser that has one. It is installed before
      // the button is pressed, which is the only time the page reads it.
      Object.defineProperty(window.navigator, 'requestMIDIAccess', {
        configurable: true,
        value: request ?? (async () => fake.access),
      });
      const doc = window.document;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      const button = doc.querySelector('[data-editor-midi]');
      button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 10));
      return {
        window,
        doc,
        port: fake.port,
        button,
        status: () => doc.querySelector('[data-editor-status]').textContent,
        on: (midi, velocity = 90) => fake.port.onmidimessage?.({ data: [0x90, midi, velocity] }),
        off: (midi) => fake.port.onmidimessage?.({ data: [0x80, midi, 0] }),
        saved: () => {
          doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
          return JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
        },
      };
    }

    /** Measure 1's noteheads, top to bottom, with a `+` on the chord members. */
    const notesOfBarOne = (xml) => {
      const measure = (xml.match(/<measure number="1">[\s\S]*?<\/measure>/) || [''])[0];
      return [...measure.matchAll(/<note>[\s\S]*?<\/note>/g)]
        .map((match) => match[0].replace(/\s+/g, ''))
        .filter((note) => !note.includes('<rest'))
        .map((note) => {
          const pitch = note.match(/<step>(\w)<\/step>(?:<alter>(-?\d+)<\/alter>)?<octave>(\d)/);
          const alter = { 1: '#', 2: '##', '-1': 'b', '-2': 'bb' }[pitch?.[2]] ?? '';
          const name = pitch === null ? '?' : `${pitch[1]}${alter}${pitch[3]}`;
          return note.includes('<chord/>') ? `+${name}` : name;
        });
    };

    test('the button asks the browser for access and shows it is on', async () => {
      const page = await openWithMidi();
      assert.equal(page.button.getAttribute('aria-pressed'), 'true', 'the control shows the keyboard is on');
      assert.match(page.status(), /MIDI on/);

      // Pressing it again hands the ports back rather than leaving a
      // listener attached to a keyboard the writer has finished with.
      page.button.dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      assert.equal(page.button.getAttribute('aria-pressed'), 'false');
      assert.equal(page.port.onmidimessage, null, 'the port is no longer listened to');
      assert.match(page.status(), /MIDI keyboard off/);
    });

    test('a key press writes the note it names and rolls the cursor on', async () => {
      const page = await openWithMidi();
      // 60 is middle C, which the treble staff writes as C4.
      page.on(60);
      assert.equal(page.status(), 'Inserted C4.');
      // A key is only held while it is down: lifting it before the next
      // press is what makes the next press a new beat.
      page.off(60);
      page.on(62);
      assert.equal(page.status(), 'Inserted D4.');
      assert.deepEqual(notesOfBarOne(page.saved()), ['C4', 'D4']);
    });

    test('keys that overlap in time become one chord, not three beats', async () => {
      const page = await openWithMidi();
      // A player holding C-E-G sends three note-ons before any note-off.
      page.on(60);
      page.on(64);
      page.on(67);
      assert.equal(page.status(), 'Note added to chord.');
      assert.deepEqual(notesOfBarOne(page.saved()), ['C4', '+E4', '+G4']);

      // Lifting them all and pressing again is a new beat, not more chord.
      page.off(60); page.off(64); page.off(67);
      page.on(65);
      assert.equal(page.status(), 'Inserted F4.');
      assert.deepEqual(notesOfBarOne(page.saved()), ['C4', '+E4', '+G4', 'F4']);
    });

    test('the key signature decides how a black key is spelled', async () => {
      // D major writes F# and C#, so 66 is F# rather than Gb, and 61 is C#.
      const xml = STARTER_XML.replace('<fifths>0</fifths>', '<fifths>2</fifths>');
      const page = await openWithMidi({ xml });
      page.on(66);
      assert.equal(page.status(), 'Inserted F#4.');
      page.off(66);
      page.on(61);
      assert.equal(page.status(), 'Inserted C#4.');
      assert.deepEqual(notesOfBarOne(page.saved()), ['F#4', 'C#4']);
    });

    test('a drum kit writes the drum the key names', async () => {
      const fake = fakeMidiAccess();
      const opened = loadEditorPage({
        newScore: { title: 'kit', instrumentIds: ['drum-kit'], key: 'C', time: '4/4', tempo: 120, measures: 1 },
      });
      const { window } = opened;
      Object.defineProperty(window.navigator, 'requestMIDIAccess', {
        configurable: true,
        value: async () => fake.access,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      window.document.querySelector('[data-editor-midi]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 10));

      // 36 is GM's bass drum, 38 the snare -- the two a kit is built around.
      fake.port.onmidimessage({ data: [0x90, 36, 90] });
      assert.equal(window.document.querySelector('[data-editor-status]').textContent, 'Inserted Bass Drum 1.');
      fake.port.onmidimessage({ data: [0x90, 38, 90] });
      assert.match(
        window.document.querySelector('[data-editor-status]').textContent,
        /^Added .+ to the chord\.$/,
        'the snare joins the bass drum on the same beat',
      );

      window.document.querySelector('[data-editor-save]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const saved = JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
      const measure = (saved.match(/<measure number="1">[\s\S]*?<\/measure>/) || [''])[0];
      const instruments = [...measure.matchAll(/<instrument id="([^"]+)"\/>/g)].map((match) => match[1]);
      assert.equal(instruments.length, 2, 'both drums reached the file');
      assert.notEqual(instruments[0], instruments[1], 'and they are different drums');
    });

    test('notes are only written while note input is on', async () => {
      const page = await openWithMidi();
      page.doc.querySelector('[data-editor-note-input]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.on(60);
      assert.match(page.status(), /Turn note input on/);
      page.off(60);
      assert.deepEqual(notesOfBarOne(page.saved()), [], 'nothing was written');

      page.doc.querySelector('[data-editor-note-input]')
        .dispatchEvent(new page.window.MouseEvent('click', { bubbles: true }));
      page.on(60);
      assert.equal(page.status(), 'Inserted C4.');
    });

    test('a browser with no Web MIDI says so instead of doing nothing', async () => {
      const { window } = loadEditorPage();
      const doc = window.document;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      doc.querySelector('[data-editor-midi]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 10));
      assert.match(doc.querySelector('[data-editor-status]').textContent, /cannot reach a MIDI keyboard/);
      assert.equal(doc.querySelector('[data-editor-midi]').getAttribute('aria-pressed'), 'false');
    });

    test('a refused request leaves the editor writable by hand', async () => {
      const page = await openWithMidi({
        request: async () => { throw new Error('NotAllowedError'); },
      });
      assert.match(page.status(), /MIDI access was refused/);
      assert.equal(page.button.getAttribute('aria-pressed'), 'false');
      // The keyboard is off, but the page still works: a letter key writes.
      page.doc.dispatchEvent(new page.window.KeyboardEvent('keydown', { key: 'C', bubbles: true }));
      assert.equal(page.status(), 'Inserted C4.');
    });
  });

  describe('the MuseScore key map', () => {
    /**
     * The page plus the three things a key-map test reads: the status line,
     * the notes of bar 1 as written, and the entry state the keys act on.
     */
    function openKeys() {
      const { window } = loadEditorPage();
      const doc = window.document;
      const status = () => doc.querySelector('[data-editor-status]').textContent;
      const press = (key, init = {}) => doc.dispatchEvent(
        new window.KeyboardEvent('keydown', { key, bubbles: true, ...init }),
      );
      const saved = () => {
        doc.querySelector('[data-editor-save]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
        return JSON.parse(window.localStorage.getItem('msharing-notation-scores') || '[]')[0]?.xml ?? '';
      };
      /** Every sounding note of bar 1, as `step+alter+octave`. */
      const bar = () => {
        const measure = saved().match(/<measure number="1">([\s\S]*?)<\/measure>/)?.[1] ?? '';
        return [...measure.matchAll(/<note>([\s\S]*?)<\/note>/g)]
          .map((match) => match[1].replace(/\s+/g, ''))
          .filter((note) => !note.startsWith('<rest'))
          .map((note) => `${note.match(/<step>(\w)<\/step>/)?.[1]}`
            + `${note.match(/<alter>(-?\d+)<\/alter>/)?.[1] ?? ''}`
            + `${note.match(/<octave>(\d)<\/octave>/)?.[1]}`);
      };
      return { window, doc, status, press, saved, bar };
    }

    test('Esc leaves note input mode, the way MuseScore does', () => {
      const page = openKeys();
      const input = page.doc.querySelector('[data-editor-note-input]');
      assert.equal(input.getAttribute('aria-pressed'), 'true', 'the editor starts in note input');

      page.press('Escape');
      assert.equal(input.getAttribute('aria-pressed'), 'false', 'Esc turned input off');
      assert.match(page.status(), /Note input off/);

      // Off, a letter is not a note any more.
      page.press('C');
      assert.deepEqual(page.bar(), [], 'nothing was written with input off');
    });

    test('R repeats the note just written instead of writing a rest', () => {
      const page = openKeys();
      page.press('D');
      page.press('r');
      assert.equal(page.status(), 'Repeated 1 note.');
      assert.deepEqual(page.bar(), ['D4', 'D4'], 'the same note lands on the next beat');

      // 0 is the rest key, so R must not have become one.
      page.press('0');
      assert.deepEqual(page.bar(), ['D4', 'D4'], '0 wrote a rest, not a note');
    });

    test('Backspace in note input takes back the note just written', () => {
      const page = openKeys();
      page.press('C');
      page.press('D');
      assert.deepEqual(page.bar(), ['C4', 'D4']);

      page.press('Backspace');
      assert.match(page.status(), /Took back the last note/);
      assert.deepEqual(page.bar(), ['C4'], 'the second note is a rest again');

      // A second press keeps walking back rather than needing a new note.
      page.press('Backspace');
      assert.deepEqual(page.bar(), [], 'and the first one goes too');
    });

    test('Backspace outside note input is still Delete', () => {
      const page = openKeys();
      page.press('C');
      page.press('Escape');
      page.press('a', { ctrlKey: true });
      assert.equal(page.status(), 'Selected 1 note.');
      page.press('Backspace');
      assert.equal(page.status(), 'Deleted 1 note.');
      assert.deepEqual(page.bar(), [], 'the note became a rest');
    });

    test('Alt+Shift moves a diatonic step and Ctrl moves an octave', () => {
      const page = openKeys();
      page.press('C');
      page.press('a', { ctrlKey: true });
      page.press('ArrowUp', { altKey: true, shiftKey: true });
      assert.equal(page.status(), 'Moved up 1 step.');
      assert.deepEqual(page.bar(), ['D4'], 'C4 becomes D4, not C sharp');

      page.press('ArrowUp', { ctrlKey: true });
      assert.match(page.status(), /Moved up an octave/);
      assert.deepEqual(page.bar(), ['D5'], 'and Ctrl raises it an octave');
    });

    test('Up and Down nudge the note just written without a selection', () => {
      const page = openKeys();
      page.press('C');
      // Nothing is selected after a note is written, so Up has to reach the
      // note the cursor just left -- that is how a writer fixes a wrong pitch.
      page.press('ArrowUp');
      assert.deepEqual(page.bar(), ['C14'], 'C4 up a semitone is C sharp 4, written <alter>1');
      page.press('ArrowDown');
      page.press('ArrowDown');
      assert.deepEqual(page.bar(), ['B3'], 'and down twice crosses into the octave below');
    });

    test('the duration digits count up from a 64th, the way MuseScore numbers them', () => {
      const page = openKeys();
      const values = [['1', '64th'], ['3', '16th'], ['5', 'quarter'], ['7', 'whole']];
      for (const [key, name] of values) {
        page.press(key);
        assert.equal(page.status(), `Note value: ${name}.`, `${key} is a ${name}`);
      }
      // And the value reaches the written note, not just the status line.
      page.press('C');
      assert.match(page.saved(), /<type>whole<\/type>/, 'the whole note is what was written');
    });

    test('Ctrl+3 writes a triplet over the current note value', () => {
      const page = openKeys();
      page.press('6'); // half note: the whole GROUP is a half
      page.press('3', { ctrlKey: true });
      assert.equal(page.status(), 'Inserted a 3-tuplet.');
      const xml = page.saved();
      assert.equal((xml.match(/<time-modification>/g) ?? []).length, 3, 'three members');
      assert.match(xml, /<actual-notes>3<\/actual-notes><normal-notes>2<\/normal-notes>/);
      assert.equal((xml.match(/<tuplet type="start"\/>/g) ?? []).length, 1);
      assert.equal((xml.match(/<tuplet type="stop"\/>/g) ?? []).length, 1);
      // A half-note group of three is three quarter notes.
      assert.equal((xml.match(/<type>quarter<\/type>/g) ?? []).length, 3);
    });

    test('a letter typed into a tuplet member keeps the member value and its marks', () => {
      const page = openKeys();
      page.press('5'); // quarter group
      page.press('3', { ctrlKey: true });
      page.press('C');
      const xml = page.saved();
      // The note replaces the first rest: it keeps the tuplet ratio and
      // carries the start mark, so the group still reads as a triplet.
      assert.match(xml, /<pitch>[\s\S]*?<time-modification>/);
      assert.equal((xml.match(/<time-modification>/g) ?? []).length, 3, 'still three members');
      assert.match(xml, /<tuplet type="start"\/>/);
    });

    test('Ctrl+4 writes a quadruplet as 4 in the time of 2', () => {
      const page = openKeys();
      page.press('5');
      page.press('4', { ctrlKey: true });
      const xml = page.saved();
      assert.match(xml, /<actual-notes>4<\/actual-notes><normal-notes>2<\/normal-notes>/);
      assert.equal((xml.match(/<type>eighth<\/type>/g) ?? []).length, 4, 'four eighths fill a quarter');
    });

    test('a tuplet that does not divide the note value is refused rather than miswritten', () => {
      const page = openKeys();
      page.press('5');
      page.press('7', { ctrlKey: true });
      assert.match(page.status(), /does not fit the current note value/);
      assert.equal((page.saved().match(/<time-modification>/g) ?? []).length, 0, 'nothing was written');
    });

    test('undo takes the whole tuplet back in one step', () => {
      const page = openKeys();
      page.press('5');
      page.press('3', { ctrlKey: true });
      page.press('z', { ctrlKey: true });
      assert.equal((page.saved().match(/<time-modification>/g) ?? []).length, 0);
    });
  });
});
