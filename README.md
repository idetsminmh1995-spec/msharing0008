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
- [ ] Real pre-designed drum PNG assets + Cloudflare R2 integration
- [ ] Cloudflare Worker for R2 asset discovery/proxying
- [ ] Canvas-based preview using real drum set assets
- [ ] WebCodecs (+ ffmpeg.wasm fallback) final video rendering
- [ ] SoundFont-based audio synthesis for the final MP4
- [ ] Cloudflare Pages deployment

This project is being planned/built with Claude and Manus AI in parallel for
comparison on key modules before committing to a full build.
