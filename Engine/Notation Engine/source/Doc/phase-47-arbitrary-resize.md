# Phase 47 — Arbitrary Width × Height Resize

**Status:** complete and directly usable today. 552/552 tests pass.
Unlike Phase 43-46, this module needs **no separate wiring pass**: it
operates on the *output* of `renderFromMusicXml` (a plain SVG string),
so a real caller can use `NotationEngine.resizePureScale(svg, w, h)`
today, on any SVG this engine already produces. Completes Stage 8
(Real layout).

## 0. Scope, per §16.3's own framing

`§16.3`'s requirement: `engine.resize(widthPx, heightPx)` must re-flow
to *any* size, not preset zoom steps, and *without re-parsing* the
source file. Per `§4.2`, the conversion from the internal staff-space
coordinate system to pixels happens in exactly one place -- the `<svg>`
element's own `width`/`height` versus its `viewBox`, controlled by one
number, `pxPerStaffSpace`. A **pure scale change** (aspect ratio and
content unchanged) is therefore an O(1) operation: only that one number
changes, and only the `<svg>` element's own `width`/`height` attributes
are rewritten, with no re-layout at all. A **re-flow** is only needed
when page mode's system breaking would actually change.

Checking what this means for the *current* renderer first: scroll mode
(`§16.1`, the only mode wired into `render-from-musicxml.ts`) is
defined as "one unbroken system, arbitrarily wide" -- **unconditionally**,
with no width-dependent breaking at all. So for every render this engine
currently produces, a resize is *always* the pure-scale case; the
re-flow path only becomes reachable once page mode (`§16.2`, Phase 46)
is itself wired into rendering.

## 1. What was built

**`layout/resize.ts`**:
- `extractViewBox` -- reads an existing rendered SVG's own `viewBox`
  dimensions (its natural size in staff-space units), independent of
  whatever pixel `width`/`height` it currently carries. Returns
  `undefined` for a malformed/non-SVG string rather than throwing.
- `computePxPerStaffSpace` -- the pure-scale computation itself: given
  the content's own `viewBox` and a target pixel box, computes the
  single scale factor that fits the content within that box while
  preserving its aspect ratio -- the same convention `object-fit:
  contain` uses (the smaller of the two per-axis scale factors, so
  neither dimension overflows).
- `resizePureScale` -- the O(1) fast path itself. Rewrites an *existing*
  rendered SVG string's own `width`/`height` attributes to a new target
  size, leaving the `viewBox` and every inner element completely
  untouched -- needing no access to the original `Score`, the parser, or
  any layout algorithm at all, which is exactly what makes it not need
  re-parsing.
- `needsReflow` -- the re-flow decision itself, for page mode's future
  integration: returns `true` only when the *usable* width has actually
  changed for `'page'` mode, and unconditionally `false` for `'scroll'`
  mode, matching `§16.1`'s own definition directly.

## 2. How this was verified

Ran `npm run verify` clean, **552/552** (13 new tests). Every one of
`§16.3`'s own named tests:
- **Same score at three sizes producing correct `width`/`height` vs.
  `viewBox` ratios** -- checked that the resulting pixel box's own aspect
  ratio matches the `viewBox`'s aspect ratio exactly, for three
  differently-shaped target sizes.
- **A pure-scale resize producing *identical* inner SVG** -- checked
  directly against a real rendered fixture: after stripping the outer
  `<svg ...>` tag, the resized document's inner content is
  string-identical to the original's, proving no re-layout occurred.
- **Resize after resize returning to the original producing
  byte-identical output** (`§4.4`'s own determinism requirement) --
  checked directly: resizing a real rendered SVG up to a large size and
  then back down to its *exact* original pixel dimensions produces a
  result string-identical to the untouched original.
- **A width change that forces different system breaking** -- covered at
  the algorithm level via `needsReflow`: confirmed `'page'` mode
  correctly detects a genuine usable-width change, and confirmed
  `'scroll'` mode never does, regardless of how large the change is
  (matching `§16.1`'s own unconditional definition).
- **The 16ms performance requirement** (`§18`) -- checked directly: a
  synthetic large document (200x a real fixture's own content repeated)
  resized in well under 16ms, confirming the fast path's own O(1)
  design holds in practice, not just in theory.

## 3. Known limitations (stated, not silently missing)

- **No literal `engine.resize(widthPx, heightPx): void` stateful API.**
  `§16.3`'s own pseudocode describes a stateful engine object; this
  engine's actual public surface is the stateless
  `renderFromMusicXml(xmlText, options)` function, with no cached
  `Score` for a later call to reuse. `resizePureScale` works around
  this by operating on the *already-rendered SVG string* directly
  (which is sufficient for the pure-scale case, since it needs no
  access to the `Score` at all) -- but the re-flow path genuinely does
  need the original parsed data, which nothing currently caches.
- **`needsReflow`'s `'page'` branch is unreachable in practice.** Page
  mode itself isn't wired into `renderFromMusicXml` (Phase 46's own
  stated limitation) -- this function's page-mode logic is built and
  tested on its own terms, but there's no live caller that could
  actually trigger a page-mode re-flow yet.

## 4. How to modify it

- **A real re-flow path for page mode** -- once page mode is wired
  (Phase 46 §4's own "how to modify it"), a caller detecting
  `needsReflow(...) === true` would re-run `computePageLayout` from a
  *cached* parsed `Score`/`attributes` rather than the raw XML text --
  which is exactly why a stateful wrapper retaining that cache becomes
  worth building at that point, not before.
- **A literal stateful `engine` object** -- if/when a caller genuinely
  needs `engine.resize(w, h): void` as its own method (rather than a
  free function taking an SVG string), wrap `renderFromMusicXml`'s
  result together with the parsed `Score`/`attributes` in a small
  class exposing `resize()`, dispatching to `resizePureScale` or a real
  re-flow based on `needsReflow`.

## 5. How to revert

Delete `src/layout/resize.ts`, remove its `export * from` line from
`src/layout/index.ts`, and delete `test/unit/resize.test.js`.
