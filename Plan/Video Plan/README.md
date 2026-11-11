# Video Plan

This folder owns Video Engine planning and technical documentation. It is separate from Main Plan and from the other engine plans.

- [Video architecture and roadmap](ARCHITECTURE.md)
- [Video Engine contract](docs/VIDEO-ENGINE.md)
- [Streaming muxer strategy](docs/VIDEO-ENGINE-STREAMING-MUXER.md)
- [Canonical implementation](../../Engine/video-engine/)
- [Verification tools](../../Engine/video-engine/source/tools/)

Video Engine owns the shared render, encode, cancellation, progress, audio, and muxing contract. Instrument pages provide segments and assets but must not implement a second export pipeline.
