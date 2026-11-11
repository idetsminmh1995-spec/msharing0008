# Phase 9 — Staff Lines (quick-demo)

**Status:** standalone quick-demo only, not yet part of the real `src/`
engine structure from Plan Phase 1. Built to visually confirm the 5-line
staff shape before Phase 1–8 (foundation) gets built for real.

## 1. What was written

**File:** `notation-engine/quick-demo/staff.ts` (compiled to `staff.js` by
running `tsc --target ES2020 --strict staff.ts` in that folder — re-run this
after every edit to `staff.ts`, since `staff.js` is a build output, not
hand-edited).

Two functions, both plain globals (no ES module `export`, so a `<script>`
tag can call them directly — see the dual-environment note below):

- **`renderStaffLines(config: StaffConfig): string`**
  Returns just the `<line>` elements for one staff — meant to be embedded
  inside a bigger `<svg>` alongside clefs/notes in later phases. Takes:
  - `x`, `y` — top-left position; `y` is the TOP line's position.
  - `width` — how far the lines extend horizontally.
  - `lineSpacing` (default `10`) — vertical gap between adjacent lines.
  - `lineThickness` (default `1`) — stroke width of each line.
  - `color` (default `'#000000'`) — stroke color of the lines.
  - `numLines` (default `5`) — line count (works for 1-line percussion or
    6-line tab too, since nothing is hardcoded to 5).

- **`renderStaffAsStandaloneSVG(config, svgWidth, svgHeight): string`**
  Wraps `renderStaffLines()` in a complete `<svg>...</svg>` document with a
  white background rectangle — only used by this quick-demo (the real
  engine's SVG document assembly is Phase 6).

**File:** `notation-engine/quick-demo/index.html` — a standalone browser
preview page; loads `staff.js` via a `<script>` tag and calls
`renderStaffAsStandaloneSVG()` directly, injecting the result into a `<div>`.

**File:** `notation-engine/quick-demo/demo-output.svg` — a one-off rendered
sample (not regenerated automatically; re-run the Node snippet below if you
want a fresh one after editing `staff.ts`).

## 2. How it's wired into the drum-video web app

**File:** `web-preview/canvas-preview.html`
- `<script src="../notation-engine/quick-demo/staff.js"></script>` — loaded
  near the bottom of the page, before the app's own main `<script>` block,
  so `renderStaffAsStandaloneSVG` is available as a global by the time the
  app's code runs.
- `<div id="notationEngineContainer">` — the container the app injects the
  rendered SVG into. Sits where the old VexFlow-based "Notation Engine 2"
  container used to be.
- Inside the `notationFile` file-input's `change` handler: on any
  `.musicxml`/`.xml` file selected (`.mxl` is explicitly rejected for now —
  see below), it calls
  `renderStaffAsStandaloneSVG({ x: 20, y: 30, width: 900, lineSpacing: 10,
  lineThickness: 1.2, color: '#000000' }, 940, 100)` and sets that as
  `notationEngineContainer.innerHTML`. This does **not** parse the XML's
  note content at all yet — it only proves the upload → engine connection
  works. Any valid file just makes the same 5-line staff appear.

## 3. How to modify it

- **Line spacing/thickness/color/count** — change the values passed into
  the `config` object either in `quick-demo/index.html`'s inline script, or
  in the `notationFile` handler inside `canvas-preview.html` (search for
  `renderStaffAsStandaloneSVG(`). No code logic needs to change for this —
  it's all just the config object's fields.
- **Position/size of the staff on the page** — same config object:
  `x`, `y`, `width`, and the two size arguments (`940, 100` above) that set
  the outer `<svg>`'s pixel dimensions.
- **Adding more lines types (e.g. a 1-line percussion staff)** — pass
  `numLines: 1` (or any other count) in the config; `renderStaffLines()`
  already loops generically over `numLines`, no code change needed.
- **If you need this logic inside the real engine later (Phase 9 for
  real)** — move the logic into `src/geometry/staff.ts` + `src/render/
  staff.ts` per the Plan's Phase 1 folder structure, using proper ES module
  `export`/`import` instead of the global-function pattern used here (that
  pattern was only chosen for this quick-demo so a plain `<script>` tag
  could call it with zero build tooling in the browser).

## 4. How to revert/remove it

Two independent things reference this code — remove both to fully revert:
1. Delete `notation-engine/quick-demo/` entirely (all four files).
2. In `web-preview/canvas-preview.html`, remove:
   - the `<script src="../notation-engine/quick-demo/staff.js">` tag,
   - the `notationEngineContainer` `<div>`,
   - the `renderStaffAsStandaloneSVG(...)` call and the
     `newEngineContainer.innerHTML = ...` line inside the `notationFile`
     change handler (the rest of that handler — reading the file, the
     status-text updates — has no dependency on this code and can stay).
