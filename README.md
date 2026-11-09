# Drum MIDI → Animated Drum Video

Converts a Drum MIDI file into a synchronized, animated drum performance
video. Full project spec: upload MIDI → select drum set → select timing
display → select aspect ratio → preview → generate → download MP4.

This repo currently contains the **first working piece** of that app: the
MIDI parsing + R/L hand-alternation timeline logic, in two forms so it can
be reviewed/compared easily.

## `/midi-parser-module`

A standalone Node/TypeScript module — the "brain" of the app:
- Parses raw MIDI (notes, tempo changes, actual time signature, duration)
- Builds the deterministic animation timeline, alternating R/L hands
  **independently per MIDI note number**
- Handles simultaneous notes and invalid/oversized files without failing
  silently

```bash
cd midi-parser-module
npm install
npm run demo
```

See `midi-parser-module/README.md` for details.

## `/cloudflare-worker`

A thin Cloudflare Worker that proxies the `msharing0008` R2 bucket — the
frontend will call this instead of talking to R2 directly. Discovers Drum
Sets dynamically (no hardcoded names) and serves manifest + asset endpoints.
See `cloudflare-worker/README.md` for the R2 folder layout it expects and
deploy instructions.

## `/Drum`

Drum-specific work, kept apart from the instrument-agnostic modules above.
Holds the **sticking engine** in two forms: `Drum/sticking-engine`
(Python, the reference implementation, all 40 rules with the rule
documents beside the code) and `Drum/sticking-engine-ts` (a TypeScript
port, parity-tested against it event by event, bundled for the browser).
It decides which limb plays every note of a drum part, what technique
each stroke uses, and whether the limb can physically get there in time
— and the drum video page draws its answer as R / L under the staff.
See `Drum/README.md` and `Drum/INTEGRATION-PLAN.md`.

## `/web-preview`

A single-file, dependency-free HTML app (`index.html`) that runs the same
parsing + timeline logic directly in the browser — including a hand-written
binary MIDI parser (no external library) so real `.mid`/`.midi` uploads work
without a build step. Open `index.html` in any browser, or click
"Load Demo Pattern" for an instant preview. Includes play/pause/seek,
BPM/time-signature display, a quarter/eighth/sixteenth timing overlay, and
placeholder drum pads (to be replaced with the real pre-designed PNG assets
once the Cloudflare R2 drum sets are ready).

## Status / what's next

- [x] MIDI parsing (notes, tempo, time signature, duration, 10-min cap)
- [x] R/L hand alternation timeline (per-note independent state)
- [x] Simultaneous-note handling
- [x] Browser-based interactive preview (placeholder pads)
- [x] Cloudflare R2 bucket created (`msharing0008`)
- [x] Cloudflare Worker for R2 asset discovery/proxying (not yet deployed)
- [x] Deterministic WebCodecs video renderer with MP4/WebM muxing
- [x] MediaRecorder compatibility fallback
- [x] Video Engine timing and container regression tests
- [ ] Real pre-designed drum PNG assets uploaded to R2
- [ ] Canvas-based preview using real drum set assets
- [ ] Browser integration tests for real encoded output
- [ ] SoundFont-based audio synthesis for the final MP4
- [ ] Cloudflare Pages deployment

See [`docs/VIDEO-ENGINE.md`](docs/VIDEO-ENGINE.md) for the render contract,
codec/container choices, timing model, cancellation behavior, test commands,
and remaining production work.

This project is being planned/built with Claude and Manus AI in parallel for
comparison on key modules before committing to a full build.

## Current delivery status — 2026-11-10

The original sections above describe the legacy MIDI prototype and remain as historical context. The current production delivery also includes the MusicXML-first notation engine and five-page video export rollout documented in [`Doc/CONSOLIDATED-PLAN-2026-11-10.md`](Doc/CONSOLIDATED-PLAN-2026-11-10.md). The notation engine currently verifies 1,054 tests. Drum, Guitar, Bass Guitar, Piano, and Violin share pinned export composition, asset gating, render reports, font/audio preflight, and frame-relative layout. Latest CI run: `42705666741`.
