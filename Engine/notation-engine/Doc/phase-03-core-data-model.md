# Phase 3 — Core Data Model

**Status:** complete and verified (`npm run verify` clean, plus a manual
smoke test constructing a pitched piano note, an unpitched drum note, a
chord, and a full mini-score — see §4 below).

## 1. What was written

All in `src/core/`, each type paired with a plain factory function of the
same name (lowercase) that constructs it:

- **`pitch.ts`** — the type that makes Phase 3b's "any instrument" hard
  requirement hold structurally. `Pitch` is a discriminated union:
  `PitchedPitch` (`kind: 'pitched'`, has `step`/`alter`/`octave` — a real
  audible pitch, e.g. piano/vocal) or `UnpitchedPitch` (`kind: 'unpitched'`,
  has `displayStep`/`displayOctave` — a percussion "position" with no real
  pitch, matching MusicXML's `<unpitched>`). Factories: `pitchedPitch(step,
  alter, octave)`, `unpitchedPitch(displayStep, displayOctave)`. Type
  guards: `isPitched(pitch)`, `isUnpitched(pitch)`.
- **`duration.ts`** — `Duration` holds both the displayed duration
  (`type`/`dots`/`tuplet`) and the authoritative `ticks` value, since
  MusicXML provides both and Phase 4 (not yet built) owns reconciling any
  disagreement between them. `TupletRatio` is `{ actualNotes,
  normalNotes }`. Factory: `duration(type, dots, ticks, tuplet?)`.
- **`note.ts`** — `Note` = `{ kind: 'note', pitch, duration, voice, staff?,
  tieStart?, tieStop? }`. `VoiceId` is just `number`. A piano Note and a
  drum Note are the exact same `Note` type — they only differ in which kind
  of `Pitch` they carry. Factory: `note(init)`.
- **`rest.ts`** — `Rest` = `{ kind: 'rest', duration, voice, staff? }` — no
  pitch field at all (not even unpitched-display), since a rest has no
  position on the staff by definition. Factory: `rest(init)`.
- **`chord.ts`** — `Chord` = `{ kind: 'chord', notes, duration, voice,
  staff? }`. The `chord(notes)` factory **validates** at construction time
  (throws if fewer than 2 notes, or if any note's voice/duration.ticks/staff
  disagrees with the first note's) — a Chord's shared duration/voice/staff
  are derived from its first note, not passed separately, so they can never
  drift out of sync with the actual notes.
- **`measure-event.ts`** — `MeasureEvent = Note | Rest | Chord`, the union
  of everything that can occupy a moment in time within a Voice.
- **`voice.ts`** — `Voice` = `{ id, events }`, a chronological list of
  `MeasureEvent`s. Factory: `voice(id, events)`.
- **`measure.ts`** — `Measure` = `{ number, voices }`. Factory:
  `measure(number, voices)`. Key/time/clef changes are NOT modeled here yet
  (that's Phase 10/11/12) — deliberately out of scope for Phase 3.
- **`part.ts`** — `Part` = `{ id, name?, measures }`. **No
  isDrum/isPiano/isVocal flag or any other instrument-specific field** —
  this is the load-bearing piece of Phase 3b: a Part is identical in shape
  no matter the instrument. Factory: `part(id, measures, name?)`.
- **`score.ts`** — `Score` = `{ parts, title?, composer? }`. Factory:
  `score(init)`.
- **`index.ts`** — barrel file, `export * from` each of the above.

`src/index.ts` now does `export * from './core/index.js'` in addition to
the Phase 2 `ENGINE_VERSION` stub, so all of the above is part of the
engine's actual public API (and therefore ends up in `dist/index.d.ts` via
`npm run declarations`, and in the IIFE bundle's `NotationEngine` global via
`npm run build`).

## 2. Why this shape (design notes)

- **No `NotePosition` wrapper type.** An earlier draft of this phase (not
  committed) separated "does this note have a pitch or a display position"
  into a wrapper around a plain `Pitch`. The version actually written
  folds that distinction directly into `Pitch` itself as a discriminated
  union, which is simpler — one type to import everywhere instead of two,
  and `isPitched()`/`isUnpitched()` type guards give the same narrowing
  either way.
- **`Chord`'s shared fields are derived, not stored independently** —
  avoids a whole class of "chord says voice 1 but its notes say voice 2"
  bugs that would otherwise need separate validation logic every time a
  Chord is constructed or mutated.
- **`exactOptionalPropertyTypes` compliance** — every factory that has
  optional fields (`note()`, `rest()`, `part()`, `chord()`) branches
  explicitly on `undefined` rather than spreading a value that might be
  `undefined` into an optional key, since Phase 2's strict tsconfig
  forbids writing `key: undefined` into a `key?: T` field.

## 3. How to modify it

- **Add a new field to Note/Rest/Chord** (e.g. dynamics, articulations in
  Phase 29/30) — add it as an optional field on the relevant interface and
  its `*Init` type, and update the factory function's spread/branch logic
  to match. Existing callers that don't pass the new field keep working
  unchanged.
- **Add a new MeasureEvent variant** — add the new type's file, then add it
  to the `MeasureEvent` union in `measure-event.ts`. Every place that
  switches on `.kind` (none yet, but geometry/render phases will) will get
  a compile error until the new case is handled, by design.
- **Add measure-level attributes (key/time/clef)** — extend `Measure` in
  `measure.ts` with an optional `attributes?` field once Phase 10/11/12
  define what that field's type looks like; don't add instrument-specific
  fields to `Part` even then.

## 4. How this was verified

Ran `npm run verify` (typecheck + lint + format:check + build) clean, then
loaded the built `dist/notation-engine.js` IIFE bundle into a Node `vm`
sandbox and exercised it directly:
- Built a pitched piano note (`pitchedPitch('C', 0, 4)`) and confirmed
  `isPitched()` returns `true` for it.
- Built an unpitched drum note (`unpitchedPitch('F', 4)`) and confirmed
  `isUnpitched()` returns `true` for it -- using the exact same `note()`
  factory as the piano note.
- Built a 2-note `Chord` and inspected its derived `duration`/`voice`.
- Built a full mini `Score` (one "Drum Set" `Part`, one `Measure`, one
  `Voice` containing the drum note + a rest) and printed it as JSON to
  confirm the whole tree serializes as expected.
- Confirmed `chord()` throws for a single note, and separately throws for
  two notes with mismatched voices -- both error messages printed as
  expected, proving the validation logic actually runs, not just compiles.

## 5. How to revert/remove it

Delete every file in `src/core/` and remove the
`export * from './core/index.js';` line from `src/index.ts` (keep the
`ENGINE_VERSION` line — that's Phase 2, not Phase 3). Nothing else in the
repo references `src/core/` yet — Phase 2's toolchain and the drum-video
app's `quick-demo/staff.js` wiring are both independent of it.
