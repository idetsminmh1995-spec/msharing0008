# Phase 8 — Testing Harness

**Status:** complete and verified (35/35 tests pass; the snapshot
mechanism's own failure-detection was deliberately verified by corrupting
a snapshot and confirming the test actually fails -- see §3).

## 1. What was written

**Runner:** Node's built-in `node --test` (no extra dependency). Test
files are plain ESM `.js` (not TypeScript) -- see §2 for why.

**`test/helpers/load-engine.js`** — `loadEngine()`: loads the *built*
`dist/notation-engine.js` bundle into a fresh `vm` sandbox per call and
returns the `NotationEngine` global. Every test file calls this once at
the top. This is the exact same technique every manual smoke test since
Phase 3 already used, now formalized into reusable test infrastructure.

**`test/helpers/snapshot.js`** — `matchSnapshot(name, actual, snapshotDir)`:
compares a string against a golden file at `<snapshotDir>/<name>.snap`.
Creates the file (instead of failing) if it doesn't exist yet, or if
`UPDATE_SNAPSHOTS=1` is set -- standard snapshot-testing convention.

**`test/unit/*.test.js`** — formalized versions of every manual smoke test
from Phases 3–7, now real `node:test` assertions instead of `console.log`
output a human had to eyeball:
- `core.test.js` (Phase 3): piano-vs-drum note via the same factory,
  chord validation (both success and both rejection paths), Part's lack of
  an instrument-specific field.
- `duration-math.test.js` (Phase 4): base ticks, dotted-note expansion,
  tuplet ratios, the ticks↔(type,dots) round trip (including the
  null-for-no-match case), divisions normalization, tied-note summing.
- `glyphs.test.js` (Phase 5): real codepoints (`gClef`, `noteheadBlack`,
  `noteheadXBlack`), real Bravura anchors/engraving defaults, graceful
  `undefined` for unknown names/keys.
- `svg-primitives.test.js` (Phase 6): the scale-factor math, the SMuFL
  font-size convention, a real glyph surviving into rendered markup
  uncorrupted, and both XML-escaping cases (text content, attribute
  value).
- `config.test.js` (Phase 7): all 5 `resolveConfig` merge scenarios.

**`test/visual/rendering.test.js`** — the actual "headless SVG render →
DOM/string snapshot compare" PLAN.md Phase 8 asked test/visual to
provide: builds the same small staff+clef+notehead+stem SVG as Phase 6's
manual demo, and snapshot-compares the resulting markup string against
`test/visual/__snapshots__/basic-staff-clef-notehead.snap`.

**`package.json`** scripts updated:
- `test`: `npm run build && node --test` (relies on Node's default
  recursive test-file discovery from the project root -- see §2 for why
  explicit path arguments don't work in this Node version).
- `test:update-snapshots`: same, with `UPDATE_SNAPSHOTS=1` set.
- `verify`: now ends in `npm run test` instead of `npm run build` directly
  -- `test` already runs `build` first, so `verify` still builds, and now
  also runs the whole test suite as part of what "verified" means.

## 2. Two things that didn't work on the first try (kept here so they
don't get re-discovered the hard way)

- **`node --test test/unit test/visual` (explicit directory arguments)
  doesn't work on this Node version (22.22.2)** -- it tries to `require()`
  the directory path itself rather than discovering `*.test.js` files
  inside it, and fails with `MODULE_NOT_FOUND`. Plain `node --test` with
  **no** path arguments works correctly, recursively auto-discovering
  every `*.test.js` file under the project root. Both `test` and
  `test:update-snapshots` use the no-arguments form for this reason (the
  update-snapshots variant relying on unit tests being harmless no-ops
  with `UPDATE_SNAPSHOTS=1` set, since they never call `matchSnapshot`).
- **`assert.deepEqual`/`deepStrictEqual` across the vm sandbox boundary
  fails even when the two objects have identical own properties.** An
  object returned from `loadEngine()`'s sandbox has a *different*
  `Object.prototype` than an object literal written directly in a test
  file (different vm "realm"), and Node's strict deep-equality check
  considers that a mismatch ("same structure but are not
  reference-equal"). Fixed by comparing such results field-by-field with
  `assert.equal` instead (see `duration-math.test.js`'s
  `durationTypeAndDotsFromTicks` test) -- this is only needed when
  comparing a sandboxed object against a literal written in the test
  file; comparing two sandboxed objects to each other (e.g.
  `config.test.js`'s `resolveConfig()` vs `DEFAULT_CONFIG`, both from the
  same `loadEngine()` call) is unaffected, since they share the same
  realm's prototype.

## 3. How this was verified

`npm run verify` runs clean: typecheck → lint → format:check → (build +
all 35 tests), 35 pass / 0 fail.

Specifically checked the snapshot mechanism isn't a rubber stamp:
appended a corrupting line to the saved `.snap` file, re-ran just the
visual test, confirmed it correctly failed with a "Snapshot mismatch"
error naming the file -- then restored the original snapshot and
confirmed it passed again. This proves `matchSnapshot` actually compares
rather than always overwriting-and-passing.

## 4. How to modify it

- **Add a new unit test** — new `test/unit/<name>.test.js` file, import
  `loadEngine` the same way the existing ones do; `node --test`'s default
  discovery picks it up automatically, no config change needed.
- **Add a new visual/snapshot test** — same pattern in `test/visual/`,
  using `matchSnapshot`; run `npm run test:update-snapshots` once to
  create its initial golden file, then commit that `.snap` file alongside
  the test.
- **Accept an intentional rendering change** — `npm run
  test:update-snapshots`, review the diff in the updated `.snap` file(s)
  like any other code change, commit both together.

## 5. How to revert/remove it

Delete `test/helpers/`, `test/unit/`, and `test/visual/__snapshots__/`
plus `test/visual/rendering.test.js` (keep `test/visual/README.md` and
`test/fixtures/README.md` if you want the folders to persist as empty
placeholders per Phase 1). Revert `package.json`'s `test`/
`test:update-snapshots` scripts and change `verify`'s last step back to
`npm run build`.
