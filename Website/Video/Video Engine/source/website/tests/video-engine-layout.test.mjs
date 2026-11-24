import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/video-engine.js', import.meta.url), 'utf8');

function loadEngine() {
  const window = {};
  const context = vm.createContext({
    window,
    document: { createElement: () => ({ getContext: () => ({}), captureStream: () => ({ getTracks: () => [] }) }) },
    navigator: { deviceMemory: 8 },
    Blob,
    Uint8Array,
    Float32Array,
    DataView,
    TextEncoder,
    TextDecoder,
    DOMException,
    performance,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    console,
    Math,
    Number,
    Array,
    Object,
    Set,
    Map,
    Promise,
    Error,
    TypeError,
    RangeError,
  });
  vm.runInContext(source, context, { filename: 'video-engine.js' });
  return window.VideoEngine;
}

const SIZES = {
  '16:9': { width: 1920, height: 1080 },
  '1:1': { width: 1080, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
};

test('each instrument gets all three parts, inside the frame and apart', () => {
  const { layoutFor } = loadEngine();
  for (const instrument of ['drums', 'piano', 'guitar', 'bass', 'violin']) {
    for (const [ratio, { width, height }] of Object.entries(SIZES)) {
      const layout = layoutFor(instrument, { width, height });
      assert.deepEqual([...layout.parts].sort(), ['instrument', 'notation', 'title']);
      assert.equal(layout.ratio, ratio);

      for (const [name, rect] of Object.entries(layout.rects)) {
        assert.ok(rect.x >= 0 && rect.y >= 0, `${instrument}/${ratio}/${name} starts outside the frame`);
        assert.ok(rect.x + rect.width <= width, `${instrument}/${ratio}/${name} runs off the right`);
        assert.ok(rect.y + rect.height <= height, `${instrument}/${ratio}/${name} runs off the bottom`);
        assert.ok(rect.width > 0 && rect.height > 0, `${instrument}/${ratio}/${name} has no area`);
      }

      const rects = Object.entries(layout.rects);
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const [nameA, a] = rects[i];
          const [nameB, b] = rects[j];
          const overlaps =
            a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
          assert.equal(overlaps, false, `${instrument}/${ratio}: ${nameA} overlaps ${nameB}`);
        }
      }
    }
  }
});

test('a voice frame is the Title band over the waveform, with no notation part', () => {
  const { layoutFor } = loadEngine();
  for (const [ratio, { width, height }] of Object.entries(SIZES)) {
    const layout = layoutFor('voice', { width, height });
    assert.equal(layout.ratio, ratio);
    // A voice has nothing to notate and nothing to mark: the recording's
    // waveform is the body of the frame.
    assert.deepEqual([...layout.parts], ['title', 'instrument']);
    assert.equal(layout.rects.notation, undefined);
    assert.ok(layout.rects.title.y < layout.rects.instrument.y);
    for (const [name, rect] of Object.entries(layout.rects)) {
      assert.ok(rect.width > 0 && rect.height > 0, `voice/${ratio}/${name} has no area`);
      assert.ok(rect.x + rect.width <= width, `voice/${ratio}/${name} runs off the right`);
      assert.ok(rect.y + rect.height <= height, `voice/${ratio}/${name} runs off the bottom`);
    }
  }
});

test('the declared order is the drawn order, per the Plan', () => {
  const { layoutFor } = loadEngine();
  const topOf = (rect) => rect.y;
  const drums = layoutFor('drums', SIZES['16:9']);
  assert.ok(topOf(drums.rects.title) < topOf(drums.rects.notation));
  assert.ok(topOf(drums.rects.notation) < topOf(drums.rects.instrument));

  const piano = layoutFor('piano', SIZES['16:9']);
  assert.ok(topOf(piano.rects.title) < topOf(piano.rects.instrument));

  const guitar = layoutFor('guitar', SIZES['16:9']);
  assert.ok(topOf(guitar.rects.instrument) < topOf(guitar.rects.notation));
  assert.ok(topOf(guitar.rects.notation) < topOf(guitar.rects.title));

  const bass = layoutFor('bass', SIZES['16:9']);
  assert.ok(topOf(bass.rects.instrument) < topOf(bass.rects.notation));
  assert.ok(topOf(bass.rects.notation) < topOf(bass.rects.title));

  const violin = layoutFor('violin', SIZES['16:9']);
  assert.equal(violin.shape, 'split');
  assert.ok(violin.rects.notation.x < violin.rects.instrument.x);
  assert.ok(topOf(violin.rects.notation) < topOf(violin.rects.title));
});

test('a page that draws only some parts still gets a sane frame', () => {
  const { layoutFor } = loadEngine();
  const layout = layoutFor('drums', { ...SIZES['16:9'], parts: ['title', 'instrument'] });
  assert.deepEqual([...layout.parts], ['title', 'instrument']);
  assert.equal(layout.rects.notation, undefined);
  const stacked = layout.rects.instrument.y + layout.rects.instrument.height;
  assert.ok(stacked <= SIZES['16:9'].height, 'the remaining parts did not fill the frame');
});

test('an undeclared instrument is refused rather than guessed at', () => {
  const { layoutFor } = loadEngine();
  assert.throws(() => layoutFor('theremin', SIZES['16:9']), /No video layout is declared/);
});

test('the ratio is read from the frame, not from the caller', () => {
  const { ratioOf } = loadEngine();
  for (const [ratio, { width, height }] of Object.entries(SIZES)) {
    assert.equal(ratioOf(width, height), ratio);
  }
  assert.throws(() => ratioOf(0, 0), TypeError);
});

test('composeFrame clips each part to its own rectangle', async () => {
  const { composeFrame } = loadEngine();
  const calls = [];
  const ctx = {
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    rect: (x, y, width, height) => calls.push(`rect:${x},${y},${width},${height}`),
    clip: () => calls.push('clip'),
  };
  const drawn = [];
  const layout = await composeFrame(ctx, {
    instrument: 'drums',
    width: 1920,
    height: 1080,
    parts: {
      title: (_target, rect) => drawn.push(['title', rect.y]),
      instrument: (_target, rect) => drawn.push(['instrument', rect.y]),
    },
  });
  assert.deepEqual(drawn.map(([name]) => name), ['title', 'instrument']);
  assert.equal(calls.filter((call) => call === 'clip').length, 2);
  assert.equal(calls.filter((call) => call === 'save').length, calls.filter((call) => call === 'restore').length);
  assert.deepEqual([...layout.parts], ['title', 'instrument']);
});

test('composeFrame refuses a caller with no parts map', async () => {
  const { composeFrame } = loadEngine();
  await assert.rejects(() => composeFrame({}, { instrument: 'drums', width: 1920, height: 1080 }), TypeError);
});

test('the engine is the one place a delivery size is written', () => {
  const { sizeFor, ratioNames, DELIVERY_SIZES } = loadEngine();
  assert.deepEqual(ratioNames().sort(), Object.keys(SIZES).sort());
  for (const [ratio, size] of Object.entries(SIZES)) {
    assert.deepEqual({ ...sizeFor(ratio) }, size, `${ratio} is not the Plan's delivery size`);
    assert.deepEqual({ ...DELIVERY_SIZES[ratio] }, size);
    // Pages spell the ratio with a colon or an x; both name the same frame.
    assert.deepEqual({ ...sizeFor(ratio.replace(':', 'x')) }, size);
  }
});

test('an unknown ratio is refused, and the caller cannot edit the table', () => {
  const { sizeFor, DELIVERY_SIZES } = loadEngine();
  assert.throws(() => sizeFor('4:3'), /not a supported video ratio/);
  const size = sizeFor('16:9');
  size.width = 1;
  assert.equal(DELIVERY_SIZES['16:9'].width, 1920, 'sizeFor handed out the table itself');
});
