# Video export rollout acceptance

Updated 2026-11-10 after commit `8b79d76` and the final Definition-of-Done checks.

## Phase 0 — A0 baseline

The controlled failure baseline is recorded in `evidence/drum-rollout-browser.json`:

- `R38.png` / HTTP 404: one request, no retry.
- `Drum Bg.png` / HTTP 500: four requests total, initial request plus three retries.

## Phase 1 — A1–A4

The Drum Chromium harness pins the 16:9 frame at 960×540, dispatches a resize event, and verifies the guard stops export with:

> Window resized during export; pinned frame was 960px wide.

The same pinned-frame and resize-guard implementation is now provided to Guitar, Bass Guitar, Piano and Violin through `website/assets/video-export-stability.js`.

## Phase 2 — C1–C2

The Drum page uses the shared fetch/blob/object-URL loader for preview and export. Failed hit images are marked failed, stale preview requests are abortable, and retry behavior is visible in the gate UI.

## Phase 3 — B and D1–D3

The Drum page has the grouped Asset Gate panel, Copy report and Download report actions. The JSON report includes pinned frame, canvas, viewport, DPR, user agent, worker URL, loader stamp, per-asset telemetry, warnings, frame count, render path, duration and final status. Outro missing clips are classified separately from timeout/5xx/unavailable clips. The 404 failure cache is covered by `tools/test-outro-video.mjs`.

The four migrated instrument pages now receive the same panel/report controls from the shared stability module, and their export wrappers block before rendering when the uploaded audio asset is absent.

## Phase 4 — A5–A6

Two Drum captures at the same viewport and DPR are byte-identical (`deterministic: true`). The pin test records the exact 960×540 reference frame. Notation fitting is re-run after pinning and stores frame-relative sizing.

## Phase 5 — Tests and CI

Local checks:

```text
asset-loader tests passed; maxActive: 6; records: 20
outro-video tests passed; requests: 2; failure: not-found/404
notation-engine: 1054 passed, 0 failed
Chromium Video Engine smoke: MP4, H.264, 320×180, 30 frames, 1 second
Drum rollout browser acceptance: passed
Cross-page rollout browser acceptance: passed
```

GitHub Actions run `42699278917` passed on Node 22 with loader, outro-cache, notation, Chromium smoke and Drum rollout checks. The next push includes the cross-page acceptance step as well.

## Phase 6 — Shared module propagation: complete

`video-export-stability.js`, `asset-loader.js` and `render-report.js` are wired into:

- Guitar
- Bass Guitar
- Piano
- Violin

Each page has a pinned export wrapper, render-time resize/visibility guard, required-audio preflight, Asset Gate panel, report buttons, and animation/transition freeze during export. The browser test exercises all four pages.

## Phase 7 — Landscape frame-relative layout: complete

All four migrated pages have the shared landscape frame-relative override using `cqw`, including title, logo row, statistics, stat-box dimensions and frame spacing. Their frame declares `container-type: inline-size` and `--frame-u: calc(100cqw / 960)`. Portrait/square page-specific rules remain intact.

The cross-page evidence records successful layout inspection at 500, 800 and 1400 CSS-pixel viewports and confirms the frame-relative variable is present on every page.

## Definition-of-Done checklist

- Pin release is in `finally`, including resize/cancel failure; no `display:none` or `visibility:hidden` is used. The browser harness asserts inline-style, freeze-class and body-lock cleanup.
- Blob URLs are revoked only after the render path finishes. Unique frame images are deduplicated in the gate, and the shared loader owns object-URL cleanup.
- Loader requests remain CORS fetches; the worker/bucket CORS configuration is not changed by this rollout.
- Sora, Manrope, Baloo 2 and Bravura are actively requested and checked in the font gate.
- Resize/zoom coverage runs at 500, 800 and 1400 CSS pixels with 100%, 150% and 200% page zoom in the cross-page Chromium harness.
- 404/no-retry and 5xx/timeout/three-retry behavior is covered by the loader tests.
- Audio decode failures block export; missing outro/count assets remain classified as warnings or unavailable assets instead of silent success.
- Report download is wired on Drum and on all four migrated pages.
- Unit, browser and notation verification tests run in CI.
- All five production pages in this rollout (Drum, Guitar, Bass Guitar, Piano and Violin) now share the same export stability contract.

## Evidence

- [Drum browser acceptance JSON](evidence/drum-rollout-browser.json)
- [Cross-page rollout JSON](evidence/cross-page-rollout.json)
- [500px Drum screenshot](evidence/drum-500.png)
- [800px Drum screenshot](evidence/drum-800.png)
- [1400px Drum screenshot](evidence/drum-1400.png)
- [Cross-page browser test](../../tools/test-cross-page-rollout-browser.mjs)
- [Shared stability module](../../website/assets/video-export-stability.js)
