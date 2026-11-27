# Writer Engine

The Notation Lab's score document and its edit commands, with no DOM in
sight. Every command is a pure function of the document: it plans the
edits, the editor turns the plan into one undo step.

- `src/index.js` — score document, edit commands, MusicXML serialization.
  Reads `NotationEngine` off the global object and publishes `WriterEngine`.
- `test/` — plain `node --test`, loading the built notation engine and this
  module into one `vm` sandbox.
- `tools/sync-writer-engine.mjs` — copies `src/index.js` to
  `Website/Website/assets/writer-engine.js`, which is what the page loads.

## Commands

Run from this directory.

| Command | What it does |
|---|---|
| `npm test` | the DOM-free command tests (needs `Notation Engine/dist` built) |
| `npm run sync:website` | publish `src/index.js` to the website asset |
| `npm run check:website` | fail when the published asset is stale |
| `npm run verify` | both of the above, as CI runs them |

The notation engine bundle must exist first:

```
cd "../../Notation/Notation Engine" && npm run build
```

## The command shape

A command returns a *plan* rather than a new document, so the editor can
report what will happen before it commits and can undo the whole gesture
in one step:

```js
const plan = WriterEngine.tiePlan(doc, cells);   // { edits, removing }
const next = WriterEngine.applyPlan(doc, plan.edits);
```

`intervalPlan` reports why it could not stack (`'no-note'`, `'unwritable'`,
`'same-note'`, `'already'`) so the caller can say it in the status line
instead of failing silently.
