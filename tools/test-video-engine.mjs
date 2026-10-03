#!/usr/bin/env node
/**
 * Checks that the MP4 `video-engine.js` writes is a real one.
 *
 * The engine runs in a browser, against encoders this machine does not
 * have, so what is testable here is the half that is pure arithmetic:
 * the container. Synthetic chunks stand in for the encoder's output,
 * and the file they are written into is then read back from its first
 * byte -- box by box, table by table -- and compared with what went in.
 *
 * It is the BUILT file that is loaded, the same one a page loads, so a
 * test can never pass against code the browser will not run.
 *
 *     node tools/test-video-engine.mjs
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sandbox = { console, Blob, DataView, Uint8Array, Math, Number, String, Array };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, 'website/assets/video-engine.js'), 'utf8'), sandbox);
const { muxMp4 } = sandbox.window.VideoEngine;

// ---------------------------------------------------------------
// A reader, written against the specification rather than against the
// writer, so the two can disagree.
// ---------------------------------------------------------------

const FULL_BOXES = new Set(['stts', 'ctts', 'stss', 'stsc', 'stsz', 'stco', 'co64', 'stsd', 'esds', 'elst']);
const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'dinf', 'edts']);

/** Every box at one level, each with where its payload starts and ends. */
function boxesIn(bytes, from, to) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const found = [];
  let at = from;
  while (at < to) {
    assert.ok(at + 8 <= to, `a box header runs past the end at ${at}`);
    let size = view.getUint32(at);
    let header = 8;
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (size === 1) {
      size = Number(view.getBigUint64(at + 8));
      header = 16;
    }
    assert.ok(size >= header, `${type} claims an impossible length ${size}`);
    assert.ok(at + size <= to, `${type} at ${at} runs past its parent`);
    found.push({ type, start: at, body: at + header, end: at + size });
    at += size;
  }
  assert.equal(at, to, 'the boxes do not fill their parent exactly');
  return found;
}

/** The first box on a path like `moov/trak/mdia`. */
function find(bytes, path, from = 0, to = bytes.length) {
  let scope = { body: from, end: to };
  for (const want of path.split('/')) {
    const box = boxesIn(bytes, scope.body, scope.end).find((b) => b.type === want);
    assert.ok(box, `no ${want} in ${path}`);
    scope = box;
  }
  return scope;
}

/** Every box of one type at one level. */
function findAll(bytes, type, from, to) {
  return boxesIn(bytes, from, to).filter((b) => b.type === type);
}

function reader(bytes, box) {
  let at = FULL_BOXES.has(box.type) ? box.body + 4 : box.body;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    u8: () => bytes[at++],
    u16: () => ((at += 2), view.getUint16(at - 2)),
    u32: () => ((at += 4), view.getUint32(at - 4)),
    i32: () => ((at += 4), view.getInt32(at - 4)),
    u64: () => ((at += 8), Number(view.getBigUint64(at - 8))),
    skip: (n) => {
      at += n;
    },
    at: () => at,
    version: () => bytes[box.body],
  };
}

/** The tables of one `stbl`, as plain numbers. */
function sampleTables(bytes, stbl) {
  const boxes = boxesIn(bytes, stbl.body, stbl.end);
  const of = (type) => boxes.find((b) => b.type === type);
  const read = (type, each) => {
    const box = of(type);
    if (!box) return null;
    const r = reader(bytes, box);
    const count = r.u32();
    const rows = [];
    for (let i = 0; i < count; i++) rows.push(each(r));
    assert.equal(r.at(), box.end, `${type} has bytes left over`);
    return rows;
  };

  const stts = read('stts', (r) => ({ count: r.u32(), delta: r.u32() }));
  const ctts = read('ctts', (r) => ({ count: r.u32(), offset: r.i32() }));
  const stss = read('stss', (r) => r.u32());
  const stsc = read('stsc', (r) => ({ first: r.u32(), per: r.u32(), desc: r.u32() }));
  const stco = of('stco') ? read('stco', (r) => r.u32()) : read('co64', (r) => r.u64());

  const stszBox = of('stsz');
  const sr = reader(bytes, stszBox);
  const uniform = sr.u32();
  const sampleCount = sr.u32();
  const stsz = [];
  for (let i = 0; i < sampleCount; i++) stsz.push(uniform === 0 ? sr.u32() : uniform);
  assert.equal(sr.at(), stszBox.end, 'stsz has bytes left over');

  return { stts, ctts, stss, stsc, stsz, stco, stsd: of('stsd') };
}

/** Each sample's duration, spread back out of the run-length table. */
function durations(stts) {
  const out = [];
  for (const run of stts) for (let i = 0; i < run.count; i++) out.push(run.delta);
  return out;
}

// ---------------------------------------------------------------
// What an encoder would have handed over.
// ---------------------------------------------------------------

const FPS = 30;
const FRAMES = 95;
const SAMPLE_RATE = 48000;
const AAC_FRAME = 1024;
const AVCC = Uint8Array.from([1, 100, 0, 40, 255, 225, 0, 5, 103, 100, 0, 40, 172, 1, 0, 4, 104, 238, 60, 176]);
const ASC = Uint8Array.from([0x11, 0x90]); // AAC-LC, 48kHz, stereo

/** Bytes that are different for every sample, so a mix-up cannot pass. */
function payload(seed, length) {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) out[i] = (seed * 37 + i * 13) & 0xff;
  return out;
}

const videoChunks = [];
for (let i = 0; i < FRAMES; i++) {
  const key = i % 60 === 0;
  videoChunks.push({
    us: Math.round((i * 1e6) / FPS),
    key,
    data: payload(i + 1, key ? 900 + i : 120 + i),
  });
}

const audioFrames = Math.ceil((FRAMES / FPS) * SAMPLE_RATE / AAC_FRAME);
const audioChunks = [];
for (let j = 0; j < audioFrames; j++) {
  audioChunks.push({
    us: Math.round((j * AAC_FRAME * 1e6) / SAMPLE_RATE),
    data: payload(1000 + j, 300 + (j % 7)),
  });
}

const AUDIO = {
  chunks: audioChunks,
  description: ASC,
  sampleRate: SAMPLE_RATE,
  channels: 2,
  bitrate: 192000,
};

async function build(over = {}) {
  const blob = muxMp4({
    width: 1920,
    height: 1080,
    fps: FPS,
    video: { chunks: videoChunks, description: AVCC },
    audio: AUDIO,
    ...over,
  });
  return new Uint8Array(await blob.arrayBuffer());
}

// ---------------------------------------------------------------
// The tests.
// ---------------------------------------------------------------

test('the file is ftyp, then moov, then mdat -- a player can start on it', async () => {
  const file = await build();
  const top = boxesIn(file, 0, file.length);
  assert.deepEqual(
    top.map((b) => b.type),
    ['ftyp', 'moov', 'mdat'],
  );
  const ftyp = top[0];
  assert.equal(String.fromCharCode(...file.subarray(ftyp.body, ftyp.body + 4)), 'isom');
});

test('every box fills its parent exactly, all the way down', async () => {
  const file = await build();
  const walk = (from, to) => {
    for (const box of boxesIn(file, from, to)) {
      if (CONTAINERS.has(box.type)) walk(box.body, box.end);
    }
  };
  walk(0, file.length); // boxesIn asserts; reaching here is the test
});

test('the offset table points at the bytes that went in', async () => {
  const file = await build();
  const traks = findAll(file, 'trak', find(file, 'moov').body, find(file, 'moov').end);
  assert.equal(traks.length, 2);

  for (const [index, chunks] of [[0, videoChunks], [1, audioChunks]]) {
    const stbl = find(file, 'mdia/minf/stbl', traks[index].body, traks[index].end);
    const { stsz, stco } = sampleTables(file, stbl);
    assert.equal(stsz.length, chunks.length, 'one entry per sample');
    assert.equal(stco.length, chunks.length, 'one chunk per sample');
    for (let i = 0; i < chunks.length; i++) {
      assert.equal(stsz[i], chunks[i].data.length, `sample ${i} is the wrong length`);
      assert.deepEqual(
        [...file.subarray(stco[i], stco[i] + stsz[i])],
        [...chunks[i].data],
        `sample ${i} of track ${index + 1} is not where the table says`,
      );
    }
  }
});

test('one sample to a chunk, so the two tracks interleave', async () => {
  const file = await build();
  const moov = find(file, 'moov');
  const traks = findAll(file, 'trak', moov.body, moov.end);
  for (const trak of traks) {
    const { stsc } = sampleTables(file, find(file, 'mdia/minf/stbl', trak.body, trak.end));
    assert.deepEqual(stsc, [{ first: 1, per: 1, desc: 1 }]);
  }
  // Interleaved means the sound for a second sits beside the picture
  // for it, not in a block of its own at one end of the file.
  const video = sampleTables(file, find(file, 'mdia/minf/stbl', traks[0].body, traks[0].end));
  const audio = sampleTables(file, find(file, 'mdia/minf/stbl', traks[1].body, traks[1].end));
  const half = Math.floor(audio.stco.length / 2);
  assert.ok(
    audio.stco[half] > video.stco[0] && audio.stco[half] < video.stco[video.stco.length - 1],
    'the sound is not interleaved with the picture',
  );
});

test('the timing tables say the length the frames actually are', async () => {
  const file = await build();
  const moov = find(file, 'moov');
  const traks = findAll(file, 'trak', moov.body, moov.end);

  const mdhd = (trak) => {
    const r = reader(file, find(file, 'mdia/mdhd', trak.body, trak.end));
    r.skip(1 + 3 + 4 + 4); // version, flags, the two times
    return { timescale: r.u32(), duration: r.u32() };
  };

  const videoClock = mdhd(traks[0]);
  const videoTables = sampleTables(file, find(file, 'mdia/minf/stbl', traks[0].body, traks[0].end));
  const videoDeltas = durations(videoTables.stts);
  assert.equal(videoDeltas.length, FRAMES);
  assert.ok(
    videoDeltas.every((d) => d === videoClock.timescale / FPS),
    'a frame does not last exactly 1/fps',
  );
  assert.equal(videoClock.duration, videoDeltas.reduce((a, b) => a + b, 0));
  assert.equal(videoClock.duration / videoClock.timescale, FRAMES / FPS);

  const audioClock = mdhd(traks[1]);
  assert.equal(audioClock.timescale, SAMPLE_RATE, 'the sound is not at 48kHz');
  const audioDeltas = durations(
    sampleTables(file, find(file, 'mdia/minf/stbl', traks[1].body, traks[1].end)).stts,
  );
  assert.equal(audioDeltas.length, audioChunks.length);
  assert.ok(audioDeltas.every((d) => d === AAC_FRAME), 'an AAC frame is not 1024 samples');

  // The movie is as long as its longest track, to the millisecond.
  const r = reader(file, find(file, 'moov/mvhd'));
  r.skip(1 + 3 + 4 + 4);
  const movieTimescale = r.u32();
  const movieDuration = r.u32();
  const longest = Math.max(
    videoClock.duration / videoClock.timescale,
    audioClock.duration / audioClock.timescale,
  );
  assert.ok(Math.abs(movieDuration / movieTimescale - longest) < 0.001);
});

test('the keyframes are the ones that were marked, and only those', async () => {
  const file = await build();
  const moov = find(file, 'moov');
  const traks = findAll(file, 'trak', moov.body, moov.end);
  const video = sampleTables(file, find(file, 'mdia/minf/stbl', traks[0].body, traks[0].end));
  assert.deepEqual(
    video.stss,
    videoChunks.map((c, i) => (c.key ? i + 1 : 0)).filter(Boolean),
  );
  // Sound is all seekable, which an absent table says better than a
  // table naming every sample.
  const audio = sampleTables(file, find(file, 'mdia/minf/stbl', traks[1].body, traks[1].end));
  assert.equal(audio.stss, null);
});

test('nothing was reordered, so no composition table is written', async () => {
  const file = await build();
  const moov = find(file, 'moov');
  const traks = findAll(file, 'trak', moov.body, moov.end);
  for (const trak of traks) {
    const { ctts } = sampleTables(file, find(file, 'mdia/minf/stbl', trak.body, trak.end));
    assert.equal(ctts, null);
  }
});

test('a reordered stream gets the composition table it needs', async () => {
  // Decode order I P B B: the P is encoded before the two frames that
  // are shown ahead of it, so its showing time runs ahead of its
  // decoding time and `ctts` is the only place that can be said.
  const order = [0, 3, 1, 2, 4, 7, 5, 6];
  const chunks = order.map((shownAt, i) => ({
    us: Math.round((shownAt * 1e6) / FPS),
    key: i === 0,
    data: payload(i + 1, 200),
  }));
  const file = new Uint8Array(
    await muxMp4({
      width: 1920,
      height: 1080,
      fps: FPS,
      video: { chunks, description: AVCC },
      audio: null,
    }).arrayBuffer(),
  );
  const trak = find(file, 'moov/trak');
  const { ctts, stts } = sampleTables(file, find(file, 'mdia/minf/stbl', trak.body, trak.end));
  assert.ok(ctts, 'a reordered stream was written without a composition table');
  const offsets = [];
  for (const run of ctts) for (let i = 0; i < run.count; i++) offsets.push(run.offset);
  const delta = durations(stts)[0];
  assert.deepEqual(
    offsets.map((o) => o / delta),
    order.map((shownAt, i) => shownAt - i),
  );
});

test('the decoder configurations are carried through byte for byte', async () => {
  const file = await build();
  const moov = find(file, 'moov');
  const traks = findAll(file, 'trak', moov.body, moov.end);

  const stsd = sampleTables(file, find(file, 'mdia/minf/stbl', traks[0].body, traks[0].end)).stsd;
  const avc1 = boxesIn(file, stsd.body + 4 + 4, stsd.end)[0];
  assert.equal(avc1.type, 'avc1');
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  assert.equal(view.getUint16(avc1.body + 24), 1920, 'avc1 has the wrong width');
  assert.equal(view.getUint16(avc1.body + 26), 1080, 'avc1 has the wrong height');
  const avcC = boxesIn(file, avc1.body + 78, avc1.end).find((b) => b.type === 'avcC');
  assert.ok(avcC, 'no avcC');
  assert.deepEqual([...file.subarray(avcC.body, avcC.end)], [...AVCC]);

  const audioStsd = sampleTables(file, find(file, 'mdia/minf/stbl', traks[1].body, traks[1].end)).stsd;
  const mp4a = boxesIn(file, audioStsd.body + 4 + 4, audioStsd.end)[0];
  assert.equal(mp4a.type, 'mp4a');
  assert.equal(view.getUint16(mp4a.body + 16), 2, 'mp4a has the wrong channel count');
  assert.equal(view.getUint32(mp4a.body + 24) / 65536, SAMPLE_RATE, 'mp4a has the wrong rate');
  const esds = boxesIn(file, mp4a.body + 28, mp4a.end).find((b) => b.type === 'esds');
  assert.ok(esds, 'no esds');
  // The AudioSpecificConfig sits in the descriptor tagged 5.
  const body = [...file.subarray(esds.body + 4, esds.end)];
  const asc = body.indexOf(0x05);
  assert.ok(asc > 0, 'no DecoderSpecificInfo in esds');
  assert.deepEqual(body.slice(asc + 2, asc + 2 + ASC.length), [...ASC]);
});

test('the track header carries the size the page asked for', async () => {
  for (const [width, height] of [[1920, 1080], [1080, 1920], [1080, 1080]]) {
    const file = await build({ width, height });
    const r = reader(file, find(file, 'moov/trak/tkhd'));
    r.skip(1 + 3 + 4 + 4 + 4 + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36);
    assert.equal(r.u32() / 65536, width, `${width}x${height} came out the wrong width`);
    assert.equal(r.u32() / 65536, height, `${width}x${height} came out the wrong height`);
  }
});

test('a silent video is one track and still a valid file', async () => {
  const file = new Uint8Array(
    await muxMp4({
      width: 1080,
      height: 1080,
      fps: FPS,
      video: { chunks: videoChunks, description: AVCC },
      audio: null,
    }).arrayBuffer(),
  );
  const moov = find(file, 'moov');
  const traks = findAll(file, 'trak', moov.body, moov.end);
  assert.equal(traks.length, 1);
  const { stco, stsz } = sampleTables(
    file,
    find(file, 'mdia/minf/stbl', traks[0].body, traks[0].end),
  );
  assert.deepEqual([...file.subarray(stco[0], stco[0] + stsz[0])], [...videoChunks[0].data]);
});

test('an encoder that reports its own priming gets an edit list', async () => {
  // A first sample timed before zero is the encoder saying "throw this
  // much away" -- without an edit list the sound would start late by
  // exactly that much.
  const primed = audioChunks.map((chunk, j) => ({
    ...chunk,
    us: Math.round(((j * AAC_FRAME - AAC_FRAME) * 1e6) / SAMPLE_RATE),
  }));
  const file = await build({ audio: { ...AUDIO, chunks: primed } });
  const moov = find(file, 'moov');
  const audioTrak = findAll(file, 'trak', moov.body, moov.end)[1];
  const elst = find(file, 'edts/elst', audioTrak.body, audioTrak.end);
  const r = reader(file, elst);
  assert.equal(r.u32(), 1, 'one edit: play from here on');
  r.u32(); // how long the edit runs, in movie time
  assert.equal(r.i32(), AAC_FRAME, 'the priming was not trimmed');
});

test('the sound starting late is said as an empty edit, not by moving it', async () => {
  const late = audioChunks.map((chunk, j) => ({
    ...chunk,
    us: Math.round(((j * AAC_FRAME + SAMPLE_RATE / 2) * 1e6) / SAMPLE_RATE),
  }));
  const file = await build({ audio: { ...AUDIO, chunks: late } });
  const moov = find(file, 'moov');
  const audioTrak = findAll(file, 'trak', moov.body, moov.end)[1];
  const r = reader(file, find(file, 'edts/elst', audioTrak.body, audioTrak.end));
  assert.equal(r.u32(), 2, 'an empty edit and then the sound');
  assert.equal(r.u32(), 500, 'the silence is not half a second');
  assert.equal(r.i32(), -1, 'the first edit is not an empty one');
});
