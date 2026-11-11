# Video Plan

This folder owns Video Engine planning and technical documentation. It is separate from Main Plan and from the other engine plans.

- [Video architecture and roadmap](ARCHITECTURE.md)
- [Video Engine contract](Documentation/VIDEO-ENGINE.md)
- [Streaming muxer strategy](Documentation/VIDEO-ENGINE-STREAMING-MUXER.md)
- [Thank You (Outro) Ending Plan](Documentation/PLAN-THANK-YOU-OUTRO.md)
- [Canonical implementation](../../Engine/video-engine/)
- [Verification tools](../../Engine/video-engine/source/tools/)

Video Engine owns the shared render, encode, cancellation, progress, audio, and muxing contract, as well as the shared outro ending and fallback delivery plan. Instrument pages provide segments and assets but must not implement a second export pipeline.

## Implementation status

### 1. Implemented in code
- **Deterministic offline WebCodecs rendering:** `VideoEncoder` + `VideoFrame` with rational timestamps, dynamic backpressure queue bounds, and 48 kHz offline audio joining/encoding (`AudioEncoder`).
- **MediaRecorder fallback:** Deterministic fallback for browsers lacking WebCodecs (`canvas.captureStream()`).
- **Fast-start flat MP4 muxing:** `ftyp -> moov -> mdat` with H.264 `avcC`, AAC `esds`, duration/timing tables, sync samples, composition offsets, edit lists, and grouped media chunks.
- **Incremental stream delivery:** `muxMp4ToStream()` incremental delivery to a `WritableStream`.
- **Outro loader hardening (S0 & S1):** Streaming reader with progress callbacks, first-byte & stall timeouts, retries with jitter, `piano`/`paino` aliases, structured failure reporting, and short-lived failure caching (`website/assets/outro-video.js`).

### 2. Planned / Future roadmap
- **Streaming fragmented MP4 writer:** Keyframe-aligned `moof` + `mdat` fragments to avoid retaining all encoded samples until the end of long renders.
- **Outro fallback ending (S2 & S3):** Built-in offline canvas ending cards for zero-network fallback and automatic page adoption.
