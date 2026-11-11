# Drum Plan — Architecture

## Scope and existing plan

Drum Plan owns percussion mapping, human sticking, drum-chart integration, limb/motion data, and the drum-video bridge. The existing [`INTEGRATION-PLAN.md`](INTEGRATION-PLAN.md) remains the authoritative port/parity decision record; this document adds the system architecture and ownership map without replacing it.

The canonical implementation is [`../../Engine/drum-engine/`](../../Engine/drum-engine/). Drum notation layout remains a Notation Engine concern. Shared export, cancellation, and muxing remain Video Engine concerns.

## Architecture

```text
MusicXML / MIDI / page note list
        │
        ├─ Notation Engine: score, GM drum number, written/repeat timeline
        └─ fromNoteList(): normalized SourceMidiEvent[]
                         │
                         ▼
                 mapEvents()
        GM note → instrument + physical drummer-frame target
                         │
                         ▼
          timing / density / pattern analysis
        beat strength, syncopation, bursts, groove/fill/ostinato roles
                         │
                         ▼
              stateful sticking solver
        all four limbs together, window + beam search, style/intent/seed
                         │
                         ▼
              technique + humanisation
        stroke type, recovery, deterministic microtiming and velocity
                         │
                         ▼
              motion / impact / validation
        limb keyframes, timeline, audio-animation sync, repair report
                         │
                         ▼
              drum page / kit-photo or future 3D renderer
```

## Python reference and TypeScript runtime

`Engine/drum-engine/sticking-engine/` is the Python reference implementation and preserves the original rule specification. `sticking-engine-ts/` is the browser runtime port, bundled as the `StickingEngine` global. The TypeScript port is judged by parity fixtures and golden JSON, not by visual similarity alone. Its deterministic RNG, event IDs, state mutation order, and rule ownership must remain compatible with the reference where parity is promised.

The browser path intentionally accepts a normalized note list rather than implementing a third MIDI parser. The drum page already has notation/playback data. A future adapter may translate Notation Engine's `parseMidiFile` output into the canonical note-list contract; it should promise semantic equivalence, not byte-identical parser behavior.

## Rule ownership

Rule 1 normalizes input. Rule 2 maps General MIDI percussion notes to instruments and target positions. Rules 3–5 analyze timing, density, patterns, and ostinato roles. Rules 6–12 generate reachable candidates, choose sticking/technique/recovery, and apply deterministic humanisation. Rules 13–19 and 24 generate motion, impact, body state, and audio-animation synchronization. Rules 20/31/33 and 21/23/32/35 own memory, profile, idiom, and fatigue state. Rule 25 validates and repairs the final performance. Rule 30 preserves continuous drummer state. Rule 40 changes search thoroughness through FAST/HIGH presets without changing the algorithm.

The orchestrator in `src/engine.ts` owns call order only. A downstream module must not silently re-decide a limb, technique, or source event that another rule owns. The final result carries performance events, animation timeline, validation, duration, seed, and engine version.

## Page integration

The drum page pipeline is `MusicXML → Notation Engine score/playback events → repeat-unfolded note list → StickingEngine → per-event limb and animation timeline → R/L kit-photo hit or future rig renderer → Video Engine`. The sticking engine must not draw notation or encode video. A drum asset gate may decide whether required kit photos are available, but it must not alter the solver's event ownership.

## Current status and roadmap

The TypeScript port, rule modules, state machine, motion timeline, browser bundle, and page bridge are present. The existing integration plan records parity and page wiring decisions. Remaining work includes a first-class adapter from Notation Engine MIDI/playback events, broader Python/TypeScript golden fixtures, browser cancellation and repeat-boundary tests, production 3D limb rig integration, and profile/idiom calibration against authored drummer performances.

The full skeletal drummer rig described by the rule specification remains a renderer concern. Until it exists, kit-photo animation and serialisable keyframes are the reliable output. FAST and HIGH must continue to be the same rule path with different window/beam budgets.

## Verification

```bash
npm run verify --prefix Engine/drum-engine/sticking-engine-ts
npm run golden --prefix Engine/drum-engine/sticking-engine-ts
```

Parity changes require regenerated reference/golden evidence. Changes to event normalization, rule ownership, limb state, deterministic randomization, or timeline timing must update both the TypeScript tests and the corresponding integration record.
