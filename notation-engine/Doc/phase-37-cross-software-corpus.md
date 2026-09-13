# Phase 37 — Cross-Software Compatibility Corpus and Fixes

**Status:** all seven documented divergences from `§10.8`'s own bullet
list are covered by real fixtures and tests. One real parser bug found
and fixed. 329/329 tests pass.

## 0. An honest scope limitation, stated up front

`§10.8`'s own test requirement calls for real exports of the same short
piece from MuseScore, Sibelius, Finale, Dorico, and Guitar Pro, plus a
DAW. **This environment has no access to run any of those programs.**
Rather than skip the requirement or quietly pretend synthetic files were
literal exports, this phase does the next most honest thing: it builds
fixtures that model each **specific, individually documented** divergence
`§10.8` itself lists (not generic "different XML shapes," but the exact
named behaviors), verified against real interoperability discussions
(the MusicXML W3C community group's own GitHub issues/discussions, which
document real divergences observed across real software) rather than
invented from guesswork. This satisfies the requirement's actual
*purpose* — "any of them rendering incorrectly is a bug in our parser,
never that program's fault" — even though it cannot literally claim to be
five named programs' output. If genuine exports from these programs ever
become available, they should replace or supplement these fixtures
directly; nothing about this phase's approach should be mistaken for
having tested against the real applications.

## 1. A real bug found and fixed: `<tied>`-only ties were silently dropped

Verified via a real MusicXML interoperability discussion (a W3C
`musicxml` GitHub issue specifically about `<tie>`/`<tied>` divergence)
that not every real exporter reliably emits both the sound-level `<tie>`
and notation-level `<tied>` elements together, even though the spec's own
recommended practice is to emit both. This engine's parser (since Phase
20) only ever read `<tie>` — a file expressing a tie via `<tied>` alone
(under `<notations>`) would have had that tie **silently dropped**, with
no warning at all.

**Fix**: `note.ts` now reads both, treating either one's `start`/`stop`
presence as sufficient. Confirmed the fix directly: a `<tied>`-only
fixture now produces `tieStart`/`tieStop` on the parsed `Note`, and — the
stronger test — a `<tie>`-only file, a `<tied>`-only file, and a file
with both together all now render **byte-identical** SVG output, proving
the three encodings are treated as truly equivalent rather than merely
"not crashing."

## 2. A real bug in this phase's own fixture files, caught before it mattered

While building the fixtures, several failed to parse at all — jsdom's
`DOMParser` returned a `<parsererror>` root instead of the real one.
Traced to this phase's own explanatory XML **comments**, several of
which contained a literal `--` (used as a stylistic em-dash, a habit
used throughout this whole project's prose) — which XML forbids
*anywhere inside a comment's content*, not just as its opening/closing
delimiters. Fixed by replacing every embedded `--` inside a comment with
a proper em-dash character, and confirmed via a scan that none remain.
Worth recording since it's a mistake that specific writing habit could
easily reproduce again in a future fixture's comment.

## 3. What was written

**`test/fixtures/cross-software/`** — nine fixtures, each isolating one
divergence from `§10.8`'s list:
- `tie-only.musicxml` / `tied-only.musicxml` / `tie-and-tied.musicxml` —
  the three tie-encoding styles (§1 above).
- `divisions-changed-mid-piece.musicxml` — `<divisions>` re-declared
  with a different value partway through a piece.
- `divisions-per-part.musicxml` — two parts independently declaring
  *different* divisions values.
- `explicit-beam-hints.musicxml` — a file supplying its own `<beam>`
  hints (this engine still always computes its own grouping, per Phase
  35's stated Tier 2/3 scope — this fixture confirms the presence of
  real beam data is at least harmless, not that it's consulted).
- `attributes-mid-measure.musicxml` — a clef change partway through a
  bar, not only at a measure's start.
- `percussion-no-display-step.musicxml` — an `<unpitched>` note omitting
  `<display-step>`/`<display-octave>` entirely.
- `print-breaks.musicxml` — `<print new-system="yes">`/`<print
  new-page="yes">` layout hints.

**`test/unit/cross-software-corpus.test.js`** — one test per divergence,
checking the *specific* expected behavior (not just "didn't throw") —
byte-identical tie rendering across all three encodings, correct tick
values for both divisions-divergence cases, the documented percussion
fallback's exact values, and confirming `<print>`/`<beam>` produce no
error-level diagnostics.

**`src/parser/musicxml/note.ts`** — the `<tied>` fix (§1).

## 4. How this was verified

Ran `npm run verify` clean, 329/329 (9 new tests). Every fixture
confirmed to render without throwing; the three tie encodings confirmed
byte-identical, not merely all non-crashing; both divisions-divergence
fixtures' actual tick values checked (1920 in every case — one whole
note — regardless of which divisions value produced it); the percussion
fallback's exact recovered values (`displayStep: 'B'`, `displayOctave:
4`) checked directly, not just that *some* diagnostic fired; `<print>`
and `<beam>` confirmed to produce no error/warning-level diagnostics
(only permitted info-level ones).

## 5. Known limitations (stated, not silently missing)

- **Not literal exports from the named programs** — see §0.
- **Explicit `<beam>` hints are still not consulted**, only tolerated —
  the same Tier 2/3 gap Phase 35 already documented.
- **Only single-issue fixtures**, not a single large multi-divergence
  file combining several at once (as a genuine cross-program export of
  "the same short piece" would). A future pass with real program exports
  should aim for that instead.

## 6. How to modify it

- **Add a genuine program export**, if one becomes available — drop it
  into `test/fixtures/cross-software/` alongside these, and add a test
  confirming it renders correctly; if it reveals a NEW divergence not
  already in `§10.8`'s list, add that to the plan section too, matching
  the discipline every other phase in this project has followed.
- **Wire explicit `<beam>` consultation** — would need `groupBeams`
  (or a new step ahead of it) to prefer file-supplied beam boundaries
  over its own computed grouping when present.

## 7. How to revert/remove it

Delete `test/fixtures/cross-software/` and
`test/unit/cross-software-corpus.test.js`; revert `note.ts`'s `<tied>`
reading back to `<tie>`-only (though this would reintroduce the real bug
§1 describes, not recommended).
