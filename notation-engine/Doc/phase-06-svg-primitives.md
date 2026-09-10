# Phase 6 — SVG Primitives Layer

**Status:** complete and verified (`npm run verify` clean, plus a real
rendered SVG combining Phase 5's actual glyph data with these primitives,
and a separate XML-escaping safety test — see §3).

## 1. What was written

**File:** `src/render/svg-primitives.ts`

- **Coordinate convention (the key design decision):** every primitive
  takes coordinates in **staff-space units** (1 unit = the distance
  between two adjacent staff lines), never raw pixels. This is what lets
  Phase 5's engraving-default metrics (already expressed in staff spaces,
  per the SMuFL spec) plug straight into these primitives with zero
  conversion, and what makes Phase 44's arbitrary-resize requirement just
  a single-number change (see `createSvgDocument`) rather than rewriting
  coordinates everywhere.
- **`SMUFL_STAFF_SPACES_PER_EM = 4`** — per the SMuFL spec's own scoring-
  application convention ("one staff space = 0.25 em"), confirmed against
  the actual spec page
  (`w3c.github.io/smufl/latest/specification/scoring-metrics-glyph-registration.html`)
  before writing this. Used by `svgGlyphText` so a glyph drawn "at size 1
  staff space" actually comes out that size, not a guessed value.
- **`escapeXmlText` / escapeXmlAttribute` (internal)** — proper XML
  escaping (`&`, `<`, `>` in text content; those plus `"` in attribute
  values). Every primitive that takes user-facing text (lyrics, tempo
  markings, measure numbers -- anything that isn't a hardcoded SMuFL
  glyph character) routes through this, so malformed or malicious input
  text can't break out of its element or inject markup.
- **`svgLine`, `svgPath`, `svgRect`, `svgText`, `svgGroup`** — thin wrappers
  around the five element types, each returning a markup string.
  (`svgRect` wasn't one of Phase 6's originally-named four (`path`/`text`/
  `g`/`line`) but was trivial to add alongside them and is broadly
  useful.)
- **`svgGlyphText(x, y, char, fontFamily, attrs?)`** — the one glyph-
  specific helper: sets `font-family` and the correct `font-size` (via
  `SMUFL_STAFF_SPACES_PER_EM`) so any SMuFL character renders at the right
  scale relative to the staff. Doesn't load or embed the font itself --
  just references it by name, same as any other SVG/CSS font reference.
- **`createSvgDocument(options, children)`** — wraps a list of already-
  built primitive strings into one complete `<svg>`. `viewBoxWidth`/
  `viewBoxHeight` (staff-space units) plus `pxPerStaffSpace` (real CSS
  pixels per staff space) together produce the `<svg>`'s `width`/`height`
  attributes -- the **one number** (`pxPerStaffSpace`) that changes to
  resize the whole rendering, since the browser does the scaling from
  `viewBox` automatically once `width`/`height` differ from it.

**File:** `src/render/index.ts` — barrel export. `src/index.ts` updated to
include it.

## 2. Why this shape

- **Plain string-building, not a DOM/AST layer.** This matches how the
  Phase 9 quick-demo (`quick-demo/staff.ts`) already worked, and keeps
  Phase 6 usable identically in Node (for testing/export) and in a
  browser, with no DOM dependency at all.
- **`svgPath`'s `d` parameter is passed through unescaped-for-XML-attribute-safety-only.** Path data syntax itself (`M`, `L`, `C`, numbers) isn't
  validated here -- that's the geometry layer's (Phase 9+) job to
  construct correctly; this module only guarantees the attribute string
  itself can't break out of its quotes.
- **No caching/memoization.** Every call rebuilds a fresh string. Given
  Phase 44 requires full re-layout on resize anyway, there's no benefit to
  caching individual primitive calls at this layer.

## 3. How this was verified

Ran `npm run verify` clean, then built a real (small) rendered SVG
combining this phase with Phase 5's actual data: 5 staff lines using the
real `staffLineThickness` (0.13) engraving default, a `gClef` glyph via
`svgGlyphText` using its real codepoint (`U+E050`), a `noteheadBlack`
glyph (`U+E0A4`) with a stem line positioned using its real
`stemUpSE` anchor point and the real `stemThickness` (0.12) default, all
wrapped in `createSvgDocument` with `pxPerStaffSpace: 20` --  confirmed the
output `<svg>`'s `width="400" height="160"` matches `20 staff-spaces-wide
× 20px = 400`, `8 staff-spaces-tall × 20px = 160`, i.e. the scale factor
math is correct.

Separately confirmed both glyph characters survived into the final SVG
string as their correct, single-character codepoints (`U+E050`, `U+E0A4`)
-- not corrupted or stripped by the string-building/escaping logic.

Ran a dedicated escaping/XML-injection test: `svgText` with content
containing `<script>alert(1)</script>` and `&` came out with those
characters entity-escaped (confirmed the raw `<script>` tag is NOT present
in the output); `svgRect` with an attribute value containing an embedded
`"` and `&` came out correctly escaped too (confirmed no unescaped quote
that could break out of the attribute).

## 4. How to modify it

- **Add a new primitive** (e.g. `<circle>`, `<ellipse>`) — same pattern as
  the existing ones: a function taking staff-space coordinates + optional
  `SvgAttributes`, returning a markup string via `attrsToString`.
- **Change the resize mechanism** — `createSvgDocument`'s `pxPerStaffSpace`
  is the single knob; Phase 44's layout engine will call this again (or an
  equivalent re-render) with a new value on resize, not mutate the
  existing SVG's attributes in place.
- **Support a different SMuFL font than Bravura** — `svgGlyphText`'s
  `fontFamily` parameter already takes any name; no code change needed
  here (see Phase 5's doc for the metadata-loading side of a font swap).

## 5. How to revert/remove it

Delete `src/render/svg-primitives.ts` and `src/render/index.ts`, and
remove the `export * from './render/index.js';` line from `src/index.ts`.
Nothing else in the repo references it yet.
