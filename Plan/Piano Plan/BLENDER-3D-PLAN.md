# Piano Engine — Blender 3D Plan

## Decision

The piano visualisation will use Blender-authored 3D models as its primary
and final presentation. SVG is not the target renderer for the new design.
The existing SVG implementation remains in the repository temporarily as a
migration reference and regression oracle; it is not the direction for new
visual features.

## Target pipeline

```text
MIDI / MusicXML-derived note data
        ↓
TypeScript core: keyboard geometry, timing, fingering
        ↓
3D scene state: key presses, note bars, hand targets
        ↓
Three.js/WebGL renderer
        ↓
Blender GLB/glTF piano and rigged hand assets
```

The core timing and fingering decisions should stay renderer-independent.
The migration should replace the output layer, not rewrite the MIDI-facing
model or the existing keyboard/fingering mathematics without a reason.

## Blender asset requirements

### Piano

- Each playable key must be a separate object.
- Object names must map deterministically to MIDI numbers, for example
  `key_60` or `key_C4`.
- White and black keys need separate materials or material slots so pressed
  state, hand colour, and highlight effects can be controlled at runtime.
- The model should be exported as a browser-loadable `.glb` asset.

### Hands

- The hand model must be rigged, not a single static mesh.
- Wrist, palm, thumb, index, middle, ring, and little finger bones are
  required at minimum; finger segments should be independently deformable.
- Left and right hand orientation must be deterministic, either as two
  assets or as one mirrored asset with a clear runtime convention.
- Finger targets must be authored or calibrated against the piano key
  coordinate system.

## Planned renderer modules

```text
src/
├── core/                  # renderer-independent logic
│   ├── keyboard.ts
│   ├── fingering.ts
│   ├── timing.ts
│   └── types.ts
└── renderer3d/
    ├── Piano3DRenderer.ts
    ├── Hand3DRenderer.ts
    ├── FallingNotes3D.ts
    ├── modelLoader.ts
    └── keyMapping.ts
models/
├── piano.glb
└── hands.glb
```

The exact filenames may change during implementation, but the boundary is
intentional: core logic produces note/key/hand state and the 3D renderer
turns that state into scene transforms and materials.

## Retired first asset proof of concept (historical)

Before the 2026-11-12 reset, `website/assets/hand/` contained an older
single-hand `hand_model.glb` and a separate `hands_pair.glb` rig exported from
`hands_pair_source.blend`. The former demo mapped MIDI 60/62/64/65/67 to
procedural keys and animated one hand. The production Hands page used the pair
asset and `hands_pair_fingertips.json`. Those model files have been removed from
the current tree; `/hand-demo/` now shows a retirement notice and the Piano
page renders Falling Notes only. See `website/assets/hand/README.md` for the
retained source/license history.

## Migration phases

1. Freeze and identify the renderer-independent keyboard, timing, and
   fingering APIs.
2. Author a first piano model in Blender with independently addressable keys
   and stable MIDI mapping.
3. Export and load the piano GLB in a minimal Three.js/WebGL scene.
4. Implement key press/release animation and left/right colour state.
5. Implement 3D falling-note bars from the existing note timing contract.
6. Author and export a rigged hand model; map fingers to planned targets.
7. Add hand movement, wrist rotation, finger press/release, and chord tests.
8. Integrate the 3D renderer into the website and define the video-rendering
   path so preview and export use the same timing and asset conventions.
9. Remove SVG from the production path only after 3D preview and export have
   passed functional, visual, and performance checks.

## Non-goals for the first 3D slice

- Do not rebuild MusicXML parsing inside the renderer.
- Do not make the first slice photorealistic; stable geometry and timing come
  first.
- Do not delete the existing SVG source before the 3D path has a working
  replacement and tests.

## Acceptance criteria

- MIDI note 60 consistently activates the intended C4 key in the GLB model.
- Key press/release timing matches the TypeScript note interval.
- The Hands camera is orthographic and exactly 90° above the key plane, with
  the keyboard's far edge at the top and wrists entering from the near edge;
  preview and video capture use the same framing.
- Hand span, hand length, key width and key depth use consistent real-world
  proportions instead of enlarging either the hands or keyboard to fill the view.
- Both hands show their dorsal surfaces in a palm-down playing pose. The
  selected source has no skin/nail textures, so the renderer uses one natural
  skin-tone material; left/right note colours do not tint the hand material.
- Left/right note/key highlight colours and finger assignments are deterministic.
- The same scene state can drive browser preview and video export.
- The scene remains usable on the target mobile and desktop browsers at the
  intended frame rate.


## Historical implementation status (verified against source, 2026-11-10; superseded 2026-11-12)

> **Reset notice — 2026-11-12:** The user requested a clean restart. The former hand GLB assets and Blender source have been removed from the current tree, the Piano Hands mode is disabled, and `/hand-demo/` no longer loads the old single-hand model. The following table records the previous implementation for historical context only. No replacement piano or hand model has been downloaded yet.

At the time of that historical snapshot, the repository contained a working
rigged-hand asset and a partial Three.js piano scene, but the target production
pipeline and acceptance criteria below were not all complete.

| Migration phase | Current status | Evidence / remaining work |
|---|---|---|
| 1. Freeze renderer-independent APIs | Partial | `piano-hand-engine` now supplies physical keyboard dimensions, key/strike positions, score-aware hand splits and phrase fingering to the Hands renderer. A typed renderer-independent frame/scene-state contract and its browser tests are still needed. |
| 2. Author production piano model | Not complete | `piano-hand-3d.js` builds procedural box keys; no production Blender piano GLB with stable per-key MIDI objects is checked in. |
| 3. Load piano GLB | Not complete | The checked-in GLB is the hand asset only. The piano keys are procedural. |
| 4. Key press/release and hand colors | Partial | `keyPressDepthMm()` now drives each key's exact millimetre travel directly from the frame timestamp; active keys retain the selected hand highlight. Preview hand-root smoothing still uses requestAnimationFrame, while export snaps to the calculated target. |
| 5. 3D falling-note bars | Not complete | The Falling Notes design still uses the existing SVG/shape renderer; the GLB/WebGL module serves the Hands design. |
| 6. Rigged hand and finger mapping | Partial | The production renderer loads separate rigs from `hands_pair.glb`, uses the measured wrist-relative fingertip anchors in `hands_pair_fingertips.json`, remaps them to distal bones, and accounts for GLTFLoader name sanitization and `_1` suffixes. The palm-down orientation and both separate roots are in place. A browser test on the superseded raw export showed a visible fingertip/key offset; the latest anchor-based asset has not yet passed an end-to-end measured contact test. Synthetic Engine IK residuals are not visible GLB accuracy. |
| 7. Hand/wrist/finger/chord motion and tests | Partial | The earlier raw export rendered left MIDI 48/finger 5 and right MIDI 64/finger 3 simultaneously, but its fingertips did not align to target key centers. That export was superseded by the anchor-based `hands_pair.glb`; repeat the browser test on this active asset and measure fingertip-to-key distance. Chord wrist targets are still averaged rather than jointly optimized; wrist rotation/trajectory and inter-hand collision handling are still missing. |
| 8. Website preview/video integration | Partial, wired | Preview and export share `stageOptions()` and the same Piano Hand Engine keyboard/events. The renderer now retains finger/key contact through the 70 ms key-release envelope and reports synthetic Engine-rig IK residuals. `renderToCanvas()` snaps the hand root while live preview still smooths translation asynchronously; browser parity tests remain outstanding. |
| 9. Remove SVG production path | Not complete | SVG remains the Falling Notes implementation and the renderer-independent contract. Do not remove it until the 3D paths pass functional, visual, deterministic-frame and performance checks. |

Before the reset, `website/hand-demo/index.html` was a 13-white-key procedural
mapping demo and the production renderer was `website/assets/piano-hand-3d.js`.
The reset has disabled that demo and removed the referenced model files; the
renderer is no longer loaded by the Piano page. The static `piano-hand-engine.js`
and the numerical IK remain source-level implementation work, but neither is
proof of a calibrated replacement rig. Building a new piano body model, hand
rig, falling bars, continuous wrist motion and deterministic export remains
unfinished.

### Required follow-up before marking the 3D path production-ready

- Replace duplicate/procedural production key meshes with the planned
  addressable piano GLB, or explicitly revise this asset requirement.
- Choose or create a replacement hand rig and anchor format, then measure
  target-to-fingertip error through articulation. Calibrate joint axes/limits
  and Engine millimetre transforms. Do not restore the retired files or treat
  synthetic-rig IK residuals as visible model contact error.
- Jointly plan chord wrist pose and individual fingertip targets, then add a
  time-based wrist trajectory with approach, travel, press, hold, and release.
- Keep preview/export state parity explicit: test repeated and out-of-order
  `renderToCanvas()` timestamps, seeks, and note releases. Export currently
  snaps to the timestamp; live preview still smooths hand-root movement with
  `requestAnimationFrame` and must be checked against the exported frames.
- Add browser tests for GLB loading and missing-bone behavior, MIDI-to-key
  mapping, per-hand colors, finger pose selection, key press/release intervals,
  the 70 ms release contact window, calibrated fingertip/key contact, keyboard-
  span changes, and preview-versus-video canvas output.
- Measure support and performance on target mobile/desktop browsers, including
  WebGL-unavailable behavior and asset-load failure. The existing
  `piano-engine` Node tests target the separate SVG bundle and do not validate
  this module.
- Historical license records identify the former `hands_pair.glb` as CC0 and
  the demo `hand_model.glb` as CC BY-NC 4.0. Both models have been removed from
  the current tree; verify any replacement model's source and license
  independently before adding it.
