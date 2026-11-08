import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/video-engine.js', import.meta.url), 'utf8');

function createVideoEngine({ webCodecs = true, deviceMemory = 8 } = {}) {
  const state = { encoders: [], canvases: [], tracks: [], audioContextClosed: false, recorderStopped: false };
  const context2d = {};
  const window = {};
  class FakeCanvas {
    width = 0;
    height = 0;
    getContext() {
      return context2d;
    }
    captureStream() {
      const track = { stopped: false, stop() { this.stopped = true; } };
      state.tracks.push(track);
      return {
        addTrack() {},
        getTracks: () => [track],
      };
    }
  }
  class FakeVideoEncoder {
    static async isConfigSupported() {
      return { supported: true };
    }
    constructor(callbacks) {
      this.callbacks = callbacks;
      this.state = 'unconfigured';
      this.encodeQueueSize = 0;
      state.encoders.push(this);
    }
    configure() {
      this.state = 'configured';
    }
    encode() {}
    async flush() {}
    close() {
      this.state = 'closed';
    }
  }
  class FakeVideoFrame {
    close() {}
  }
  class FakeMediaRecorder {
    static isTypeSupported() {
      return true;
    }
    constructor(stream) {
      this.stream = stream;
      this.state = 'inactive';
      this.onstop = null;
      this.onerror = null;
    }
    start() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      state.recorderStopped = true;
      queueMicrotask(() => this.onstop?.());
    }
  }
  class FakeAudioContext {
    constructor() {
      this.state = 'running';
    }
    createMediaStreamDestination() {
      const track = { stopped: false, stop() { this.stopped = true; } };
      state.tracks.push(track);
      return {
        stream: { getAudioTracks: () => [track], getTracks: () => [track] },
      };
    }
    async close() {
      this.state = 'closed';
      state.audioContextClosed = true;
    }
  }

  if (webCodecs) {
    window.VideoEncoder = FakeVideoEncoder;
    window.VideoFrame = FakeVideoFrame;
  }
  window.AudioContext = FakeAudioContext;
  window.MediaRecorder = FakeMediaRecorder;
  const document = {
    createElement(name) {
      assert.equal(name, 'canvas');
      const canvas = new FakeCanvas();
      state.canvases.push(canvas);
      return canvas;
    },
  };
  const context = vm.createContext({
    window,
    document,
    navigator: { deviceMemory },
    MediaRecorder: FakeMediaRecorder,
    AudioContext: FakeAudioContext,
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
    Promise,
    Error,
    TypeError,
    RangeError,
  });
  vm.runInContext(source, context, { filename: 'video-engine.js' });
  return { engine: window.VideoEngine, state };
}

test('WebCodecs cleanup closes the encoder and releases canvas memory if a frame draw fails', async () => {
  const { engine, state } = createVideoEngine();
  await assert.rejects(
    engine.render({
      width: 640,
      height: 360,
      fps: 30,
      segments: [{ seconds: 1 / 30, draw: async () => { throw new Error('test frame failure'); } }],
    }),
    /test frame failure/,
  );
  assert.equal(state.encoders.length, 1);
  assert.equal(state.encoders[0].state, 'closed');
  assert.equal(state.canvases[0].width, 0);
  assert.equal(state.canvases[0].height, 0);
});

test('MediaRecorder cleanup stops tracks and closes AudioContext if frame drawing fails', async () => {
  const { engine, state } = createVideoEngine({ webCodecs: false });
  await assert.rejects(
    engine.render({
      width: 640,
      height: 360,
      fps: 30,
      segments: [{ seconds: 1 / 30, draw: async () => { throw new Error('fallback frame failure'); } }],
    }),
    /fallback frame failure/,
  );
  assert.equal(state.recorderStopped, true);
  assert.equal(state.audioContextClosed, true);
  assert.ok(state.tracks.length > 0);
  assert.ok(state.tracks.every((track) => track.stopped));
  assert.equal(state.canvases[0].width, 0);
  assert.equal(state.canvases[0].height, 0);
});

test('rejects a projected export above the device memory budget before allocating a canvas or encoder', async () => {
  const { engine, state } = createVideoEngine({ deviceMemory: 1 });
  await assert.rejects(
    engine.render({
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 20_000_000,
      segments: [{ seconds: 100, draw: async () => {} }],
    }),
    /safety budget/,
  );
  assert.equal(state.canvases.length, 0);
  assert.equal(state.encoders.length, 0);
});

test('rejects oversized MediaRecorder output before allocating its canvas or AudioContext', async () => {
  const { engine, state } = createVideoEngine({ webCodecs: false, deviceMemory: 1 });
  await assert.rejects(
    engine.render({
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 20_000_000,
      segments: [{ seconds: 100, draw: async () => {} }],
    }),
    /safety budget/,
  );
  assert.equal(state.canvases.length, 0);
  assert.equal(state.audioContextClosed, false);
});
