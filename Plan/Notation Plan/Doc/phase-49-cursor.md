# Phase 49 — Cursor, both sync modes

**Status:** complete. `npm run verify` clean (679/679 tests). Completes
**Stage 9** (Playback surface), together with Phase 48.

## 0. Scope, per §17.2's own framing

> One module, one `mode` option (not two modules — see §2.4).

Both sync modes are the same computation seen from two reference frames:
`positionToX(currentTick)` says where the music is, and the mode only
decides whether the **marker** or the **notation** moves to meet it.

- `cursorMoves` — the notation is static, the marker is drawn at the
  note's own x. Suits page layout (scrolling a page under a fixed marker
  fights the page boundaries).
- `notationMoves` — the marker is pinned at `fixedFraction` of the
  viewport width and the notation slides under it. Suits scroll layout
  and the narrow video frames this project's own drum-video host uses.

## 1. What was built

**`src/playback/cursor.ts`**
- `computeCursorPlacement(playback, tick, options)` → `CursorPlacement`
  (`markerX`, `notationTranslateX`, `systemIndex`, `pageIndex`,
  `systemY`, `noteX`). One function, both modes, branching only on
  `options.mode` — exactly what §2.4 asked for instead of two modules.
- `DEFAULT_CURSOR_FIXED_FRACTION` (1/3): two thirds of the visible music
  stays ahead of the player, which is what a scrolling practice view
  wants.

**`src/render/cursor.ts`**
- `renderCursor(placement, options)` — draws the marker itself, from a
  `CursorPlacement` rather than a tick, so one drawing path serves both
  modes and neither knows which it was handed.

**`src/config/config.ts`** — `CursorConfig` gained `fixedFraction`,
`thickness`, `color` and `opacity`, each with a default, following §8's
own stated rule for adding to a section (interface + default + one merge
line). `color` is its own field rather than `colors.ink` because a cursor
is an overlay *on* the music and is conventionally not the same colour as
the notes it sits over.

**`src/playback/position.ts`** — `PlaybackMeasurePlacement` and
`EventPosition` gained `systemY`. Page mode's own render loop already
computed each system's vertical origin; the cursor is the first consumer
that needs it, otherwise a page-mode marker would always be drawn on the
first system's staff.

## 2. What the engine deliberately does NOT do

**Translate the notation.** `renderCursor` returns only the marker.
Applying `notationTranslateX` is the host's own job, by transforming the
already-rendered SVG — re-rendering the whole score once per animation
frame is exactly what §17.3's boundary exists to avoid.

**Simulate playback order.** §17.2: when playback passes a repeat-end
barline and jumps back, the host supplies the *musical* tick it jumped
to. Nothing here tracks "where playback has been", so a repeat, a D.S., a
manual seek and ordinary forward playback are all just "some tick" —
which is why none of them need a special case. A test asserts exactly
this: ticks asked for in reverse produce the same placements reversed.

## 3. Tests

`test/unit/cursor.test.js` (9 tests): each mode's own invariant
(`cursorMoves` never moves the notation; `notationMoves` never moves the
marker, and always lands the note exactly under it); both modes agreeing
on the underlying note x; the no-viewport degenerate case; the default
fraction; page mode carrying system/page/systemY; `renderCursor`'s
actual output geometry; repeat-jump order-independence; and the new
config fields resolving and merging per field.

## 4. How to modify

| Want to change | Where |
|---|---|
| Where the fixed marker sits | `config.cursor.fixedFraction`, or `options.fixedFraction` per call |
| Marker appearance | `config.cursor.thickness/color/opacity` → `renderCursor`'s options |
| Marker height/vertical span | `renderCursor`'s `top`/`height` options — the host decides whether it spans one staff or a whole system |

## 5. How to revert

Delete `src/playback/cursor.ts`, `src/render/cursor.ts` and
`test/unit/cursor.test.js`; drop their two `export *` lines; revert
`CursorConfig` to `{ mode }` and its default; drop `systemY` from
`PlaybackMeasurePlacement`/`EventPosition` and the two places that set
it.
