import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, describe } from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoDir = path.resolve(packageDir, '..', '..');
const appDir = path.join(repoDir, 'Website');

/**
 * The new-score wizard: the instrument catalog, the MusicXML it writes,
 * and the entry page that asks the questions.
 *
 * A wizard score is only useful if the engine can open it, so the builder
 * tests parse and render what they build rather than inspecting strings.
 * The page tests then drive the real `notation.html` -- the chips, the
 * steps, the handoff -- because the wiring is what a user touches.
 */
function loadBuilder() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  const context = dom.getInternalVMContext();
  vm.runInContext(fs.readFileSync(path.join(packageDir, 'dist', 'notation-engine.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(appDir, 'notation-newscore.js'), 'utf8'), context);
  return { window: dom.window, engine: dom.window.NotationEngine, NewScore: dom.window.NotationNewScore };
}

function loadEntryPage() {
  const html = fs.readFileSync(path.join(appDir, 'notation.html'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://example.test/notation.html',
  });
  const context = dom.getInternalVMContext();
  for (const rel of ['assets/notation-engine.js', 'notation-newscore.js', 'notation-entry.js']) {
    vm.runInContext(fs.readFileSync(path.join(appDir, rel), 'utf8'), context, { filename: rel });
  }
  return dom.window;
}

/** Total ticks one measure's voices hold. */
const measureTicks = (measure) =>
  measure.voices.flatMap((voice) => voice.events).reduce((sum, event) => sum + event.duration.ticks, 0);

const barTicks = (engine, time) => {
  const [beats, beatType] = time.split('/').map(Number);
  return (engine.TICKS_PER_QUARTER * 4 * beats) / beatType;
};

describe('the new-score builder writes MusicXML the engine accepts', () => {
  test('every catalog instrument builds a score that parses with no errors', () => {
    const { window, engine, NewScore } = loadBuilder();
    for (const instrument of NewScore.INSTRUMENTS) {
      const xml = NewScore.buildMusicXml({ instrumentIds: [instrument.id], measures: 2 });
      const parsed = engine.parseMusicXml(xml, window.DOMParser);
      const errors = parsed.diagnostics.filter((item) => item.severity === 'error');
      assert.deepEqual([...errors.map((item) => item.message)], [], `${instrument.name} must parse cleanly`);
      assert.equal(parsed.score.parts.length, 1, `${instrument.name} must build one part`);
      assert.equal(parsed.score.parts[0].measures.length, 2, `${instrument.name} must build two bars`);
    }
  });

  test('a bar is exactly as long as its meter says, in every offered meter', () => {
    const { window, engine, NewScore } = loadBuilder();
    for (const time of NewScore.TIME_SIGNATURES) {
      const xml = NewScore.buildMusicXml({ instrumentIds: ['piano'], time, measures: 2 });
      const parsed = engine.parseMusicXml(xml, window.DOMParser);
      const expected = barTicks(engine, time);
      for (const measure of parsed.score.parts[0].measures) {
        assert.equal(measureTicks(measure), expected, `${time} bar ${measure.number} must be one bar long`);
      }
    }
  });

  test('the tempo the user typed is the tempo playback runs at', () => {
    const { window, engine, NewScore } = loadBuilder();
    // A quarter-note meter counts quarters, so the mark and playback agree.
    for (const tempo of [40, 120, 300]) {
      const xml = NewScore.buildMusicXml({ instrumentIds: ['piano'], time: '4/4', tempo });
      const rendered = engine.renderFromMusicXml(xml, {
        domParser: window.DOMParser,
        config: { layout: { mode: 'page' } },
      });
      const microseconds = rendered.playback.tempoMap.segments[0].microsecondsPerQuarter;
      assert.equal(Math.round(60000000 / microseconds), tempo);
    }
  });

  test('the printed metronome mark survives parsing, so its beat and number read back', () => {
    const { window, engine, NewScore } = loadBuilder();
    // A dotted-quarter mark is `<beat-unit>quarter</beat-unit>` plus a
    // `<beat-unit-dot/>`; writing "dotted-quarter" as the unit is not a note
    // type, and the parser then drops the mark entirely.
    for (const [time, expected] of [
      ['4/4', { beatUnit: 'quarter', beatUnitDots: 0 }],
      ['6/8', { beatUnit: 'quarter', beatUnitDots: 1 }],
      ['12/8', { beatUnit: 'quarter', beatUnitDots: 1 }],
      ['7/8', { beatUnit: 'eighth', beatUnitDots: 0 }],
    ]) {
      const xml = NewScore.buildMusicXml({ instrumentIds: ['piano'], time, tempo: 120 });
      const parsed = engine.parseMusicXml(xml, window.DOMParser);
      const mark = parsed.tempoMarks[0];
      assert.ok(mark, `${time} must carry a metronome mark`);
      assert.equal(mark.beatUnit, expected.beatUnit, `${time} beat unit`);
      assert.equal(mark.beatUnitDots, expected.beatUnitDots, `${time} dot count`);
      assert.equal(mark.perMinute, 120, `${time} must print the tempo the user typed`);
      const dropped = parsed.diagnostics.filter((item) => item.code === 'UNSUPPORTED_METRONOME');
      assert.deepEqual([...dropped], [], `${time} must not drop its own mark`);
    }
  });

  test('the mark and the playback tempo describe the same speed', () => {
    const { window, engine, NewScore } = loadBuilder();
    // 120 dotted quarters a minute is 180 quarters a minute. The printed
    // number stays 120 and playback must run at the same rate the mark says.
    const xml = NewScore.buildMusicXml({ instrumentIds: ['piano'], time: '6/8', tempo: 120 });
    const rendered = engine.renderFromMusicXml(xml, {
      domParser: window.DOMParser,
      config: { layout: { mode: 'page' } },
    });
    const quarters = Math.round(60000000 / rendered.playback.tempoMap.segments[0].microsecondsPerQuarter);
    assert.equal(quarters, 180);
    assert.equal(engine.parseMusicXml(xml, window.DOMParser).tempoMarks[0].perMinute, 120);
  });

  test('a compound meter keeps the typed beat tempo, converted to quarters', () => {
    const { window, engine, NewScore } = loadBuilder();
    // 6/8 is counted in dotted quarters: 100 dotted quarters a minute is
    // 150 quarters a minute, which is what <sound tempo> must say.
    const xml = NewScore.buildMusicXml({ instrumentIds: ['piano'], time: '6/8', tempo: 100 });
    const rendered = engine.renderFromMusicXml(xml, {
      domParser: window.DOMParser,
      config: { layout: { mode: 'page' } },
    });
    const microseconds = rendered.playback.tempoMap.segments[0].microsecondsPerQuarter;
    assert.equal(Math.round(60000000 / microseconds), 150);
  });

  test('each chosen instrument becomes its own part, in the chosen order', () => {
    const { window, engine, NewScore } = loadBuilder();
    const xml = NewScore.buildMusicXml({ instrumentIds: ['cello', 'piano', 'drum-kit'], measures: 1 });
    const parsed = engine.parseMusicXml(xml, window.DOMParser);
    assert.deepEqual(
      [...parsed.score.parts.map((part) => part.name)],
      ['Cello', 'Piano', 'Drum Kit'],
    );
  });

  test('a drum kit declares its drums so a written note actually sounds', () => {
    const { window, engine, NewScore } = loadBuilder();
    const xml = NewScore.buildMusicXml({ instrumentIds: ['drum-kit'], measures: 1 });
    const parsed = engine.parseMusicXml(xml, window.DOMParser);
    const kit = parsed.midiInstrumentsByPart.get('P1');
    assert.ok(kit && kit.size > 0, 'the kit must declare its drums');
    // Snare is General MIDI key 38, and every drum needs a real key
    // number: a note naming an unknown instrument is silent.
    const snareId = [...kit.entries()].find(([, gmNote]) => gmNote === 38)?.[0];
    assert.ok(snareId, 'the kit must include a snare');

    const withSnare = xml.replace(
      /<note><rest measure="yes"\/><duration>\d+<\/duration><voice>1<\/voice><\/note>/,
      `<note><unpitched><display-step>D</display-step><display-octave>4</display-octave></unpitched>` +
        `<duration>16</duration><voice>1</voice><type>whole</type><instrument id="${snareId}"/></note>`,
    );
    const rendered = engine.renderFromMusicXml(withSnare, {
      domParser: window.DOMParser,
      config: { layout: { mode: 'page' } },
    });
    assert.deepEqual(
      [...rendered.playback.events.flatMap((event) => event.midiNotes ?? [])],
      [38],
      'the snare must sound as General MIDI key 38',
    );
    assert.ok(
      rendered.playback.tracks.some((track) => track.percussion && track.channel === 9),
      'the kit must play on the General MIDI percussion channel',
    );
  });

  test('a guitar sounds an octave below where it is written', () => {
    const { window, engine, NewScore } = loadBuilder();
    // Guitar is a transposing instrument: written C4 sounds C3. Stating
    // the octave in both <chromatic> and <octave-change> would sound it
    // two octaves low, which is the mistake this pins down.
    for (const id of ['acoustic-guitar', 'bass-guitar']) {
      const xml = NewScore.buildMusicXml({ instrumentIds: [id], measures: 1 });
      const withNote = xml.replace(
        /<note><rest measure="yes"\/><duration>\d+<\/duration><voice>1<\/voice><\/note>/,
        '<note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration>' +
          '<voice>1</voice><type>whole</type></note>',
      );
      const rendered = engine.renderFromMusicXml(withNote, {
        domParser: window.DOMParser,
        config: { layout: { mode: 'page' } },
      });
      assert.deepEqual([...rendered.playback.events.flatMap((event) => event.midiNotes ?? [])], [48]);
    }
  });

  test('the title and composer reach the score, and are escaped', () => {
    const { window, engine, NewScore } = loadBuilder();
    const xml = NewScore.buildMusicXml({
      instrumentIds: ['piano'],
      title: 'Song <&> "quoted"',
      composer: 'A. Composer',
    });
    assert.match(xml, /<work-title>Song &lt;&amp;&gt; &quot;quoted&quot;<\/work-title>/);
    assert.match(xml, /<creator type="composer">A\. Composer<\/creator>/);
    // The escaped text must come back out as the text that went in.
    const parsed = engine.parseMusicXml(xml, window.DOMParser);
    assert.equal(parsed.score.title, 'Song <&> "quoted"');
  });

  test('a stale or hostile spec still opens a writable score', () => {
    const { NewScore } = loadBuilder();
    const spec = NewScore.normaliseSpec({
      instrumentIds: ['not-an-instrument', 'piano', 'piano'],
      key: 'H',
      time: '13/16',
      tempo: 'fast',
      measures: 9999,
    });
    assert.deepEqual([...spec.instrumentIds], ['piano'], 'unknown and duplicate ids are dropped');
    assert.equal(spec.key, 'C', 'an unknown key falls back to C');
    assert.equal(spec.time, '4/4', 'an unknown meter falls back to 4/4');
    assert.equal(spec.tempo, 120, 'a non-numeric tempo falls back to 120');
    assert.equal(spec.measures, 64, 'the bar count is capped');
    assert.deepEqual([...NewScore.normaliseSpec({}).instrumentIds], ['piano']);
  });
});

describe('the Create wizard asks for a score before the editor opens', () => {
  const chipFor = (window, id) =>
    window.document.querySelector(`[data-newscore-groups] [data-instrument-id="${id}"]`);
  const stepOf = (window, name) =>
    window.document.querySelector(`[data-newscore-step="${name}"]`);

  test('Create opens the wizard instead of navigating straight to the editor', () => {
    const window = loadEntryPage();
    const wizard = window.document.querySelector('[data-newscore]');
    assert.equal(wizard.hidden, true, 'the wizard starts closed');
    window.document.querySelector('[data-notation-create]').click();
    assert.equal(wizard.hidden, false, 'Create opens the wizard');
    assert.equal(window.location.pathname.endsWith('notation-editor.html'), false, 'Create does not navigate away');
  });

  test('the instrument step lists every catalog instrument, grouped', () => {
    const window = loadEntryPage();
    const NewScore = window.NotationNewScore;
    window.document.querySelector('[data-notation-create]').click();
    for (const instrument of NewScore.INSTRUMENTS) {
      assert.ok(chipFor(window, instrument.id), `${instrument.name} must be offered`);
    }
    const groups = [...window.document.querySelectorAll('.newscore__group-label')].map((node) => node.textContent);
    assert.ok(groups.includes('Drums'), 'drums must be its own group');
    assert.ok(groups.includes('Keyboards'), 'keyboards must be its own group');
  });

  test('a chip toggles, and the last instrument cannot be removed', () => {
    const window = loadEntryPage();
    window.document.querySelector('[data-notation-create]').click();
    const piano = chipFor(window, 'piano');
    const drums = chipFor(window, 'drum-kit');
    assert.equal(piano.getAttribute('aria-pressed'), 'true', 'piano is on by default');

    drums.click();
    assert.equal(drums.getAttribute('aria-pressed'), 'true', 'clicking adds the kit');

    drums.click();
    assert.equal(drums.getAttribute('aria-pressed'), 'false', 'clicking again removes it');

    // One instrument must remain: a score with no part has nothing to
    // write into, so the last chip stays on and says why.
    piano.click();
    assert.equal(piano.getAttribute('aria-pressed'), 'true');
    const status = window.document.querySelector('[data-newscore-status]');
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /at least one instrument/i);
  });

  test('the setup step offers the key, meter, tempo and bar count', () => {
    const window = loadEntryPage();
    window.document.querySelector('[data-notation-create]').click();
    window.document.querySelector('[data-newscore-next]').click();
    assert.equal(stepOf(window, 'setup').hidden, false, 'Continue moves to setup');
    assert.equal(stepOf(window, 'instruments').hidden, true);

    const NewScore = window.NotationNewScore;
    const key = window.document.querySelector('[data-newscore-key]');
    const time = window.document.querySelector('[data-newscore-time]');
    assert.deepEqual([...key.options].map((option) => option.value), Object.keys(NewScore.KEY_LABELS));
    assert.deepEqual([...time.options].map((option) => option.value), [...NewScore.TIME_SIGNATURES]);
    assert.equal(window.document.querySelector('[data-newscore-tempo]').value, '120');
  });

  test('the review step restates the choices before creating', () => {
    const window = loadEntryPage();
    window.document.querySelector('[data-notation-create]').click();
    chipFor(window, 'drum-kit').click();
    window.document.querySelector('[data-newscore-next]').click();
    window.document.querySelector('[data-newscore-key]').value = 'D';
    window.document.querySelector('[data-newscore-time]').value = '3/4';
    window.document.querySelector('[data-newscore-tempo]').value = '90';
    window.document.querySelector('[data-newscore-title-input]').value = 'My Song';
    window.document.querySelector('[data-newscore-next]').click();

    assert.equal(stepOf(window, 'review').hidden, false);
    const summary = window.document.querySelector('[data-newscore-summary]').textContent;
    assert.match(summary, /Piano, Drum Kit/);
    assert.match(summary, /My Song/);
    assert.match(summary, /D major/);
    assert.match(summary, /3\/4/);
    assert.match(summary, /90 BPM/);
    assert.match(window.document.querySelector('[data-newscore-next]').textContent, /Create score/);
  });

  test('Back returns to the previous step and the first step has no Back', () => {
    const window = loadEntryPage();
    window.document.querySelector('[data-notation-create]').click();
    const back = window.document.querySelector('[data-newscore-back]');
    assert.equal(back.hidden, true, 'the first step has no Back');
    window.document.querySelector('[data-newscore-next]').click();
    assert.equal(back.hidden, false);
    back.click();
    assert.equal(stepOf(window, 'instruments').hidden, false);
  });

  test('Escape and Cancel close the wizard without creating a score', () => {
    const window = loadEntryPage();
    const wizard = window.document.querySelector('[data-newscore]');
    for (const close of [
      () => wizard.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
      () => window.document.querySelector('[data-newscore-foot], .newscore__foot [data-newscore-dismiss]').click(),
    ]) {
      window.document.querySelector('[data-notation-create]').click();
      assert.equal(wizard.hidden, false);
      close();
      assert.equal(wizard.hidden, true, 'the wizard closes');
    }
    assert.equal(window.sessionStorage.getItem('notation-lab-new-score'), null, 'nothing was handed over');
  });

  test('Create score hands the spec to the editor', () => {
    const window = loadEntryPage();
    window.document.querySelector('[data-notation-create]').click();
    chipFor(window, 'drum-kit').click();
    window.document.querySelector('[data-newscore-next]').click();
    window.document.querySelector('[data-newscore-time]').value = '6/8';
    window.document.querySelector('[data-newscore-next]').click();
    window.document.querySelector('[data-newscore-next]').click();

    // jsdom cannot navigate, so the handoff itself is what is asserted
    // here; the editor tests below open the editor and consume it.
    const stored = JSON.parse(window.sessionStorage.getItem('notation-lab-new-score'));
    assert.deepEqual(stored.instrumentIds, ['piano', 'drum-kit']);
    assert.equal(stored.time, '6/8');
    assert.equal(stored.title, 'Untitled score');
  });
});

/**
 * The other half of the wizard: the editor opening what the wizard
 * handed over. jsdom cannot navigate between pages, so the handoff is
 * seeded the way the entry page leaves it and the editor is opened
 * against it -- which is the same state a real Create click produces.
 */
function loadEditorWithHandoff(spec, url = 'https://example.test/notation-editor.html?intent=new') {
  const html = fs.readFileSync(path.join(appDir, 'notation-editor.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url });
  const { window } = dom;
  window.sessionStorage.setItem('notation-lab-new-score', JSON.stringify(spec));
  const context = dom.getInternalVMContext();
  for (const rel of ['assets/notation-engine.js', 'notation-doc.js', 'notation-newscore.js', 'notation-editor.js']) {
    vm.runInContext(fs.readFileSync(path.join(appDir, rel), 'utf8'), context, { filename: rel });
  }
  return window;
}

describe('the editor opens the score the wizard created', () => {
  test('the wizard score is drawn, and the handoff is consumed once', () => {
    const window = loadEditorWithHandoff({
      title: 'My Song',
      instrumentIds: ['piano', 'drum-kit'],
      key: 'D',
      time: '3/4',
      tempo: 90,
      measures: 2,
    });
    const doc = window.document;
    const scoreHost = doc.querySelector('[data-editor-score]');
    assert.equal(scoreHost.hidden, false, 'the score must be drawn');
    assert.equal(scoreHost.querySelectorAll('svg').length, 1);
    assert.equal(doc.querySelector('[data-editor-status]').textContent, 'Score ready.');
    assert.equal(doc.querySelector('[data-editor-file], [data-editor-filename]')?.textContent, 'My Song.musicxml');
    assert.equal(
      window.sessionStorage.getItem('notation-lab-new-score'),
      null,
      'a consumed handoff must not reopen the old score on the next visit',
    );
  });

  test('the wizard score reaches the editor even without the setup dropdowns', () => {
    // The clef/key/time selects lived in the bottom bar and are gone, so
    // the wizard's setup has to reach the drawn score on its own.
    const window = loadEditorWithHandoff({
      instrumentIds: ['piano'],
      key: 'G',
      time: '3/4',
      measures: 1,
    });
    const doc = window.document;
    for (const selector of ['[data-editor-key]', '[data-editor-time]', '[data-editor-clef]']) {
      assert.equal(doc.querySelector(selector), null, `${selector} must be gone from the bottom bar`);
    }
    const svg = doc.querySelector('[data-editor-score] svg');
    assert.ok(svg, 'the wizard score must be drawn');
    // The meter is drawn as SMuFL glyphs, so 3/4 shows up as timeSig3 +
    // timeSig4 rather than as the text "3/4".
    const drawn = [...svg.querySelectorAll('text')].map((node) => node.textContent).join('');
    assert.ok(drawn.includes('\uE083\uE084'), 'the drawn score must carry the wizard 3/4 meter');
  });

  test('a drum score is writable: clicking a line writes a sounding drum', () => {
    const window = loadEditorWithHandoff({ instrumentIds: ['drum-kit'], time: '4/4', measures: 1 });
    const doc = window.document;
    // Identity transform and a generous hit box, so a click lands on a
    // real staff position rather than wherever the browser would paint.
    window.DOMPoint = class {
      constructor(x = 0, y = 0) { this.x = x; this.y = y; }
      matrixTransform() { return new window.DOMPoint(this.x, this.y); }
    };
    window.SVGElement.prototype.getScreenCTM = () => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 });

    const scoreHost = doc.querySelector('[data-editor-score]');
    // A one-measure staff does not reach across the whole page, and a press
    // past its last bar is not on the score, so the click has to land on the
    // staff itself -- the same geometry the pointer code reads.
    const svg = scoreHost.querySelector('svg');
    const staffLines = [...svg.querySelectorAll('line')].filter((line) => line.getAttribute('y1') === line.getAttribute('y2')
      && Math.abs(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))) > 3);
    const staffXs = staffLines.flatMap((line) => [Number(line.getAttribute('x1')), Number(line.getAttribute('x2'))]);
    const staffYs = staffLines.map((line) => Number(line.getAttribute('y1')));
    scoreHost.dispatchEvent(new window.PointerEvent('pointerdown', {
      clientX: (Math.min(...staffXs) + Math.max(...staffXs)) / 2,
      clientY: Math.min(...staffYs),
      bubbles: true,
    }));
    // The status names the drum, which is the proof the click resolved to
    // a real kit instrument rather than to a pitch or to nothing.
    assert.match(doc.querySelector('[data-editor-status]').textContent, /Inserted .*(Snare|Hat|Tom|Cymbal|Drum)/);
    const drawn = scoreHost.querySelector('svg').querySelectorAll('[data-id]').length;
    assert.ok(drawn >= 2, 'the written drum must be drawn on the staff');
  });

  test('a broken handoff still opens a writable score', () => {
    const window = loadEditorWithHandoff('{not json');
    const scoreHost = window.document.querySelector('[data-editor-score]');
    assert.equal(scoreHost.hidden, false, 'a corrupt handoff must still open a starter score');
    assert.equal(scoreHost.querySelectorAll('svg').length, 1, 'a starter score must be drawn');
  });

  test('a multi-part score draws every part, and offers no part picker', () => {
    const one = loadEditorWithHandoff({ instrumentIds: ['piano'], measures: 1 });
    assert.equal(one.document.querySelector('[data-editor-part]'), null, 'the part dropdown is gone');

    const many = loadEditorWithHandoff({ instrumentIds: ['piano', 'drum-kit'], measures: 1 });
    const doc = many.document;
    assert.equal(doc.querySelector('[data-editor-instrument]'), null, 'the Instruments panel went with the sidebar');

    const drawn = [...doc.querySelectorAll('[data-editor-score] svg [data-id]')]
      .map((node) => node.getAttribute('data-id').split('#')[0]);
    assert.deepEqual([...new Set(drawn)].sort(), ['P1', 'P2'], 'both parts must still be drawn');
  });
});
