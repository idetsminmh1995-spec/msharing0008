# Integration L — page layout wired in, and one horizontal timeline for the whole score

**Not a numbered phase.** Phase 46 built §16.2's full page/system breaking
algorithm and recorded that it was not wired into rendering — the last unwired
piece of Stage 8. This pass connects it, and in doing so had to fix a real
alignment bug that made a shared timeline impossible.

**Status:** complete. `npm run verify` clean (646 tests).

## 1. The bug this had to fix first

`renderFromMusicXml` computed measure widths and x positions **per part**.
A part whose measure 1 held eight eighth notes made *its* measure 1 wide,
while another part's whole-note measure 1 stayed narrow — so the two parts'
barlines landed at completely different x and nothing lined up vertically.

Measured on a real two-part case before the fix: part 1's barlines at
x = 25.8 and 34.8, part 2's at x = 9 and 18.

This directly contradicted §9.18 ("the same horizontal measure positions
shared down the system") and §14 (spacing is one shared axis). It also made
page mode impossible, since a system is score-wide and cannot break at
different measures for different parts.

**Fixed** by computing the horizontal layout **once for the whole score**,
from every part's voices combined, before the part loop. `computeMeasureLayout`
already only reads `measure.voices` to find attack ticks, so it is fed a
synthetic measure holding every part's voices for that measure number.

After the fix both parts use the same two barline positions, in scroll and
page mode alike. There is a regression test.

## 2. What was written

### `RenderFromMusicXmlOptions.config`

The renderer now accepts a `PartialEngineConfig`. **Only the sections it
actually reads are honoured:** `layout.mode`, `page`, `spacing`. Colours,
fonts, bar numbers and the rest are still the hardcoded constants they were —
unifying all of them is Phase 50's own job (§8, Stage 10), and pretending
otherwise here would be worse than saying so.

### Placement instead of per-part layout

One `placementByMeasureNumber` map holds each measure's `x`, `width`,
`systemY`, `systemIndex` and `isSystemStart`.

- **Scroll mode (§16.1):** `computeScrollLayout`, one system, `systemY = 0`.
  Every formula below reduces to exactly what it was, which is why the drum
  chart this project is built around renders **byte-identically** (116,036
  bytes before and after).
- **Page mode (§16.2):** `computePageLayout` with the score-wide widths, the
  score's own `systemHeight`, `config.page` and `config.spacing`. Each
  system's `systemY` is `pageIndex × pageHeight + marginTop + systemIndexOnPage
  × systemHeight`; x is offset by `marginLeft`.

### Per-system engraving

`isSystemStart` replaces "is this the part's first measure?" for the clef and
key signature, which are restated at **every** system start. The time
signature deliberately is not — it appears at the start of the part and
wherever it changes, which is standard practice and is asserted by a test.

The brace (§9.18) likewise moved from once-per-part to once-per-**system**.

### Justification

Scroll mode keeps `justify: false`; page mode takes the config's value, whose
default is `true`. This is the semantics, not a workaround: §14.3's
justification fills a system to a KNOWN width, and a scroll system has none —
it is as wide as the music.

### `<print>` breaks

§16.2 requires honouring `<print new-system="yes">` / `new-page="yes"`. The
parser's `prints` side-table feeds them straight in. Any part asking for a
break breaks the whole system, since a system is score-wide and one part
cannot break alone.

### Performance

The same pass removed three linear `.find()` scans that ran once per measure
per part (`attributes.find`, `part.measures.find`), replacing them with
indexes built once. They made a full render quadratic in measure count — well
before §18.1's own budget would have allowed it. Measured on the project's
32-measure drum chart: layout + render ≈ **10 ms** (the remaining ~165 ms is
jsdom parsing a 179 KB XML file, which a browser's native `DOMParser` does far
faster). A real performance pass against §18.1 is still Phase 53's job.

## 3. How to modify it

| Want to change | Where |
|---|---|
| Page size / margins | `config.page` (see `config/config.ts`'s A4-ish defaults) |
| Whether systems are justified | `config.spacing.justify` |
| Which mode renders | `config.layout.mode` |
| System height | `systemHeight` in `render-from-musicxml.ts` — currently one score-wide value, §16.2's own stated simplification (a score with a grand staff on some systems and a single staff on others would need per-system heights) |

## 4. Known limitations

- **One system height for every system**, per §16.2's own note.
- **A hairpin crossing a system break is not drawn** (`WEDGE_CROSSES_SYSTEM`)
  — see `integration-j-dynamics-hairpins.md`.
- **`MEASURE_HEADER_ALLOWANCE` is reserved in every measure**, including ones
  that draw no clef/key/time. Pre-existing and already documented at the
  constant; it wastes a little width per measure, which page mode makes
  slightly more visible than scroll mode did.

## 5. How to revert it

Remove `config` from `RenderFromMusicXmlOptions`; delete the
`placementByMeasureNumber`/`systemOrigins` block and the page branch; restore
the per-part `computeScrollLayout` call. **Keep** the score-wide measure
layout and the lookup indexes — the alignment fix and the de-quadratic-ing are
independent of page mode and are bug fixes, not features.

Tests: `test/unit/page-layout-wiring.test.js`,
`test/unit/bugfixes-phase47-review.test.js`, and the
`render-from-musicxml-page-mode` snapshot.
