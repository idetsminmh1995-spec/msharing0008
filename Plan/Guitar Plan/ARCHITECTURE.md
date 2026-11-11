# Guitar Plan — Architecture

## Scope and ownership

Guitar Plan owns the visual guitar stage: string/fret geometry, instrument photographs, fretboard marks, fretting-hand display, picking-hand marks, slides, colours, and SVG/Canvas-compatible output. The canonical implementation is [`../../Engine/guitar-engine/`](../../Engine/guitar-engine/). Score parsing and automatic finger assignment remain outside this renderer; the engine draws the string/fret/finger decisions it receives.

## Architecture

```text
MusicXML / tab / MIDI adapter
        │  GuitarNote { string, fret, time, finger?, slideToFret? }
        ▼
GuitarEngine.fretboard geometry
        ├─ tuningFor() / stringName()
        ├─ fretRange() / fretCenter() / fretWidth()
        ├─ stringLines() / stringYAt()
        └─ positionsAt(time) → LivePosition[]
        ▼
Instrument surface
        ├─ procedural fretboard + gradients
        └─ measured GuitarPhotograph + photoPlacement()
        ▼
stageShapes(options)
        ├─ fretboard, strings, wires, inlays, numbers
        ├─ note marks and fractional slide positions
        ├─ fretting-hand legend/hand image
        └─ picking marks: pick stroke or p/i/m/a fingers
        ▼
StageShape[]
        ├─ renderGuitarStage() → SVG
        └─ page/video adapter → Canvas frame
```

The engine's input is a physical playing position, not only a pitch. A guitar pitch can have multiple string/fret solutions, so automatic tab choice belongs to a tab/fingering adapter. `fret: 0` is an open string and is intentionally distinct from an unassigned fretting finger.

## Geometry and photo modes

Procedural mode computes a horizontal neck with string 1 at the top, a nut at fret 0, fret wires, inlays, fret labels, and string thickness. `firstFret`/`lastFret` define the visible window. Photo mode replaces only the instrument surface with measured fret-wire and string-edge data; playing marks, hand imagery, labels, and picking strokes remain engine-owned overlays. When a photograph is active, its visible frets—not an invented range—define the usable fret window.

The same layout functions drive SVG and Canvas output. A photograph may bleed beyond the frame and optionally fade into the page background, avoiding hard crop lines without changing note positions. This keeps image presentation separate from musical alignment.

## Playing and animation contracts

`positionsAt()` returns a fractional fret while a slide is active. A slide is a single finger travelling along one string from `fret` to `slideToFret`; a same-fret target is not treated as a slide. Ordinary marks use the current fret centre, while open-string notes omit a fretting-finger mark. The picking side is explicit: a pick creates one down/up stroke over its string group; fingerstyle creates per-string `p`, `i`, `m`, or `a` marks, with caller overrides available for bass alternation.

`GuitarStageOptions.seconds` is the absolute audio time. The engine does not infer tempo, repeats, or score structure. It clips notes to the selected fretboard window and keeps missing finger assignments visually distinct through the `unassigned` colour.

## Boundaries and roadmap

`finger-engine` decides guitar/bass fingering candidates; Guitar Engine renders the result. Notation Engine parses notation and exposes score/playback events. Video Engine consumes the Canvas frame and owns encoding. Future 3D guitar work should consume the same position and timing contracts rather than moving tab logic into a model renderer.

Remaining work is primarily verification and integration: add a typed frame-state contract for browser adapters, expand slide/picking acceptance cases, verify photo measurements across every supported instrument preset, test narrow portrait layouts, and add an end-to-end Guitar Video export check. Any future tab solver must preserve the explicit distinction among open, assigned, and unassigned positions.

## Verification

```bash
npm run verify --prefix Engine/guitar-engine
```

Geometry changes must update fretboard and photo tests. Rendering changes must be checked in both SVG shape output and the Canvas/video adapter, because the renderer-neutral `StageShape` list is the compatibility contract.
