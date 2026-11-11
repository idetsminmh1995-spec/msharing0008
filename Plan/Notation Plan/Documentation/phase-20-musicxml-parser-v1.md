# Phase 20 — MusicXML Parser v1

**Status:** complete for §10.3's v1 element set (182/182 tests pass,
including 22 tests against 10 real MusicXML fixture files parsed with a
real DOMParser). Every one of §10.3's 17 v1 elements has fixture
coverage and every one of the 11 diagnostic codes the parser can emit is
asserted by a test — verified by a systematic audit, plus a
self-checking test that fails if a future recovery rule is added without
a matching test. This begins **Stage 3 — the first vertical slice**, the key
correction v2 made over v1's plan (v1 didn't reach an end-to-end test until
Phase 39 of 50).

Also caught and fixed a real chord-position bug via the fixture-based
tests before this phase shipped — see §2.

## 1. What was written

`src/parser/musicxml/` — five files (four of which already existed from
earlier work on this session and were reviewed rather than rewritten;
only `parse.ts` and the barrel files are new here):

- **`diagnostic.ts`** — `Diagnostic` (`severity`/`code`/`message`/
  `location`) and its `diagnostic()` factory, per §10.7. `code` is a
  stable identifier callers assert on, not the human-readable `message`.
- **`dom-helpers.ts`** — thin helpers (`childElements`, `firstChildNamed`,
  `childrenNamed`, `textOf`, `intOf`, `attrOf`) over the standard DOM
  `Element` interface. Uses the real `Element`/`Document` types from the
  project's `"lib": [..., "DOM"]` tsconfig setting (Phase 2) rather than
  inventing a custom structural type — TypeScript doesn't care that
  Node isn't a browser; it only needs the type available for checking,
  and a real implementation (jsdom in tests, the browser's own DOMParser
  in production) is injected at runtime.
- **`attributes.ts`** — `parseAttributesElement` reads one `<attributes>`
  element into an `AttributesUpdate` **delta** (not a full snapshot) --
  divisions/fifths/time/clef, each present only if that specific child
  existed. Deltas are how mid-measure `<attributes>` (§10.8) merge
  correctly: applying one just overwrites the fields it actually
  mentions, leaving everything else as it was.
- **`note.ts`** — `parseNoteElement` reads one `<note>` into a
  `ParsedNoteEvent`, never throwing (§10.7): missing `<duration>` assumes
  one quarter note's ticks and warns (`MISSING_DURATION`); missing/
  unrecognized `<type>` derives the duration from ticks via Phase 4's
  `durationTypeAndDotsFromTicks` and warns (`UNKNOWN_DURATION_TYPE`);
  missing `<octave>` defaults to 4 and errors (`MISSING_OCTAVE`); an
  invalid `<step>` errors (`INVALID_PITCH_STEP`); a note that's neither
  `<pitch>` nor `<rest>` (i.e. `<unpitched>`, v2-only per §10.4) is
  flagged `isUnsupported` so the caller can skip it while still advancing
  the tick cursor past it correctly.
- **`parse.ts`** (new) — the actual traversal and `Score` assembly:
  - **`parseMusicXml(xmlText, options?)`** — the main entry point.
    Accepts `options.domParser` (§10's "tests inject a parser" -- see
    `DomParserLike`), falling back to the global `DOMParser` when running
    in a browser. Only `<score-partwise>` is accepted directly (a
    `<score-timewise>` root gets a clear `UNSUPPORTED_ROOT` diagnostic
    and an empty `Score`, never a thrown exception -- conversion is
    Phase 36).
  - **The tick cursor** — one shared running position per measure,
    advanced by `<note>` (unless it's a chord continuation), rewound by
    `<backup>`, advanced by `<forward>` -- exactly §10.1's model.
    **Never filters by voice**: every `<note>`'s own `<voice>` value is
    recorded and grouped afterward, so a file using `<backup>` to write a
    second voice keeps both, the exact case the pre-Phase-1 prototype
    once destroyed by filtering to `voice==1` only.
  - **Chord grouping** -- a second pass, after the whole measure's raw
    tick-tagged records are collected: group by voice, sort by tick
    (stable, preserving each chord's original relative order), then merge
    consecutive same-tick chord-continuation records into one `Chord` via
    Phase 3's `chord()` -- falling back to just the first note (with an
    `INVALID_CHORD` diagnostic) if `chord()` rejects the group, rather
    than letting that exception escape uncaught.
  - **`MeasureAttributes`** -- the per-(part, measure) side-table §10
    asks for. Every measure gets an entry, even ones with no
    `<attributes>` of their own, inheriting whatever was last in effect
    (matching MusicXML's own "attributes persist until changed"
    semantics) -- confirmed by a dedicated test, not assumed.
  - Missing `<divisions>` defaults to 1, warns once per part
    (`MISSING_DIVISIONS`), matching §10.7.
- **`index.ts`** (new, both at `musicxml/` and `parser/` level) — barrel
  exports, wired into `src/index.ts`.

**Test fixtures** (`test/fixtures/musicxml/`, all new, 10 files): `simple-single-voice`
(2 measures, a barline), `two-voice-backup` (the `<backup>` multi-voice
case), `chord` (a 3-note chord), `tie-dot-staff` (`<tie>`/`<dot>`/
`<staff>` together), `forward`, `multi-part`, `missing-divisions`,
`unknown-duration-type`, `unknown-element`, `measure-overrun`,
`empty-part`, `malformed-notes`, `invalid-chord`.

**`test/helpers/dom.js`** (new) -- `testDomParser()` returns a real jsdom-
backed `DOMParser` class for injection, added alongside a new `jsdom`
devDependency (test-only; the shipped engine has no DOM-library
dependency itself, matching §1's independence requirement -- `jsdom`
never appears in `dist/notation-engine.js`).

## 2. A real bug the fixture tests caught

The first draft recorded a `<chord/>` continuation note at the tick
cursor's **current** value -- but by the time a continuation note is
read, the cursor has already advanced past the chord's base note (the
non-chord note that started the group). Naively using "the current tick"
for a continuation note therefore records it one note-duration too late,
not at the chord's actual position.

Caught immediately by the `chord.musicxml` fixture test: a 3-note chord
(C+E+G) parsed into a lone note (C) followed by a separate 2-note chord
(E+G) instead of one 3-note chord -- 4 events instead of the expected 3.

**Fix:** track `lastAdvance`, the tick-amount the most recently processed
*non*-chord note advanced the cursor by. A chord-continuation note is now
recorded at `tick - lastAdvance` (the base note's own position), not at
`tick` directly. `lastAdvance` resets to 0 after `<backup>`/`<forward>`,
since a chord can never legitimately span one of those. Re-ran the
fixture test after the fix: the 3-note chord now correctly produces
exactly 3 events (chord, rest, half note), matching the file's actual
musical content.

## 2b. A completeness audit that found two real gaps

After the first pass looked done, the phase was audited element-by-element
against §10.3's list and code-by-code against §10.7's recovery rules
rather than assumed finished. Two real gaps turned up:

1. **`<forward>` had zero coverage.** It's in §10.3's v1 element list and
   the code handled it, but no fixture contained one, so nothing proved
   it actually worked. Added `forward.musicxml` plus a test that checks
   not just that both notes parse, but that the cursor advanced by the
   *right amount* — the measure lands exactly full (C + forward + G =
   1920 ticks = one 4/4 bar), which a no-op or wrong-sized `<forward>`
   would fail.
2. **5 of 11 diagnostic codes had no test.** `MISSING_DURATION`,
   `MISSING_OCTAVE`, `INVALID_PITCH_STEP`, `UNSUPPORTED_NOTE`, and
   `INVALID_CHORD` were all emitted by the code but never asserted,
   despite §10.7 explicitly requiring "malformed-input recovery tests
   asserting the exact `Diagnostic.code` emitted." Added
   `malformed-notes.musicxml` and `invalid-chord.musicxml` with tests for
   each.

Also added a **self-checking test** that reads this test file's own
source and fails if any of the 11 emitted codes isn't asserted somewhere
in it — so the same gap can't silently reappear when a future phase adds
a new recovery rule.

## 3. How this was verified

Ran `npm run verify` clean, 182/182 (23 new tests here, on top of the
159 already passing). Every test in this phase runs against a **real**
jsdom `DOMParser` parsing **real** XML text from fixture files -- not
mocked DOM objects:

- Structural parse: correct part/measure/voice/event counts and the
  right pitch sequence for a simple 2-measure piece; zero diagnostics for
  a clean file.
- Attributes side-table: divisions/key/time/clef captured correctly, AND
  confirmed to be inherited into a measure with no `<attributes>` of its
  own (not just present in the measure that declares them).
- Barline info captured.
- Duration/tick conversion: a `divisions=2` quarter note converts to
  exactly 480 (Phase 4's `TICKS_PER_QUARTER`).
- **Two voices via `<backup>` both survive**, with the correct event
  counts and pitch for each -- the single most important test in this
  phase, directly guarding against the prototype's known failure mode.
- **Chord merging**: exactly 3 events (not 5) for a chord+rest+note
  measure, with the chord's 3 member pitches in the right order.
- Both `MISSING_DIVISIONS` and `UNKNOWN_DURATION_TYPE` recovery paths,
  confirmed by their diagnostic codes AND by checking the recovered
  value is actually correct (not just that *some* diagnostic fired).
- A non-`score-partwise` root produces an empty `Score` plus a named
  diagnostic, never an exception.
- Calling without an injected parser and no global `DOMParser` throws a
  clear, actionable error message (not a cryptic one).

## 4. Known v1 scope boundaries (not gaps -- intentional per the plan)

- **No `<unpitched>` support.** Percussion notes are skipped with an
  `UNSUPPORTED_NOTE` info diagnostic. §10.4/§10.5 (percussion, MIDI-note
  mapping) are v2 (Phase 35), which is why the drum-video project's own
  files won't render via this parser yet -- v1's milestone target is a
  pitched piece.
- **No `.mxl` or `<score-timewise>`.** Both explicitly deferred to
  Phase 36 per the roadmap; pass this function already-decompressed,
  already-partwise XML text.
- **Mid-measure `<attributes>` changes are captured correctly for the
  RUNNING state** (each field updates independently via the delta
  design) but the `MeasureAttributes` side-table only records one
  snapshot per measure (whatever's in effect by the time the measure
  ends) -- a clef change mid-measure would need per-event attribute
  tracking that Phase 3's core `Measure`/`Voice` types don't carry yet.

## 5. How to modify it

- **Add a v2 element** (e.g. `<unpitched>`) -- extend `note.ts`'s parsing
  and remove the corresponding `isUnsupported` branch once the core model
  or notehead-mapping integration is ready; that's explicitly Phase 35's
  job, not a small patch here.
- **Change chord-rejection fallback behavior** -- the `try`/`catch`
  around `makeChord` in `parse.ts`'s `buildEvent`.
- **Add a new attributes field** (e.g. `<staves>`) -- add it to
  `AttributesUpdate` in `attributes.ts` and thread it through `parse.ts`'s
  running-state variables the same way `divisions`/`fifths`/etc. already
  are.

## 6. How to revert/remove it

Delete `src/parser/musicxml/` and `src/parser/index.ts` entirely, remove
the `export * from './parser/index.js';` line from `src/index.ts`, delete
`test/unit/musicxml-parser.test.js`, `test/helpers/dom.js`, and
`test/fixtures/musicxml/`, and remove the `jsdom` devDependency from
`package.json`/`package-lock.json`.
