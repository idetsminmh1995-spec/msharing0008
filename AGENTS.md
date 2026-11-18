# AGENTS.md

Repository-specific knowledge for the M Sharing music platform.

## Layout

- Top-level deploy directory: `Website/`. The actual static site lives in
  `Website/Website/` (`index.html`, `notation-editor.html`, `notation.html`,
  `assets/`, ...). The site is static: there is no backend, and "user account"
  means client-side `localStorage`.
- Notation Engine: `Website/Notation/Notation Engine/` (TypeScript, its own
  `package.json`).
- Notation docs: `Website/Notation/Notation Plan/PLAN.md`,
  `Website/Notation/Notation Doc/DOC.md`, and the generated
  `Website/Notation/Notation Plan/Documentation/API.md`.

## Notation Engine

Run every command from `Website/Notation/Notation Engine/`.

- `npm run verify` is the full gate: typecheck + lint + `format:check` + build +
  API-doc check + unit/visual tests. It must be green before committing.
- `npm run build` writes `dist/notation-engine.js` and, via
  `scripts/sync-website-bundle.mjs`, copies it to `Website/Website/assets/`
  with a content-addressed `?v=<hash>` cache key that `test/unit/website-bundle.test.js`
  enforces across the app's HTML. After changing the engine, run the build so
  the app copy and cache keys stay in step.
- `npm run docs` regenerates `Notation Plan/Documentation/API.md`; the verify
  step fails if it is stale, so run it after changing exported symbols.
- Tests load the **built bundle** (`dist/notation-engine.js`) into a `vm`
  sandbox (`test/helpers/load-engine.js`), not the TypeScript source. Build
  before running tests directly.
- jsdom is used for DOM-dependent tests. Load page scripts with
  `vm.runInContext(code, dom.getInternalVMContext())`, not `window.eval`: the
  bundle opens with `"use strict"`, and a strict `eval` scopes its top-level
  `var` to the eval so nothing reaches the global.

## Notation defaults and licensing

- The engine's own data layer is `src/notation-defaults/`. It replaced a
  `src/musescore/` copy of a GPL-3.0-only program's tables, which was removed to
  keep the engine free of that provenance. Do not reintroduce a `src/musescore/`
  folder or import MuseScore-derived tables.
- Every table in `src/notation-defaults/` carries a `DefaultsSource` naming the
  public specification it comes from (`musicxml`, `smufl`, `gm1`,
  `drumNotation`) or `houseStyle` for the engine's own choices. New defaults must
  do the same.
- The bundled Bravura font's `engravingDefaults` is the source of truth for
  engraving thicknesses; the spacing law is named `'power'` (the multiplicative
  law), not `'musescore'`.
- The audited MuseScore repository is a pinned reference only -- links and
  behaviour notes, no copied source. See the audit section in `PLAN.md`.
