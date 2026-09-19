# docs

**Generated** API reference for the engine, per PLAN.md §22 (Stage 10,
Phase 54). Produced by `scripts/generate-api-docs.mjs` from the `.d.ts`
files `tsc` emits — which is exactly what a consumer of the bundle sees.

| | |
|---|---|
| [`API.md`](./API.md) | Every exported symbol, by module, with the supported entry points called out first |

```
npm run docs         # regenerate
npm run docs:check   # fail if it has drifted from the code (part of `npm run verify`)
```

Do not edit `API.md` by hand — `npm run verify` will fail on the diff.

## What is "the public API"

The bundle has one global, `NotationEngine`, and everything the engine
exports is on it. That is deliberate (a single IIFE global is what a
plain `<script>` tag can use), but it means "exported" and "supported"
are not the same thing:

- **Supported entry points** — listed first in `API.md`. These are what a
  host application is meant to call, and what the `Doc/` records and
  tests treat as the contract.
- **Everything else** — the geometry, layout, glyph and render building
  blocks the engine uses on itself. Exported, documented, unit-tested and
  perfectly usable; not covered by any stability promise, because they
  exist to serve the renderer and will follow it.

## Not to be confused with `../Doc/`

`docs/` is machine-generated reference. [`../Doc/`](../Doc/) is the
hand-written build history: one record per phase, each saying what was
built, what was deliberately *not* built, how it was verified, and how to
revert it. Start at [`../Doc/STATUS.md`](../Doc/STATUS.md) for where the
project stands, or [`../Doc/README.md`](../Doc/README.md) for the index.
