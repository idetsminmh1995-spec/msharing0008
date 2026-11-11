# Phase 54 — Public API surface + generated reference docs (§22)

**Status:** complete. `npm run verify` clean (796/796 tests, 10 new).
**This is the last phase of the roadmap: Stages 0–10 are now complete.**

## 0. Scope

§22's line for Phase 54 is "Public API surface + generated reference docs
into `docs/`". Three open items in `Doc/STATUS.md` belonged here too, and
are closed:

- **§C1's tenor half** — tenor-clef key signatures, which used to throw.
- **§F4** — no browser-level visual test in the automated suite.
- **§F5** — `quick-demo/`, dead code since the rewiring.

## 1. The public API surface

The bundle has exactly one global, `NotationEngine`, carrying everything
the engine exports (243 runtime symbols; 479 including types). That is
deliberate — a single IIFE global is what a plain `<script>` tag can
use — but it means "exported" and "supported" are not the same thing, and
nothing said which was which.

So the surface is now **stated** rather than implied, in two tiers:

- **Supported entry points**, listed first in `docs/API.md` and grouped by
  what a host is actually doing: rendering, configuration, playback and
  cursor, resize, export, debug. 30 symbols. This is the contract.
- **Everything else** — the geometry, layout, glyph and render building
  blocks the engine uses on itself. Exported, documented, unit-tested,
  usable; not covered by a stability promise, because they exist to serve
  the renderer and will follow it.

The list lives in `scripts/generate-api-docs.mjs`, and **the generator
throws if an entry point is no longer exported** — so renaming one
without updating the list fails the build rather than quietly producing a
reference with a hole in it.

## 2. The reference is generated, and cannot drift

`scripts/generate-api-docs.mjs` reads the `.d.ts` files `tsc` emits — not
the `.ts` source, because the declarations are exactly what a consumer
sees, with everything unexported already gone — and writes `docs/API.md`:
each supported entry point with its real signature and the first sentence
of its doc comment, then a full per-module index of all 479 symbols.

```
npm run docs         # regenerate
npm run docs:check   # fails if API.md differs from the code
```

`docs:check` is part of `npm run verify`. A hand-written API reference is
wrong the first time someone renames a parameter and doesn't notice; this
one turns that into a red build.

**Not TypeDoc or api-extractor.** This repo has one runtime dependency
(`fflate`) and four dev tools, by §2's design. A ~200-line generator that
emits exactly the two sections wanted is a better trade than a dependency
that emits a hundred HTML files nobody opens. It parses `.d.ts` with
regexes, which is defensible precisely here: a declaration file is a
small, regular, tsc-formatted subset where every export is one top-level
statement.

## 3. Tenor-clef key signatures (closes §C1's tenor half)

`keySignatureAccidentals()` threw for tenor clef, so a real cello,
bassoon or trombone part in tenor clef rendered **everything except its
key signature** (the renderer caught the throw and emitted an
`UNSUPPORTED_KEY_SIGNATURE_CLEF` warning). Phase 11 left it open rather
than guess, which was right — the sources agree tenor is a genuine
exception, not a shifted copy of treble the way alto is.

### Why tenor is different

Tenor puts middle C on the **fourth** line, so its staff runs D3 (bottom
line) to E4 (top line). The highest F that fits on that staff is **F3**,
far lower relative to the staff than treble's F5 (top line) or alto's F4
(fourth space). Shifting treble's shape down would run the signature off
the bottom; starting high at F4 would put G♯ two spaces clear of the
staff. So tenor's sharps **ascend** from F3 and alternate perfectly (up a
5th, down a 4th, six times) — which lands all seven on the staff with no
octave break:

```
F#=F3(-1)  C#=C4(-3)  G#=G3(-1.5)  D#=D4(-3.5)  A#=A3(-2)  E#=E4(-4)  B#=B3(-2.5)
Bb=B3(-2.5) Eb=E4(-4) Ab=A3(-2)    Db=D4(-3.5)  Gb=G3(-1.5) Cb=C4(-3) Fb=F3(-1)
```

### How it was checked

The construction used — *start on the staff-nearest F (sharps) or B
(flats), then alternate by 4ths and 5ths, keeping every accidental on the
staff* — was first run against the three tables Phase 11 **had**
independently verified. It reproduces all six of their rows exactly:
treble's, bass's and alto's, sharps and flats. A method that regenerates
every already-verified answer is what makes its answer for the remaining
clef trustworthy.

It also agrees with the qualitative description Phase 11 recorded from
its sources and could not turn into numbers — *"sharps ascend instead of
descending first, no octave break"* — which the test suite now asserts as
a property, not just as seven numbers: tenor's second sharp is higher on
the page where treble/bass/alto's is lower, tenor's directions alternate
perfectly where treble's carry the octave break, and nothing leaves the
staff.

### Soprano is still open, deliberately

No source consulted describes soprano's key-signature shape, and the
construction is **ambiguous** for it: soprano puts C4 on the bottom line,
so both "down a 4th" and "up a 5th" from its first sharp stay on the
staff, and nothing available decides which the convention takes. Soprano
clef is effectively extinct outside historical vocal scores. Guessing
seven positions to close a checkbox would be worse than the named error,
which degrades to "everything renders except that one signature". §C1
stays open for soprano alone.

## 4. A browser-level visual test (closes §F4)

§F4 named the hole exactly: *"A markup-only suite structurally cannot
catch 'the glyphs are correct but nothing can draw them.'"* That is not
hypothetical — it is Integration M, where the deployed site served no
Bravura, every glyph rendered as an empty box, and all 600-odd markup
tests stayed green. Since then a real headless Chromium has been driven
**by hand** before calling a rendering change done. `test/visual/browser.test.js`
makes it permanent.

It screenshots real renders in Chromium, decodes the PNG with nothing but
`zlib`, and asserts four things:

1. A rendered score **puts ink on the page** — more than a trace, less
   than half (which would mean something filled it).
2. The ink is **where the music is**: in a window twice as tall as the
   SVG, the lower half must be exactly blank. This catches "it drew, but
   at the wrong scale or offset", which markup cannot see at all.
3. Rendering with Bravura differs from rendering with a font that cannot
   exist — so the font is genuinely resolving, which is Integration M's
   own bug as an assertion.
4. A page-mode render fills its pages.

**What it deliberately does not do** is snapshot pixels. A pixel snapshot
fails on every font-hinting and antialiasing difference between machines,
and teaches everyone to regenerate it without looking — worse than no
test. These assertions are coarse on purpose, and coarse is enough to
catch the class of bug that motivated them.

It **skips** rather than fails where no Chromium is installed
(`CHROMIUM_PATH` overrides the search), so the suite still runs anywhere
with nothing but `npm install`.

One thing it caught immediately, in its own decoder: Chromium screenshots
an opaque page and writes **colour type 2** (RGB, 3 bytes per pixel),
not the RGBA this engine's own encoder emits. Reading it as RGBA reports
a page that is 99% black.

## 5. `quick-demo/` deleted (closes §F5)

Referenced by nothing since the rewiring, and the last thing in the tree
still describing itself as "the notation renderer" to a casual reader.
Removed, along with its `eslint.config.js` ignore entry.

## 6. Tests

- `test/unit/key-signature.test.js` gains 6 tenor tests (§3).
- `test/visual/browser.test.js` is new: 4 tests (§4).
- The generator's own entry-point check is enforced by `npm run
  docs:check` inside `npm run verify`.

## 7. How to revert

Delete `scripts/generate-api-docs.mjs`, `docs/API.md`, the `docs` and
`docs:check` npm scripts (and `docs:check` from `verify`), and
`test/visual/browser.test.js`. Restore tenor by removing `TENOR_POSITIONS`
and its entry in `CLEF_KEY_SIGNATURE_POSITIONS` — but that re-opens a real
gap on real repertoire, so it should not be done without a reason.
