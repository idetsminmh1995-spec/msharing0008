# Video Engine Technical Documentation

## 1. Scope

`website/assets/video-engine.js` is the single rendering boundary for generated videos. Instrument pages provide a list of timed segments; the engine draws frames, encodes video and audio, muxes the result, and returns a downloadable `Blob`. Keeping encoding in one module prevents drum, piano, guitar, and future instrument pages from silently using different timing or export rules.

The companion `website/assets/outro-video.js` adapts a Thank You clip into a render segment. It downloads the clip as a same-origin `Blob`, decodes its audio, seeks each requested video frame, and hands both streams to `VideoEngine.render`.

The Thank You clip is optional by default: if no matching R2 object can be loaded, the page may omit that segment and still export the instrument take. A caller that truly requires an outro can pass `required: true` to `OutroVideo.loadOutro`; only that mode registers the clip with VideoEngine's fail-closed asset gate. Other assets explicitly registered as required continue to block export until ready.

### Shared Asset Gate

`website/assets/video-asset-gate.js` supplies the common gate lifecycle and panel for the active Drum, Piano, Guitar, Bass Guitar, Metronome, and Violin exporters. A route declares its required and optional groups with `VideoAssetGate.create({ page, groups })`, calls `start()` for an export attempt, updates each group with `set(id, status, message)`, and calls `assertReady()` immediately before `VideoEngine.render`. Required groups are synchronized to the engine's fail-closed gate; optional failures appear as warnings and do not block encoding. All routes use the same status rows and JSON copy/download report UI. Drum retains its instrument-specific R2 kit/hit-image preflight, but delegates presentation, reporting, and the final required-asset state to the shared gate. Requirements can differ by instrument; the status contract and enforcement are shared.

The static Viola, Cello, Bass Cello, and Vocal placeholder pages do not yet have a VideoEngine export pipeline, so they are not listed as gate-enabled routes.

## 2. Render contract

A page calls the engine with the following shape:

```js
const result = await VideoEngine.render({
  width,
  height,
  fps,
  bitrate,
  segments: [
    {
      seconds,
      draw: async (ctx, at, index) => {},
      audio: AudioBuffer | null,
      onStart: async () => {},
      onEnd: async () => {},
    },
  ],
  onProgress: (fraction, phase) => {},
  shouldStop: () => boolean,
});
```

`draw` receives the segment-local time `at`. The engine owns the output timeline: encoded timestamps are based on the global frame index, not on wall-clock time. A successful result includes the `Blob`, container and extension, codec information when available, frame count, duration, render path, and cancellation state.

## 3. Encoding paths

### 3.1 WebCodecs path

When `VideoEncoder` and `VideoFrame` are available, the engine uses deterministic offline rendering. It draws the requested frame as quickly as the machine allows, assigns the intended timestamp, and applies encoder backpressure when the queue grows beyond the configured threshold. A slow machine therefore renders more slowly instead of dropping frames because a wall-clock deadline was missed.

If the render contains audio, `AudioEncoder` and `AudioData` are also required. Silent videos only require the video WebCodecs APIs; they no longer fall back to `MediaRecorder` merely because audio WebCodecs APIs are missing.

The preferred output is H.264 plus AAC in MP4. If that combination is unsupported, the engine tries VP8/VP9 plus Opus in WebM. Codec support is checked with `isConfigSupported` before any frame is drawn.

### 3.2 MediaRecorder fallback

Browsers without a usable WebCodecs configuration use `canvas.captureStream()` and `MediaRecorder`. This path is retained for compatibility, but it is inherently less deterministic because capture occurs against the wall clock. The returned result identifies the path as `mediarecorder`; callers should communicate that it can duplicate or drop frames under load.

Fallback cancellation is explicit: once `shouldStop()` returns true, the current segment stops, later segments are skipped, the recorder is stopped, and `cancelled` is returned as `true`.

## 4. MP4 muxing

The MP4 writer creates:

```text
ftyp -> moov -> mdat
```

Putting `moov` before `mdat` enables fast start. The muxer writes:

- H.264 `avc1` sample entry and `avcC` decoder configuration;
- AAC-LC `mp4a` sample entry and `esds` decoder configuration;
- `stts` decode timing;
- `ctts` composition timing when encoded decode order differs from display order;
- `stss` sync-sample information;
- `stsc`, `stsz`, and `stco`/`co64` sample locations;
- edit lists for encoder priming or audio that begins after video.

Samples are grouped into fixed-size media chunks (currently up to 16 samples
per track chunk). `stsc` records the samples-per-chunk runs and `stco`/`co64`
stores one offset per media chunk, reducing `moov` metadata for long renders.
The seekable MP4 can also be delivered incrementally to a browser
`WritableStream` with `VideoEngine.muxMp4ToStream(options, writable)`. The
stream writer does not call `arrayBuffer()` or create a second full-file
contiguous copy.

The complete design for true fragment-at-a-time streaming, random-access flat
MP4 patching, sink contracts, recovery, and browser tests is documented in
[`VIDEO-ENGINE-STREAMING-MUXER.md`](VIDEO-ENGINE-STREAMING-MUXER.md).

## 5. Timing model and recent fixes

### 5.1 Fractional frame rates

Earlier code multiplied a rounded frame delta by the frame index. That can accumulate error at `29.97`, `23.976`, or `59.94` fps. The muxer now computes each decode timestamp from the ideal rational position:

```js
dts = Math.round((frameIndex * VIDEO_TIMESCALE) / fps);
```

The final sample duration is calculated from the ideal end position, so the total track duration remains aligned with `frameCount / fps`. `stts` can therefore contain multiple duration runs, which is correct for fractional rates.

### 5.2 Multiple segments

Each segment previously rounded its own frame count. A sequence of short segments could consequently gain or lose frames at every boundary. The WebCodecs renderer now maintains a global segment frame cursor and derives each segment's end from the global time. This avoids cumulative frame gaps and overlaps while preserving segment-local `draw` times.

### 5.3 Cancellation and audio length

When a WebCodecs render is cancelled, the engine computes:

```js
renderedSeconds = frameIndex / fps;
```

and joins audio only for that rendered duration. This prevents a cancelled video from receiving the original full-length soundtrack.

### 5.4 Encoder failures

Video and audio encoder callbacks now retain the reported error. After `flush()`, the engine throws a descriptive error instead of silently returning incomplete data. An MP4 render also fails explicitly if H.264 decoder configuration was not supplied by the browser; writing a file without `avcC` would produce a broken output.

## 6. Audio joining

Segment audio is rendered into one `OfflineAudioContext` at 48 kHz. Each segment's `AudioBuffer` is scheduled at its segment offset. The offline context naturally clips samples past the requested output duration, which is used for cancellation-safe rendering. The resulting buffer is encoded in short slices and its decoder configuration is stored in the final container.

The AAC encoder is configured for AAC-LC. Opus is used only on the WebM fallback format. Audio is limited to a maximum of two channels for predictable browser and mobile playback.

## 7. Verification

The pure muxer regression suite is:

```bash
node tools/test-video-engine.mjs
node tools/test-outro-video.mjs
node website/tests/video-asset-gate.test.mjs
node tools/test-cross-page-rollout-browser.mjs
```

The suite validates box structure, fast-start ordering, sample offsets, interleaving, timing tables, keyframes, composition offsets, codec descriptions, dimensions, silent video, and edit lists. It also includes a `29.97fps` regression test that verifies no cumulative duration drift.

Additional static checks:

```bash
node --check website/assets/video-engine.js
node --check website/assets/video-asset-gate.js
node --check tools/test-video-engine.mjs
git diff --check
```

The muxer suite currently passes **15/15** tests. The outro suite covers optional-versus-required asset-gate behavior, retry/fallback handling, piano/paino aliases, and streamed response progress. The shared-gate suite checks required/optional parity and engine synchronization; the Chromium cross-page test verifies all six active routes mount the gate and preserves the responsive-frame and stability checks where enabled. Static checks also cover JavaScript syntax and patch whitespace.

## 8. Remaining work

The following items are not yet complete and should be handled as separate updates:

1. Extend the Chromium integration test to exercise a writable file sink and decode the first and last frames.
2. Run the same compatibility matrix on Chromium, Safari, and Firefox, including portrait and square resolutions.
3. Add browser-level cancellation tests that exercise both WebCodecs and MediaRecorder with a multi-segment render.
4. Add browser-level memory-pressure instrumentation and a quality preset for low-memory devices.
5. Make the MediaRecorder fallback trim its live audio source when cancellation occurs.

Completed in the current update:

- Render input validation for dimensions, FPS, segment duration, draw callbacks, and audio buffers.
- Bounded WebCodecs progress phases: rendering (0–75%), audio/file work (75–90%), and complete (100%).
- Global multi-segment timing and accurate MediaRecorder cancellation state.
- Root README status and this technical document kept in sync with the implementation.
- Grouped MP4 media chunks with validated `stsc` and `stco`/`co64` tables.
- Chromium WebCodecs smoke test with `ffprobe` validation and incremental `WritableStream` output API.
- Detailed fully-streaming/seekable muxer strategy in `VIDEO-ENGINE-STREAMING-MUXER.md`.

## 9. Long-video memory update

The render path already closes every `VideoFrame` and `AudioData` immediately,
and the MP4 muxer passes encoded frame arrays to `Blob` without first joining
all video bytes into another large contiguous array. The new memory update
adds three further safeguards:

1. **Device-aware encoder backpressure.** `navigator.deviceMemory` selects a
   smaller encoder queue on 2 GB and 4 GB devices. This limits transient codec
   queue memory while preserving the larger queue on desktop devices.
2. **PCM release after audio encoding.** The joined `AudioBuffer` is retained
   only until `AudioEncoder.flush()` completes. Its reference is then cleared
   before final muxing, allowing the browser to reclaim the large Float32 PCM
   backing store.
3. **Memory telemetry.** WebCodecs results now include encoded video bytes,
   encoded audio bytes, the temporary PCM byte estimate, an estimated peak,
   and the device-class budget. The values are diagnostic and do not claim to
   measure the entire JavaScript heap.

These changes reduce transient memory and make long renders observable, but
they do not make the output fully streaming: encoded video samples must still
remain available until the MP4 offset tables are written. The next substantial
optimization is a seekable streaming muxer, which should be implemented only
with browser integration tests because it changes the file layout and offset-
table behavior.

## 10. Change history

- `b9e794d` — fractional-FPS timing, cancellation-safe audio duration, silent-video WebCodecs detection, encoder error propagation, and muxer regression coverage.
- Current follow-up — global multi-segment frame timeline and accurate MediaRecorder cancellation state.
- Current follow-up — grouped MP4 chunks and lower offset-table overhead for long videos.


## 10. Thank You outro loader — S1 hardening

`website/assets/outro-video.js` keeps the existing fetch → bytes → Blob → same-origin object URL path, but now bounds the download and reports the outcome. The defaults are a 15-second first-byte timeout, a 15-second stall timeout, a 120-second total deadline, and a 15-second metadata timeout. The total deadline covers all candidate keys and retries.

HTTP 408, 429, 5xx, network failures, timeouts, and generic unavailable responses may retry twice after the initial attempt. Retry delays are 0.5 seconds and 1.5 seconds with small jitter, and retry requests use `cache: 'reload'`. HTTP 403 and 404 do not retry the same key; the loader advances to the next de-duplicated candidate. Codec/decode failure is classified as `codec` and advances without a blind retry.

The loader reads a streaming response when `response.body.getReader()` is available and reports progress through `onProgress({ loaded, total, attempt, key })`. Environments without a readable stream use the existing `arrayBuffer()` fallback. Piano/paino aliases are generated in the shared key helper rather than in page code.

Successful results now include `source: 'r2'`, `bytes`, `ms`, `attempts`, and `reason: null` while preserving `video`, `key`, `seconds`, and `audio`. Failed optional loads return `null`, preserve diagnostic details in `OutroVideo.lastFailure()`, and do not poison VideoEngine's required-asset gate. Passing `required: true` opts into fail-closed gate reporting for workflows where the outro is mandatory. Automatic built-in fallback is intentionally S2 work and is not claimed here.

S1 verification is recorded in [`Doc/rollout/evidence/outro-loader-s1.json`](../Doc/rollout/evidence/outro-loader-s1.json). It covers 404/403 no-retry, 500/network retry, stream progress, piano/paino aliases, first-byte timeout, structured success metadata, and failure caching. Drum and cross-page Chromium acceptance tests remain green.
