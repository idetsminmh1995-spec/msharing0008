# Video Engine

This folder is the project entry point for the shared browser video-rendering engine.

The production source remains at `website/assets/video-engine.js` because all instrument video pages load that stable browser path directly. This folder groups the engine's ownership and navigation without duplicating or breaking the runtime asset.

## Canonical implementation

- [Video Engine source](../../website/assets/video-engine.js)
- [Video Engine contract and architecture](../../docs/VIDEO-ENGINE.md)
- [Streaming muxer strategy](../../docs/VIDEO-ENGINE-STREAMING-MUXER.md)

## Verification

- [Node regression suite](../../tools/test-video-engine.mjs)
- [Chromium browser smoke-test runner](../../tools/test-video-engine-browser.mjs)
- [Browser test fixture](../../tools/browser-video-engine-fixture.html)
- [Website cleanup test](../../website/tests/video-engine-cleanup.test.mjs)

## Runtime consumers

The shared engine is loaded by the piano, guitar, bass-guitar, drum, metronome, and violin video-create pages. Keep `website/assets/video-engine.js` as the runtime source of truth and update this index when new engine surfaces are added.
