# Video Engine

This folder contains the authoritative Video Engine runtime source, tests, browser fixture, and tooling.

- [Engine source and tooling](source/)
- [Authoritative runtime source](source/website/assets/video-engine.js)
- [Node muxer tests](source/tools/test-video-engine.mjs)
- [Chromium engine smoke test](source/tools/test-video-engine-browser.mjs)
- [Browser fixture](source/tools/browser-video-engine-fixture.html)
- [Studio integration browser test](source/tools/test-studio-video-browser.mjs)
- [Source-to-production sync tool](source/tools/sync-video-engine.mjs)
- [Production website asset](../../Website/assets/video-engine.js)
- [Implementation status](../Video%20Engine%20Doc/README.md)
- [Video Engine Plan](../Video%20Engine%20Plan/PLAN.md)

The authoritative source is `source/website/assets/video-engine.js`. The static website loads the generated copy at `Website/Website/assets/video-engine.js`. After changing the source, run `node source/tools/sync-video-engine.mjs`; CI/checks can use `node source/tools/sync-video-engine.mjs --check` to detect a stale production copy.
