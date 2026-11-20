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
function loadEditorPage({ url = 'https://example.test/notation-editor.html?intent=create' } = {}) {
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

  test('the count-in is exactly one bar of clicks and stops at the bar line', async () => {
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
    play.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // A 4/4 bar at the default 120 is two seconds, one beat every 0.5s.
    // Four clicks, at 0, 0.5, 1.0 and 1.5 -- and nothing at 2.0, where the
    // music starts. That stray fifth click landing on the first note is
    // exactly what the writer hears as "one more comes in".
    assert.equal(clicks.length, 4, 'one bar of 4/4 is four clicks, not five');
    assert.deepEqual(clicks.map((click) => click.at), [0, 0.5, 1, 1.5]);
    // The first beat is accented, the rest are not, so the bar is countable.
    assert.ok(clicks[0].freq > clicks[1].freq, 'the downbeat is the accented click');

    await new Promise((resolve) => window.setTimeout(resolve, 2100));
    assert.equal(clicks.length, 4, 'no click is scheduled once the bar is over');
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
    // The count is over, so the switch goes off by itself: the metronome is
    // the bar before the music, not a pulse running under it.
    assert.equal(metronome.getAttribute('aria-pressed'), 'false', 'the metronome switches itself off after the bar');
    assert.equal(metronome.dataset.metronome, undefined, 'no stray metronome flag is left on the button');
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
      'Note input',
      'Note value',
      'Augmentation dots',
      'Rest',
      'Accidentals',
      'Tie and slur',
      'Articulations',
      'Dynamics',
      'Stem',
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
