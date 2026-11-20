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

  test('the bottom bar holds the zoom controls and nothing else', () => {
    const { window } = loadEditorPage();
    const bars = window.document.querySelectorAll('[data-editor-bottom-bar]');
    assert.equal(bars.length, 1, 'the editor has exactly one bottom bar');
    const controls = bars[0].querySelectorAll('button, output, select, input');
    assert.deepEqual(
      [...controls].map((control) => control.getAttribute('aria-label')),
      ['Zoom out', 'Zoom level', 'Zoom in'],
      'the bottom bar carries the zoom controls',
    );
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

  test('undo and redo sit at the end of the row', () => {
    const { window } = loadEditorPage();
    const row = window.document.querySelector('[data-editor-toolbars] .editor-toolbar');
    const controls = [...row.children].filter(
      (node) => node.tagName === 'BUTTON' || node.classList.contains('editor-toolbar__group'),
    );
    const labels = controls.map(
      (node) => node.getAttribute('aria-label') ?? node.querySelector('[aria-label]')?.getAttribute('aria-label'),
    );
    assert.deepEqual(labels.slice(-2), ['Undo', 'Redo'], 'undo and redo close the row');
    assert.ok(labels.indexOf('Note input mode') < labels.indexOf('Undo'), 'history comes after the writing tools');
  });

  test('the crowded tools open from a box on the row instead of spreading out', () => {
    const { window } = loadEditorPage();
    const doc = window.document;

    // A trigger and its panel are a pair, so a panel with no trigger (or the
    // reverse) would leave a box nothing can open.
    const triggers = [...doc.querySelectorAll('[data-editor-popover]')];
    const panels = [...doc.querySelectorAll('[data-editor-popover-panel]')];
    assert.deepEqual(
      triggers.map((node) => node.dataset.editorPopover).sort(),
      panels.map((node) => node.dataset.editorPopoverPanel).sort(),
    );
    assert.deepEqual(
      triggers.map((node) => node.dataset.editorPopover),
      ['value', 'dots', 'accidentals', 'marks', 'dynamics', 'more'],
    );
    for (const panel of panels) {
      assert.equal(panel.hidden, true, `${panel.dataset.editorPopoverPanel} starts closed`);
      assert.ok(panel.querySelector('.editor-tool'), `${panel.dataset.editorPopoverPanel} holds no tools`);
    }

    // Every note value lives in a panel, so the closed row stays short
    // enough not to scroll even on a phone.
    const values = doc.querySelectorAll('[data-editor-popover-panel="value"] [data-editor-duration]');
    assert.equal(values.length, 7);
    for (const selector of ['[data-editor-tie]', '[data-editor-slur]', '[data-editor-rest]', '[data-editor-flip]']) {
      assert.ok(doc.querySelector(`[data-editor-popover-panel="more"] ${selector}`), `${selector} is in the more box`);
    }
  });

  test('a tool in a box closes it again, and the value trigger shows the value in force', () => {
    const { window } = loadEditorPage();
    const doc = window.document;
    const trigger = doc.querySelector('[data-editor-popover="value"]');
    const panel = doc.querySelector('[data-editor-popover-panel="value"]');

    trigger.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, false, 'the trigger opens its box');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true');

    doc.querySelector('[data-editor-popover-panel="value"] [data-editor-duration="eighth"]')
      .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(panel.hidden, true, 'picking a value folds the box away');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    assert.equal(
      doc.querySelector('[data-editor-value-glyph]').textContent,
      doc.querySelector('[data-editor-popover-panel="value"] [data-editor-duration="eighth"] .editor-tool__glyph').textContent,
      'the trigger shows the note value in force',
    );
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
