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

test('the header reserves room for the mark, in every ratio', () => {
  // The two used to carry their own copy of the size, and when one
  // changed a design drew underneath the logo. They read one constant
  // now; this is what says so.
  for (const aspect of ['16x9', '9x16', '1x1']) {
    const canvas = M.canvasFor(aspect);
    const box = M.logoBox(canvas);
    const { stage } = M.bands(canvas);
    assert.ok(
      box.y + box.height <= stage.y + 0.5,
      `${aspect}: the stage starts at ${stage.y}, under a mark ending at ${box.y + box.height}`,
    );
    assert.ok(box.width > canvas.short * 0.12, `${aspect}: the mark is smaller than it should be`);
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

test('every design carries the same BPM and metre readout, in the same two colours', () => {
  // The owner asked for ONE readout treatment across all eleven -- the
  // tempo in yellow with BPM under it in red, and the metre's figures
  // in the same yellow either side of a red slash. A design that drew
  // its own, or took its own accent for it, would be the one that
  // drifted, and that is exactly what this stops.
  for (const design of M.listDesigns()) {
    for (const aspect of RATIOS) {
      const where = `${design.id}/${aspect}`;
      const svg = M.renderMetronomeFrame({
        design: design.id,
        aspect,
        frame: frame({ bpm: 96, beatsPerBar: 7, timeSignature: { numerator: 7, denominator: 8 } }),
      });
      const value = design.palette.statValue;
      const label = design.palette.statLabel;
      assert.match(svg, new RegExp(`fill="${value}"[^>]*>96<`), `${where}: no yellow tempo`);
      assert.match(svg, new RegExp(`fill="${label}"[^>]*>BPM<`), `${where}: no red BPM label`);
      assert.match(svg, new RegExp(`fill="${value}"[^>]*>7<`), `${where}: no yellow numerator`);
      assert.match(svg, new RegExp(`fill="${label}"[^>]*>/<`), `${where}: no red slash`);
      assert.match(svg, new RegExp(`fill="${value}"[^>]*>8<`), `${where}: no yellow denominator`);
    }
  }
  // The two colours are a property of the GROUND, not of the design:
  // every dark design shares one pair and every light one the other.
  const dark = M.listDesigns().filter((d) => !d.isLight);
  const light = M.listDesigns().filter((d) => d.isLight);
  assert.equal(new Set(dark.map((d) => d.palette.statValue)).size, 1);
  assert.equal(new Set(light.map((d) => d.palette.statValue)).size, 1);
  assert.notEqual(dark[0].palette.statValue, light[0].palette.statValue);
  for (const d of M.listDesigns()) {
    assert.notEqual(
      d.palette.statValue,
      d.palette.accent,
      `${d.id}: the readout fell back to the design's own accent`,
    );
  }
});

test('the readout is big enough to read across a room, in every ratio', () => {
  // It is a sixth of the short side, give or take whatever the widest
  // of the three strings needs -- not the line of small type in a
  // corner it used to be. A regression here is invisible in a test
  // that only checks the markup is well formed.
  for (const design of M.listDesigns()) {
    for (const aspect of RATIOS) {
      const canvas = M.canvasFor(aspect);
      const svg = M.renderMetronomeFrame({ design: design.id, aspect, frame: frame() });
      const size = Number(/<text[^>]*font-size="([\d.]+)"[^>]*>BPM</.exec(svg)[1]);
      assert.ok(
        size > canvas.short * 0.085,
        `${design.id}/${aspect}: the BPM label is only ${size} on a ${canvas.short} side`,
      );
    }
  }
});

test('the readout keeps its own room, and no design draws into it', () => {
  for (const aspect of RATIOS) {
    const canvas = M.canvasFor(aspect);
    const { stage } = M.bands(canvas);
    if (canvas.isPortrait || canvas.isSquare) {
      const { header } = M.bands(canvas);
      assert.ok(
        stage.y >= header.y + header.height + M.statRowHeight(canvas) - 0.5,
        `${aspect}: the stage starts inside the stat row under the title`,
      );
      assert.ok(stage.height > canvas.height * 0.3, `${aspect}: the stage has almost no room left`);
    } else {
      assert.ok(
        stage.x >= M.statColumnWidth(canvas),
        `${aspect}: the stage starts inside the left stat column`,
      );
      assert.ok(
        stage.x + stage.width <= canvas.width - M.statColumnWidth(canvas),
        `${aspect}: the stage runs into the right stat column`,
      );
    }
  }
});

test('Beat Dots draws the medallion, the count inside it, and one dot per beat', () => {
  // The owner drew this one: a machined ring with the count in red
  // standing in its middle, and a row of white dots underneath, one
  // per beat of the bar. All three have to be there, and the dot count
  // has to follow the metre rather than being four forever.
  for (const aspect of RATIOS) {
    for (const beatsPerBar of [2, 4, 7]) {
      const svg = M.renderMetronomeFrame({
        design: 'beat-dots',
        aspect,
        frame: frame({ beatsPerBar, beat: 2, bpm: 96 }),
      });
      const where = `beat-dots/${aspect}/${beatsPerBar}`;
      const palette = M.listDesigns().find((d) => d.id === 'beat-dots').palette;

      // The count, in the medallion's own red.
      assert.match(svg, new RegExp(`fill="${palette.accent}"[^>]*>2<`), `${where}: no count`);

      // One dot per beat: the one whose turn it is in the count's own
      // red, the rest white.
      const waiting = [...svg.matchAll(new RegExp(`<circle[^>]*fill="${palette.ink}"`, 'g'))];
      const current = [...svg.matchAll(new RegExp(`<circle[^>]*fill="${palette.accent}"`, 'g'))];
      assert.equal(waiting.length, beatsPerBar - 1, `${where}: wrong number of waiting dots`);
      assert.equal(current.length, 1, `${where}: the beat's own dot is not lit`);

      // And the rings: five concentric circles plus the two tick bands,
      // which are paths of many subpaths rather than many elements.
      const rings = [...svg.matchAll(/<circle[^>]*fill="none"/g)];
      assert.ok(rings.length >= 5, `${where}: the medallion lost its rings`);
      const tickBands = [...svg.matchAll(/<path d="M [^"]*L [^"]*"/g)];
      assert.ok(tickBands.length >= 2, `${where}: the medallion lost its hatching`);
    }
  }
});

test('Beat Dots settles to its drawn shape between beats', () => {
  // The drawing it came from is a still: four equal dots and no ping.
  // Right after a beat the current dot is swollen and a ring is on its
  // way out; by the time the next beat is near, the frame is the still
  // again. A design that never settled would never look like what was
  // drawn.
  const at = (phase) =>
    M.renderMetronomeFrame({
      design: 'beat-dots',
      aspect: '16x9',
      frame: frame({ beat: 2, beatsPerBar: 4, phase }),
    });
  const litRadius = (svg) =>
    Number(/<circle[^>]*r="([\d.]+)"[^>]*fill="#E90006"/.exec(svg)[1]);
  const waitingRadii = (svg) =>
    [...svg.matchAll(/<circle[^>]*r="([\d.]+)"[^>]*fill="#FFFFFF"/g)].map((m) => Number(m[1]));

  const resting = waitingRadii(at(0.9));
  assert.equal(resting.length, 3, 'three dots are waiting their turn');
  assert.equal(new Set(resting.map((r) => r.toFixed(3))).size, 1, 'and are all one size');
  assert.ok(litRadius(at(0)) > litRadius(at(0.9)), 'the beat should swell its own dot');
  assert.ok(
    Math.abs(litRadius(at(0.9)) - resting[0]) < 0.001,
    'and settle back to the size of the others',
  );
  // The ping ring is drawn on the beat and gone well before the next.
  assert.ok(at(0).length > at(0.9).length, 'the ping should have faded out');
});

test('the readout sits under the title in the narrow shapes, not along the bottom', () => {
  // The owner drew 9x16 and 1x1 with the tempo directly under the
  // title and the instrument below it: on a phone the eye goes
  // top-down, and a tempo parked at the foot of the frame is the last
  // thing read rather than the second.
  for (const aspect of ['9x16', '1x1']) {
    const canvas = M.canvasFor(aspect);
    const { header, stage } = M.bands(canvas);
    const svg = M.renderMetronomeFrame({ design: 'pendulum', aspect, frame: frame() });
    const bpmY = Number(/<text[^>]*y="([\d.]+)"[^>]*>BPM</.exec(svg)[1]);
    assert.ok(bpmY > header.y + header.height, `${aspect}: the readout is inside the title band`);
    assert.ok(bpmY < stage.y, `${aspect}: the readout is inside the stage`);
    assert.ok(stage.y + stage.height > canvas.height * 0.9, `${aspect}: the stage stops short`);
  }
});

test('each design carries its own mark: the two the owner named', () => {
  assert.equal(M.metronomeLogoName('pendulum'), 'drum');
  assert.equal(M.metronomeLogoName('beat-dots'), 'piano');
});

test('every design has a mark, and it is in the summary a picker reads', () => {
  for (const design of M.listDesigns()) {
    assert.equal(typeof design.logo, 'string');
    assert.ok(design.logo.length > 0, `${design.id} has no mark`);
    assert.equal(design.logo, M.metronomeLogoName(design.id));
  }
});

test('a design nobody has heard of gets the house mark, never an empty corner', () => {
  assert.equal(M.metronomeLogoName('no-such-design'), M.DEFAULT_LOGO_NAME);
  assert.equal(M.DEFAULT_LOGO_NAME, 'sharing');
});

test('the seven instruments are spread one per design, not repeated', () => {
  // Eleven designs, seven instruments: each instrument is used once and
  // the four left over take the house mark. A repeat would say something
  // untrue about a design rather than nothing.
  const used = M.listDesigns()
    .map((d) => d.logo)
    .filter((name) => name !== M.DEFAULT_LOGO_NAME);
  assert.equal(new Set(used).size, used.length, `an instrument is used twice: ${used.join(', ')}`);
});
