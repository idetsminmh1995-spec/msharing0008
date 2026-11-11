# Piano Hand Plan — Architecture and Roadmap

## Purpose and ownership

Piano Hand Engine converts timed piano notes into an inspectable, serialisable two-hand performance plan. It does not draw SVG or 3D pixels, does not own MusicXML engraving, and does not own video encoding. Its output is consumed by the Piano page and eventually by the 3D hand renderer.

The canonical implementation is under [`../../Engine/piano-hand-engine/`](../../Engine/piano-hand-engine/). The current package has phases 1–3 built and a bounded phase-4 IK solver for a synthetic hand rig. GLB calibration, wrist trajectories, chord-shape motion, humanisation, full two-hand motion, and renderer completion remain planned work.

## Coordinate and data architecture

All physical values are millimetres on a real piano, never pixels. The coordinate system is right-handed with `x` along the keyboard toward the player's right, `y` upward from the white-key surface, and `z` away from the player. The renderer maps these millimetres into its own scene; it must not change the engine's physical model to fit a viewport.

```text
Notation / MIDI adapter
  └─ PerformanceNote[]
       id, midi, timeMs, durationMs, velocity,
       staff, voice, track, statedFinger, statedHand, chordId
              │
              ▼
  buildKeyboard() + keyPositionsFor()
       PianoKey3D, strike point, approach point, key travel
              │
              ▼
  splitHands()
       hand + handReason + handConfidence
              │
              ▼
  solveFingering()
       finger + fingerSource + fingerConfidence + diagnostics
              │
              ▼
  solvePerformancePlan()
       PianoPerformancePlan, version 1, crossings, incomplete state
              │
              ├─ static hand pose / synthetic finger IK
              ├─ future wrist and chord motion planner
              └─ future GLB transform + renderer adapter
              │
              ▼
  PianoMotionPlan → sampleHandMotion(timestampMs)
       trajectories + contacts → deterministic render state
```

The engine carries stable note IDs and source evidence through every stage. A renderer can therefore trace a visible finger contact back to the source note, staff, voice, and confidence decision.

## Module responsibilities

### Input and timeline

`core/types.ts` defines the shared contract: `PerformanceNote`, `SolvedPerformanceNote`, `PianoPerformancePlan`, `HandState`, `FingerState`, `Technique`, and physical vectors. `core/timeline.ts` owns milliseconds, frame sampling, sounding intervals, and key-contact boundaries. The engine must never move a note's musical onset to make a visual gesture easier.

### Keyboard geometry

`keyboard/pianoGeometry.ts` models the physical keyboard in millimetres, including white/black key dimensions and the 88-key range. `keyboard/keyPosition.ts` converts a MIDI note into a physical key, strike point, approach point, press depth, and key-contact state. Geometry is shared conceptually with the Piano Engine, but the hand solver keeps its physical representation independent of the drawn keyboard.

### Hand split and fingering

`fingering/handSplit.ts` resolves hand ownership from explicit source evidence first, then staff, voice, track, and bounded inference. `fingering/handSpan.ts` defines physically reachable spans. `fingering/fingeringCost.ts` scores chord shapes and transitions. `fingering/fingeringSolver.ts` performs a bounded phrase-level search rather than making isolated per-note decisions. Caller overrides beat MusicXML `<fingering>`, which beats automatic search.

### Performance plan

`core/performancePlan.ts` composes key positions, hand decisions, finger decisions, confidence values, crossings, and diagnostics into a versioned `PianoPerformancePlan`. It is intentionally serialisable and renderer-independent. `incomplete: true` is honest output for out-of-range, unfingered, or strained material; the engine does not hide an impossible passage behind a plausible-looking fallback.

### Motion plan and sampling

`core/motionPlan.ts` defines `PianoMotionPlan`, `HandTrajectorySegment`, `FingerContactPlan`, and `SampledHandMotion`. Sampling is pure and absolute-time based: preview, seek, and export receive the same plan and timestamp and should produce the same serialisable state. Contact states are `APPROACH`, `CONTACT`, `HOLD`, and `RELEASE`; hand phases include `REST`, `PREPARE`, `TRAVEL`, `ALIGN`, `PRESS`, `HOLD`, `RELEASE`, `SHIFT`, and `CROSS`.

### Kinematics and calibration

`kinematics/handPose.ts` is the forward model: joint angles produce palm, wrist, and fingertip positions under joint limits. `kinematics/inverseKinematics.ts` provides bounded damped-least-squares finger IK with per-target residuals on the synthetic Engine rig. `calibration/glbCalibration.ts` validates the expected 21-joint skeleton and exposes engine↔GLB transforms, but the default manifest is deliberately `calibrated: false` until measurements are verified. `singleFingerContact.ts` defines the calibration/contact boundary for one finger and one key.

A synthetic IK residual is not evidence of visual fingertip accuracy. Production contact claims require verified wrist anchor, bone-chain orientation, fingertip surface, scale, rotation, translation, and left/right hand transforms against `hand_model.glb`.

## Renderer integration

The Piano page adapter preserves MusicXML/MIDI time, stable IDs, staff, voice, track, stated fingering, and chord membership before calling the hand engine. The browser bundle exposes the engine through `website/assets/piano-hand-engine.js`; the 3D renderer consumes physical key and hand data while the Piano Engine continues to own the Falling Notes/SVG design.

Preview and export must use the same absolute-time sampling API. Preview may interpolate presentation for responsiveness, but export must sample the exact requested timestamp. Until this parity is tested, the hand renderer should expose a diagnostic mode that records the plan timestamp, sampled hand state, active contacts, and source note IDs.

## Invariants

The engine follows six non-negotiable rules. Physical values remain in millimetres. Note contact time remains the source musical time. Finger joints are represented by angles, not duplicated fingertip positions. Inferred hand/finger decisions carry confidence. Impossible shapes are rejected or diagnosed rather than silently accepted. Motion is derived from a complete serialisable plan, not re-decided independently by each rendered frame.

## Current status

Phases 1–3 are implemented: physical keyboard geometry, exact key positions, hand splitting, phrase-level fingering, stated-fingering precedence, confidence values, and serialisable performance plans. Phase 4 is partial: synthetic-rig finger-target IK works with bounded residuals, but it is not GLB-calibrated. The current package verification covers typecheck, lint, formatting, build, unit tests, and browser bundle generation.

## Roadmap

### Phase 4 — calibrated contact

Complete GLB manifest validation, measure the 21-bone skeleton, solve engine↔GLB scale/rotation/translation, verify left/right hand orientation, and add a browser test that checks fingertip/key contact in scene coordinates. A calibration report must include residuals and tolerance, not only a boolean flag.

### Phase 5 — wrist trajectories

Plan wrist anchor movement over time from the solved notes. Use absolute timestamps, approach clearance, travel limits, and transition phases. The planner must preserve contact timing and expose an infeasible-transition diagnostic instead of teleporting a hand.

### Phase 6 — chord shapes

Treat simultaneous notes as one hand shape. Solve finger contacts jointly, prevent impossible finger crossings, model black-key height and front-edge clearance, and maintain a stable wrist/palm orientation across the chord.

### Phase 7 — musical techniques

Add scale, arpeggio, thumb-under, crossing, octave, repeated-note, and hand-shift strategies as explicit techniques. Technique detection must remain inspectable and must not override stated fingerings without a diagnostic.

### Phase 8 — humanisation

Add bounded timing, velocity, lift, and wrist variation after the deterministic plan is correct. Humanisation must be seeded and reproducible for export; it must never change note onset or break key-contact constraints.

### Phase 9 — two-hand and renderer completion

Plan both hands together, resolve collision and occlusion policy, connect calibrated bones to the GLB, and prove preview/export parity on representative scales, chords, crossings, and dense passages.

### Phase 10 — production verification

Add golden serialised plans, browser scene assertions, performance budgets, long-piece memory tests, and an end-to-end Piano Video export test through Video Engine. Keep ML refinement optional and downstream of the deterministic solver.

## Verification commands

```bash
npm run verify --prefix Engine/piano-hand-engine
npm run typecheck --prefix Engine/piano-hand-engine
```

The verification result must accompany changes to the public data model, solver rules, calibration manifests, motion sampling, or browser bundle.
