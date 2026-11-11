# Piano Plan — Architecture

## Scope and existing documents

Piano Plan owns the piano keyboard stage, falling-note presentation, keyboard geometry in drawing units, hand/fingering display, and Piano video integration. The detailed 3D migration and asset status already live in [`BLENDER-3D-PLAN.md`](BLENDER-3D-PLAN.md); this document defines the broader engine boundary so the 2D/Falling Notes and 3D/Hands designs do not diverge.

The canonical implementation is [`../../Engine/piano-engine/`](../../Engine/piano-engine/). Physical hand planning is intentionally separate in [Piano Hand Plan](../Piano%20Hand%20Plan/), while video encoding remains the responsibility of [Video Plan](../Video%20Plan/).

## Architecture

```text
MusicXML / MIDI adapter owned by the page
        │  PianoNote { midi, startSeconds, endSeconds, hand }
        ▼
PianoEngine.planFingering()
        │  FingeredNote[] + HandAnchor[]
        ▼
keyboardRange() / keyboardGeometry()
        │  PianoKey[] in the requested stage box
        ▼
stageShapes(options)
        ├─ fallingBars() + gridShapes() + pressedAt()
        ├─ handsShapes() + handFingertips()
        └─ common colours, labels, fade, and keyboard shapes
        ▼
StageShape[] intermediate representation
        ├─ renderPianoStage() → SVG
        └─ page/video adapter → Canvas frame
```

The engine receives already-timed notes and does not parse a score. `startSeconds` and `endSeconds` are in the same clock as the audio. A caller decides hand ownership from notation or the Piano Hand Engine; Piano Engine only renders the supplied hand and finger decisions.

## Shared model and two designs

`PianoStageOptions` is the shared contract for both `falling-notes` and `hands`. Keyboard size may be 61, 73, 76, or 88 keys, or a `KeyRange` window when the full instrument would be unreadable in a portrait frame. `keyboardGeometry()` produces black/white key rectangles in the stage box, and `pressedAt()` determines key state from the current time.

The Falling Notes design draws time as distance: a note's vertical position is derived from `seconds`, `leadSeconds`, and the strike line. The Hands design removes the falling bars and draws a keyboard with hand silhouettes, fingertips, finger numbers, and key names. These are presentation modes over the same note, keyboard, colour, and fingering contracts—not separate timing engines.

`StageShape[]` is the renderer-neutral intermediate representation. SVG and Canvas consume the same geometry so preview and exported frames do not independently re-decide key positions, note clipping, colours, or labels. Path shapes are used for hands; rectangles are used for keys and falling bars; text labels are explicit and video-size aware.

## Ownership boundaries

Notation parsing, staff interpretation, MusicXML timing, and playback repeats belong to Notation Engine and its page adapter. Physical millimetre keyboard geometry, wrist motion, calibrated GLB contacts, and inverse kinematics belong to Piano Hand Engine. Piano Engine owns the visual stage box and drawing-unit keyboard geometry. Video Engine owns frame encoding and MP4/WebM muxing. No module should reparse MusicXML or create a second timestamp policy.

The Piano Hand Engine can provide a richer physical plan to the Hands renderer. It must be adapted into this engine's drawing contract rather than copied into Piano Engine. The Falling Notes design remains useful as a fallback and as a visual comparison surface while the 3D renderer is being verified.

## Current status and gaps

The current TypeScript engine has keyboard ranges, note-name labels, falling bars, grid lines, keyboard pressing, hand/finger shapes, photo/asset-independent SVG output, and a Canvas-compatible shape list. The existing Blender plan records the 3D asset, camera, GLB, contact, and browser-test gaps in detail.

The main remaining work is not another drawing primitive. It is contract verification: typed frame/scene state shared with the 3D renderer, measured GLB-to-key contact, preview/export timestamp parity, deterministic seek tests, responsive layout tests, and an end-to-end export through Video Engine. The SVG/Falling Notes path should not be removed until those 3D checks pass.

## Verification

```bash
npm run verify --prefix Engine/piano-engine
```

Changes to note timing, keyboard ranges, stage layout, hand placement, or `StageShape` must update unit tests for geometry and rendering, plus the relevant browser/video acceptance test. Changes to physical hand motion belong in Piano Hand Plan and must not be hidden inside drawing coordinates.
