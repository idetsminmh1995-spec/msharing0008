# Phase 25 — Multi-Voice Per Staff

**Status:** the core deliverable (forced stem direction + rest separation)
is complete and wired end to end (226/226 tests pass). Notehead-collision
offsetting has real, tested geometry but is **not yet wired into
`renderFromMusicXml`** — see §3.

This phase directly fixes the stem-direction bug found while testing the
A+B+C web-app work: a real drum groove (hi-hat in one voice, kick/snare in
another) was rendering with an arbitrary automatic-direction stem instead
of the "hands up, feet down" convention.

## 0. Another plan gap found and fixed before writing code

Like beams (Phase 23), this phase's actual content had no dedicated `§9.X`
specification — `§15.3` mentioned "multi-voice notehead offsetting ...
handled by their own module" without ever writing that module up. Verified
the real convention against four independent sources (MuseScore's
handbook, LilyPond's reference manual, and two notation-pedagogy sites, all
stating the identical rule with zero disagreement) before writing anything,
then added `PLAN.md` `§9.14` with the full spec, sources, and named test
cases, matching the same rigor as every other `§9.X` subsection.

## 1. What was written

**`src/geometry/voice.ts`**:
- **`voiceForcedDirection(voiceId)`** — the universal rule: odd voices
  always up, even voices always down, confirmed identical across every
  source consulted (MuseScore: "an upper voice with stems up and a lower
  voice with stems down"; LilyPond: "first and third voices get stems up,
  second and fourth voices get stems down"; two independent pedagogy
  sites: "upper up, lower down — always").
- **`voiceRestOffset(voiceId)`** — feeds Phase 18's existing `restY(...,
  voiceOffset)`: odd voice shifts −1 (toward the top), even voice shifts
  +1 (toward the bottom), landing exactly 2 staff-spaces apart at the
  shared middle-line default rather than stacking.
- **`resolveNoteheadCollision(positionA, voiceIdA, positionB, voiceIdB,
  noteheadWidth)`** — the geometry (see §3 for its wiring status): within
  `1.0`sp (chosen slightly more generous than the `1` vertical staff
  position LilyPond/Clairnote's own collision engine actually uses as its
  bare threshold), the higher-numbered voice's notehead shifts right by
  one notehead-width.

**`src/render-from-musicxml.ts`** — wired the direction and rest pieces
into every rendering path:
- `renderNoteOrRest`, `renderChord`, and `renderBeamGroup` all gained a
  `forcedDirection: StemDirection | undefined` parameter. Each now calls
  Phase 16's own `resolveStemDirection` (or, for chords/beams,
  `forcedDirection ?? <the existing automatic calculation>`) **instead of**
  always computing automatic direction — reusing Phase 16's already-built
  priority chain rather than hand-rolling a new one.
- **Critical scoping decision:** `forcedDirection` is only ever set when
  `measure.voices.length > 1`. A single-voice measure keeps plain automatic
  (position-based) direction, exactly as before — forcing "voice 1 always
  up" onto a solo piano/vocal line would be wrong (real single-voice
  writing uses automatic direction; the "always up/down" rule is
  specifically a **multi-voice** convention, per every source consulted).
  Confirmed by a **byte-identical** snapshot: the existing single-voice
  fixture's rendered SVG is unchanged, character for character, after this
  phase's changes.
- `renderNoteOrRest` also gained a `restOffset` parameter, threaded through
  to Phase 18's `restY`.

## 2. How this was verified

Ran `npm run verify` clean, 226/226. Beyond the plan's own named test
cases for the geometry functions:
- **The single-voice snapshot is byte-identical** to Phase 21's original —
  proof this phase changes nothing for the common one-voice case.
- **A real 2-voice drum groove** (hi-hat in voice 1 as 8 beamed eighth
  notes, kick+snare in voice 2 as a quarter note + rest + eighth note, via
  `<backup>`) was rendered and every stem's actual SVG coordinates were
  parsed and checked: **every** voice-1 stem points up, **every** voice-2
  stem points down, confirmed by direct numeric comparison of the
  rendered `y1`/`y2` values (not just "some stems differ") — this is the
  literal reproduction of the reported bug, now fixed and pinned as a
  visual regression snapshot.
- A separate check on `two-voice-backup.musicxml` (whose voice 2 is a
  single whole note, so it has no stem to check) confirms voice 1's 4
  stems are all correctly forced up.

A real verification mistake was caught and fixed along the way (see the
commit): a manual sanity check comparing rendered `y1`/`y2` coordinates as
**strings** rather than numbers produced a false "still buggy" result due
to JavaScript's lexicographic string comparison (`"7.668" < "11.168"` is
`false` as strings, since `'7' > '1'` character-wise) — re-run with
`Number(...)` conversion confirmed the fix was actually correct.

## 3. Known limitation: notehead-collision offsetting is not yet wired

`resolveNoteheadCollision` exists and is tested in isolation, but
`renderFromMusicXml` does not yet call it. Wiring it in requires comparing
notes **across different voices** at matching tick positions, which needs
restructuring the current per-voice rendering loop into a two-pass shape
(compute every voice's event positions first, resolve cross-voice
collisions, *then* render) rather than the current single-pass-per-voice
structure. This was deliberately deferred rather than rushed under time
pressure — the same judgment call Phase 23 made deferring beam *drawing*
until Phase 24 existed to do it properly. The stem-direction fix (the bug
that was actually reported) does not depend on this and is complete now.

## 4. How to modify it

- **Change which voice gets which direction** — `voiceForcedDirection`'s
  single `% 2` check.
- **Change the rest-offset distance** — the `-1`/`1` values in
  `voiceRestOffset`.
- **Wire in notehead-collision offsetting** — the two-pass restructure
  described in §3; `resolveNoteheadCollision` itself needs no changes.

## 5. How to revert/remove it

Delete `src/geometry/voice.ts`, remove its `export * from` line from
`src/geometry/index.ts`, delete `test/unit/voice-multi.test.js`, revert
`render-from-musicxml.ts`'s `forcedDirection`/`restOffset` parameters back
to always-automatic, delete the two-voice-drum-groove fixture and its
snapshot, and remove the added test cases from
`render-from-musicxml.test.js` and `test/visual/rendering.test.js`.
