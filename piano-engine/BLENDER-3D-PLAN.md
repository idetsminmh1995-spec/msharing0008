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
- Left/right hand colours and finger assignments are deterministic.
- The same scene state can drive browser preview and video export.
- The scene remains usable on the target mobile and desktop browsers at the
  intended frame rate.
