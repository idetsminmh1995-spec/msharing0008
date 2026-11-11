# Video Engine Implementation Plan

**Scope:** This is the dedicated implementation plan for the shared Video Engine. It covers the canonical runtime at `website/assets/video-engine.js`, the mirrored engine package under `Engine/video-engine/`, and the shared render/asset modules that are required to produce a complete export.

**Status audited:** 2026-11-12  
**Repository:** `idetsminmh1995-spec/msharing0008`

This file is separate from the repository-wide `Plan.md`. Instrument pages provide segments and assets; they must not create a second encoder, timeline, muxer, or outro policy.

## 1. Current baseline — implemented

The following functionality exists in the canonical runtime and is mirrored in `Engine/video-engine/source/`:

- Segment-based `VideoEngine.render()` with one global frame clock and segment-local draw time.
- WebCodecs rendering with `VideoEncoder`, optional `AudioEncoder`, rational timestamps, queue backpressure, progress phases, encoder error propagation, and resource cleanup.
- MediaRecorder compatibility fallback with explicit cancellation state and track/audio-context cleanup.
- H.264/AAC MP4 selection with VP8/VP9/Opus WebM fallback after codec support probing.
- Fast-start MP4 muxing with `ftyp → moov → mdat`, `avcC`, `esds`, timing tables, composition offsets, sync samples, edit lists, grouped media chunks, and `stco`/`co64` offsets.
- `muxMp4ToStream()` for incremental copying of a completed seekable MP4 to a forward-only `WritableStream`.
- Fractional-FPS timing, global multi-segment frame accounting, cancellation-safe audio duration, device-aware queue limits, PCM release, and diagnostic memory telemetry.
- Shared asset-gate integration for the active Drum, Piano, Guitar, Bass Guitar, Metronome, and Violin routes.
- S0 outro diagnosis and S1 outro loader hardening: timeout, retry, alias, progress, structured result, and short-lived failure cache.

### Baseline verification

The baseline must remain green after every phase:

```bash
node Engine/video-engine/source/tools/test-video-engine.mjs
node Engine/video-engine/source/tools/test-video-engine-browser.mjs
node --test Engine/video-engine/source/website/tests/video-engine-cleanup.test.mjs
node tools/test-outro-video.mjs
node --check website/assets/video-engine.js
node --check website/assets/video-asset-gate.js
node --check Engine/video-engine/source/website/assets/video-engine.js
```

The current pure muxer suite is **15/15 passed**. Cleanup tests are **4/4 passed** and the S1 outro loader test passes.

## 2. Known gaps — code not yet implemented

These are intentionally not marked complete:

1. Browser-level cancellation coverage for both WebCodecs and MediaRecorder across multiple segments.
2. A deliberately slow `WritableStream` sink test that proves writes are awaited and backpressure is respected.
3. A true fragment-at-a-time MP4 writer that releases encoded payloads after each fragment.
4. A random-access flat MP4 patcher for OPFS/File System Access sinks with reservation-overflow errors.
5. Crash/recovery and interrupted-sink tests with structured sink error codes.
6. MediaRecorder cancellation that trims its live audio source instead of retaining the original full source.
7. Cross-browser compatibility evidence on Chromium, Safari, and Firefox for landscape, portrait, and square exports.
8. Low-memory quality presets and browser-level memory-pressure instrumentation.
9. Built-in Thank You ending and automatic R2-to-built-in resolution. Current S1 loader failure remains optional/no-outro unless a caller explicitly requests `required: true`.
10. Complete page-level fallback policy, nested `outro` report schema, six-style golden frames, blocked-R2 output assertions, and final release evidence.

## 3. Implementation order

### Phase V0 — Contract and mirror guard

**Goal:** Keep canonical production code, the engine mirror, documentation, and tests synchronized.

**Files:**

- `website/assets/video-engine.js`
- `Engine/video-engine/source/website/assets/video-engine.js`
- `docs/VIDEO-ENGINE.md`
- `Plan/Video Plan/Documentation/VIDEO-ENGINE.md`

**Acceptance:** Every shared render-contract change updates both runtime copies, both technical documents, and the relevant Node/browser tests in the same commit. A mirror-drift check must fail if the canonical and mirrored runtime differ.

**Status:** Baseline exists; an explicit automated mirror-drift test remains to be added.

### Phase V1 — Browser cancellation and bounded-sink tests

**Goal:** Prove cancellation and output-sink behavior with real browser APIs, not only mocks.

**Work:**

- Extend `test-video-engine-browser.mjs` with multi-segment WebCodecs cancellation.
- Add a MediaRecorder fallback browser case and assert that later segments are skipped.
- Add a slow `WritableStream` whose `write()` resolves after a delay; assert ordering, awaited writes, close, and abort behavior.
- Decode the first and last frames with `ffprobe` or a browser frame decoder and verify dimensions, timestamps, and final frame availability.

**Acceptance evidence:** `video-engine-cancellation-browser.json` and `video-engine-slow-sink.json`.

**Status:** Not implemented.

### Phase V2 — Fragmented MP4 writer

**Goal:** Provide a forward-only streaming format that does not retain all encoded payloads until final `moov` construction.

**Required API:**

```js
await VideoEngine.createFragmentedMp4Writer({
  width, height, fps, videoCodec, audioCodec, sink, fragmentSeconds,
});
```

**Required behavior:**

- Write `ftyp` and an initialization `moov` segment first.
- Align fragment boundaries to video keyframes, normally every 1–2 seconds.
- Write `moof` followed by `mdat` for each fragment.
- Validate monotonic timestamps, sample sizes, codec descriptions, and keyframe boundaries.
- Release fragment payloads after the sink confirms the write.
- Abort the sink and close encoders on failure; never return a complete result after a partial write.
- Expose structured errors such as `SINK_WRITE_FAILED`, `NON_MONOTONIC_TIMESTAMP`, and `FRAGMENT_FINALIZE_FAILED`.

**Acceptance evidence:** A Chromium test writes a multi-fragment H.264 MP4 to a slow sink and validates playback and `ffprobe` metadata.

**Status:** Architecture is documented in `VIDEO-ENGINE-STREAMING-MUXER.md`; runtime API is not implemented.

### Phase V3 — Random-access flat MP4 patcher

**Goal:** Support sinks that can seek and patch headers without retaining encoded payloads.

**Required API:**

```js
await VideoEngine.createFlatMp4Patcher({
  sink: { writeAt, append, truncate, close, abort },
  moovReserveBytes,
});
```

**Acceptance:** Reject a normal forward-only `WritableStream` with `SINK_NOT_SEEKABLE`; write `ftyp`, reserved `free`, and extended-size `mdat`; retain compact sample metadata only; patch `moov` and `mdat` safely; return `MOOV_RESERVATION_TOO_SMALL` without overwriting media bytes.

**Status:** Architecture is documented; runtime API and tests are not implemented.

### Phase V4 — Recovery, memory, and compatibility

**Goal:** Make long exports observable and recoverable on real browsers and constrained devices.

**Work:**

- Add interrupted-write and sink-abort tests.
- Add structured byte-position/error reporting.
- Add browser memory-pressure telemetry and low-memory quality presets.
- Make MediaRecorder cancellation trim or replace the live audio source.
- Run the compatibility matrix on Chromium, Safari, and Firefox at 16:9, 9:16, and 1:1.

**Status:** Not implemented.

### Phase V5 — Thank You outro completion

**Goal:** Ensure every in-scope export has a visible ending or is explicitly blocked.

**Order:**

1. **S2:** Implement deterministic `builtin-ending.js` with 3-second duration, 0.4-second fade, three aspects, two styles, explicit logo mapping, optional `siteUrl`, and no network dependency.
2. **S3:** Add `OutroVideo.resolve()` and source locking. Migrate Drum first, then Guitar, Bass Guitar, Piano, Violin, and Metronome. Remove silent no-outro success.
3. **S4:** Separately implement Worker Range/206, `If-None-Match`/304, CORS policy, safe key decoding, and request IDs if deployment evidence confirms the need.
4. **S5:** Produce the complete R2 manifest and `ffprobe` results; resolve `paino/piano`, `guitar/bass-guitar`, and Metronome fallback decisions.
5. **S6:** Add loader, built-in golden-frame, blocked-R2, R2-success, cancellation, and encoded-final-frame browser matrices.
6. **S7:** Synchronize public docs, evidence index, asset stamp checks, CI, and this plan.

**Status:** S0 diagnosis and S1 loader hardening are complete. S2–S7 are not implemented; no export may be described as having guaranteed fallback ending yet.

## 4. Commit and evidence rules

- Keep V1–V4 engine work separate from V5 outro/page rollout work.
- Every phase must include code, tests, evidence JSON, and a short work-log entry.
- Keep the canonical runtime and `Engine/video-engine/source/` mirror synchronized.
- Do not silently downgrade a failed or partial export to a successful file.
- After verification passes, commit and push the completed change to `origin/main`.

## 5. Definition of done

- [ ] Canonical and mirrored engine sources have an automated drift check.
- [ ] WebCodecs and MediaRecorder multi-segment cancellation are browser-tested.
- [ ] Slow-sink backpressure and sink-abort behavior are browser-tested.
- [ ] Fragmented MP4 writer passes playback and `ffprobe` validation.
- [ ] Flat MP4 patcher validates random-access sink capabilities and reservation overflow.
- [ ] Recovery, memory-pressure, and cross-browser evidence is committed.
- [ ] Built-in ending and automatic R2 fallback pass all aspect/style/page matrices.
- [ ] Final output always contains a visible Thank You ending or is explicitly blocked.
- [ ] Documentation, mirror, tests, evidence, CI, and this plan agree.
