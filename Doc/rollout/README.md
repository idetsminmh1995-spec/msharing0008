# Drum export rollout acceptance

Generated 2026-11-10 from commit `2aa12b0` plus the final local acceptance changes.

## Phase 0 — A0 baseline

The controlled failure baseline is recorded in `evidence/drum-rollout-browser.json`. It reproduces the two failure classes that must remain visible:

- `R38.png` / HTTP 404: one request, no retry.
- `Drum Bg.png` / HTTP 500: four requests total, initial request plus three retries.

The browser harness also captures the responsive page at 500, 800, and 1400 CSS pixels with device scale factors 1, 1.5, and 2. Screenshots are stored beside this report.

## Phase 1 — A1–A4

The Chromium harness calls the query-gated export test hook, pins the 16:9 frame at 960×540, dispatches a resize event, and verifies that the guard stops the export with:

> Window resized during export; pinned frame was 960px wide.

This proves the pin and resize guard path without relying on a real user timing race. The normal page only exposes the hook when `?test=1` is present.

## Phase 2 — C1–C2

The browser page contains the retry button and shared loader. Failed hit images are marked `failed`; stale preview requests are abortable. The screenshots verify that the responsive page and diagnostic UI remain present at all three viewport widths.

## Phase 3 — B and D1–D3

The browser test proves the 404/no-retry and 500/three-retry policy. The page has the grouped Asset Gate panel, Copy report and Download report actions. The JSON report includes the pinned frame, canvas, viewport, DPR, user agent, worker URL, loader stamp, per-asset telemetry, warnings, frame count, render path, duration and final status.

Outro missing clips are classified separately from timeout/5xx/unavailable clips. The 404 failure cache is short-lived and is covered by `tools/test-outro-video.mjs`.

## Phase 4 — A5–A6

Two captures at the same 800px viewport and DPR are byte-identical (`deterministic: true`). The pin test records the exact 960×540 reference frame. The notation fitting path is re-run after pinning and stores frame-relative sizing.

## Phase 5 — Tests and CI

Local checks:

```text
asset-loader tests passed; maxActive: 6; records: 20
outro-video tests passed; requests: 2; failure: not-found/404
notation-engine: 1054 passed, 0 failed
Chromium Video Engine smoke: MP4, H.264, 320×180, 30 frames, 1 second
Drum rollout browser acceptance: passed
```

GitHub Actions run `42697502576` is green. It runs the loader test, outro-cache test, notation verification, Chromium video smoke test, and the Drum rollout browser acceptance test on Node 22.

## Phase 6 boundary

The shared loader is currently used by the Drum page only. Guitar, bass-guitar, piano, violin, and metronome have **not** been migrated. This is intentional: Phase 6 remains blocked until Drum Phases 0–5 acceptance is complete and this evidence is reviewed.

## Evidence

- [Browser acceptance JSON](evidence/drum-rollout-browser.json)
- [500px screenshot](evidence/drum-500.png)
- [800px screenshot](evidence/drum-800.png)
- [1400px screenshot](evidence/drum-1400.png)
