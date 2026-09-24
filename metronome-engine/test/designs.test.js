import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// The BUILT bundle, in a bare sandbox -- the same file the page loads,
// so a test can never pass against code the browser will not run.
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../dist/metronome-engine.js', import.meta.url), 'utf8'), sandbox);
const M = sandbox.MetronomeDesigns;

const RATIOS = ['16x9', '9x16', '1x1'];
const frame = (over = {}) => ({
  beat: 1,
  beatsPerBar: 4,
  phase: 0,
  bar: 1,
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  ...over,
});

test('there are exactly eleven designs, each with its own id', () => {
  const designs = M.listDesigns();
  assert.equal(designs.length, 11);
  assert.equal(new Set(designs.map((d) => d.id)).size, 11);
  assert.equal(new Set(designs.map((d) => d.name)).size, 11);
  for (const d of designs) {
    assert.ok(d.description.length > 10, `${d.id} needs a description`);
  }
});

test('every design renders every ratio, and gets the ratio right', () => {
  const expected = { '16x9': '0 0 1920 1080', '9x16': '0 0 1080 1920', '1x1': '0 0 1080 1080' };
  for (const design of M.listDesigns()) {
    for (const aspect of RATIOS) {
      const svg = M.renderMetronomeFrame({ design: design.id, aspect, frame: frame() });
      assert.ok(svg.startsWith('<svg'), `${design.id}/${aspect} is not an svg`);
      assert.ok(svg.endsWith('</svg>'), `${design.id}/${aspect} is not closed`);
      assert.ok(
        svg.includes(`viewBox="${expected[aspect]}"`),
        `${design.id}/${aspect} has the wrong viewBox`,
      );
      // Well-formedness: every tag opened is closed. A malformed frame
      // renders as nothing at all in a browser, silently.
      const opens = (svg.match(/<(?!\/)[a-z]/g) ?? []).length;
      const closes = (svg.match(/\/>/g) ?? []).length + (svg.match(/<\/[a-z]/g) ?? []).length;
      assert.equal(opens, closes, `${design.id}/${aspect} has unbalanced tags`);
      assert.ok(!svg.includes('NaN'), `${design.id}/${aspect} emitted NaN`);
      assert.ok(!svg.includes('undefined'), `${design.id}/${aspect} emitted undefined`);
    }
  }
});

test('the 33 layouts are all different from each other', () => {
  const seen = new Map();
  for (const design of M.listDesigns()) {
    for (const aspect of RATIOS) {
      const svg = M.renderMetronomeFrame({
        design: design.id,
        aspect,
          frame: frame({ beat: 2, phase: 0.3 }),
      });
      // Ignore the shared shell and header -- two designs are allowed to
      // agree about where the BPM goes, and must not agree about
      // anything else.
      const body = svg.slice(svg.indexOf('</g>') + 4);
      const key = `${design.id}/${aspect}`;
      for (const [other, previous] of seen) {
        assert.notEqual(body, previous, `${key} draws exactly what ${other} draws`);
      }
      seen.set(key, body);
    }
  }
  assert.equal(seen.size, 33);
});

test('a design looks different at different points in the bar', () => {
  for (const design of M.listDesigns()) {
    const frames = [
      M.renderMetronomeFrame({ design: design.id, aspect: '16x9', frame: frame({ beat: 1, phase: 0 }) }),
      M.renderMetronomeFrame({ design: design.id, aspect: '16x9', frame: frame({ beat: 3, phase: 0 }) }),
      M.renderMetronomeFrame({ design: design.id, aspect: '16x9', frame: frame({ beat: 3, phase: 0.6 }) }),
    ];
    assert.notEqual(frames[0], frames[1], `${design.id} does not react to the beat`);
    assert.notEqual(frames[1], frames[2], `${design.id} does not move within a beat`);
  }
});

test('every design has its own look, and draws in it', () => {
  const designs = M.listDesigns();
  const grounds = designs.map((d) => d.palette.background);
  assert.equal(new Set(grounds).size, 11, 'two designs share a background');
  assert.equal(new Set(designs.map((d) => d.look)).size, 11, 'two designs share a look name');
  // Both grounds are represented: a picker of eleven dark frames is
  // much harder to tell apart than a mixed one.
  assert.ok(designs.some((d) => d.isLight), 'no light design at all');
  assert.ok(designs.some((d) => !d.isLight), 'no dark design at all');
  for (const design of designs) {
    const svg = M.renderMetronomeFrame({ design: design.id, aspect: '1x1', frame: frame() });
    assert.ok(
      svg.includes(`fill="${design.palette.background}"`),
      `${design.id} is not drawn on its own background`,
    );
    assert.ok(svg.includes(design.palette.accent), `${design.id} never uses its own accent`);
  }
});

test('odd time signatures are drawn, not rounded away', () => {
  for (const design of M.listDesigns()) {
    for (const beatsPerBar of [1, 3, 5, 6, 7, 12]) {
      const svg = M.renderMetronomeFrame({
        design: design.id,
        aspect: '9x16',
          frame: frame({ beatsPerBar, beat: beatsPerBar, timeSignature: { numerator: beatsPerBar, denominator: 8 } }),
      });
      assert.ok(!svg.includes('NaN'), `${design.id} broke on ${beatsPerBar}/8`);
      assert.ok(svg.length > 400, `${design.id} drew almost nothing for ${beatsPerBar}/8`);
    }
  }
});

test('nonsense input is clamped rather than drawn', () => {
  const svg = M.renderMetronomeFrame({
    design: 'no-such-design',
    aspect: 'banana',
    frame: { beat: 0, beatsPerBar: 0, phase: NaN, bar: -3, bpm: 0, timeSignature: { numerator: 0, denominator: 0 } },
  });
  assert.ok(svg.includes('viewBox="0 0 1920 1080"'), 'unknown ratio should fall back to 16x9');
  assert.ok(!svg.includes('NaN'));
  assert.ok(!svg.includes('Infinity'));
});

test('a logo is placed when given and nothing is drawn when not', () => {
  for (const design of M.listDesigns()) {
    const without = M.renderMetronomeFrame({ design: design.id, aspect: '16x9', frame: frame() });
    const with_ = M.renderMetronomeFrame({
      design: design.id,
      aspect: '16x9',
      frame: frame(),
      logoUrl: 'https://example.test/logo.png',
    });
    assert.ok(!without.includes('<image'), `${design.id} draws a logo box with no logo`);
    assert.ok(with_.includes('<image'), `${design.id} ignores the logo`);
    assert.ok(with_.includes('example.test/logo.png'));
  }
});

test('text is escaped, so a title cannot break the frame', () => {
  const svg = M.renderMetronomeFrame({
    design: 'big-number',
    aspect: '1x1',
    frame: frame(),
    title: '<script>x</script> & "quotes"',
  });
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(svg.includes('&amp;'));
});
