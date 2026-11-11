# Phase 2 — Toolchain

**Status:** complete and verified (typecheck + lint + format:check + build
+ declaration-file generation all run clean with zero errors).

## 1. What was written

**`package.json`** — the engine's own npm project (separate from the
drum-video app and from `quick-demo/`, which has no build step of its own).
`"type": "module"`. Scripts:
- `npm run build` — bundles `src/index.ts` with esbuild into
  `dist/notation-engine.js` (IIFE format, global name `NotationEngine`, so
  it can still be dropped into a plain `<script>` tag like `quick-demo`
  currently is, until Phase 50 adds proper package publishing).
- `npm run typecheck` — `tsc --noEmit`, strict-mode type checking only.
- `npm run declarations` — `tsc --emitDeclarationOnly`, generates
  `dist/index.d.ts` (this is what Phase 50's generated API docs will read
  from later).
- `npm run lint` — ESLint over `src/`.
- `npm run format` / `format:check` — Prettier write / check-only.
- `npm run verify` — chains typecheck → lint → format:check → build; run
  this before considering any later phase's code "done."

**`tsconfig.json`** — `strict: true` plus several stricter-than-default
flags turned on deliberately: `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`,
`noUnusedParameters`, `noFallthroughCasesInSwitch`. Target `ES2020`,
module `ESNext` with `moduleResolution: "Bundler"` (matches esbuild's
resolution behavior). `rootDir: "src"`, `outDir: "dist"`, declarations on.
`quick-demo/` is explicitly excluded — it has its own separate compile step
(plain `tsc staff.ts`, documented in `phase-09-staff-lines.md`) and isn't
part of this stricter project.

**`eslint.config.js`** — flat config (ESLint 10's default format),
TypeScript-aware via `@typescript-eslint`. `no-explicit-any` is an **error**
(not just a warning) — the engine's config objects (Phase 7/48) are meant to
be fully typed; any spot that genuinely needs `any` should use a scoped
`eslint-disable-next-line` with a comment explaining why, not a relaxed
global rule.

**`.prettierrc.json`** — 2-space indent, single quotes, semicolons,
trailing commas, 100-char print width.

**`.gitignore`** — `node_modules/`, `dist/`, `*.log`.

**`src/index.ts`** — a deliberately tiny smoke-test stub (just an
`ENGINE_VERSION` constant) so every one of the commands above has at least
one real `.ts` file to run against. This is **not** real Phase 3 code —
Phase 3 (core data model) will add the actual exports here.

## 2. Package versions (pinned, not floating)

| Package | Version | Why this one |
|---|---|---|
| `typescript` | `5.9.3` | Latest 5.x. TypeScript 7.0.2 exists but `@typescript-eslint` 8.70.0's peer range is `<6.1.0` -- installing TS7 broke `npm install` with an ERESOLVE conflict. Revisit this pin once typescript-eslint publishes TS7 support. |
| `esbuild` | `0.28.2` | Latest at setup time. |
| `eslint` | `10.10.0` | Latest; flat config is its default now. |
| `@typescript-eslint/parser` + `/eslint-plugin` | `8.70.0` | Latest matching pair; these two must always stay on the same version as each other. |
| `prettier` | `3.9.6` | Latest. |

## 3. How to modify it

- **Loosen/tighten strictness** — edit the flags in `tsconfig.json`'s
  `compilerOptions`. Removing any of the extra strict flags listed above
  should be a deliberate, documented decision (update this file's "what was
  written" section to note why), not an incidental fix to make an error
  disappear.
- **Change build output format** — edit the `build` script in
  `package.json` (e.g. swap `--format=iife` for `--format=esm` once the
  engine moves to real ES module consumers instead of a `<script>` tag).
- **Add a new lint rule** — edit the `rules` block in `eslint.config.js`.
- **Bump a dependency** — edit the version in `package.json`'s
  `devDependencies`, then run `npm install` and re-run `npm run verify` to
  confirm nothing broke before committing the lockfile change.

## 4. How to revert/remove it

Delete `package.json`, `package-lock.json`, `tsconfig.json`,
`eslint.config.js`, `.prettierrc.json`, `.gitignore`, `node_modules/`
(gitignored, so it won't be in the repo anyway), and `src/index.ts`.
Nothing outside `notation-engine/` references any of this yet -- the
drum-video app (`web-preview/canvas-preview.html`) only loads the separate,
already-compiled `quick-demo/staff.js` directly, with no build-tool
dependency on anything in this Doc entry.
