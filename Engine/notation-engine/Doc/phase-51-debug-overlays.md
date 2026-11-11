# Phase 51 — Debug overlays and the diagnostics surface (§18.3)

**Status:** complete. `npm run verify` clean (741/741 tests, 37 of them
new).

## 0. Scope — §18.3's four bullets

1. One `Diagnostic[]` channel, severity-filtered by `config.debug.logLevel`.
2. `config.debug.drawBoundingBoxes` overlays every element's bounding box.
3. `config.debug.drawSkyline` overlays §15's north/south skylines.
4. Every rendered element carries a stable `data-id` back to its `Score` node.

All four are built. The interesting decisions are in 2 and 4.

## 1. `data-id` — one id scheme, not two

Every note, chord and rest is now drawn inside a
`<g data-id="P1#m2#v1#e0">`, where the id comes from **`notationEventId`**
— the same function Phase 48's event stream builds its `noteIds` from.

That sharing is the whole point. A host that has `{ tick, noteIds }` from
`getEventStream` can turn it into a DOM node with one `querySelector`,
because the two strings are produced by one function rather than by two
implementations of one format. A chord member's `...#e3#n1` maps to its
chord's own group through the new **`elementIdForNoteId`**, since a chord
is drawn as one element with several noteheads.

**Each member of a beam group carries its own id, not the group's.** A
beam is a *relationship* between events; highlighting one eighth note
must not light up the other three it happens to be beamed to. This needed
a real change: `renderBeamGroup` used to return one SVG string for the
whole group, and now returns `memberSvgs` (one per event, in `events`
order) plus `beamSvg` (shared, belonging to no single event). Its three
internal passes — heads, stems, marks — write into per-member buckets
instead of one flat list.

That reordered the emitted elements within a beam group (each member's
head and stem are now adjacent, where before all heads preceded all
stems). **Every render snapshot was checked element-by-element after the
change: the set of drawn elements is byte-identical, only the grouping
differs.**

## 2. The bounding boxes are measured from the output, not collected

`measureSvgBoxes(svg)` walks the SVG the renderer just produced and
returns one `DebugBox` per drawn element, tracking the nearest enclosing
`data-id` so each box knows which event it belongs to.

The obvious alternative — thread a collector through the renderer and
record a box at each drawing call — was rejected for the reason §18.3
says "**every** element": there are roughly thirty distinct drawing calls,
so that design needs a new line every time a drawing call is added, and,
much worse, it can silently disagree with what was actually drawn. An
overlay whose job is "show me the truth about the layout" must not have a
second opinion about the layout. Measuring the output cannot drift from
the output.

What each element kind costs:

| Kind | How it's measured | Exact? |
|---|---|---|
| SMuFL glyph | the glyph's own `bBox` from Bravura's metadata, y-flipped (SMuFL's +y is up, SVG's is down) | yes |
| `<line>` | endpoints, widened by half the stroke | yes |
| `<rect>` | directly | yes |
| `<path>` | every coordinate in the `d`, **control points included** | no — a correct over-estimate |
| plain text | font size × a per-character advance ratio | no — no DOM, no real font metrics |

The two inexact kinds set `approximate: true`, and the overlay draws
those boxes **dashed** — so the picture says which of its own numbers are
tight and which are hulls, rather than presenting all of them as equally
trustworthy.

Glyph text is told apart from ordinary text by *looking the character
up*: a SMuFL glyph is a single character in the font's private-use area,
so `getGlyphByChar` either finds it or it is ordinary text. No
font-family or font-size check to go stale.

**New in `glyphs/`:** `getGlyphByChar` — the reverse of `getGlyph`, built
lazily and once, because the forward direction is what every renderer
needs and only this pass has nothing but the character to go on.

## 3. The skylines come from the same boxes

`computeDebugSkylines(boxes, staffBottomYs)` derives §15's north (highest
content at each x) and south (lowest) envelopes **from the boxes the
other overlay draws**. A skyline that disagreed with the boxes sitting
under it would be worse than no skyline at all, and deriving both from
one measurement makes that impossible.

Boxes are assigned to the staff whose bottom line their own vertical
centre is nearest. That is a heuristic and it is the right one here:
nothing in the emitted SVG records which staff a note was drawn *for*,
and "nearest staff" is correct in every case except deliberately crossed
hands — where the ambiguity is precisely what one would be debugging.

Adjacent samples sharing a y are merged into one segment, so a flat run
is one entry rather than hundreds, and `renderSkylineOverlay` draws each
side as a stepped polyline that **starts a new sub-path across a gap**
rather than drawing a line through empty space it has no content for.

## 4. `logLevel`

`filterDiagnostics(diagnostics, level)` is applied to what
`renderFromMusicXml` returns. `silent` → nothing, `error` → errors,
`warn` → errors + warnings, `info`/`debug` → everything. The default is
`'info'`, so a caller that sets nothing sees exactly what it saw before
this section existed — a filter whose default dropped information would
be a surprising regression.

It is typed structurally (anything with a `severity`) rather than against
`parser/`'s `Diagnostic`, which keeps `debug/` dependent on nothing but
`config/` and `glyphs/`, and lets the same filter work on `drums/`'s own
`DrumDiagnostic`.

`debug` is distinguished from `info` not by which severities pass — both
pass all three — but by being the level at which a host says "give me
everything", which future internal tracing can key off without changing
what `info` means today.

## 5. Where the code lives, and why

| Module | Holds | Imports |
|---|---|---|
| `debug/log-level.ts` | `filterDiagnostics`, `severityPassesLogLevel` | `config/` |
| `debug/measure.ts` | `measureSvgBoxes`, `DebugBox` | `glyphs/` |
| `debug/skyline.ts` | `computeDebugSkylines` | (nothing) |
| `render/debug-overlay.ts` | `renderBoundingBoxOverlay`, `renderSkylineOverlay` | `render/svg-primitives` |

The overlays are *drawn* in `render/` rather than in `debug/` so §4.1's
"only `render/` emits SVG" keeps holding, and they take plain structural
shapes (four numbers is a box) rather than importing `debug/`'s types, so
`render/` still depends on nothing further down the pipeline. PLAN.md
§4.1's dependency table gained rows for `debug/`, `timing/`, `drums/` and
`playback/`, which it had been missing.

## 6. Tests

`test/unit/debug.test.js` (37 tests): every level's own severity set and
its agreement with `severityPassesLogLevel`; the `'info'` fast path
returning the same array; order preserved through a filter; a real
fixture's warning/error mix filtered at each level; filtering changing
neither SVG nor playback data; the ids on a real render matching the
event stream's exactly; per-member ids in a beam group; id stability
across renders; each measured kind's geometry including the two
approximate ones; `data-id` inheritance through nested and unnamed
groups; one box per drawn element on a real render; north/south
envelopes, segment merging, steps, per-staff assignment, and the empty
case; both overlay renderers' output including the dashed-approximate
rule and the skyline's gap handling; the overlays off by default, on
individually, coloured from config, and one skyline per staff on a grand
staff; and the `debug` config section's own merge.

## 7. How to use it

```js
const { svg, diagnostics } = renderFromMusicXml(xml, {
  config: { debug: { drawBoundingBoxes: true, drawSkyline: true, logLevel: 'debug' } },
});
```

Both overlays land in their own `<g class="debug-bounding-boxes">` /
`<g class="debug-skyline">`, so a host can also leave them on and hide
them with one CSS rule.

## 8. How to revert

Delete `src/debug/`, `src/render/debug-overlay.ts`,
`test/unit/debug.test.js` and their `export *` lines; drop `DebugConfig`
from `config.ts` and its merge line; drop the overlay block and the
`filterDiagnostics` call from `renderFromMusicXml`; drop `withEventId`
and restore `renderBeamGroup`'s single `svg` return; drop
`getGlyphByChar` and the two id helpers in `playback/event-stream.ts`;
re-record the snapshots.
