# Video Plan — Architecture and Roadmap

## Purpose and ownership

Video Engine is the shared export boundary for every instrument page. Piano, guitar, bass guitar, drum, metronome, violin, and future exporters provide timed render segments; Video Engine owns deterministic frame timing, audio joining, codec selection, cancellation, progress reporting, MP4/WebM muxing, and result metadata. Instrument pages must not implement their own encoder or muxer.

The canonical implementation is under [`../../Engine/video-engine/`](../../Engine/video-engine/). The browser compatibility import at `website/assets/video-engine.js` points to that implementation. Technical details of the current implementation and the future streaming muxer are in [`docs/VIDEO-ENGINE.md`](docs/VIDEO-ENGINE.md) and [`docs/VIDEO-ENGINE-STREAMING-MUXER.md`](docs/VIDEO-ENGINE-STREAMING-MUXER.md).

## System architecture

```text
Instrument page
  ├─ asset gate / preload / route-specific data
  ├─ timed segments: draw(ctx, localTime, frameIndex)
  └─ optional AudioBuffer + lifecycle hooks
            │
            ▼
      VideoEngine.render()
            │
            ├─ validate dimensions, fps, segments, audio, callbacks
            ├─ choose WebCodecs or MediaRecorder fallback
            ├─ global frame timeline and cancellation boundary
            ├─ progress phases and memory/backpressure policy
            │
            ├─ WebCodecs: VideoEncoder + AudioEncoder
            │       └─ encoded chunks + decoder configuration
            └─ MediaRecorder: canvas.captureStream + audio tracks
            │
            ▼
      container selection
        ├─ H.264/AAC → fast-start MP4 muxer
        ├─ VP8/VP9/Opus → WebM muxer
        └─ WritableStream delivery for completed seekable output
            │
            ▼
      Blob / streamed bytes + structured result metadata
```

The render API is intentionally segment-based. A segment owns local drawing and audio content; the engine owns the global timeline. This prevents short segments, outros, and multi-page compositions from accumulating frame-rounding errors at boundaries.

## Core contracts

The input contract is `{ width, height, fps, bitrate, segments, onProgress, shouldStop }`. Each segment supplies a duration and a `draw` callback. `draw` receives a segment-local time, while encoded timestamps use the global frame index. Optional lifecycle hooks are used for page-specific setup and cleanup. A failed required asset must be rejected by the shared asset gate before rendering begins.

The result contract includes the output `Blob`, container and extension, codec information where available, frame count, duration, render path, cancellation state, and memory/backpressure telemetry. A cancelled render is a valid controlled result; encoder failures, invalid H.264 decoder metadata, and malformed inputs are hard errors and must not be converted into apparently successful files.

## Encoding paths

### WebCodecs path

WebCodecs is the preferred path because it is offline and deterministic. The engine draws each intended frame, assigns a rational timestamp, queues it into `VideoEncoder`, and applies backpressure before the queue becomes unbounded. Audio is rendered into a 48 kHz offline buffer, joined for the actual rendered duration, and encoded in slices when audio is present. Silent output requires only the video WebCodecs APIs.

The preferred container is H.264/AAC in MP4. If the browser cannot support that combination, the engine probes VP8/VP9/Opus and emits WebM. Codec support is checked before drawing so unsupported configurations fail early.

### MediaRecorder fallback

Browsers without a usable WebCodecs configuration use `canvas.captureStream()` and `MediaRecorder`. This path is compatibility-oriented and wall-clock-driven, so it can duplicate or drop frames under load. The result identifies `renderPath: 'mediarecorder'`. Cancellation stops later segments, closes tracks, stops the recorder, and reports `cancelled: true` rather than returning a full-length file with misleading metadata.

## Timing and progress model

Fractional rates such as 29.97, 23.976, and 59.94 fps use ideal rational positions rather than a rounded frame delta multiplied by the frame number. Multi-segment rendering maintains one global frame cursor, so each segment cannot introduce an independent rounding error.

Progress is phase-based and bounded. WebCodecs rendering reports approximately 0–75%, audio encoding or direct file work reports 75–90%, and final mux completion reports 100%. The complete event is emitted only after the output container has been assembled. Callers should treat progress as user-interface telemetry, not as a frame timestamp.

## MP4 and streaming architecture

The flat MP4 muxer writes `ftyp → moov → mdat`, with H.264 `avcC`, AAC `esds`, timing tables, sync samples, composition offsets, edit lists, and grouped media chunks. Grouping stores one chunk offset rather than one offset per sample and keeps long-video metadata smaller. `muxMp4ToStream()` can deliver the completed seekable file incrementally to a `WritableStream`, but it still retains encoded samples until final muxing.

The next long-video step is a true fragment-at-a-time muxer. Fragmented MP4 is the recommended forward-only stream format because `moof` contains the metadata needed immediately before each `mdat`; flat MP4 header patching is reserved for random-access sinks such as OPFS or File System Access. The detailed state machine, reservation policy, recovery rules, and test matrix are in the streaming muxer strategy document.

## Memory and failure policy

Encoded video payloads, audio PCM, and mux metadata are the principal memory consumers. The WebCodecs path closes `VideoFrame` and `AudioData` promptly, limits encoder queue depth using a device-aware policy, and records estimated peak memory telemetry. Audio is joined only for the rendered duration after cancellation. The remaining unbounded lifetime is the encoded sample collection required by the current flat muxer; fragmented output is the architectural fix.

Errors are observable at every boundary. Encoder callback failures are retained and thrown after flush, missing H.264 decoder metadata is rejected, unsupported codecs are reported before drawing, and asset-gate failures are kept separate from render failures. A caller may retry a failed export, but must not silently download a partial file.

## Verification architecture

The verification stack has four levels. Pure Node tests cover mux boxes, fractional timing, grouped chunks, composition tables, offsets, cancellation metadata, and WritableStream delivery. Static checks cover JavaScript syntax and whitespace. Chromium CDP tests exercise real WebCodecs rendering and validate the generated file with `ffprobe`. Cross-page checks confirm that active instrument routes mount the shared asset gate and keep responsive export behavior.

The canonical commands are:

```bash
node Engine/video-engine/source/tools/test-video-engine.mjs
node Engine/video-engine/source/tools/test-video-engine-browser.mjs
node --check Engine/video-engine/source/website/assets/video-engine.js
```

## Roadmap

### Completed baseline

The current baseline includes strict input validation, deterministic fractional-FPS timing, global multi-segment frame accounting, WebCodecs and MediaRecorder paths, cancellation-safe audio duration, progress phases, device-aware queue limits, grouped MP4 chunks, seekable WritableStream delivery, encoder error propagation, and a Chromium/ffprobe smoke test.

### Next implementation order

1. Add browser-level cancellation tests for both WebCodecs and MediaRecorder over multiple segments.
2. Add a bounded-sink test that deliberately slows `WritableStream.write()` and verifies backpressure.
3. Extract compact per-track sample metadata so fragmented output can release encoded payloads after each fragment.
4. Implement a forward-only fragmented MP4 writer with keyframe-aligned fragments and initialization-segment validation.
5. Add random-access flat MP4 patching for OPFS/File System Access sinks with explicit reservation overflow errors.
6. Add crash/recovery and interrupted-sink tests, then make fragmented output the default for long renders while retaining flat MP4 for compatibility consumers.

## Change rule

Any change to a shared render contract, timing rule, codec policy, muxer box layout, progress phase, or cancellation result must update this document, the detailed Video Engine documentation, the pure regression suite, and the browser smoke test when browser behavior is involved.
