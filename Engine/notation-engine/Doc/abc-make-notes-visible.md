# A+B+C — Making Notes Actually Visible in the Web App

**Status:** complete (213/213 tests pass; a real drum MusicXML now renders
noteheads through the exact browser code path).

This is **not a numbered phase** — it's a corrective work item raised when
the web app was observed still showing bare staff lines and the message
"Phase 9 only, notes not implemented yet," long after Phases 20–24 had
built a working renderer. Investigation found **four independent
blockers**, three of which were deliberate-but-forgotten scope decisions
rather than bugs.

## The four blockers

| # | Blocker | Why it existed |
|---|---|---|
| 1 | The web app still loaded `quick-demo/staff.js` and called `renderStaffAsStandaloneSVG` | Wired in at Phase 9 as a proof-of-concept and **never rewired** once the real engine existed. Phase 21's doc noted the engine wasn't wired in, but nothing ever closed that loop. |
| 2 | `dist/` was gitignored | Normal for a library, **wrong** here: the app is served as static files from GitHub Pages, which has no build step, so the browser could never fetch a bundle that isn't in the repo. |
| 3 | `<unpitched>` (percussion) notes were skipped entirely | A documented Phase 20 v1 scope decision (percussion deferred to Phase 35). Correct in isolation — but it meant the user's **drum** file could never show a single note, no matter what else was fixed. |
| 4 | No Bravura font was loaded in the browser | Found while fixing #2. The engine emits `font-family="Bravura"`; with no `@font-face`, every notehead/clef/rest/accidental would render as a **blank box** even with everything else working. Nothing had caught this because all testing was headless, where fonts are irrelevant. |

Blocker #4 is worth noting specifically: the headless snapshot tests
(Phase 8's harness) assert on SVG *markup*, which was completely correct
the whole time. A test suite that only ever checks markup can't detect a
missing font — the glyphs are right, they just have nothing to draw with.

## C — Percussion support (pulled forward from Phase 35)

**`src/parser/musicxml/note.ts`** — `<unpitched>` is now parsed rather
than flagged unsupported. Its `<display-step>`/`<display-octave>` become
`step`/`octave` on the parsed event with a new `isUnpitched: true` flag,
plus `instrumentId` from `<instrument id="...">` (how a drum file
distinguishes kick from snare from hi-hat; mapping that id to a notehead
*shape* is left to Phase 15's existing mapping system, not hardcoded
here). The same recovery rules as a pitched note apply, so a malformed
drum file degrades identically to a malformed pitched one.
`UNSUPPORTED_NOTE` now means only "neither `<pitch>`, `<unpitched>`, nor
`<rest>`."

**`src/parser/musicxml/parse.ts`** — `buildSingle` constructs an
`unpitchedPitch(...)` for those notes. Percussion and pitched notes use
the **same `Note` type**, differing only in which kind of `Pitch` they
carry — exactly the §4.3 invariant Phase 3 established. No `isDrum` flag
was added anywhere.

**`src/render-from-musicxml.ts`** — the three places that bailed out on
unpitched notes now handle them: an unpitched note's display-step/octave
goes through the *same* `staffPositionForPitch` (it **is** a staff
position), while the accidental branch is skipped entirely for unpitched
notes rather than special-cased inside it — an unpitched note has no
pitch to alter, so there is nothing an accidental could mean. Chord
members may now be pitched or unpitched (a drum chart legitimately writes
kick+hi-hat as a simultaneous group).

## A — Committing the built bundle

Root `.gitignore` keeps its blanket `dist/` rule but now has explicit
negation exceptions for `notation-engine/dist/notation-engine.js`,
`index.d.ts`, and `dist/fonts/**`, with `dist/*.map` still ignored (the
sourcemap is 2× the bundle's own size and only helps local debugging,
where `npm run build` regenerates it anyway). Both `.gitignore` files
carry a comment explaining *why*, so this doesn't look like an oversight
to a future reader.

`dist/fonts/Bravura.woff2` (306 KB) was downloaded from the same source
and tag as the metadata the engine already uses
(`steinbergmedia/bravura`, `bravura-1.380`), with
`dist/fonts/LICENSE.md` recording the SIL OFL attribution and the reason
it's committed rather than fetched at build time.

## B — Web app wiring

`web-preview/canvas-preview.html`:
- Loads `../notation-engine/dist/notation-engine.js` instead of the
  quick-demo.
- Adds the `@font-face` rule for Bravura (blocker #4).
- The upload handler now calls `NotationEngine.renderFromMusicXml(xmlText)`
  — **without** a `domParser` option, because in a browser the engine
  picks up the native `DOMParser` automatically; that option exists only
  for Node/tests.
- **Surfaces diagnostics** instead of discarding them: any
  error/warning-severity diagnostic is reported in the status line (with
  codes) and logged to the console, while info-level ones are logged but
  don't turn the status red. Previously the app had no way to tell the
  user *why* something didn't render.

`quick-demo/` is now referenced by nothing and can be deleted whenever
convenient (kept for now — deleting it is unrelated cleanup, not part of
fixing this).

## How this was verified

- `npm run verify` clean, 213/213.
- **The specific regression this work targets**: a drum MusicXML with two
  `<unpitched>` notes rendered **0** noteheads before and **2** after,
  with zero diagnostics and the percussion clef present.
- **The actual browser code path was simulated**, not just the test-only
  one: loaded `dist/notation-engine.js` via `vm.runInThisContext` (as a
  `<script>` tag would), set a native `DOMParser` global, and called
  `NotationEngine.renderFromMusicXml(xmlText)` with **no** options —
  exactly the app's call — then confirmed the noteheads landed in the
  DOM.
- Both browser-relative URLs (`../notation-engine/dist/notation-engine.js`
  and `.../dist/fonts/Bravura.woff2`) confirmed to resolve to real files.
- `git check-ignore` confirmed the bundle, types, and font are now
  tracked while the sourcemap stays ignored.
- The app's inline JS re-checked with `node --check`.

One existing test changed meaning and was updated rather than deleted:
Phase 20's "an `<unpitched>` note is skipped with UNSUPPORTED_NOTE" now
asserts the opposite — that it parses into a real unpitched `Note` with
the correct display-step/octave.

## What is still NOT done (tracked in STATUS.md §F)

This work makes drum notes *appear*. It does not make them *correct* as
drum notation — notehead shapes still come from the duration-based
default, so a hi-hat renders as a round notehead rather than an ✕. That
and the rest of real percussion support remain Phase 35's job; see
`Doc/STATUS.md` §F for the full list raised by this work.
