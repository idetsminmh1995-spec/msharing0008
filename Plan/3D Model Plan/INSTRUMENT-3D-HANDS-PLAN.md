# Full 3D Instrument Scenes and Two-Hand Performance

**Decision recorded:** 2026-11-11. The approved direction is a complete 3D instrument scene with both hands for Piano, Guitar, Bass Guitar and Violin. This plan follows the user's choice of full 3D scenes rather than compositing hands over the existing 2D layouts.

## Accuracy contract

A scene must be driven by a renderer-independent, time-addressable performance state. Instrument contact points must come from measured instrument geometry and be expressed in documented physical units; the renderer must not invent a plausible-looking position when the score or solver cannot determine one. Preview and video export must render the same scene state at the same timestamp. Asset-load, missing-rig, and calibration failures must be visible and must never produce a video that silently omits the hands.

Each instrument keeps its own musical and ergonomic rules. A shared 3D scene host, coordinate-frame utilities, rig loader and export adapter may be reused, but piano fingering must not be applied to fretted instruments, bass geometry must not be inferred from guitar defaults, and violin bowing must not be represented as guitar picking.

## Current repository state

| Instrument | What the video currently renders | Data already available | Confirmed gap |
|---|---|---|---|
| Piano | Falling Notes is the only active video design. The former Hands scene and its GLB models have been retired for a clean rebuild; no 3D piano body model was present. | `Engine/piano-hand-engine` remains as a source of keyboard geometry, hand splits, fingering and synthetic IK. Prior GLB calibration files are historical evidence only, not an active runtime asset. | Rebuild and validate the piano body, hand rigs, contact/calibration pipeline and preview/export integration before re-enabling Hands mode. |
| Guitar | 2D fretboard and note markers in preview/export; the hand illustration is a static SVG legend. | `Engine/finger-engine` computes guitar string/fret/finger assignments and left-hand movement keyframes. The page consumes note assignments but discards the left-hand keyframe tracks. | No 3D instrument or hand rig, no fretboard-space pose adapter, and no instrument-contact validation. Chords/barres and several techniques are outside the finger engine's current phase. |
| Bass Guitar | 2D fretboard and markers; no 3D hands. | The page has bass tunings, scale overrides, picking colors and slap/finger/pick UI behavior. | It calls `analyzeGuitar` rather than a bass analysis API, bypasses the authoritative bass geometry, and does not pass left-hand motion to a 3D rig. Five-string geometry needs a single source of truth. |
| Violin | Static SVG illustration, including a static bow; no animated hands. | MusicXML notation timing and playback cursor are available. | No violin fingering/string-position solver, measured string/neck geometry, left-hand poses, bow-motion events, 3D instrument or bow-hand renderer. |

Evidence and existing source plans: `Plan/Piano Plan/BLENDER-3D-PLAN.md`, `Plan/Piano Hand Plan/ARCHITECTURE.md`, `Engine/piano-hand-engine/README.md`, `website/assets/hand/README.md`, `Engine/finger-engine/README.md`, `website/assets/violin/README.md`, and the instrument pages under `website/video-create/`.

## Asset and licensing policy

On 2026-11-12, the user requested a clean reset. The prior `hand_model.glb`, `hands_pair.glb` and `hands_pair_source.blend` files are removed from the current tree; the old single-hand asset's CC BY-NC 4.0 license and the pair model's CC0 provenance are retained only in the historical records. No hand rig is currently approved for runtime reuse. Every new piano or instrument model, bow and pick must have a recorded source/license before it is added, and its measurements and runtime suitability must be verified independently.

## Implementation phases

### Phase 0 — shared scene contract and export safety

- Define the timestamped instrument scene-state contract: instrument geometry, score events, left/right hand targets, prop state, camera and deterministic render timestamp.
- Keep score parsing and fingering decisions outside the Three.js renderer.
- Make 3D assets explicitly ready before export starts; fail clearly if a required model or rig cannot load.
- Use this contract to keep preview, seek, repeated/out-of-order frame sampling and export deterministic.

### Phase 1 — establish a clean Piano 3D base

- Start from the empty runtime-asset state created by the 2026-11-12 reset; do not restore the retired GLBs as production assets.
- Select and add a properly licensed piano body model and new hand rig under the organized `3D model/` folders. Record source, license, scale, axes and physical dimensions.
- Build a renderer-independent timestamped scene state before adding a new model loader.
- Distinguish “asset and anchors loaded” from “visible contact is calibrated.” Require measured instrument contact and disclose the tested tolerance.
- Add browser tests for model loading, exact-time rendering, out-of-order timestamps, key-span changes and WebGL/asset failures.
- Keep the existing Falling Notes mode until the replacement 3D piano and hands pass contact, motion and preview/export tests.

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

## Reset log (2026-11-12)

The user requested that all checked-in 3D model files, including the piano hand models, be removed so the model work can restart without the previous assets. Repository inventory found three model files, all under `website/assets/hand/`; `3D model/Piano/` contained only its README and no piano body model. This reset removes those three files, disables the old Hands renderer and interactive hand demo, and keeps Piano video export on Falling Notes. Historical JSON calibration and license records remain for provenance. The replacement CC0 Baby Grand model is intentionally not part of this reset; it will be added only after the asset-removal change is published.

## Historical first implementation slice (2026-11-11)

The first piano safety slice makes the current scene expose an awaitable readiness result, rejects incomplete finger-rig mappings, and makes video export wait for the rig, anchors and current production calibration manifest instead of silently recording a keyboard without hands. The separate Phase C.2 record reports five single-finger contact samples with a maximum 0.000 mm residual against a 1 mm tolerance; this is a bounded calibration, not proof for chords, wrist motion, collisions or other instruments. Guitar, Bass Guitar and Violin scenes remain future phases.


## Historical progress (2026-11-11; superseded by the reset)

The previous implementation exposed an awaitable `ready(container)` API and checked the two wrist roots, ten fingertip anchors, distal finger bones and calibration manifest before export. `tools/test-piano-3d-reset-browser.mjs` replaces the old GLB-loading smoke test and now verifies the retired renderer is not loaded and Hands mode remains unavailable. The earlier browser calibration values describe only the removed asset and must not be reused as validation of future models.

The old smoke test verified loading and rig integrity, not general contact accuracy. Its five-sample Phase C.2 record is retained as history only. A new piano body, replacement hand rig, instrument-specific motion adapters and all rendered-contact tests remain future work.
