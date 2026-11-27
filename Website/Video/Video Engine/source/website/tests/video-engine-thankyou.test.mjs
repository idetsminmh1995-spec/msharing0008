import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/video-engine.js', import.meta.url), 'utf8');

/**
 * A page whose Thank You clip is a fake element that presents one frame per
 * seek, the way a paused video does: `requestVideoFrameCallback` fires only
 * after the time changes, and the seek resolves on a microtask.
 */
function createPage() {
  const state = { video: null, order: [] };

  class FakeVideo {
    constructor() {
      // Assigned straight to the field: the setter below records a seek, and
      // the element starting at zero is not one.
      this._time = 0;
      this.readyState = 4;
      this.duration = 2;
      this.videoWidth = 1920;
      this.videoHeight = 1080;
      this.listeners = new Set();
      this.frameCallbacks = [];
      state.video = this;
    }
    addEventListener(name, fn) {
      if (name === 'seeked') this.listeners.add(fn);
    }
    removeEventListener(name, fn) {
      if (name === 'seeked') this.listeners.delete(fn);
    }
    requestVideoFrameCallback(callback) {
      state.order.push(['frameCallback', this.currentTime]);
      this.frameCallbacks.push(callback);
    }
    /** Presents the frame the element now holds. */
    present() {
      const pending = this.frameCallbacks;
      this.frameCallbacks = [];
      for (const callback of pending) callback(0, { mediaTime: this.currentTime });
    }
    load() {
      queueMicrotask(() => this.onloadeddata?.());
    }
  }

  Object.defineProperty(FakeVideo.prototype, 'currentTime', {
    get() {
      return this._time ?? 0;
    },
    set(value) {
      this._time = value;
      state.order.push(['seek', value]);
      // A real element fires `seeked` when the decoder has the frame, then
      // presents it. Both happen off the task that asked for the seek.
      setTimeout(() => {
        for (const fn of [...this.listeners]) fn();
        this.present();
      }, 0);
    },
  });

  const context2d = { fillRect() {}, drawImage() {} };
  class FakeCanvas {
    width = 0;
    height = 0;
    getContext() {
      return context2d;
    }
  }
  class FakeOfflineAudioContext {
    async decodeAudioData() {
      return { duration: 2, sampleRate: 48000, numberOfChannels: 1, getChannelData: () => new Float32Array(0) };
    }
  }

  const window = {};
  const context = vm.createContext({
    window,
    document: {
      createElement(name) {
        if (name === 'video') return new FakeVideo();
        assert.equal(name, 'canvas');
        return new FakeCanvas();
      },
    },
    navigator: { deviceMemory: 8 },
    fetch: async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(8)]) }),
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL() {} },
    OfflineAudioContext: FakeOfflineAudioContext,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
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
  return { engine: window.VideoEngine, state };
}

const startedAt = (state) => state.order.findIndex(([what]) => what === 'seek');
const callbackBeforeSeek = (state) => state.order
  .slice(0, startedAt(state))
  .some(([what]) => what === 'frameCallback');

test('the frame callback is asked for before the seek, so a paused clip does not wait out the bound', async () => {
  const { engine, state } = createPage();
  const segment = await engine.thankYouSegment(1920, 1080);
  assert.ok(segment, 'the fake clip loaded');

  const drawn = [];
  const began = Date.now();
  await segment.draw({ fillRect() {}, drawImage: (...args) => drawn.push(args) }, 0.5);
  const elapsed = Date.now() - began;

  assert.ok(callbackBeforeSeek(state), 'the callback was registered ahead of the seek');
  assert.ok(elapsed < 200, `the seek resolved on its own frame, not the 250 ms bound (took ${elapsed} ms)`);
  assert.equal(drawn.length, 1, 'and the clip was drawn');
});
