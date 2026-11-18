# AGENTS.md

Repository-specific knowledge for the M Sharing music platform.

## Layout

- Top-level deploy directory: `Website/`. The actual static site lives in
  `Website/Website/` (`index.html`, `notation-editor.html`, `notation.html`,
  `assets/`, ...). The site is static: there is no backend, and "user account"
  means client-side `localStorage`.
- Notation Engine: `Website/Notation/Notation Engine/` (TypeScript, its own
  `package.json`).
- Notation docs: `Website/Notation/Notation Plan/PLAN.md`,
  `Website/Notation/Notation Doc/DOC.md`, and the generated
  `Website/Notation/Notation Plan/Documentation/API.md`.

## Notation Engine

Run every command from `Website/Notation/Notation Engine/`.

- `npm run verify` is the full gate: typecheck + lint + `format:check` + build +
  API-doc check + unit/visual tests. It must be green before committing.
- `npm run build` writes `dist/notation-engine.js` and, via
  `scripts/sync-website-bundle.mjs`, copies it to `Website/Website/assets/`
  with a content-addressed `?v=<hash>` cache key that `test/unit/website-bundle.test.js`
  enforces across the app's HTML. After changing the engine, run the build so
  the app copy and cache keys stay in step.
- `npm run docs` regenerates `Notation Plan/Documentation/API.md`; the verify
  step fails if it is stale, so run it after changing exported symbols.
- Tests load the **built bundle** (`dist/notation-engine.js`) into a `vm`
  sandbox (`test/helpers/load-engine.js`), not the TypeScript source. Build
  before running tests directly.
- jsdom is used for DOM-dependent tests. Load page scripts with
  `vm.runInContext(code, dom.getInternalVMContext())`, not `window.eval`: the
  bundle opens with `"use strict"`, and a strict `eval` scopes its top-level
  `var` to the eval so nothing reaches the global.

## Notation defaults and licensing

- The engine's own data layer is `src/notation-defaults/`. It replaced a
  `src/musescore/` copy of a GPL-3.0-only program's tables, which was removed to
  keep the engine free of that provenance. Do not reintroduce a `src/musescore/`
  folder or import MuseScore-derived tables.
- Every table in `src/notation-defaults/` carries a `DefaultsSource` naming the
  public specification it comes from (`musicxml`, `smufl`, `gm1`,
  `drumNotation`) or `houseStyle` for the engine's own choices. New defaults must
  do the same.
- The bundled Bravura font's `engravingDefaults` is the source of truth for
  engraving thicknesses; the spacing law is named `'power'` (the multiplicative
  law), not `'musescore'`.
- The audited MuseScore repository is a pinned reference only -- links and
  behaviour notes, no copied source. See the audit section in `PLAN.md`.

## Page layout and music-font invariants (PLAN Part F)

- Page mode gives each page its own REAL height (`Page.height`, summed into
  `PageLayout.totalHeight`). A system taller than the page's usable height
  grows its page rather than spilling past the bottom margin or overlapping
  the next page. The renderer stacks pages by these real heights and sizes
  the page-mode viewBox from `totalHeight`; a normal page is still exactly
  `config.page.pageHeight`, so normal-page snapshots are unchanged.
- `planResize()` in `src/layout/resize.ts` is the public pure-scale vs
  re-flow decision (`resizePureScale` is the O(1) path; re-flow re-renders
  from the cached `Score`). Page mode re-flows when usable width OR usable
  height changes.
- Glyph geometry (bBox/anchor/advance) always comes from the bundled Bravura
  metrics, never the font the browser loads. A `config.fonts.musicFont` other
  than `Bravura` draws a `MUSIC_FONT_METRICS` diagnostic; only a
  Bravura-compatible-metrics SMuFL font is supported.

## MusicXML transposition (PLAN Part D)

- `<transpose>` (what to add to a written pitch to get a sounding pitch) is
  applied to SOUNDING pitch only: `buildEventStream`'s `midiNotes` and
  `flattenPartNotes`'s `noteNumber` carry it. The drawn notation stays on the
  written pitch the file carries, so removing `<transpose>` leaves the SVG
  byte-identical (`test/unit/transposition.test.js`). The renderer builds a
  sparse `transposeSemitonesByPartAndMeasure` map (`0` entries omitted) and
  threads it into `computePlaybackData`.

## Instrument mapping layer (PLAN Part E)

- Note/accidental/clef/percussion resolution lives in `src/mapping/`, not the
  renderer. `resolveNoteRendering` builds a `MappingContext` and calls
  `ctx.theme.mappingRegistry.resolve(...)`; the renderer keeps only the
  context assembly. The extraction is verified by output being byte-identical
  (all visual snapshots unchanged).
- Precedence, most authoritative first: `explicit-file` (a `<display-step>`,
  `<notehead>` or `<stem>` the file stated) -> `user-override`
  (`config.noteheadMapping.overridesByKey`) -> `instrument-profile` -> the
  documented `fallback`. `MappingNoteResult`'s `staffPositionSource` /
  `noteheadSource` report which tier actually decided, so a test can assert
  the order held instead of inferring it from pixels.
- `GENERIC_PITCHED_PROFILE` matches everything and is forced to the end of the
  registry's list in the constructor, so no note is ever dropped and
  `resolve` never throws. `UNPITCHED_PERCUSSION_PROFILE` handles GM-mapped
  drums; `MappingProfile` (via `mappingProfileToInstrumentProfile`) is the
  customization/persistence surface, matched by `match.instrumentName`
  against the part name the renderer threads in as `RenderCtx.instrumentName`.
- Diagnostics: the renderer's score-wide drum-lookup pass calls
  `drumLookupDiagnostics()` (the mapping layer's own rule), and a profile that
  throws degrades to the generic answer with a `MAPPING_PROFILE_FAILED`
  warning rather than taking the render down.
- Mapping NEVER changes sounding pitch or playback; it only decides what is
  drawn. `test/unit/instrument-mapping.test.js` covers the contract, the
  no-dropped-note completion test, and that a transposing part keeps its
  sounding pitch.

## Diagnostics, recovery and MIDI scope (PLAN Part D)

- `test/unit/diagnostics-hardening.test.js` is a coverage GUARD: it scans
  every source dir that emits diagnostics and asserts each code is named
  somewhere in the test suite. When you add a new emitting module or a new
  `*Diagnostic(` helper, add its dir to `SRC_DIRS` and its function name to
  the alternation -- otherwise a code can ship with no assertion and the
  guard stays green. `src/mapping` + `mappingDiagnostic` were the last gap.
- Recovery tests state three things per case, not just "does not throw":
  no throw, the stable code is emitted, and the good notes survive. A
  recovery that dropped the whole measure would pass a throw-only test.
  See `test/unit/parser-recovery.test.js`.
- `parseMidiFile()` is a MIDI event/meta reader by DECISION, not by
  omission: it returns `MidiFile` (notes + tempo/time/key timeline), never a
  `Score`, and there is deliberately no `midiFileToScore()`/`renderFromMidi()`.
  MIDI has no notation concepts (spelling/voice/beaming/clef), so the
  MIDI-to-notation policy is the host's. Documented in the root README's
  "MIDI scope" section.

## SoundFont routing and unpitched percussion

- Unpitched percussion SOUNDS: `buildEventStream` emits `midiNotes` for an
  `<unpitched>` note from its `<midi-unpitched>` GM key (1-based in the file,
  0-based on the wire). A note with no `<midi-unpitched>` stays silent rather
  than guessing a drum.
- `<midi-program>` / `<midi-bank>` / `<midi-channel>` route a part, parsed
  into `midiInstrumentInfoByPart` and carried on the playback track. All three
  are 1-based per the W3C spec (program 1-128, bank 1-16384, channel 1-16) and
  are decremented to wire values; out-of-range values warn
  (`INVALID_MIDI_PROGRAM` / `_BANK` / `_CHANNEL`) and are dropped.
- `assignTrackRouting()` (`src/playback/routing.ts`) is the pure routing rule,
  kept free of WebAudio so it is testable: percussion is always pinned to the
  GM percussion channel (index 9), a pitched part honors the file's channel
  when free, and otherwise takes the next free melodic channel. The browser
  engine only turns the result into `programChange`/`controllerChange` calls.

