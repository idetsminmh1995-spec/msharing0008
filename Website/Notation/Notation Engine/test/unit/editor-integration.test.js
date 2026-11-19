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

  test('the editor starts in note-input mode with note preview on', () => {
    const { window } = loadEditorPage();
    const noteInput = window.document.querySelector('[data-editor-note-input]');
    const preview = window.document.querySelector('[data-editor-preview]');
    assert.ok(preview, 'the editor has no note-preview toggle');
    // A writer must be able to write a note the moment the page opens, and
    // hear it -- the two things this editor is for.
    assert.equal(noteInput.getAttribute('aria-pressed'), 'true');
    assert.equal(preview.getAttribute('aria-pressed'), 'true');
  });

  test('the note-input toolbar carries MuseScore\'s note values, marks and slurs', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const bar = doc.querySelector('[data-editor-note-toolbar]');
    assert.ok(bar, 'the editor has no note-input toolbar');
    assert.ok(doc.querySelector('[data-editor-toolbars]'), 'the two toolbars are not one sticky block');

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

    // The palette must offer every mark the toolbar can set, or a writer
    // browsing the list cannot find a mark the bar already shows. Order is
    // each surface's own -- the bar groups marks by shape, the palette
    // lists them in reading order -- so only membership is compared.
    for (const kind of ['articulation', 'dynamic']) {
      const field = `editor${kind[0].toUpperCase()}${kind.slice(1)}`;
      const paletteValues = new Set(
        [...doc.querySelectorAll(`[data-editor-palette-mark="${kind}"]`)].map((b) => b.dataset.editorPaletteValue),
      );
      for (const button of within(`[data-editor-${kind}]`)) {
        assert.ok(paletteValues.has(button.dataset[field]), `the palette is missing the ${button.dataset[field]} ${kind}`);
      }
    }
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
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', { clientX: 120, clientY: 9, bubbles: true }));
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
    // The score controls are enabled once a score exists; Add measure is
    // one of them, and unlike the transport it is always in the toolbar.
    assert.equal(window.document.querySelector('[data-editor-add-measure]').disabled, false, 'the score controls must be enabled');
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

  describe('the sidebar dock', () => {
    /** The editor page, with the click helpers the selection tests use. */
    function openEditor() {
      const { window, errors } = loadEditorPage();
      window.DOMPoint = class {
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        matrixTransform() { return new window.DOMPoint(this.x, this.y); }
      };
      window.SVGElement.prototype.getScreenCTM = () => ({
        a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      });
      window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });
      return { window, doc: window.document, errors };
    }

    const visible = (node) => Boolean(node) && !node.hidden;
    const shownPanel = (doc) => [...doc.querySelectorAll('[data-editor-sidebar-panel]')]
      .filter(visible)
      .map((panel) => panel.dataset.editorSidebarPanel);

    test('it opens on Palettes, beside the score', () => {
      const { doc, errors } = openEditor();
      assert.deepEqual(errors, [], 'the page must start without a script error');

      const sidebar = doc.querySelector('[data-editor-sidebar]');
      assert.ok(sidebar, 'the editor has no sidebar');
      assert.equal(sidebar.hidden, false, 'the dock is the default and must start open');
      assert.deepEqual(shownPanel(doc), ['palettes'], 'exactly one panel shows at a time');

      const tabs = [...doc.querySelectorAll('[data-editor-sidebar-tab]')];
      assert.deepEqual(
        tabs.map((tab) => tab.dataset.editorSidebarTab),
        ['palettes', 'properties', 'instruments'],
      );
      assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
      // A tab must name the panel it controls, or a screen reader announces
      // a panel that is not the one on screen.
      for (const tab of tabs) {
        const panel = doc.querySelector(`[data-editor-sidebar-panel="${tab.dataset.editorSidebarTab}"]`);
        assert.equal(tab.getAttribute('aria-controls'), panel.id);
        assert.equal(panel.getAttribute('aria-labelledby'), tab.id);
      }
    });

    test('a tab switches panels, and the toggle closes and reopens the dock', () => {
      const { doc, window } = openEditor();
      const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      click(doc.querySelector('[data-editor-sidebar-tab="instruments"]'));
      assert.deepEqual(shownPanel(doc), ['instruments']);
      click(doc.querySelector('[data-editor-sidebar-tab="properties"]'));
      assert.deepEqual(shownPanel(doc), ['properties']);

      const toggle = doc.querySelector('[data-editor-sidebar-toggle]');
      const sidebar = doc.querySelector('[data-editor-sidebar]');
      click(toggle);
      assert.equal(sidebar.hidden, true, 'the toggle closes the dock');
      assert.equal(toggle.getAttribute('aria-expanded'), 'false');
      click(toggle);
      assert.equal(sidebar.hidden, false, 'and opens it again');
      assert.deepEqual(shownPanel(doc), ['properties'], 'the dock remembers its last panel');
    });

    test('the rail is keyboard-navigable with the arrow keys', () => {
      const { doc, window } = openEditor();
      const tabs = [...doc.querySelectorAll('[data-editor-sidebar-tab]')];
      const press = (tab, key) => tab.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

      // Roving tabindex: only the selected tab is a stop in the tab order.
      assert.deepEqual(tabs.map((tab) => tab.tabIndex), [0, -1, -1]);
      press(tabs[0], 'ArrowDown');
      assert.deepEqual(shownPanel(doc), ['properties']);
      assert.deepEqual(tabs.map((tab) => tab.tabIndex), [-1, 0, -1]);
      press(tabs[1], 'ArrowDown');
      assert.deepEqual(shownPanel(doc), ['instruments']);
      // The last tab wraps back to the first, and up from there wraps again.
      press(tabs[2], 'ArrowDown');
      assert.deepEqual(shownPanel(doc), ['palettes']);
      press(tabs[0], 'ArrowUp');
      assert.deepEqual(shownPanel(doc), ['instruments']);
    });

    test('Properties reads the selected note, and says so when nothing is selected', () => {
      const { doc, window } = openEditor();
      const click = (node) => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      const staffClick = () => doc.querySelector('[data-editor-score]')
        .dispatchEvent(new window.PointerEvent('pointerdown', { clientX: 5, clientY: 9, bubbles: true }));
      const read = () => Object.fromEntries(
        [...doc.querySelectorAll('[data-editor-property]')]
          .map((node) => [node.dataset.editorProperty, node.textContent]),
      );

      click(doc.querySelector('[data-editor-sidebar-tab="properties"]'));
      assert.equal(doc.querySelector('[data-editor-properties]').hidden, true, 'an empty selection hides the readout');
      assert.equal(doc.querySelector('[data-editor-properties-empty]').hidden, false);

      // A staff click in note input writes; selecting needs input off.
      staffClick();
      click(doc.querySelector('[data-editor-note-input]'));
      staffClick();

      assert.equal(doc.querySelector('[data-editor-properties]').hidden, false);
      assert.equal(doc.querySelector('[data-editor-properties-empty]').hidden, true);
      const values = read();
      assert.equal(values.measure, '1');
      assert.equal(values.duration, 'Quarter');
      assert.equal(values.voice, '1');
      assert.match(values.pitch, /^[A-G]/);
    });

    test('Instruments lists the score\'s parts and marks the one being written into', () => {
      const { doc, window } = openEditor();
      doc.querySelector('[data-editor-sidebar-tab="instruments"]')
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

      const items = [...doc.querySelectorAll('[data-editor-instrument]')];
      assert.deepEqual(items.map((item) => item.textContent.trim()), ['Music']);
      assert.equal(items[0].getAttribute('aria-current'), 'true');
      assert.equal(doc.querySelector('[data-editor-instruments-empty]').hidden, true);
    });
  });
});
