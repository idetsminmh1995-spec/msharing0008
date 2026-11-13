import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { loadEngine } from '../helpers/load-engine.js';

const NE = loadEngine();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) =>
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'musicxml', name), 'utf8');
const domParser = new JSDOM('').window.DOMParser;

/** Every `<text>` element's content, in document order. */
function textRuns(svg) {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
}

/** A chord layout's parts, as one comparable string (arrays from the vm realm are not deepEqual-able). */
function drawnParts(layout) {
  return layout.parts.map((p) => (p.kind === 'text' ? p.text : p.glyphName)).join('|');
}

describe('text layer: the generic text renderer (Phase 55/§19.10)', () => {
  test('renderText emits one <text> element with the font, size and colour it was given', () => {
    const svg = NE.renderText('Hal', 4, 12, {
      fontFamily: 'Manrope, sans-serif',
      fontSize: 1.8,
      color: '#112233',
    });
    assert.match(svg, /^<text /);
    assert.match(svg, /font-family="Manrope, sans-serif"/);
    assert.match(svg, /font-size="1\.8"/);
    assert.match(svg, /fill="#112233"/);
    assert.match(svg, />Hal<\/text>$/);
    // 'start' is SVG's own default, so it is not written out.
    assert.doesNotMatch(svg, /text-anchor/);
  });

  test('an anchor is written only when it is not the default', () => {
    const centered = NE.renderText('Hal', 4, 12, {
      fontFamily: 'x',
      fontSize: 1.8,
      color: '#000',
      anchor: 'middle',
    });
    assert.match(centered, /text-anchor="middle"/);
  });

  test('text content is escaped, so a hostile lyric cannot break the document', () => {
    const svg = NE.renderText('a<b&c', 0, 0, { fontFamily: 'x', fontSize: 1, color: '#000' });
    assert.match(svg, /a&lt;b&amp;c/);
  });

  test('a scaled glyph is drawn at the text size, not at the 4x SMuFL convention', () => {
    const svg = NE.renderTextScaledGlyph('\uE870', 0, 0, {
      fontFamily: 'Bravura',
      fontSize: 1.8,
      color: '#000',
    });
    assert.match(svg, /font-size="1\.8"/);
  });
});

describe('text layer: chord symbols (§9.23)', () => {
  test('a major seventh is the root letter plus the real csymMajorSeventh glyph', () => {
    const layout = NE.chordSymbolLayout(
      { rootStep: 'C', rootAlter: 0, kind: 'major-seventh' },
      1.8,
    );
    assert.equal(layout.unsupportedKind, undefined);
    assert.equal(drawnParts(layout), 'C|csymMajorSeventh');
    assert.ok(layout.width > 0);
  });

  test('a minor seventh is csymMinor followed by a plain "7", not a made-up glyph', () => {
    const layout = NE.chordSymbolLayout({ rootStep: 'A', rootAlter: 0, kind: 'minor-seventh' }, 1.8);
    assert.equal(drawnParts(layout), 'A|csymMinor|7');
  });

  test('a slash bass adds the real csymAlteredBassSlash glyph and the bass letter', () => {
    const layout = NE.chordSymbolLayout(
      { rootStep: 'G', rootAlter: 0, kind: 'dominant', bassStep: 'B', bassAlter: 0 },
      1.8,
    );
    assert.equal(drawnParts(layout), 'G|7|csymAlteredBassSlash|B');
  });

  test('a root accidental uses the csym glyph set, which is distinct from the plain one', () => {
    const layout = NE.chordSymbolLayout({ rootStep: 'F', rootAlter: 1, kind: 'diminished' }, 1.8);
    assert.equal(drawnParts(layout), 'F|csymAccidentalSharp|csymDiminished');
    assert.notEqual(layout.parts[1].glyphName, NE.tryAccidentalGlyphName(1));
  });

  test('a <kind text="..."> wins outright over this engine own spelling', () => {
    const layout = NE.chordSymbolLayout(
      { rootStep: 'B', rootAlter: 0, kind: 'half-diminished', kindText: 'm7b5' },
      1.8,
    );
    assert.equal(drawnParts(layout), 'B|m7b5');
  });

  test('an unknown <kind> draws nothing and reports itself rather than guessing', () => {
    const layout = NE.chordSymbolLayout({ rootStep: 'C', rootAlter: 0, kind: 'other' }, 1.8);
    assert.equal(layout.parts.length, 0);
    assert.equal(layout.unsupportedKind, 'other');
    assert.equal(layout.width, 0);
  });

  test('renderChordSymbol draws every part left to right from the x it is given', () => {
    const layout = NE.chordSymbolLayout({ rootStep: 'C', rootAlter: 0, kind: 'major' }, 1.8);
    const svg = NE.renderChordSymbol(layout, 5, 10, {
      textFont: 'Manrope',
      musicFont: 'Bravura',
      fontSize: 1.8,
      color: '#000',
    });
    assert.match(svg, /data-chord-symbol="true"/);
    assert.match(svg, /<text x="5" y="10"/);
  });
});

describe('text layer: lyrics (§9.22)', () => {
  const box = (text, x, width, extra = {}) => ({
    text,
    x,
    width,
    extend: false,
    melismaEndX: 30,
    ...extra,
  });

  test('a hyphen is centered between two syllables of the same word', () => {
    const items = NE.layoutLyricRow(
      [box('Hal', 4, 2, { syllabic: 'begin' }), box('le', 8, 1.4, { syllabic: 'end' })],
      { hyphenWidth: 0.5, elisionWidth: 1, punctuationGap: 0 },
    );
    const hyphen = items.find((i) => i.kind === 'hyphen');
    // 'Hal' spans 3..5 and 'le' spans 7.2..8.8, so the midpoint is 6.1.
    assert.ok(Math.abs(hyphen.x - 6.15) < 1e-9);
  });

  test('no hyphen when the file never said the word continues', () => {
    const items = NE.layoutLyricRow([box('Hal', 4, 2), box('le', 8, 1.4)], {
      hyphenWidth: 0.5,
      elisionWidth: 1,
      punctuationGap: 0,
    });
    assert.equal(items.filter((i) => i.kind === 'hyphen').length, 0);
  });

  test('two syllables on one note are an elision, drawn side by side around the note', () => {
    const items = NE.layoutLyricRow([box('A', 10, 1), box('men', 10, 3)], {
      hyphenWidth: 0.5,
      elisionWidth: 1,
      punctuationGap: 0,
    });
    const syllables = items.filter((i) => i.kind === 'syllable');
    assert.equal(syllables.length, 2);
    // Centered as a group on the note's own x: the pair spans 1 + 1 + 3 = 5,
    // so it starts at 7.5 and ends at 12.5, and the elision sits at 9.5.
    assert.equal(syllables[0].x, 8);
    assert.equal(syllables[1].x, 11);
    const elision = items.find((i) => i.kind === 'elision');
    assert.equal(elision.x, 9);
  });

  test('an <extend/> syllable gets a melisma line that stops before the next syllable', () => {
    const items = NE.layoutLyricRow(
      [
        box('lu', 4, 2, { extend: true }),
        box('jah', 12, 2),
      ],
      { hyphenWidth: 0.5, elisionWidth: 1, punctuationGap: 0 },
    );
    const extender = items.find((i) => i.kind === 'extender');
    assert.equal(extender.startX, 5);
    assert.equal(extender.endX, 11);
  });

  test('the last syllable of a row extends to the melisma end it was given', () => {
    const items = NE.layoutLyricRow([box('lu', 4, 2, { extend: true })], {
      hyphenWidth: 0.5,
      elisionWidth: 1,
      punctuationGap: 0,
    });
    const extender = items.find((i) => i.kind === 'extender');
    assert.equal(extender.startX, 5);
    assert.equal(extender.endX, 30);
  });

  test('verse rows step down by the configured row height', () => {
    assert.equal(NE.lyricRowBaselineY(8, 0, 2.2, 2.6), 10.2);
    assert.ok(Math.abs(NE.lyricRowBaselineY(8, 1, 2.2, 2.6) - 12.8) < 1e-9);
  });

  test('renderLyricRow draws the words as text and the hyphen as a glyph', () => {
    const items = NE.layoutLyricRow(
      [box('Hal', 4, 2, { syllabic: 'begin' }), box('le', 8, 1.4, { syllabic: 'end' })],
      { hyphenWidth: 0.5, elisionWidth: 1, punctuationGap: 0 },
    );
    const svg = NE.renderLyricRow(items, 12, {
      fontFamily: 'Manrope',
      fontSize: 1.8,
      musicFont: 'Bravura',
      color: '#000',
      hyphenWidth: 0.5,
      elisionWidth: 1,
      lineThickness: 0.16,
    });
    assert.match(svg, /data-lyric-row="true"/);
    assert.match(svg, />Hal</);
    assert.match(svg, />le</);
    assert.match(svg, /font-family="Bravura"/);
  });
});

describe('text layer: rehearsal marks and <words> (§9.21)', () => {
  test('the frame is at least as wide as the text it encloses', () => {
    const box = NE.computeRehearsalMarkBox('A', 2.4);
    assert.ok(box.width > box.textWidth);
    assert.ok(box.height > box.ascent + box.descent);
  });

  test('renderRehearsalMark draws a frame and a centered letter', () => {
    const box = NE.computeRehearsalMarkBox('B', 2.4);
    const svg = NE.renderRehearsalMark('B', 10, 4, {
      box,
      fontFamily: 'Manrope',
      fontSize: 2.4,
      color: '#000',
      frameColor: '#000',
    });
    assert.match(svg, /data-rehearsal-mark="true"/);
    assert.match(svg, /<rect /);
    assert.match(svg, /text-anchor="middle"/);
    assert.match(svg, />B</);
  });

  test('renderWords can draw an italic expression mark', () => {
    const svg = NE.renderWords('dolce', 10, 4, {
      fontFamily: 'Manrope',
      fontSize: 2.4,
      color: '#000',
      italic: true,
    });
    assert.match(svg, /font-style="italic"/);
    assert.match(svg, />dolce</);
  });
});

describe('text layer: end to end through renderFromMusicXml (Phase 55)', () => {
  const render = (config) => {
    const result = NE.renderFromMusicXml(fixture('text-layer.musicxml'), {
      domParser,
      ...(config !== undefined ? { config } : {}),
    });
    return result;
  };

  test('every lyric verse is drawn, and nothing reports a diagnostic', () => {
    const result = render();
    assert.equal(result.diagnostics.length, 0, JSON.stringify(result.diagnostics));
    const runs = textRuns(result.svg);
    for (const word of ['Hal', 'le', 'lu', 'jah', 'Praise', 'A', 'men']) {
      assert.ok(runs.includes(word), `missing lyric syllable ${word}`);
    }
  });

  test('one lyric row is drawn per verse per measure that has text', () => {
    const result = render();
    const rows = result.svg.match(/data-lyric-row="true"/g) ?? [];
    // Measure 1: verses 1 and 2. Measure 2: verse 1. Measure 4: verse 1.
    assert.equal(rows.length, 4);
  });

  test('the hyphen and the melisma extender are both really drawn', () => {
    const result = render();
    // The hyphen is the SMuFL glyph, drawn in the music font at text size.
    const hyphen = NE.getGlyph(NE.lyricHyphenGlyphName()).char;
    assert.ok(result.svg.includes(hyphen));
    // The extender is a line, not a glyph: a horizontal segment below the
    // staff that no staff line accounts for.
    const lines = [...result.svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)]
      .map((m) => ({ x1: Number(m[1]), y1: Number(m[2]), x2: Number(m[3]), y2: Number(m[4]) }))
      .filter((l) => l.y1 === l.y2 && l.x2 > l.x1);
    assert.ok(lines.length > 0);
  });

  test('all five chord symbols are drawn, including the slash bass and the sharp root', () => {
    const result = render();
    const symbols = result.svg.match(/data-chord-symbol="true"/g) ?? [];
    assert.equal(symbols.length, 5);
    const runs = textRuns(result.svg);
    assert.ok(runs.includes('C'));
    assert.ok(runs.includes('D'));
    assert.ok(runs.includes('G'));
    assert.ok(runs.includes('B'));
    // The sharp root's own csym glyph, not the plain accidental.
    assert.ok(result.svg.includes(NE.getGlyph('csymAccidentalSharp').char));
    assert.ok(result.svg.includes(NE.getGlyph('csymAlteredBassSlash').char));
  });

  test('the rehearsal mark is framed and the <words> direction is italic', () => {
    const result = render();
    assert.match(result.svg, /data-rehearsal-mark="true"/);
    assert.match(result.svg, /font-style="italic"[^>]*>Allegro</);
  });

  test('a lyric row sits BELOW the staff and a chord symbol ABOVE it', () => {
    const result = render();
    // Read the staff out of the drawing rather than hardcoding STAFF_BOTTOM_Y:
    // the five staff lines are the only five horizontal segments that share
    // one x-span, and the lowest of them is the bottom line.
    const bySpan = new Map();
    for (const m of result.svg.matchAll(
      /<line x1="([\d.]+)" y1="([-\d.]+)" x2="([\d.]+)" y2="([-\d.]+)"/g,
    )) {
      if (m[2] !== m[4]) continue;
      const key = `${m[1]}|${m[3]}`;
      bySpan.set(key, [...(bySpan.get(key) ?? []), Number(m[2])]);
    }
    const staffYs = [...bySpan.values()].find((ys) => ys.length === 5);
    assert.ok(staffYs !== undefined, 'expected five staff lines sharing one x-span');
    const bottomY = Math.max(...staffYs);
    const lyricY = [
      ...result.svg.matchAll(/data-lyric-row="true">\s*<text[^>]*y="([-\d.]+)"/g),
    ].map((m) => Number(m[1]));
    assert.ok(lyricY.length > 0);
    assert.ok(Math.min(...lyricY) > bottomY, 'lyrics must hang below the staff');
    const chordY = [
      ...result.svg.matchAll(/data-chord-symbol="true">\s*<text[^>]*y="([-\d.]+)"/g),
    ].map((m) => Number(m[1]));
    assert.ok(chordY.length > 0);
    assert.ok(Math.max(...chordY) < bottomY - 4, 'chord symbols must clear the staff');
    // One line, not one per bar: every chord symbol shares a baseline.
    assert.equal(new Set(chordY).size, 1);
  });

  test('turning the text layer off draws none of it', () => {
    const result = render({
      text: {
        lyricsDisplay: 'off',
        chordSymbolsDisplay: 'off',
        rehearsalMarksDisplay: 'off',
        wordsDisplay: 'off',
      },
    });
    assert.equal(result.svg.includes('data-lyric-row'), false);
    assert.equal(result.svg.includes('data-chord-symbol'), false);
    assert.equal(result.svg.includes('data-rehearsal-mark'), false);
    assert.equal(textRuns(result.svg).includes('Allegro'), false);
  });
});
