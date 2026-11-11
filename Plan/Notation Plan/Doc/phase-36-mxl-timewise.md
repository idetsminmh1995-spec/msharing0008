# Phase 36 — `.mxl` Support + `<score-timewise>` Conversion

**Status:** both features complete, tested, and wired into the web app.
320/320 tests pass. Every result confirmed **byte-identical** to the
already-verified partwise/uncompressed path, not just "renders without
error."

## 1. What was written

**`src/parser/musicxml/mxl.ts`** — **`unzipMxl(bytes, domParser)`**:
unzips a `.mxl` archive using `fflate` (the plan's own specified
dependency — small, well-established, not a notation dependency, so it
doesn't violate `§1`'s independence requirement), reads
`META-INF/container.xml`, and follows its `<rootfile full-path="...">`
pointer to find the real score file — **never assumes a filename**,
exactly as `§10.2` requires (some exporters use the score's own title,
others a generic name). Returns the score file's raw text, ready for the
existing `parseMusicXml`/`renderFromMusicXml`.

> **Updated by Phase 38**: this originally *threw* a distinct error for
> each real failure mode. Phase 38's hardening pass found this
> inconsistent with `§10.7`'s own "never throws on malformed input"
> philosophy and changed `unzipMxl` to return `{ xmlText, diagnostics }`
> instead — see `Doc/phase-38-diagnostics-hardening.md` for the full
> story. The description below is kept as a historical record of what
> this phase originally built; treat `Doc/phase-38-diagnostics-hardening.md`
> as authoritative for `unzipMxl`'s current behavior.

Throws a clear, specific
error for each real failure mode: no `container.xml` at all, no
`<rootfile>` pointer inside it, or a pointer to an entry that isn't
actually in the archive — each a genuinely different malformed-*archive*
condition, reported distinctly rather than one generic "couldn't read
file" message.

**`src/parser/musicxml/timewise.ts`** — **`convertTimewiseToPartwise`**:
a **mechanical** transposition of the measure/part nesting (`§10.6`) —
measures-outside-parts becomes parts-outside-measures — using real DOM
manipulation (`createElement`/`appendChild`/`cloneNode`) on the same
parsed document, not a string-level rewrite. Non-measure content
(`<part-list>`, title, identification, etc.) is copied unchanged; only
the grouping changes. Parts are collected in first-seen order across the
timewise document's measures, since `<score-timewise>` has nothing
equivalent to `<part-list>`'s ordering for measure content.

**`src/parser/musicxml/parse.ts`** — `parseMusicXml` now detects a
`<score-timewise>` root and converts it before any further processing,
so every downstream function (attributes, notes, measures) only ever
sees the partwise shape it was already built for. The `UNSUPPORTED_ROOT`
error message was updated to mention both accepted root element names.

**Both exposed via the public API** (`unzipMxl`,
`convertTimewiseToPartwise`) so callers can combine them with the
existing string-based `parseMusicXml`/`renderFromMusicXml` themselves,
rather than this phase inventing parallel binary-input entry points.

**`web-preview/canvas-preview.html`** — the upload handler now reads a
`.mxl` file as binary (`arrayBuffer()`, not `text()` — reading a ZIP
archive as UTF-8 text would corrupt its bytes before unzipping ever sees
them) and calls `unzipMxl` with the browser's own `window.DOMParser`
before handing the result to the existing `renderFromMusicXml` call. The
bundle's cache-busting query string was bumped (`?v=2`) since its actual
content changed.

## 2. How this was verified

Ran `npm run verify` clean, 320/320 (8 new tests). Both features checked
against the **strongest** assertion available — not "it renders
something reasonable," but **byte-for-byte identical SVG output** to the
already-established, already-verified uncompressed/partwise path:
- Built a real `.mxl` fixture (an actual ZIP archive, via `fflate`'s own
  `zipSync`, with a genuine `container.xml` pointer) from the existing
  `simple-single-voice.musicxml` fixture. Confirmed `unzipMxl` extracts
  text starting with `<score-partwise`, and confirmed the **full
  rendered SVG is byte-identical** to rendering the original
  uncompressed file directly.
- Wrote a real, independent `<score-timewise>` fixture (not derived by
  running the converter backwards) describing the *same* music as the
  existing partwise fixture. Confirmed the parsed `Score`'s part/
  measure/voice/event counts match, and confirmed the **full rendered
  SVG is byte-identical** to the partwise version.
- Confirmed `unzipMxl` originally threw distinct, specific errors for a
  missing `container.xml` and for a `container.xml` whose pointer
  targets a nonexistent entry — two different failure modes, not
  conflated into one message (Phase 38 later changed this to a
  non-throwing diagnostic shape; see the note in §1 above).
- Confirmed a genuinely unrecognized root (neither partwise nor
  timewise) still produces `UNSUPPORTED_ROOT` and never throws.
- Simulated the actual browser upload path end to end (native
  `DOMParser`, no injected test options) with the real `.mxl` fixture,
  confirming 0 diagnostics and the expected notehead count in the DOM.

## 3. A fixture-organization note, not a bug

The new binary `.mxl` fixture was placed in its own
`test/fixtures/mxl/` directory rather than alongside the existing
`test/fixtures/musicxml/*.musicxml` text fixtures. An existing test
(`render-from-musicxml.test.js`) iterates over every file in the
`musicxml/` directory and renders it as UTF-8 text — a binary ZIP file
placed there would have broken that loop (reading zip bytes as text
produces garbage, not valid XML). Caught before it became a real
failure, by checking for this exact kind of test before adding the
fixture rather than after seeing it fail.

## 4. Known limitations (stated, not silently missing)

- **`.mxl` archives with multiple rootfiles** — `unzipMxl` takes the
  *first* `<rootfile>` found; MusicXML technically allows more than one
  (e.g. a media/preview file alongside the score), which this phase
  doesn't attempt to disambiguate further than "the first one."
- **No `.mxl` *writing*** — only reading. Out of scope per `§10.2`'s own
  framing (a parser concern, not an export concern).

## 5. How to modify it

- **Handle multiple rootfiles** — extend `unzipMxl` to inspect every
  `<rootfile>` and pick the one with a `media-type` of
  `"application/vnd.recordare.musicxml+xml"` if present, falling back to
  the first.
- **Support nested/renamed container paths** — not currently an issue
  (the container.xml path is always `META-INF/container.xml` by the
  `.mxl` format's own fixed convention), but if a real-world file ever
  violates this, `unzipMxl`'s first lookup is the only place to change.

## 6. How to revert/remove it

Delete `src/parser/musicxml/mxl.ts` and
`src/parser/musicxml/timewise.ts`, remove their `export * from` lines
from `src/parser/musicxml/index.ts`, revert `parse.ts`'s root-detection
change back to only accepting `score-partwise`, delete
`test/unit/mxl-timewise.test.js`, `test/fixtures/mxl/`, and
`test/fixtures/musicxml/simple-single-voice-timewise.musicxml`, revert
`web-preview/canvas-preview.html`'s upload handler to reject `.mxl`
again, and remove the `fflate` dependency from `package.json`.
