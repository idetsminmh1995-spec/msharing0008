# Main Plan — Project Architecture

## Scope

`Main Plan` is the project-wide plan. It describes how the engines, website, shared assets, tests, and export pipeline fit together. It is intentionally separate from `Notation Plan`, `Video Plan`, and the other engine-specific plans.

## Canonical repository layout

All engine implementations live under [`Engine/`](../../Engine/). There is one canonical folder per engine: `notation-engine`, `video-engine`, `piano-engine`, `piano-hand-engine`, `finger-engine`, `guitar-engine`, `metronome-engine`, and `drum-engine`.

The [`Plan/`](../) folder contains architecture and delivery plans. `Main Plan` owns cross-engine decisions; each named engine plan owns that engine's requirements, milestones, implementation notes, and verification evidence.

## Runtime flow

1. An instrument page under `website/video-create/` loads the shared notation, instrument, and video runtime assets.
2. MusicXML/MIDI input is parsed into score events by the Notation Engine and timing data is normalized for playback.
3. The instrument engine converts those events into keyboard, fretboard, drum, metronome, or hand-performance data.
4. The page renders a preview using the same data contract used by export.
5. Video Engine samples the frame timeline, encodes audio/video, muxes the result, and exposes progress, cancellation, and output metadata.
6. CI runs typechecks, unit tests, visual/browser tests, and the video smoke test from the canonical Engine paths.

## Ownership boundaries

| Layer | Owner | Responsibility |
|---|---|---|
| Score model and engraving | Notation Engine | MusicXML parsing, layout, SVG notation, diagnostics, playback positions |
| Instrument geometry | Piano, Guitar, Drum, Metronome Engines | Instrument-specific geometry and visual state |
| Hand planning | Piano Hand and Finger Engines | Hand split, fingering, kinematics, candidate scoring, performance plans |
| Export | Video Engine | Frame scheduling, WebCodecs/MediaRecorder fallback, audio, MP4 muxing |
| Host application | `website/` | Upload, preview controls, page composition, asset loading, download |
| Plans and evidence | `Plan/` | Architecture, milestones, status, decisions, and verification records |

## Change policy

Engine source changes must be made in the corresponding folder under `Engine/`. Update the matching engine plan when behavior, public APIs, file layout, or verification status changes. Update this Main Plan only when a cross-engine contract or ownership boundary changes.

The website video asset paths are compatibility integration points. The Video Engine source of truth is under `Engine/video-engine`; `website/assets/video-engine.js` remains a compatibility symlink so existing pages continue to load the same runtime boundary.

## Verification baseline

Before a release, run the affected engine's typecheck and tests, then run the website/video checks. A change is complete when source, plan documentation, tests, and canonical paths agree.
