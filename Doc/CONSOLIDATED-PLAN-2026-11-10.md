# msharing0008 Consolidated Delivery Plan

**Last audited:** 2026-11-12
**Repository:** `idetsminmh1995-spec/msharing0008`  
**Current branch:** `main`
**Purpose:** This is the implementation ledger for the work completed across the Notation Engine and the production video pages. It records code that exists, tests that prove it, evidence produced, and work intentionally still outside the current delivery.

## 1. Delivery goals

1. Render MusicXML notation as accurate SVG, with special attention to drum notation, beams, stems, notehead anchors, spacing, and percussion positions.
2. Make the Drum Video export independent of browser window size, resize, docked DevTools, zoom, and live preview layout changes.
3. Make asset failures explicit: identify the file, HTTP status or decode reason, retry policy, and whether rendering was blocked or continued with an optional warning.
4. Propagate the stable export contract to Guitar, Bass Guitar, Piano, and Violin.
5. Keep the engine and the host video pages separate: notation owns SVG and playback-position data; the host owns audio, animation, and video encoding.
6. Keep the current user-facing instrument upload flow MusicXML-first/ MusicXML-only where the page contract specifies MusicXML; legacy MIDI parser modules remain in the repository as separate historical/compatibility modules and are not required by the migrated video-page export gate.

## 2. Notation Engine — completed implementation

### 2.1 Graphic and SVG geometry

- Bravura/SMuFL font data and engraving metrics are used for noteheads, clefs, rests, stems, flags, beams, dynamics, articulations, ornaments, fermatas, and percussion shapes.
- Chord stems are anchored to the actual outermost rendered notehead extents, not to the widest glyph box. This prevents stem detachment and incorrect chord stem placement.
- Beam endpoints use each note's actual stem-attachment x-position, including notehead anchor offsets, so the final stem reaches the beam.
- Stem shortening respects forced direction and out-of-staff geometry instead of using one fixed stem length.
- Measure note positions are stretched after the measure receives its final width, preventing notes from bunching at the left edge when systems are justified.
- Rest clearance, voice collision offsets, skyline collision avoidance, arbitrary resize, page/scroll layout, and debug overlays are integrated according to the existing Notation Engine plan.
- Barline location, display-position precedence, percussion clef positions, and GM fallback mapping are represented in dedicated integration records.

### 2.2 MusicXML and percussion behavior

- MusicXML parser v1/v2, `.mxl`, timewise scores, cross-software fixtures, diagnostics hardening, directions, tempo, dynamics, lyrics/harmony parsing, tuplets, slurs, articulations, ornaments, fermatas, and print/layout data are already recorded in `Plan/Notation Plan/Documentation/` and wired in the engine.
- For percussion, a note's MusicXML `<display-step>` / `<display-octave>` takes precedence over the GM table. The GM mapping is the fallback when the file does not state a display position.
- Drum mapping includes notehead, staff position, stem direction, voice, and instrument metadata using the standard GM table and MuseScore reference data.
- Drum house-style beaming now covers continuous hand patterns such as hi-hat eighth-note pulses even when source MusicXML writes quarter-note durations. Lower-voice kick/left-foot patterns are also beamed when the continuous pattern qualifies.
- Drum beam groups respect meter groups and explicit MusicXML beam hints. Chord stems inside beam groups honor MusicXML direction and resolved glyph anchors.
- Drum fixtures cover 44130 eighths, MuseScore percussion, GM mapping, two-voice grooves, forward gaps, drum chords, and lower-voice beam behavior.

### 2.3 Playback contract

- The engine exposes playback-position APIs and host-selectable per-track event streams. Video pages consume this contract without coupling the notation engine to audio or encoding.
- Cursor/repeat unfolding and track-specific events remain host-driven and deterministic.

### 2.4 Verification

- Current local Notation Engine verification: **1068 passed, 0 failed**.
- The engine source, compiled distribution, and website bundle are kept aligned by the notation verification/build workflow.
- Existing visual snapshots and fixture-based tests remain the source of truth for SVG geometry; browser acceptance is used for the host video composition.

## 3. Drum export — completed implementation

### 3.1 Stable composition

- Export captures a pinned frame instead of reading the live frame rectangle on every frame.
- Reference landscape frame width is 960px; portrait and square reference widths are defined separately.
- A placeholder preserves page layout while the frame is moved off-screen and pinned with explicit width/height.
- The frame is never hidden with `display:none`, `visibility:hidden`, or opacity-based disappearance during export.
- `finally` restores the frame's original inline style, class state, placeholder, resize listener, visibility listener, and page rendering lock, including cancellation and guard failures.
- Resize and `visibilitychange` during export become explicit interruption/report conditions.
- Export scale is calculated once from the pinned frame; frame-size guard checks continue to protect every render path.
- Preview CSS was kept separate from the first pin phase; landscape frame-relative `cqw` conversion is recorded as the later layout phase.

### 3.2 Asset loading and gate

- `website/assets/asset-loader.js` provides fetch → blob → object URL → image decode loading.
- Maximum concurrent loads: 6.
- Per-request timeout: 20 seconds.
- Gate timeout: 120 seconds.
- Retry policy: no retry for 404/403; retry 429, 5xx, network failures, and timeout up to three times with 0.5s/1.5s/4s plus jitter.
- CORS mode remains enabled; worker/bucket CORS configuration was not changed.
- Blob URL ownership and post-render revocation are centralized in the loader.
- Failed image states, stale-request cancellation, retry UI, and successful-only cache behavior are implemented.
- Required assets block rendering; optional assets produce explicit warnings.
- Audio is decoded before export. A decode failure blocks render instead of producing a silent video.
- The gate deduplicates identical image elements and actively requests/checks Sora, Manrope, Baloo 2, and Bravura fonts.

### 3.3 Diagnostics and outro behavior

- `website/assets/render-report.js` creates structured JSON reports containing page, aspect, canvas/pinned frame, viewport, DPR, UA, asset stamp, asset telemetry, warnings, and final status.
- Drum UI contains grouped Asset Gate status, Copy report, and Download report controls.
- `website/assets/outro-video.js` distinguishes missing/not-found outro clips from timeout/5xx/unavailable failures.
- Failed outro results are not permanently cached; only successful loads are retained, with short-lived failure classification.
- Count-voice omissions and optional asset skips are surfaced rather than silently ignored.
- `?debug=1` support makes missing assets visually obvious for QA.

## 4. Propagation to the other instrument pages — complete for the production scope

The shared modules are wired into all nine full notation-video production pages:

- `website/video-create/drum/index.html`
- `website/video-create/guitar/index.html`
- `website/video-create/bass-guitar/index.html`
- `website/video-create/piano/index.html`
- `website/video-create/violin/index.html`
- `website/video-create/bass-cello/index.html`
- `website/video-create/cello/index.html`
- `website/video-create/viola/index.html`
- `website/video-create/vocal/index.html`

`website/assets/video-export-stability.js` provides the common wrapper for the four migrated non-drum pages. Each page receives:

- asset preflight and audio decode gate;
- pinned frame and resize/visibility guard;
- `finally` cleanup;
- animation/transition freeze during export;
- grouped gate panel and report actions;
- frame-relative landscape CSS using `container-type: inline-size` and `--frame-u: calc(100cqw / 960)`.

Portrait and square page-specific layout rules remain intact. Metronome is separately connected to the Notation Engine for score timing and to VideoEngine for export, but it intentionally renders its metronome design rather than exporting the notation SVG.

### 4.1 Notation → Video Engine integration audit — 2026-11-12

The connection was checked page by page instead of assuming that Drum's working path automatically covered the other pages:

- **Full notation video export:** Drum, Guitar, Bass Guitar, Piano, and Violin each load the shared `notation-engine.js`, parse MusicXML/MXL, call `renderParsedMusicXml`, retain the returned playback/timing contract, create the export-ready notation SVG through `NotationEngine.exportSvg`, and pass frame segments to the shared `VideoEngine.render`.
- **Timing-only notation integration:** Metronome loads Notation Engine, uses its parsed MusicXML/MXL playback, tempo, and timeline data, and exports through `VideoEngine.render`. It does not call `exportSvg` because its intended video surface is the metronome design, not a score display.
- **Now connected:** Bass Cello, Cello, Viola, and Vocal no longer use scaffold-only behavior. They share `website/assets/instrument-video-core.js`, which owns MusicXML/MXL parsing, notation SVG preview, Bravura-embedded SVG rasterisation for export, audio decode/mix, preview transport, aspect/style controls, asset-gate reporting, and `VideoEngine.render` segment composition.

The shared export boundary is therefore verified for all currently implemented notation-video pages: page-specific configuration prepares the instrument presentation, the shared core prepares score/audio state, and `VideoEngine` owns frame-addressed encoding, audio/video segments, cancellation, and final asset checks.

### 4.2 Remaining instrument integration — complete

The four former scaffold pages now follow the same explicit source contract: upload a MusicXML/MXL score and an audio take; the score is parsed once by Notation Engine; the returned SVG and playback metadata populate the live preview; the audio duration determines the take segment; and the generated frame is encoded by VideoEngine. The export includes a one-second opening hold followed by the decoded audio take and the rendered notation/instrument frame.

Each page also has a page-specific identity/configuration while reusing the same implementation boundary:

- **Bass Cello:** `bass-cello` config and Bass Cello performance presentation.
- **Cello:** `cello` config and Cello performance presentation.
- **Viola:** `viola` config and Viola performance presentation.
- **Vocal:** `vocal` config and Vocal performance presentation.

The shared `VideoAssetGate` tracks MusicXML source, notation SVG, audio mix, and video-frame readiness. Missing or undecodable inputs block export with a visible reason; successful export exposes a browser download. The Vocal page was exercised end to end with a MusicXML fixture and a one-second WAV fixture: notation rendered, the gate reached Ready, VideoEngine encoded a 1920×1080 WebM, and the Download Video action appeared.

### 4.3 Piano score-input correction — complete

The Piano Video page is now MusicXML/MXL-only for score input. The MIDI file
slot, `.mid`/`.midi` accept filter, `parseMidiFile()` handler, and MIDI upload
status messaging were removed. MusicXML parsing now remains the single source
for notation, tempo map, playback events, piano notes, and hand targets; the
separate audio upload supplies the sound track. Export is disabled until both
MusicXML playback and audio are available. `tools/test-piano-musicxml-only.mjs`
guards this contract and runs in CI.

## 5. Tests, CI, and evidence

### 5.1 Automated tests

- `tools/test-asset-loader.mjs`: status policy, retries, timeout, concurrency ≤ 6, gate behavior, and telemetry.
- `tools/test-outro-video.mjs`: failed 404 is classified and not permanently cached.
- `tools/test-drum-rollout-browser.mjs`: Drum pin, resize guard, deterministic capture, viewport evidence, 404/500 behavior, and report UI.
- `tools/test-cross-page-rollout-browser.mjs`: Guitar/Bass/Piano/Violin module loading, audio gate, resize guard, cleanup, 500/800/1400 CSS-pixel viewports, and 100%/150%/200% zoom.
- Remaining-page smoke coverage: Bass Cello/Cello/Viola/Vocal load the shared core and asset gate; Vocal has an end-to-end MusicXML + WAV VideoEngine encode smoke test.
- `tools/test-video-engine-browser.mjs`: Chromium encoded-output smoke test.
- `tools/test-video-engine.mjs`: video engine timing/container regression tests.
- `npm run verify --prefix notation-engine`: current local result **1068 passed, 0 failed**.

### 5.2 CI

`.github/workflows/notation-and-video.yml` runs on Node 22 and includes:

1. notation dependency installation;
2. asset loader test;
3. outro cache test;
4. Notation Engine verification;
5. Chromium and ffprobe installation;
6. Video Engine smoke test;
7. Drum rollout browser acceptance;
8. cross-page rollout browser acceptance.

Latest successful CI run: `42705666741`.

### 5.3 Evidence

- `Doc/rollout/evidence/drum-rollout-browser.json`
- `Doc/rollout/evidence/cross-page-rollout.json`
- `Doc/rollout/evidence/drum-500.png`
- `Doc/rollout/evidence/drum-800.png`
- `Doc/rollout/evidence/drum-1400.png`
- `Doc/rollout/README.md`

## 6. Commit ledger

| Commit | Recorded work |
|---|---|
| `1bbecfa` | Lower drum-voice beam fix |
| `02d0392` | Drum beam groups split by meter |
| `8f175ce` | Closed hi-hat eighth-pulse mode |
| `739c251` | Chord stems honored in beam groups |
| `96113b8` | Drum beams retained on hand voices |
| `85dee0e` | Continuous drum hand-pattern beaming |
| `8238b1e` | Published/synchronized notation bundle |
| `e17647f` | Chord stem direction and glyph-anchor alignment |
| `21de95f` | Per-track playback event streams |
| `d998d83` | Bounded blob asset pipeline |
| `b928c53` | Unified preview/export asset gate |
| `10a231b` | Render diagnostics and test coverage |
| `f3ec56e` | Drum rollout acceptance and evidence |
| `8b79d76` | Cross-instrument stability propagation and `cqw` layout |
| `dcd89c5` | Definition-of-Done hardening: fonts, dedupe, zoom, cleanup |
| `b05ee67` | Deterministic cross-page guard race fix |

## 7. Definition of Done — current result

- [x] 500/800/1400px viewport coverage.
- [x] 100/150/200% zoom coverage.
- [x] Resize during export either leaves output stable or stops with a clear reason.
- [x] Pin is always restored in `finally`, including cancel/guard failure.
- [x] No hidden-frame workaround using `display:none` or `visibility:hidden`.
- [x] Blob URLs are revoked after render, not while a frame is being drawn.
- [x] CORS fetch behavior preserved.
- [x] Font gate checks the required named fonts.
- [x] Missing/failed assets block render with filename and reason.
- [x] 404 does not retry; 5xx/timeout retries three times.
- [x] Audio decode failure blocks render.
- [x] Outro/count failures are classified or warned about.
- [x] JSON report can be copied and downloaded.
- [x] Unit, browser, notation, and CI checks are green.
- [x] Nine-page notation-video export contract is consistent for Drum, Guitar, Bass Guitar, Piano, Violin, Bass Cello, Cello, Viola, and Vocal.
- [x] Metronome timing-only Notation Engine contract remains connected to VideoEngine.

## 8. Explicit remaining work / not silently marked complete

1. A real encoded golden-frame pixel-diff suite against the user's final reference image is not yet committed. Current browser evidence proves layout/guard determinism, not musical-image perceptual equality across every instrument.
2. R2/custom-domain cache policy and Worker deployment/observability are intentionally outside this rollout. CORS behavior is preserved but bucket/cache changes are a separate plan.
3. The Piano GLB hand-contact plan remains partially open: synthetic IK and 73 piano-hand tests are documented, but GLB bind-pose calibration, measured fingertip contact, collision/clearance, and browser-level contact verification remain future work.
4. The remaining unconnected video pages are now outside this list; Metronome remains timing-only by design and the nine full notation-video pages are connected.
5. Existing legacy MIDI parser and web-preview documentation still describes the original MIDI-first prototype. It is not the same as the migrated MusicXML video-page export contract and should be retired or rewritten in a separate product-documentation task.

## 9. Source documents

- [Video rollout acceptance](./rollout/README.md)
- [Notation Engine authoritative plan](../Plan/Notation Plan/PLAN.md)
- [Notation Engine status](../Plan/Notation Plan/Documentation/STATUS.md)
- [Piano hand plan](../Plan.md)
- [Video Engine contract](../docs/VIDEO-ENGINE.md)
