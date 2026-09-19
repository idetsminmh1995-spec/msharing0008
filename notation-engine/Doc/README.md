# Notation Engine — Doc folder

**Rule (never skipped): every time code is written for the Notation Engine,
a matching doc file goes in this folder in the same turn — what was written,
and how to change/revert it.** One doc file per unit of work, named after
the phase/feature it covers, so this folder stays a running record of the
whole engine's build history, not just the plan (`../PLAN.md`) for what's
*intended*.

## Where the specification lives

- **[`../PLAN.md`](../PLAN.md)** — the **authoritative** architecture and
  specification (v2). Read this before writing any code.
- **[`./STATUS.md`](./STATUS.md)** — what is built vs not built right now,
  with the remaining phases numbered. Start here to pick the next piece of
  work.
- [`./PLAN-v1-historical.md`](./PLAN-v1-historical.md) — the v1 roadmap,
  superseded, kept here as a read-only historical reference.
- **This folder** — the per-phase build record: what was actually written,
  how to change it, how to revert it. `../PLAN.md` is the source of truth
  for *intent*; these files are the source of truth for *what exists*.

## Index

| Doc file | Covers |
|---|---|
| [`phase-01-folder-structure.md`](./phase-01-folder-structure.md) | Phase 1 folder skeleton (`src/`, `test/`, `docs/`) |
| [`phase-02-toolchain.md`](./phase-02-toolchain.md) | Phase 2 toolchain (TypeScript, esbuild, ESLint, Prettier) |
| [`phase-03-core-data-model.md`](./phase-03-core-data-model.md) | Phase 3 core data model (`Pitch`, `Note`, `Chord`, `Voice`, `Measure`, `Part`, `Score`) |
| [`phase-04-duration-tick-math.md`](./phase-04-duration-tick-math.md) | Phase 4 duration/tick math (dots, tuplets, divisions conversion) |
| [`phase-05-smufl-glyph-table.md`](./phase-05-smufl-glyph-table.md) | Phase 5 SMuFL glyph table (real Bravura data, `getGlyph`/engraving defaults) |
| [`phase-06-svg-primitives.md`](./phase-06-svg-primitives.md) | Phase 6 SVG primitives layer (line/path/rect/text/group, staff-space coordinates) |
| [`phase-07-config-schema.md`](./phase-07-config-schema.md) | Phase 7 config schema (`EngineConfig`, `resolveConfig`, 7 reserved sections) |
| [`phase-08-testing-harness.md`](./phase-08-testing-harness.md) | Phase 8 testing harness (`node --test`, snapshot compare, Phase 3-7 tests formalized) |
| [`phase-09-staff-lines.md`](./phase-09-staff-lines.md) | Standalone pre-Phase-1 quick-demo staff renderer (superseded by real Phase 9 below, but still wired into the drum-video app) |
| [`phase-09-staff-stave-rendering.md`](./phase-09-staff-stave-rendering.md) | Real Phase 9: staff geometry + rendering in `src/geometry`/`src/render`, 1-6 line support |
| [`phase-10-clef-engine.md`](./phase-10-clef-engine.md) | Phase 10 clef engine (treble/bass/alto/tenor/soprano/8va/8vb/percussion/tab, `staffPositionForPitch`) |
| [`phase-11-key-signature-engine.md`](./phase-11-key-signature-engine.md) | Phase 11 key signature engine (circle-of-fifths positions per clef, cancellation naturals; tenor/soprano a documented gap) |
| [`phase-12-time-signature-engine.md`](./phase-12-time-signature-engine.md) | Phase 12 time signature engine (numeric/common/cut/additive meters, real digit-width spacing) |
| [`phase-13-barline-engine.md`](./phase-13-barline-engine.md) | Phase 13 barline engine (all 7 barline types, bar-number display logic) |
| [`phase-14-ledger-lines.md`](./phase-14-ledger-lines.md) | Phase 14 ledger lines (any clef/line-count, real Bravura extension) |
| [`phase-15-noteheads.md`](./phase-15-noteheads.md) | Phase 15 notehead selection (XML > config > duration default, unified drum/pitched key) |
| [`phase-16-stems.md`](./phase-16-stems.md) | Phase 16 stems (forced/XML/automatic direction, anchor-attached length) |
| [`phase-17-flags.md`](./phase-17-flags.md) | Phase 17 flags (unbeamed-only rule, direction-aware glyph selection) |
| [`phase-18-rests.md`](./phase-18-rests.md) | Phase 18 rests (whole/half special-case placement, per-voice offset) |
| [`phase-19-accidentals.md`](./phase-19-accidentals.md) | Phase 19 accidentals (draw-or-not state machine, chord stacking) |
| [`phase-20-musicxml-parser-v1.md`](./phase-20-musicxml-parser-v1.md) | Phase 20 MusicXML parser v1 (traversal model, chord-tick bug fix) |
| [`phase-21-render-from-musicxml.md`](./phase-21-render-from-musicxml.md) | Phase 21 renderFromMusicXml (naive layout, first vertical slice) |
| [`phase-22-milestone-vertical-slice.md`](./phase-22-milestone-vertical-slice.md) | Phase 22 milestone checkpoint (closed on Phase 21's evidence; Stage 3 complete) |
| [`phase-23-beam-grouping.md`](./phase-23-beam-grouping.md) | Phase 23 beam grouping (wrote the missing §9.12 spec first, then implemented it) |
| [`phase-24-beam-geometry.md`](./phase-24-beam-geometry.md) | Phase 24 beam geometry (3 styles, slope clamping; fixed a real beam-overlap bug) |
| [`abc-make-notes-visible.md`](./abc-make-notes-visible.md) | **A+B+C corrective work** — percussion support, committed bundle + font, web app rewired to the real engine |
| [`phase-25-multi-voice.md`](./phase-25-multi-voice.md) | Phase 25 multi-voice (forced stem direction, rest separation; fixes the reported hand/foot stem bug) |
| [`phase-26-ties.md`](./phase-26-ties.md) | Phase 26 ties (tapered lens shape, side-opposite-stem rule, wired end to end) |
| [`phase-27-slurs.md`](./phase-27-slurs.md) | Phase 27 slurs (whole-span side rule; geometry built, not yet wired -- parsing is v2 scope) |
| [`phase-28-tuplets.md`](./phase-28-tuplets.md) | Phase 28 tuplets (bracket-needed rule, stem-side placement; geometry built, not yet wired) |
| [`phase-29-grand-staff-multi-part.md`](./phase-29-grand-staff-multi-part.md) | Phase 29 grand staff/multi-part (brace rule, system stacking; geometry built, not yet wired) |
| [`phase-30-articulations-ornaments.md`](./phase-30-articulations-ornaments.md) | Phase 30 articulations (opposite-stem, marcato exception) + ornaments (always above); not yet wired |
| [`phase-31-dynamics-hairpins-tempo-rehearsal.md`](./phase-31-dynamics-hairpins-tempo-rehearsal.md) | Phase 31 dynamics + hairpins (built), tempo/rehearsal marks (placement only, text rendering deferred) |
| [`phase-32-lyrics.md`](./phase-32-lyrics.md) | Phase 32 lyrics (real hyphen/elision glyphs, extender line; syllable text deferred) |
| [`phase-33-chord-symbols.md`](./phase-33-chord-symbols.md) | Phase 33 chord symbols (real csym accidental + 5 quality glyphs; root letter deferred) |
| [`phase-34-grace-notes.md`](./phase-34-grace-notes.md) | Phase 34 grace notes (real precomposed acciaccatura/appoggiatura glyphs -- no text-font gap here) |
| [`phase-35-musicxml-parser-v2.md`](./phase-35-musicxml-parser-v2.md) | Phase 35 MusicXML parser v2 Tier 1 (midi-instrument/notehead/grace/tuplet/stem/accidental; 2 bugs found+fixed) |
| [`phase-36-mxl-timewise.md`](./phase-36-mxl-timewise.md) | Phase 36 .mxl support + score-timewise conversion (both byte-identical to partwise/uncompressed) |
| [`phase-37-cross-software-corpus.md`](./phase-37-cross-software-corpus.md) | Phase 37 cross-software corpus (§10.8 divergences; fixed a real tied-only-tie bug) |
| [`phase-38-diagnostics-hardening.md`](./phase-38-diagnostics-hardening.md) | Phase 38 diagnostics hardening (fixed 2 real crash bugs + a real test-coverage gap; completes Stage 6) |
| [`phase-39-midi-parser.md`](./phase-39-midi-parser.md) | Phase 39 Standard MIDI File parser (VLQ, running status, tempo/meta timeline; starts Stage 7) |
| [`phase-40-timing-engine.md`](./phase-40-timing-engine.md) | Phase 40 timing engine (anti-drift TempoMap, tick<->seconds, tick<->measure/beat; passes 10-min drift test) |
| [`phase-41-drum-mapping.md`](./phase-41-drum-mapping.md) | Phase 41 GM drum mapping table -- built, tested, AND wired into rendering (real notehead/position/stem from GM data) |
| [`phase-42-midi-musicxml-alignment.md`](./phase-42-midi-musicxml-alignment.md) | Phase 42 MIDI<->MusicXML alignment (4-tier matching cascade; completes Stage 7) |
| [`integration-a-grand-staff.md`](./integration-a-grand-staff.md) | Integration A: grand staff wired end to end + a real clef-glyph-placement bug fix (NOT a numbered phase) |
| [`integration-b-multi-part.md`](./integration-b-multi-part.md) | Integration B: every part renders (guitar tab part no longer dropped) + per-staff line counts from `<staff-lines>` |
| [`integration-c-tab-frets.md`](./integration-c-tab-frets.md) | Integration C: tab fret numbers drawn on their string lines (no text-font system needed after all) |
| [`integration-d-tempo-marks.md`](./integration-d-tempo-marks.md) | Integration D: tempo marks drawn above the staff from real glyphs (no text-font system needed after all) |
| [`phase-43-spacing-algorithm.md`](./phase-43-spacing-algorithm.md) | Phase 43 real spacing algorithm (§14, LilyPond-derived constants); not yet wired into rendering |
| [`phase-44-skyline-collision-avoidance.md`](./phase-44-skyline-collision-avoidance.md) | Phase 44 skyline collision avoidance (§15); found+fixed a real staff-distance formula bug; not yet wired into rendering |
| [`integration-e-spacing-wiring.md`](./integration-e-spacing-wiring.md) | Integration E: Phase 43's spacing algorithm wired into rendering; found+fixed a real chord-exclusion bug |
| [`integration-f-skyline-wiring.md`](./integration-f-skyline-wiring.md) | Integration F: Phase 44's skyline wired into grand-staff distance (content-aware gap, confirmed on real crossing-hands content) |
| [`phase-45-scroll-layout.md`](./phase-45-scroll-layout.md) | Phase 45 scroll layout (§16.1), formalizing + wiring what the renderer already did since Integration E |
| [`phase-46-page-layout.md`](./phase-46-page-layout.md) | Phase 46 page layout (§16.2) -- system/page breaking + justification; found+fixed a real single-measure justification gap; not yet wired into rendering |
| [`integration-g-tempo-mark-fixes.md`](./integration-g-tempo-mark-fixes.md) | Integration G: tempo mark display/positioning fixes, in two rounds (equals-sign spacing, vertical clearance, measure-width awareness, x-formula inconsistency) |
| [`phase-47-arbitrary-resize.md`](./phase-47-arbitrary-resize.md) | Phase 47 arbitrary resize (§16.3) -- O(1) pure-scale fast path, directly usable on any rendered SVG today, no separate wiring needed |
| [`phase-35-musicxml-parser-v2-tier23.md`](./phase-35-musicxml-parser-v2-tier23.md) | Phase 35 COMPLETION: parser v2 Tier 2/3 (notations, beam, lyric, harmony, direction, print, sound tempo) + additive meters (C3) + explicit beam hints (§10.8) |
| [`integration-h-articulations-ornaments.md`](./integration-h-articulations-ornaments.md) | Integration H: §9.19 articulations + §9.20 ornaments drawn (incl. the marcato exception); fermata parsed but deliberately not drawn |
| [`integration-i-slur-tuplet-wiring.md`](./integration-i-slur-tuplet-wiring.md) | Integration I: §9.16 slurs + §9.17 tuplets drawn via a span pass over captured anchors; fixed a latent beam-group index/x misalignment |
| [`integration-j-dynamics-hairpins.md`](./integration-j-dynamics-hairpins.md) | Integration J: §9.21 dynamics + hairpins drawn, incl. wedges spanning measures |
| [`integration-k-voice-collision.md`](./integration-k-voice-collision.md) | Integration K: §9.14 multi-voice notehead collision offsetting wired -- completes Phase 25 |
| [`integration-l-page-layout-and-score-wide-spacing.md`](./integration-l-page-layout-and-score-wide-spacing.md) | Integration L: §16.2 page mode wired (completes Phase 46) + fixed parts laying themselves out independently, so a score now shares ONE horizontal timeline |
| [`integration-m-drum-chart-defects.md`](./integration-m-drum-chart-defects.md) | Integration M: the three defects a real drum chart exposed -- the deployed site served no music font, every chord broke its beam (62 stray flags), and the tempo mark was drawn through the notes |
| [`integration-n-drum-position-corrections.md`](./integration-n-drum-position-corrections.md) | Integration N: corrected the GM drum table's snare (1 full staff-space) and hi-hat (half a staff-space) default positions, verified against a real drum-lesson file's own 100%-consistent encoding |
| [`integration-o-stem-shortening.md`](./integration-o-stem-shortening.md) | Integration O: closed §9.8's deferred stem-shortening gap -- a forced direction pointing AWAY from the middle for a note outside the staff (drum charts: hands-up hi-hat sitting above the staff) now shortens toward the 2.5sp floor instead of staying at a fixed 3.5sp |
| [`integration-p-beam-endpoint-anchor.md`](./integration-p-beam-endpoint-anchor.md) | Integration P: beam line endpoints were computed from each note's raw x instead of its actual stem-attach x (the notehead glyph's own anchor offset) -- a beamed group's LAST stem fell just short of the beam, appearing disconnected with no flag either |
| [`integration-q-barline-location.md`](./integration-q-barline-location.md) | Integration Q: a `<barline location="left">` (a real file's own way of writing a repeat-begin on the FIRST measure of the repeated section) was drawn at that measure's right edge instead of its left -- a whole measure late |
| [`phase-48-playback-position-api.md`](./phase-48-playback-position-api.md) | Phase 48: §17.1 playback position API + event stream (`positionToX`/`xToPosition`/`getEventStream`/`resolvePosition`), wired into `renderFromMusicXml`'s own result -- completes Stage 9's first half; deletes the superseded `src/cursor/` placeholder |
| [`phase-49-cursor.md`](./phase-49-cursor.md) | Phase 49: §17.2 cursor, both sync modes in ONE module (`computeCursorPlacement` + `renderCursor`) -- completes Stage 9; repeats stay the host's business, never simulated here |
| [`phase-09-staff-lines.md`](./phase-09-staff-lines.md) | Quick-demo 5-line staff renderer (`quick-demo/staff.ts`) |

## Convention for each doc file

Every doc file answers three questions for the code it covers:
1. **What was written** — the file(s), the functions/exports, what each one
   does.
2. **How to modify it** — for each config/parameter, what changing it does
   and where in the code that happens.
3. **How to revert/remove it** — which files to delete and which other
   files reference it (so removing it cleanly doesn't leave dangling
   references, the way the old VexFlow engine's removal needed care).
