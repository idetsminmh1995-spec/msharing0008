# Full 3D Instrument Scenes and Two-Hand Performance

**Decision recorded:** 2026-11-11. The approved direction is a complete 3D instrument scene with both hands for Piano, Guitar, Bass Guitar and Violin. This plan follows the user's choice of full 3D scenes rather than compositing hands over the existing 2D layouts.

## Accuracy contract

A scene must be driven by a renderer-independent, time-addressable performance state. Instrument contact points must come from measured instrument geometry and be expressed in documented physical units; the renderer must not invent a plausible-looking position when the score or solver cannot determine one. Preview and video export must render the same scene state at the same timestamp. Asset-load, missing-rig, and calibration failures must be visible and must never produce a video that silently omits the hands.

Each instrument keeps its own musical and ergonomic rules. A shared 3D scene host, coordinate-frame utilities, rig loader and export adapter may be reused, but piano fingering must not be applied to fretted instruments, bass geometry must not be inferred from guitar defaults, and violin bowing must not be represented as guitar picking.

## Current repository state

| Instrument | What the video currently renders | Data already available | Confirmed gap |
|---|---|---|---|
| Piano | `PianoHand3D` renders a procedural keyboard and two rigged hands in the Hands design. This is a partial 3D scene, not a complete piano model. | `piano-hand-engine` supplies physical key positions, hand splits, finger assignments, contact timing and synthetic IK. The active CC0 `hands_pair.glb` has measured wrist-relative fingertip anchors. | The active GLB has not passed an end-to-end measured contact test. Runtime validation currently checks anchor presence but not all expected distal bones. The export path can begin before GLB loading completes. No production piano body model exists. |
| Guitar | 2D fretboard and note markers in preview/export; the hand illustration is a static SVG legend. | `finger-engine` computes guitar string/fret/finger assignments and left-hand movement keyframes. The page consumes note assignments but discards the left-hand keyframe tracks. | No 3D instrument or hand rig, no fretboard-space pose adapter, and no instrument-contact validation. Chords/barres and several techniques are outside the finger engine's current phase. |
| Bass Guitar | 2D fretboard and markers; no 3D hands. | The page has bass tunings, scale overrides, picking colors and slap/finger/pick UI behavior. | It calls `analyzeGuitar` rather than a bass analysis API, bypasses the authoritative bass geometry, and does not pass left-hand motion to a 3D rig. Five-string geometry needs a single source of truth. |
| Violin | Static SVG illustration, including a static bow; no animated hands. | MusicXML notation timing and playback cursor are available. | No violin fingering/string-position solver, measured string/neck geometry, left-hand poses, bow-motion events, 3D instrument or bow-hand renderer. |

Evidence and existing source plans: `piano-engine/BLENDER-3D-PLAN.md`, `piano-hand-engine/README.md`, `website/assets/hand/README.md`, `finger-engine/README.md`, `website/assets/violin/README.md`, and the four instrument pages under `website/video-create/`.

## Asset and licensing policy

The production hand-pair asset `website/assets/hand/hands_pair.glb` is the current reusable rig candidate and is documented as CC0. Reuse across instruments is conditional on measuring its bone axes, fingertip anchors, scale and wrist rotations for each instrument-specific pose; its current piano mapping is not proof of guitar, bass or violin accuracy. Do not substitute the older `hand_model.glb` into production: its documented CC BY-NC 4.0 license restricts commercial use. Each new instrument model, bow and pick must have a recorded source/license or be generated procedurally in the repository.

## Implementation phases

### Phase 0 — shared scene contract and export safety

- Define the timestamped instrument scene-state contract: instrument geometry, score events, left/right hand targets, prop state, camera and deterministic render timestamp.
- Keep score parsing and fingering decisions outside the Three.js renderer.
- Make 3D assets explicitly ready before export starts; fail clearly if a required model or rig cannot load.
- Use this contract to keep preview, seek, repeated/out-of-order frame sampling and export deterministic.

### Phase 1 — make the existing piano 3D base trustworthy

- Validate that both GLB wrist roots, all five measured fingertip anchors and all required distal finger bones are present.
- Distinguish “anchor data is present” from “visible contact is calibrated.” Do not label presence checks as a completed calibration.
- Add a real-browser smoke test using the checked-in GLB and anchor JSON.
- Measure fingertip-to-key error for left/right hands over white/black keys and straight/curl/press poses; publish the selected millimetre tolerance before claiming contact accuracy.
- Test exact-time rendering, out-of-order timestamps, keyboard-span changes and WebGL/asset failures.
- Add a full piano case/body model and establish its transform from the measured keyboard; retain the current key meshes until the model passes MIDI-to-key and contact tests.

### Phase 2 — reusable 3D scene host and Guitar

- Separate common GLB rig loading, coordinate transforms, scene lifecycle and canvas capture from piano-specific keyboard logic.
- Build a measured guitar scene with named string, fret, nut, bridge and picking-area anchors.
- Adapt the guitar finger timeline into fretboard-space left-hand targets and hand-position/wrist motion; sample the existing movement keyframes rather than showing only note dots.
- Add right-hand pick position/stroke data and a pick prop. Add guitar chord/barre and technique support before marking chord passages production-ready.
- Test six-string ordering, representative fret contacts, shifts, open strings, simultaneous notes, and preview/export parity.

### Phase 3 — Bass Guitar

- Establish one authoritative bass tuning, scale-length, string-spacing and fingertip-offset geometry shared by analysis and rendering.
- Add/finish a bass-specific analysis API instead of treating bass as a guitar with page overrides.
- Build a measured bass scene and adapt its four-/five-string finger timeline, left-hand reach and right-hand fingerstyle/slap/pick events to the rig and props.
- Test four and five strings, bass octave interpretation, open notes, fretting limits, alternating index/middle, slap and pick modes, and visible string contact.

### Phase 4 — Violin

- Define a violin-specific score/event adapter for stable note identity, performance time, written string/fingering, position shifts, ties/repeats and bow-direction evidence. Preserve unknown or ambiguous evidence rather than silently guessing.
- Measure the four strings at nut/bridge, fingerboard/neck, bridge, bow-contact region and instrument scale against a named physical coordinate frame.
- Implement violin string/finger/position selection and bow-event planning as violin-specific logic.
- Build a violin scene with a bow prop; drive the left hand on the fingerboard and the right hand/bow with explicit strokes.
- Test open strings, ambiguous fingerings, position shifts, up/down bow, ties/repeats, string contact, bow contact and preview/export parity.

### Phase 5 — production rollout

- Add a 3D scene mode to all four video pages while keeping the existing 2D modes as explicit fallback until the corresponding 3D mode passes acceptance tests.
- Run browser-based checks across instrument, aspect ratio, zoom, resize, WebGL support, model-load failure and repeated/out-of-order frame timestamps.
- Record model provenance, calibration results, measured error, browser performance and known musical limitations for every instrument.
- Remove a 2D production path only after the instrument's complete 3D scene, both hand roles, score mapping and exported video pass the agreed criteria.

## First implementation slice

Start by making the current piano 3D scene expose an awaitable readiness result and reject incomplete finger-rig mappings. The page's video export must wait for the rig and anchors, rather than silently recording a keyboard without hands. This does not claim that piano contact is calibrated and does not yet ship Guitar, Bass Guitar or Violin 3D scenes; it establishes an explicit safety boundary before extending the renderer.


## Progress (2026-11-11)

The first safety slice is implemented on the current work branch: the piano renderer exposes an awaitable `ready(container)` API; startup validation checks both wrist roots, all ten fingertip anchors and the expected distal finger bones; the video export waits for that readiness and stops with an explicit error if the 3D hands cannot load; the static renderer URL has a cache-version bump; and `tools/test-piano-hand-3d-browser.mjs` exercises the actual checked-in GLB in Chromium. The browser smoke test passes with two roots and five anchor-to-bone mappings per hand.

This is a readiness/integrity check, **not** a measured fingertip-contact calibration. The full piano body and new Guitar, Bass Guitar and Violin 3D scenes, instrument-specific motion adapters, and their rendered-contact tests remain future phases.