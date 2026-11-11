# Phase 38 — Diagnostics and Partial-Render Hardening

**Status:** completes Stage 6. Found and fixed **two real crash bugs**
this pass was specifically designed to catch, plus a real test-coverage
gap the new hardening check caught immediately. 339/339 tests pass.

## 0. What "hardening" meant for this phase

`§10.7` was already marked `[BUILT for v1's element set]` from Phase 20.
This phase's job was to extend that same discipline — "never throws,
always recovers with a Diagnostic" — to everything added since (Phases
21-37), and to stress-test the whole pipeline with genuinely adversarial
input rather than only well-formed-but-unusual files (which Phase 37's
corpus already covered). This turned out to matter immediately: two real
crash paths were found this way, not hypothetically.

## 1. Real bug: `unzipMxl` violated `§10.7`'s own philosophy

Phase 36's `unzipMxl` **threw real exceptions** for malformed `.mxl`
archives — a genuine inconsistency with every other entry point in this
codebase, which all commit to recovering from malformed input via a
`Diagnostic` rather than an exception. There was no principled reason a
`.mxl` archive should be held to a different standard than a malformed
`.musicxml` file already is.

**Fix:** `unzipMxl` now returns `{ xmlText: string | undefined,
diagnostics: Diagnostic[] }` instead of a bare string, with `xmlText`
left `undefined` on failure. Four stable codes cover the real failure
modes: `MXL_INVALID_ARCHIVE` (fflate's own `unzipSync` throwing on
genuinely non-ZIP bytes — also newly caught, since the *library's* throw
path had never been guarded either), `MXL_MISSING_CONTAINER`,
`MXL_MISSING_ROOTFILE_POINTER`, and `MXL_MISSING_SCORE_FILE`. Updated
both call sites: the test suite and `web-preview/canvas-preview.html`'s
upload handler, which now surfaces the diagnostic messages the same way
any other unrenderable input already is, rather than relying on a
`try`/`catch` around a thrown error.

## 2. Real bug: `<divisions>0</divisions>` crashed the whole render

`xmlDivisionsToTicks` (Phase 4's own core duration math) throws for any
non-positive `divisions` value — a deliberate, correct contract for that
function's *internal* callers, all of which pass only already-validated
values. But `note.ts` passed a file's raw, **untrusted** `<divisions>`
value straight into it. A file with `<divisions>0</divisions>` (whether
genuinely malformed or adversarial) would crash the entire
`renderFromMusicXml` call — the exact class of bug this phase exists to
find.

**Fix:** validated at the boundary where untrusted file data meets that
strict internal contract, not by weakening the contract itself — its
other, already-validated callers elsewhere in the codebase should keep
failing loudly if *they* misuse it. `note.ts` now checks
`currentDivisions` before use; a non-positive value falls back to `1`
and emits a new `INVALID_DIVISIONS` warning, exactly the same recovery
shape as the neighboring `MISSING_DIVISIONS`/`MISSING_DURATION` codes.

## 3. A real test-coverage gap the new hardening check caught immediately

Phase 20's original self-check (`musicxml-parser.test.js`) verified a
**hand-maintained list** of diagnostic codes was covered — meaning it
could never catch a *new* code shipping without a test, since the list
itself had to be remembered and updated by hand. This phase replaced it
with a **dynamic** version (`test/unit/diagnostics-hardening.test.js`)
that scans the actual parser source for every `diagnostic(...)` call's
code, and checks that each one is asserted **somewhere across the
entire test suite** — not just one file's list.

This immediately proved its worth: on first run, it flagged
`MXL_MISSING_ROOTFILE_POINTER` as having **zero test coverage anywhere**
— a real gap introduced during this phase's own `mxl-timewise.test.js`
rewrite (the old "container.xml has no rootfile" test was replaced by a
new one for a *different* failure mode, and a replacement for the
original case was never added back). Caught and fixed in the same pass,
by the very mechanism built to catch exactly this. The old
hand-maintained list in `musicxml-parser.test.js` was removed once the
dynamic version subsumed it — keeping one mechanism for this concern
rather than two that could silently diverge.

## 4. What was written

- **`src/parser/musicxml/mxl.ts`** — `UnzipMxlResult`, the non-throwing
  return shape (§1).
- **`src/parser/musicxml/note.ts`** — the `INVALID_DIVISIONS` recovery
  guard (§2).
- **`test/unit/diagnostics-hardening.test.js`** (new) — the dynamic
  code-discovery/coverage check (§3), plus eight adversarial-input
  tests: a completely empty string, non-XML garbage text, a part with
  zero measures, a negative duration, an absurdly large duration
  (999999999), zero divisions, pitch data missing both step and octave,
  and confirming a totally empty `Score` still renders a well-formed
  (if content-free) SVG string.
- **`test/unit/mxl-timewise.test.js`** — updated for `unzipMxl`'s new
  return shape, plus the restored `MXL_MISSING_ROOTFILE_POINTER` test
  and a new genuinely-non-ZIP-bytes test.
- **`web-preview/canvas-preview.html`** — upload handler updated for
  `unzipMxl`'s new shape.

## 5. How this was verified

Ran `npm run verify` clean, 339/339. Every fix confirmed by a test that
would have failed before it: `INVALID_DIVISIONS` checked via
`assert.doesNotThrow` on a `<divisions>0</divisions>` file *and* the
exact code asserted; `unzipMxl`'s four failure modes each confirmed to
leave `xmlText` undefined with the right code, including genuinely
non-ZIP garbage bytes (`fflate`'s own throw path); the dynamic coverage
check run against the real, current parser source (not a frozen
snapshot of it), so it keeps catching this class of gap for any future
diagnostic code too.

## 6. Known limitations (stated, not silently missing)

- **`INVALID_DIVISIONS` can fire once per affected note**, not once per
  bad `<divisions>` declaration — since the check happens per-note
  (where the value is actually used) rather than once where
  `<attributes>` is originally read (which doesn't currently have a
  diagnostics channel of its own). Noisy on a badly-behaved file with
  many notes under one bad declaration, but never wrong, and never a
  crash — a real, minor refinement for later rather than a correctness
  issue.
- **`convertTimewiseToPartwise`'s defensive `ownerDocument === null`
  check was left throwing**, not converted to a diagnostic — verified
  it is genuinely unreachable from any real file input (a parsed
  document's own root element always has that document as its
  `ownerDocument`, a DOM invariant, not something malformed XML content
  could violate); it protects against programmatic misuse of the
  exported function, not malformed input, so `§10.7`'s "never throws on
  malformed input" doesn't apply to it.

## 7. How to modify it

- **Move `INVALID_DIVISIONS` to fire once per declaration** — would need
  `parseAttributesElement` to gain its own diagnostics channel (it
  currently returns only `AttributesUpdate`), then a validation step in
  `parse.ts`'s measure-processing loop right after applying an
  `<attributes>` update, before any note in that scope is parsed.
- **Extend the dynamic coverage check further** — it currently only
  scans `src/parser/musicxml/*.ts`; if diagnostic-emitting code is ever
  added elsewhere, widen `SRC_DIR` (or generalize it to a list of
  directories) in `diagnostics-hardening.test.js`.

## 8. How to revert/remove it

Revert `mxl.ts`'s `unzipMxl` to its throwing form (not recommended — see
§1), revert `note.ts`'s `INVALID_DIVISIONS` guard, delete
`test/unit/diagnostics-hardening.test.js`, and restore the old
hand-maintained `EMITTED_CODES` list in `musicxml-parser.test.js` if the
dynamic version is removed (though the dynamic version is strictly more
robust and removing it is not recommended either).
