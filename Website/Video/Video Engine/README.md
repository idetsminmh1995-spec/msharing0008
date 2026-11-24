# Video Engine

This folder contains the authoritative Video Engine runtime source, tests, browser fixture, and tooling.

- [Engine source and tooling](source/)
- [Authoritative runtime source](source/website/assets/video-engine.js)
- [Node muxer tests](source/tools/test-video-engine.mjs)
- [Chromium engine smoke test](source/tools/test-video-engine-browser.mjs)
- [Browser fixture](source/tools/browser-video-engine-fixture.html)
- [Studio integration browser test](source/tools/test-studio-video-browser.mjs)
- [Guitar Studio browser test](source/tools/test-guitar-studio-browser.mjs)
- [Piano Studio browser test](source/tools/test-piano-studio-browser.mjs)
- [Bass Studio browser test](source/tools/test-bass-studio-browser.mjs)
- [Violin Studio browser test](source/tools/test-violin-studio-browser.mjs)
- [Voice Studio browser test](source/tools/test-voice-studio-browser.mjs)
- [Shared audio contract browser test](source/tools/test-audio-contract-browser.mjs)
- [Studio dispatch browser test](source/tools/test-studio-dispatch-browser.mjs)
- [Title / Info band browser test](source/tools/test-title-info-browser.mjs)
- [Notation view browser test](source/tools/test-notation-view-browser.mjs)
- [`.mxl` score browser test](source/tools/test-mxl-score-browser.mjs)
- [Source-to-production sync tool](source/tools/sync-video-engine.mjs)
- [Production website asset](../../Website/assets/video-engine.js)
- [Implementation status](../Video%20Engine%20Doc/README.md)
- [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md)

The authoritative source is `source/website/assets/video-engine.js`. The static website loads the generated copy at `Website/Website/assets/video-engine.js`. After changing the source, run `node source/tools/sync-video-engine.mjs`; CI/checks can use `node source/tools/sync-video-engine.mjs --check` to detect a stale production copy.
