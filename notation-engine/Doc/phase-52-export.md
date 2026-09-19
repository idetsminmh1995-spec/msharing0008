# Phase 52 — Export: SVG, PNG, PDF (§3, §16.2)

**Status:** complete. `npm run verify` clean (774/774 tests, 32 of them
new). Verified end to end in a real browser on the user's own MusicXML
files, and the resulting PDF read back with **pdf.js** — an independent
PDF implementation — rather than trusted because it was written here.

## 0. The shape of the problem

`renderFromMusicXml` returns an SVG *fragment*. Three deliverables sit
between that and a file someone can send to a printer, and they are not
equally hard:

| | What's needed | Can the engine do it alone? |
|---|---|---|
| SVG | a standalone document, with the font travelling with it | yes |
| PNG | vector art turned into pixels, then encoded | half |
| PDF | pixels or embedded fonts, then a PDF container | half |

The honest split follows that table exactly: **everything that is
arithmetic lives in the engine and is tested without a browser;
rasterizing is borrowed from the host.**

## 1. SVG — `exportSvg`

Adds the XML declaration, puts `<title>`/`<desc>` inside the document
where SVG requires them (first, for accessibility), and — the part that
actually matters — **embeds the font**.

A score exported without its font is a page of missing-glyph boxes, and
this engine cannot quietly prevent that: it ships no font (§7.2 — glyph
*names* are font-independent, the font itself is the host's). So
`options.fonts` takes bytes the host already has and writes real
`@font-face` rules into the file; and when nothing is passed, the file
carries a comment saying exactly why it may render wrong, rather than
looking fine until someone opens it elsewhere.

The rules go in CDATA, not escaped text: a base64 payload contains
characters XML would otherwise mangle, and a stylesheet is what CDATA is
for.

`svgToDataUri` base64-encodes rather than percent-encoding, because a
percent-encoded SVG needs a different escape set per context (`#` in CSS,
`"` in an attribute) and this engine's output contains both. `bytesToBase64`
and `stringToUtf8` are written out rather than reaching for `btoa`/
`TextEncoder`, neither of which can be assumed in every host; both are
tested against Node's own encoders, including the astral plane.

## 2. PNG — `encodePng`

A real encoder, not a wrapper: signature, IHDR, optional pHYs, IDAT,
IEND, 8-bit RGBA, zlib via `fflate` (already a dependency, for `.mxl`).

Scanlines use PNG filter 1 (**Sub**). Notation is overwhelmingly flat
runs of one colour, which Sub turns into runs of zeroes that deflate
compresses to almost nothing; the adaptive per-row heuristic real
encoders use would be a meaningful amount of code for a file written
once, at export time.

Its test decodes the output with an **independent decoder written in the
test file** (inflate, un-filter) and compares pixels — including a
gradient, which a subtly wrong Sub implementation would corrupt while a
flat fill would hide.

## 3. PDF — `encodePdf`

### Why the pages are images

PDF has no notion of SVG, so there are exactly two honest options:
translate every drawing operation into PDF's own operators, or put a
raster image on each page.

The vector route sounds better and, for lines, rects and curves, nearly
is — those map almost one-to-one onto PDF operators. It falls down on
**text**, which is what a score mostly is. PDF cannot reference a font by
name and hope the way SVG can: it needs the font program embedded, as CFF
or TrueType, and subset to the glyphs used to keep the file sane. That is
a font parser and a subsetter — a project of its own, and not one this
engine should contain. A "vector" PDF without it is a file of missing
glyphs, which is strictly worse than an image.

So: one **Flate-compressed RGB** image per page. Lossless (unlike the
JPEG route most small exporters take), correct in any viewer, and honest
about what it is. `exportSvg` remains the vector deliverable.

### The writing itself

Objects are written in order with their byte offsets recorded as they go,
because that is exactly what the cross-reference table at the end must
contain — a PDF is built back-to-front by design, and computing those
offsets any other way means serializing twice. `creationDate` is
overridable so output can be byte-reproducible (§4.4), which its own test
asserts.

## 4. Rasterizing — the borrowed step

`rasterizeSvg` does not implement rasterization. It takes a
`RasterBackend` with two methods (`createCanvas`, `loadImage`) — the same
dependency-injection shape the MusicXML parser already uses for
`domParser`, for the same reason: name what you need instead of depending
on one implementation of it.

- `browserRasterBackend()` is built in and needs no arguments. Called
  without a DOM it throws with a real explanation, not a
  `ReferenceError` three frames deep.
- A Node host passes its own (`@napi-rs/canvas`, `skia-canvas`, …).

**Slicing.** Page mode (§16.2) stacks every page into one tall SVG, so
`slices: n` is how a multi-page score becomes a multi-page PDF. Each
slice draws the **whole** image onto a canvas one slice tall, at a
negative y offset — the browser clips it, which costs nothing, and avoids
re-serializing the SVG per page with a different viewBox (which would
re-resolve and re-lay-out the fonts every time).

`exportPng` returns the FIRST slice only, deliberately: a PNG is one
image, so a caller who wants page 7 calls `rasterizeSvg` + `encodePng`
themselves rather than being handed something no single file can hold.

## 5. A real bug this found

**The grand-staff brace was drawn above the music, not beside it.**

Bravura's `brace` glyph sits entirely *above* its own origin
(`bBoxSW` y = 0, `bBoxNE` y = 3.988). `renderBrace` anchored it at the
system's **top** and scaled up from there, so the glyph ran upward out of
the system — on a grand staff by a dozen staff spaces, and in page mode
far enough that each system's brace landed on the **previous page**.

It was invisible in the SVG snapshots (which record the transform, not
where the ink lands) and survived every test, because no test asserted
the brace's geometry. It became obvious the moment an exported PDF was
read back and looked at. The fix is one word — anchor at `bottomY` — and
`test/unit/grand-staff.test.js` now asserts the brace's top and bottom
against the staff lines the same render actually drew, so it cannot
regress silently again.

## 6. How it was verified

Unit tests cover every pure part (32 tests: the SVG document, both
encoders' output decoded back, the PDF's xref offsets *checked against
the objects they point at*, reproducibility, the slicing arithmetic
through a stub backend, and the error cases).

Beyond that, the whole path was run for real:

1. The user's own `Drum_Lesson_5.musicxml` and `Paino.musicxml` rendered,
   exported with Bravura embedded, and rasterized in headless Chromium.
2. The PNG (32682 × 800) decoded and inspected — real glyphs, not
   missing-glyph boxes, which is what proves the embedded `@font-face`
   survives the data-URI → `Image` → canvas path.
3. The 16-page PDF parsed with **pdf.js**: 16 pages, correct metadata,
   correct 450 × 630 pt MediaBox, and page 1's image decoded to
   600 × 840 with real content.
4. That decoded page re-encoded with this engine's own `encodePng` and
   looked at — which is how the brace bug was caught.

(Headless Chromium here cannot *display* a PDF at all — its own
`--print-to-pdf` output screenshots blank too — so a blank screenshot
proves nothing either way, and pdf.js was used instead of trusting it.)

## 7. Using it

```js
const { svg } = renderFromMusicXml(xml, { config: { layout: { mode: 'page' } } });

const file = exportSvg(svg, { title: 'My Score', fonts: [{ family: 'Bravura', base64, format: 'woff2' }] });
const png  = await exportPng(file, { scale: 2, dpi: 96 });
const pdf  = await exportPdf(file, { scale: 2, slices: pageCount, title: 'My Score' });
```

Export the SVG **document** (not the raw fragment) to PNG/PDF: the
embedded font is what makes the raster come out with glyphs in it.

Scroll mode produces one enormously wide page — the drum file above is
24511 pt across, well past the 14400 pt some viewers cap at. Page mode is
what a PDF wants.

## 8. How to revert

Delete `src/export/` and `test/unit/export.test.js`, and the `export *`
line in `src/index.ts`. The brace fix in §5 is independent of this phase
and should be kept.
