# Main Plan — Web App Architecture and Stability Plan

**Repository:** `idetsminmh1995-spec/msharing0008`
**Scope:** the complete repository, including `Engine/`, `website/`, `Plan/`, `Doc/`, CI, Cloudflare deployment, and browser export.
**Document role:** this is the cross-engine plan. Engine-specific behavior stays in the named plans under `Plan/`.

## 1. Current system position

The repository has moved beyond the original MIDI prototype. It now contains a MusicXML/MXL-first notation pipeline, instrument engines, a shared browser video boundary, asset gates, deterministic export safeguards, and nine notation-video routes. The strongest part of the system is the engine and rendering work. The main stability risk is now the host application: some routes share `instrument-video-core.js`, while Drum, Piano, Guitar, Bass Guitar, Violin, and Metronome still contain large page-specific implementations for upload, parsing, state, preview, and export.

The system should therefore be treated as a production-oriented static browser application with an incremental migration path, not as a collection of unrelated demos. The target is one predictable application lifecycle with instrument-specific rendering plugins.

## 2. Canonical repository layout

| Area | Canonical location | Rule |
|---|---|---|
| Score parsing, engraving, playback position | `Engine/notation-engine/` | MusicXML/MXL parsing, SVG notation, diagnostics, tempo/repeat-aware playback data |
| Video encoding and muxing | `Engine/video-engine/` | Frame scheduling, WebCodecs, MediaRecorder fallback, audio, muxing, cancellation |
| Piano visual stage | `Engine/piano-engine/` | Keyboard geometry, falling bars, hand/finger drawing contracts |
| Piano physical hand planning | `Engine/piano-hand-engine/` | Hand split, motion plans, calibration, GLB/IK boundary |
| Guitar visual stage | `Engine/guitar-engine/` | Fretboard, photo mode, note positions, slides, picking marks |
| Finger assignment | `Engine/finger-engine/` | Candidate scoring and fingering plans consumed by instrument renderers |
| Drum performance | `Engine/drum-engine/` | Python reference rules and parity-tested TypeScript browser runtime |
| Metronome visual/timing design | `Engine/metronome-engine/` | Metronome-specific visual stage and timing presentation |
| Browser compatibility bundles | `website/assets/` | Committed runtime assets loaded by static pages; generated from canonical engine builds |
| Host pages and UI | `website/video-create/` | Route configuration, instrument-specific presentation, user interaction |
| Shared host lifecycle | `website/assets/instrument-video-core.js` and shared gate/stability modules | Common input, state, asset, preview, export, report, and cleanup behavior |
| Plans and evidence | `Plan/` and `Doc/` | Cross-engine decisions in Main Plan; engine details in named plans; evidence next to the relevant rollout record |

`website/assets/` is a browser compatibility boundary, not a second source tree. Engine source changes must be built and synchronized into the committed browser bundle before deployment.

## 3. Current route inventory

The routes currently fall into two implementation families:

| Route family | Routes | Current state | Target state |
|---|---|---|---|
| Shared-core routes | Bass Cello, Cello, Viola, Vocal | Use `instrument-video-core.js` and compact configuration pages | Remain configuration-first and become the reference implementation |
| Bespoke routes | Drum, Piano, Guitar, Bass Guitar, Violin, Metronome | Contain large inline upload/parser/preview/export logic | Migrate shared lifecycle into the core; retain only instrument hooks |

All routes should eventually expose the same user lifecycle: select score, select audio, parse, preview, play/seek, validate assets, export, show progress, download, and report errors. Instrument-specific engines may change the picture, but not the lifecycle contract.

## 4. Target runtime architecture

```text
Route HTML
  └─ route configuration + instrument hooks
       ▼
InstrumentVideoCore
  ├─ input controller: score/audio selection and validation
  ├─ score controller: MusicXML/MXL parse and playback contract
  ├─ audio controller: decode, duration, channel policy
  ├─ presentation controller: preview transport and aspect/style state
  ├─ VideoAssetGate: required/optional asset lifecycle and diagnostics
  ├─ export controller: pinned frame, render request, cancellation, cleanup
  └─ RenderReport: structured result and downloadable diagnostics
       │
       ├─ Notation Engine → score SVG, playback, timing map
       ├─ Instrument Engine → instrument-specific frame shapes/DOM
       └─ Video Engine → encoded video/audio and output metadata
```

The route should provide functions such as `createPresentation()`, `renderPreview(state)`, `renderExportFrame(ctx, time, state)`, and `collectRequiredAssets()`. It should not implement a second parser, a second asset gate, or a second export cleanup protocol.

## 5. Shared contracts

### 5.1 Score input contract

The application target is MusicXML/MXL-first. The current repository still contains legacy `parseMidiFile()` paths on some bespoke pages, so the migration must make the policy explicit rather than silently assuming all routes are identical.

The target contract is:

```text
ScoreInput = MusicXML (.musicxml/.xml) or compressed MusicXML (.mxl)
AudioInput = browser-decodable audio take
MIDIInput  = legacy/explicitly supported only; never an accidental second path
```

Each route must declare `scoreInput` in configuration. If MIDI remains supported for a route, its parser, test, and user-facing behavior must be documented. Otherwise, remove its file accept filter, handler, status text, and parser call together.

### 5.2 Normalized playback contract

Notation Engine owns score interpretation and returns a normalized playback object containing tempo map, repeat/performance mapping, measure order, event streams, and position conversion helpers. Host pages own presentation decisions and may select a track, but must not reconstruct timing from raw note durations.

Instrument engines consume normalized events in seconds and instrument-specific metadata. Video Engine consumes frame-addressed segments. The same absolute timeline must drive preview, cursor, animation, audio placement, and export.

### 5.3 Application lifecycle contract

Every route should use the same state machine:

```text
idle
→ score-selected
→ score-parsing
→ score-ready
→ audio-loading
→ preview-ready
→ export-preparing
→ exporting
→ completed
```

Terminal/error states are `score-error`, `audio-error`, `asset-error`, `codec-error`, `cancelled`, `resize-interrupted`, and `unsupported-browser`. The export button must be derived from state and required gate readiness, not from several page-local booleans.

### 5.4 Asset contract

Required assets block export and report a filename, status, reason, attempt count, and timing. Optional assets become warnings. Asset loading remains fetch → Blob → object URL → decode, with bounded concurrency, timeout, retry policy, deduplicated cache entries, and explicit revocation ownership. Font readiness is part of the required notation asset contract whenever notation is exported.

### 5.5 Export contract

All routes call the same `VideoEngine.render()` boundary. The host pins a stable frame, freezes transitions, checks dimensions, renders the requested timestamp, and restores every mutated DOM/style/listener state in `finally`. A result must identify container, extension, codec/path, dimensions, frame count, duration, cancellation, and diagnostic memory/byte telemetry where available.

## 6. Ownership boundaries

| Responsibility | Owner | Must not be duplicated by |
|---|---|---|
| MusicXML/MXL parsing and engraving | Notation Engine | Instrument pages |
| Tempo, repeats, playback conversion | Notation Engine + host track selection | Ad hoc page timing code |
| Keyboard/fretboard/drum/metronome geometry | Instrument Engine | Video Engine or route HTML |
| Automatic fingering/sticking | Finger, Piano Hand, or Drum Engine | Visual renderer |
| Preview/export state | InstrumentVideoCore | Individual pages after migration |
| Required/optional assets and reports | Shared asset modules | Per-page gate implementations |
| Frame encoding, audio, muxing | Video Engine | Instrument pages |
| Route copy, controls, theme, instrument hooks | Route configuration/page | Shared engine internals |
| Deployment and cache policy | Website/Worker release configuration | Runtime heuristics |

## 7. Stability risks found in the repository

### 7.1 Page duplication

The largest HTML pages are Drum, Bass Guitar, Guitar, Piano, and Violin. They each contain substantial inline logic and are more difficult to verify than the compact shared-core pages. This is the highest-priority maintainability risk.

### 7.2 Source/bundle drift

Engine source lives under `Engine/`, while static pages load committed bundles from `website/assets/`. A build, synchronization, asset stamping, and drift check must be a single release operation. A source test passing while the browser loads an older bundle is an unacceptable release state.

### 7.3 Documentation drift

The original root README still contains legacy MIDI-prototype language, while newer consolidated records describe the MusicXML/video rollout. Video documentation also contains records written before the remaining pages were connected. Status documents must carry explicit labels: `Implemented`, `Implemented but not fully evidenced`, `Experimental`, `Disabled`, `Planned`, or `Legacy`.

### 7.4 Test coverage asymmetry

Notation and browser rollout checks are strong, but the CI workflow does not yet run every canonical engine package's full verification command. CI should verify the packages that produce committed browser bundles, then run bundle synchronization and route smoke checks.

### 7.5 Disabled 3D hand path

Piano Falling Notes is the reliable current presentation. Piano Hands remains disabled until GLB bind-pose, fingertip contact, collision clearance, orientation, preview/export parity, and browser evidence are complete. The UI must keep this status explicit rather than presenting an unfinished mode as production-ready.

### 7.6 Deployment/security gaps

The Cloudflare Worker configuration currently allows a wildcard origin in its checked-in defaults. Production should restrict origins to the deployed Pages/custom-domain origins and document R2 cache, range, manifest, rate-limit, and observability policy. This is a deployment concern, not an engine concern.

## 8. Stability roadmap

### Phase 0 — truth and release contract

Update the root and Video Plan status records to match the current implementation. Publish a route feature matrix showing score format, audio requirement, notation mode, instrument engine, export mode, and known disabled features. Decide which routes are MusicXML-only and remove or explicitly label remaining MIDI paths. Mark legacy prototype documents as historical.

### Phase 1 — shared host lifecycle

Move upload validation, parser invocation, audio decode, state transitions, preview transport, gate synchronization, export preparation, cancellation, and report actions into `instrument-video-core.js` or small shared modules. Migrate one bespoke route at a time, starting with the simplest non-drum page and ending with Drum. Keep instrument hooks narrow and test each migration before deleting duplicate code.

### Phase 2 — reproducible build and bundle release

Add a repository-level build command that verifies all engine packages, builds browser bundles, synchronizes the committed files under `website/assets/`, stamps changed script URLs, and fails on stale or missing bundles. Do not introduce a framework merely to solve this; the static site can remain static if the release pipeline is deterministic.

### Phase 3 — complete CI matrix

Install and verify every browser-loaded engine package. Run shared unit tests, route smoke tests, Chromium export tests, ffprobe validation, asset-gate tests, cancellation/resize tests, and bundle-drift checks. Add a small browser matrix for landscape, portrait, square, 100/150/200% zoom, slow network, missing assets, invalid scores, and long audio.

### Phase 4 — visual and encoded evidence

Add golden-frame or perceptual image checks for each instrument design and encoded first/last-frame checks. Prove that preview and export use the same score timing and visual state. Record evidence by route and aspect ratio rather than marking the entire application complete from one Drum test.

### Phase 5 — production deployment hardening

Restrict Worker origins, define R2 cache and Range/304 behavior, publish a complete asset manifest, add deployment smoke checks, and record runtime errors with route/version/asset-stamp metadata. Confirm rollback behavior by retaining the previous static bundle set.

### Phase 6 — Piano Hands and advanced engines

Only after the shared release contract is stable, complete Piano GLB calibration and browser evidence. Keep 3D assets and physical hand planning behind the Piano Hand boundary so the reliable Falling Notes path remains unaffected.

## 9. Build and verification policy

A change is complete only when the affected source, generated browser bundle, route behavior, tests, plan status, and asset stamp agree. The preferred release sequence is:

```text
read current status
→ change canonical Engine or shared host source
→ run affected package verification
→ build/sync browser bundles
→ stamp asset URLs
→ run static/link/drift checks
→ run browser and encoded smoke tests
→ update Plan/evidence/status
→ deploy and run post-deploy smoke test
```

The minimum CI package set should include Notation, Piano, Guitar, Finger, Drum Sticking, Metronome, Piano Hand, and Video Engine checks, followed by website tests. CI should use Node 22 consistently and fail on missing lockfiles, stale generated bundles, syntax errors, broken plan links, or uncommitted required output.

## 10. Definition of Done for the web app

A route is production-ready when it has one documented input contract, a deterministic state machine, required/optional asset classification, preview/export timing parity, cancellation and resize cleanup, accessible error messages, a downloadable report, browser evidence at the supported aspect ratios, and a passing encoded output smoke test.

The repository is release-ready when every browser-loaded bundle maps to one canonical source, every route appears in the feature matrix, all package and browser checks are green, deployment origins are restricted, the current documentation does not contradict runtime behavior, and a previous static bundle can be restored without rebuilding from an unverified working tree.

## 11. Immediate next actions

1. Update stale root and Video Plan status text and publish the route feature matrix.
2. Add a root build/sync/stamp/drift command for all browser-loaded engines.
3. Extend CI to verify every engine package used by the website.
4. Define and enforce the MusicXML/MXL versus legacy MIDI policy per route.
5. Migrate one bespoke page to the shared lifecycle and use it as the reference implementation.
6. Add encoded first/last-frame and golden-frame evidence before enabling new visual modes.
7. Restrict Worker origins and document R2 production behavior.
8. Keep Piano Hands disabled until its calibration and browser evidence are complete.
