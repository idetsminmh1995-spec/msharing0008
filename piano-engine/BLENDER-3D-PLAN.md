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

## First asset proof of concept

The first realistic hand asset is now checked into
`website/assets/hand/`. It includes the source `.blend`, a browser-ready
`.glb`, skinning, a 21-bone armature, and the `Pose_OK` / `RigAction` clips.
The working test page is `/hand-demo/`; it loads the GLB with Three.js,
plays both clips, lists the bones, and directly curls the index finger.
The asset is CC BY-NC 4.0, so it is suitable for non-commercial evaluation
only until replaced by a compatible asset or an original model. Full source,
license, and attribution details live in `website/assets/hand/README.md`.

The first piano mapping slice is also live in the demo. It creates named
procedural key meshes, maps MIDI 60/62/64/65/67 to C4/D4/E4/F4/G4, moves the
hand to the selected target, curls the corresponding thumb/index/middle/ring/
little finger chain, and animates the key press/release. This is a mapping
prototype; the production piano GLB and calibrated inverse-kinematics solver
still remain future work.

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
- The Hands camera uses a high performer-side overhead angle like the supplied
  reference, with the keyboard toward the far edge and wrists entering from
  the near edge; preview and video capture use the same framing.
- Left/right hand colours and finger assignments are deterministic.
- The same scene state can drive browser preview and video export.
- The scene remains usable on the target mobile and desktop browsers at the
  intended frame rate.


## Current implementation status (verified against source, 2026-11-09)

The migration is in progress. The repository contains a working rigged-hand
asset and a partial Three.js piano scene, but the target production pipeline
and acceptance criteria below are not all complete.

| Migration phase | Current status | Evidence / remaining work |
|---|---|---|
| 1. Freeze renderer-independent APIs | Partial | Existing PianoEngine supplies keyboard, note timing, fingering and shape APIs; the new website renderer duplicates keyboard-range and scene mapping logic rather than consuming a dedicated shared 3D state contract. Define and test that boundary. |
| 2. Author production piano model | Not complete | `piano-hand-3d.js` builds procedural box keys; no production Blender piano GLB with stable per-key MIDI objects is checked in. |
| 3. Load piano GLB | Not complete | The checked-in GLB is the hand asset only. The piano keys are procedural. |
| 4. Key press/release and hand colors | Partial | The website renderer colors active keys by hand and eases key meshes down/up, but interpolation is wall-clock/requestAnimationFrame-driven, not yet tied deterministically to the note/frame timestamp. |
| 5. 3D falling-note bars | Not complete | The Falling Notes design still uses the existing SVG/shape renderer; the GLB/WebGL module serves the Hands design. |
| 6. Rigged hand and finger mapping | Partial | A 21-bone hand GLB and finger-bone/key mappings are present. The production mapping curls fingers and moves hands, but this is not calibrated inverse kinematics or a full motion solution. |
| 7. Hand/wrist/finger/chord motion and tests | Partial | Hand translation and selected-finger curling exist. Wrist trajectory/rotation planning, robust chord handling and dedicated automated browser tests for the GLB renderer are not complete. |
| 8. Website preview/video integration | Partial, wired | The Piano page calls `PianoHand3D.update()` for Hands preview and `PianoHand3D.renderToCanvas()` during video composition. Preview/export parity is not yet proven because animation advances independently using `THREE.Clock` and `requestAnimationFrame`. |
| 9. Remove SVG production path | Not complete | SVG remains the Falling Notes implementation and the renderer-independent contract. Do not remove it until the 3D paths pass functional, visual, deterministic-frame and performance checks. |

`website/hand-demo/index.html` is a 13-white-key procedural mapping demo with
five explicit white-key MIDI/finger assignments (60/62/64/65/67), embedded GLB
animation controls, pointer/computer-keyboard interaction, and a bone listing.
The production renderer is `website/assets/piano-hand-3d.js`; it loads the
hand GLB, creates procedural keys for the selected keyboard span, applies
left/right colours and finger poses, and supports canvas capture. These are
working prototype capabilities; do not describe the piano GLB, 3D falling
bars, IK, or deterministic export as shipped.

### Required follow-up before marking the 3D path production-ready

- Replace duplicate/procedural production key meshes with the planned
  addressable piano GLB, or explicitly revise this asset requirement.
- Make scene updates a pure function of musical/video time (including seeks
  and repeated timestamps), rather than the `THREE.Clock` interpolation used
  by the current animation loop. Test that rendering the same timestamp twice
  yields equivalent pixels/state and that a timestamp can be rendered in any
  order.
- Add browser tests for GLB loading and missing-bone behavior, MIDI-to-key
  mapping, per-hand colors, finger pose selection, key press/release intervals,
  keyboard-span changes, and preview-versus-video canvas output.
- Measure support and performance on target mobile/desktop browsers, including
  WebGL-unavailable behavior and asset-load failure. The existing
  `piano-engine` Node tests target the separate SVG bundle and do not validate
  this module.
- The included hand asset is CC BY-NC 4.0 (see
  `website/assets/hand/README.md`); replace it or obtain a compatible/original
  asset before commercial distribution.
