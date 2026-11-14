# Notation Lab Editor — Audit, Product Design, and Capability Plan

**Date:** 2026-11-15  
**Status:** Active architecture plan; no feature-parity claim yet.

## 1. Current-code decision

### Keep and extend

The TypeScript Notation Engine is a useful foundation. Its public entry point exports core score types, parsing, rendering, geometry, layout, timing, drums, playback, diagnostics, and export modules. The website bridge can render MusicXML to SVG, open MXL, switch page/scroll layouts, play through the SoundFont bridge, zoom, and export PDF.

These capabilities should remain behind stable adapter boundaries:

- MusicXML/MXL import and diagnostics
- notation rendering, page/scroll layout, geometry, and font handling
- playback event generation and SoundFont adapter
- SVG/PDF/PNG export paths
- existing instrument-neutral model and drum mapping work

### Replace, not extend

The former `Website/Website/notation.js` viewer controller has been retired. It kept a single XML string as state and had no command model, selection, undo/redo, score editing API, or source-of-truth document layer. `notation-editor.html` has been reset to the Web app header only. Editor workspace code will be added only after the new score-document design is explicitly accepted.

We will not mutate the rendered SVG as the source of truth. The new editor will edit a structured score document, derive MusicXML/export data, then ask the existing engine to render it.

## 2. Research synthesis

The products below are studied as workflow references, not as UI designs to copy.

| Reference | Useful workflow lessons for Notation Lab |
|---|---|
| MuseScore Studio | automatic engraving with deep layout customization, playback, broad import/export, palettes, accessibility |
| Guitar Pro 8 | multi-track writing, standard/tab/slash/numbered notation, instrument-specific track inspector, audio-track-oriented practice workflow |
| StaffPad | pen/touch input, handwriting recognition, audio import/recording, expressive playback, touch-first editing |
| Flat.io | real-time collaboration, comments, simple browser-first controls, education/assignment workflows, OMR as a separate import capability |
| Dorico | mode-based workflow, semantic music model, dedicated engraving controls, flexible playback/mixer and modern layout behavior |
| Sibelius | score/part workflow, comments/annotations, cloud sharing, MusicXML/MIDI/audio/PDF/video interchange |
| Finale | historical model of flexible input, editing, engraving, and virtual-instrument support; it is not a dependency because development ended in 2024 |

Primary references: [MuseScore Studio overview](https://musescore.org/sites/musescore.org/files/2025-07/Screenshot%202025-06-30%20at%2010.44.05%E2%80%AFPM.pdf), [Guitar Pro 8 overview](https://www.guitar-pro.com/docs/gp8/basics/intro/overview), [Guitar Pro notation displays](https://www.guitar-pro.com/docs/gp8/display-options/notations), [StaffPad](https://www.staffpad.net/), [Flat collaboration](https://help.flat.io/en/education/music-notation-software/share-collaborate/), [Flat OMR](https://help.flat.io/en/education/music-notation-software/omr/), [Dorico feature comparison](https://www.steinberg.net/dorico/compare-editions/), [Sibelius comparison](https://www.avid.com/sibelius/comparison), and [MakeMusic's Finale sunset notice](https://www.makemusic.com/press-room/press-releases-2024/makemusic-sunsets-finale/).

## 3. Original Notation Lab design

Notation Lab will use a **score-first workspace**, not a copy of a desktop ribbon, palette, or competitor UI.

### Desktop

```
Project bar:  score title · save state · undo/redo · play · share/export
──────────────────────────────────────────────────────────────────────
Tool rail       Score canvas / page spread                 Context panel
Input modes     selection + insertion cursor               part / note /
notes, rests    navigation, rehearsal, comments            layout settings
symbols, text
──────────────────────────────────────────────────────────────────────
Transport: play · loop · tempo · mixer shortcut · zoom · command search
```

- The tool rail shows only the current mode's essential tools.
- The context panel follows selection: score, part, staff, measure, note/chord, text, or layout.
- A command palette provides discoverable keyboard-first access without a permanently crowded toolbar.
- On tablet/mobile, the context panel becomes a bottom sheet and the tool rail becomes a compact mode switcher.
- Scan stays separate from the editor until OMR is an approved, tested service.

### Interaction principles

1. **Semantic first:** edit musical intent, not SVG pixels.
2. **Progressive disclosure:** basic notation is immediately visible; advanced engraving and instrument tools appear in context.
3. **One undoable command per user intent:** every change has predictable undo/redo.
4. **Accessible input parity:** pointer, keyboard, MIDI, touch/pen, and screen-reader paths share the same commands.
5. **Local first:** editing works locally; cloud collaboration is an optional sync layer, never the only document store.

## 4. Editor architecture

```
Editor UI → command dispatcher → score document + operation history
     ↓                                  ↓
selection / inspector              serialization adapters
     ↓                                  ↓
renderer adapter ← layout/engine ← MusicXML, MIDI, audio, collaboration adapters
```

### Required layers

- **ScoreDocument:** canonical structured score, parts, instruments, staves, voices, measures, events, annotations, layout preferences, and asset references.
- **Command system:** typed, serializable operations such as `insertNote`, `setDuration`, `splitMeasure`, `changeClef`, and `setStaffType`; supports undo/redo, keyboard shortcuts, and future collaboration.
- **Selection model:** score/part/staff/measure/voice/event/range selection with stable IDs.
- **Renderer adapter:** converts ScoreDocument snapshots to the existing engine's supported input without making SVG authoritative.
- **I/O adapters:** MusicXML first; MIDI, GP interchange, audio, PDF/video, and OMR are independently scoped adapters.
- **Capability registry:** each feature declares its command, inspector controls, render requirement, import/export behavior, tests, accessibility path, and availability state.
- **Collaboration adapter:** operation transport, conflict handling, presence, comments, and permission policy; it must not be mixed into basic local editing.
- **Plugin boundary:** integrations are versioned adapters rather than unrestricted access to the score internals.

## 5. Capability matrix

| Capability group | Examples | Delivery state |
|---|---|---|
| Document foundation | score setup, templates, parts, instruments, staves, measures, metadata, local save | M1 |
| Input and editing | step entry, rests, chords, durations, accidentals, tuplets, ties/slurs, articulations, lyrics, text, selection, undo/redo | M2 |
| Navigation and layout | page/continuous, zoom, navigator, rehearsal marks, breaks, staff/measure spacing, style profiles | M2–M3 |
| Instrument notation | piano/grand staff, drum maps, TAB/tuning, slash, numbered notation, transposition, custom noteheads | M3 |
| Playback | transport, cursor, tempo map, loop, count-in, mixer, SoundFonts, MIDI input/output, audio-track alignment | M3–M4 |
| Engraving | collisions, beams, lyrics, chord symbols, dynamics, repeats, ornaments, custom fonts/styles, part extraction | M4 |
| Interchange | MusicXML, MXL, MIDI, SVG/PDF/PNG, audio/video; GP compatibility is a separately licensed/interoperability-scoped project | M4 |
| Collaboration | comments, sharing, roles, presence, change history, merge/conflict rules | M5 |
| Pen and scan | handwriting, touch gestures, OMR image/PDF import and correction | M6 |
| Extensibility | command palette, keyboard customization, plugin API, templates, style packs | M5–M6 |

“Can add every function” means the architecture reserves a tested extension path for every group above. It does **not** mean every competitor feature is already implemented, nor that proprietary file formats or licensed assets can be copied. Each capability must pass licensing, UX, model, rendering, playback, import/export, performance, and accessibility review before it is marked available.

## 6. Build sequence

1. **M1 — Editor shell and document core:** replace viewer UI with the original score-first workspace; create/open/save a local ScoreDocument; add command dispatcher, selection, and undo/redo.
2. **M2 — Essential writing:** note/rest entry, keyboard/MIDI input, measure navigation, basic text/lyrics, context inspector, render bridge, MusicXML export.
3. **M3 — Instrument and playback studio:** parts/staves/instrument setup, TAB/drums/piano, transport, mixer, cursor, looping, and score/part views.
4. **M4 — Professional output:** engraving controls, layout controls, full interchange/export, audio/video workflows.
5. **M5 — Sharing:** cloud documents, comments, roles, presence, operation sync, revision history.
6. **M6 — Pen and scan:** handwriting and OMR only after accuracy, privacy, correction UX, and service costs are approved.

## 7. Immediate next implementation

The next code milestone is M1. Before changing the editor route, define TypeScript types for ScoreDocument, selection, commands, history, and renderer adapter; write unit tests for command inversion and stable identifiers; then replace the temporary viewer UI with the score-first shell.

## 8. Editor-route reset — 2026-11-15

- Removed the legacy viewer controller, the temporary score-first shell, its canvas, rail, inspector, transport controls, workspace controller, and related styling.
- The Editor route now intentionally contains only the Web app header.
- The octave-shift parser false diagnostic fix and its regression test remain independent engine work.

## 9. Documentation rule

After every milestone, update this document with:
- delivered capabilities and their availability state;
- touched code paths and tests;
- known limitations and migration notes;
- explicit new or changed decisions.
