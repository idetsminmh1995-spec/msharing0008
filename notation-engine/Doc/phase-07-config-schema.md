# Phase 7 — Config Schema

**Status:** complete and verified (`npm run verify` clean, plus 5 manual
test scenarios against `resolveConfig` — see §3).

## 1. What was written

**File:** `src/config/config.ts` — one `EngineConfig` interface with 7
sections, matching exactly the 7 PLAN.md Phase 7 named as needing a
reserved slot:

| Section | Type | Default | Owning phase(s) |
|---|---|---|---|
| `colors` | `ColorConfig` | `{ ink: '#000000', background: '#ffffff' }` | 18, 48 |
| `layout` | `LayoutConfig` | `{ mode: 'scroll', pxPerStaffSpace: 10 }` | 41, 42, 44 |
| `cursor` | `CursorConfig` | `{ mode: 'notationMoves' }` | 45–47 |
| `noteheadMapping` | `NoteheadMappingConfig` | `{ defaultShape: 'noteheadBlack' }` | 16, 17 |
| `beam` | `BeamConfig` | `{ style: 'straight' }` | 24 |
| `barNumbers` | `BarNumberConfig` | `{ display: 'systemStart' }` | 13 |
| `keySignature` | `KeySignatureConfig` | `{ style: 'standard' }` | 11 |

Each section's fields with an unsettled design (e.g. exactly how
`noteheadMapping.overridesByKey` gets keyed -- by MIDI note? by instrument
id + step?) are reserved as a generic `Record<string, string>` for now
rather than guessed at, with a comment pointing at the phase that will
actually decide it.

- **`DEFAULT_CONFIG: EngineConfig`** — the concrete defaults table above,
  as a real exported constant (not just documented).
- **`PartialEngineConfig`** — same shape, every section AND every field
  within each section optional (`Partial<...>` per section).
- **`resolveConfig(overrides?: PartialEngineConfig): EngineConfig`** — the
  one function that merges a caller's partial overrides against
  `DEFAULT_CONFIG`, section by section. This is the function every later
  phase should call to get a config to actually read from -- nothing else
  should read `DEFAULT_CONFIG` directly or hardcode its own fallback.

**File:** `src/config/index.ts` — barrel export. `src/index.ts` updated to
include it.

## 2. Design notes

- **Section-by-section merge, not a generic deep-merge utility.**
  `resolveConfig` spells out all 7 sections explicitly
  (`{ ...DEFAULT_CONFIG.colors, ...overrides?.colors }` etc.) rather than
  a recursive generic `deepMerge<T>()`. A generic version would need
  either unsafe casts or a lot of conditional-type machinery to stay
  fully typed under `exactOptionalPropertyTypes`; spelling out 7 known
  sections is simpler, still fully type-checked, and the list only grows
  when Phase 48 adds a genuinely new section (rare) rather than on every
  config read.
- **Unions instead of bare strings** for every enum-like field
  (`LayoutMode`, `CursorMode`, `BeamStyle`, `BarNumberDisplay`,
  `KeySignatureStyle`) -- typos like `mode: 'scoll'` are caught at compile
  time instead of silently doing nothing at runtime.
- **`KeySignatureStyle` is a union of one value (`'standard'`) rather than
  a bare `string`** specifically so Phase 11 can add real alternatives
  later without that being a breaking type change for existing callers
  (adding a member to a union is additive; switching `string` to a union
  later would be the breaking direction).

## 3. How this was verified

Ran `npm run verify` clean, then 5 scenarios against the built bundle:
1. `resolveConfig()` with no arguments produces something deep-equal to
   `DEFAULT_CONFIG` exactly.
2. Overriding one field in one section (`colors.ink`) leaves every other
   field in that section (`colors.background`) AND every other section
   (`layout`, `cursor`, ...) untouched at their defaults.
3. Overriding several sections at once (a black-background/white-ink
   color scheme + a different `pxPerStaffSpace` -- deliberately chosen to
   resemble the earlier drum-video project's actual color/scale needs)
   produces the expected fully-merged result.
4. A section with two related optional fields (`barNumbers.display` +
   `barNumbers.everyNBars`) correctly holds both when both are provided
   together.
5. `DEFAULT_CONFIG` itself is unmutated after all of the above calls --
   confirming the spread-based merge never accidentally writes through to
   the shared default object.

## 4. How to modify it

- **Add a new field to an existing section** — add it to that section's
  interface (and to `DEFAULT_CONFIG`'s matching value); `resolveConfig`
  doesn't need to change since it already spreads the whole section.
- **Add a whole new section** (a genuinely new Phase 48 concern not on the
  list above) — add its interface, add it to `EngineConfig` and
  `PartialEngineConfig`, add its default to `DEFAULT_CONFIG`, and add its
  line to `resolveConfig`'s merge.
- **Settle one of the reserved generic-map fields' real key scheme** (e.g.
  Phase 17 deciding how `noteheadMapping.overridesByKey` gets keyed) --
  narrow that field's type from `Record<string, string>` to whatever
  specific key type gets decided, in that field's own section only; no
  other section is affected.

## 5. How to revert/remove it

Delete `src/config/config.ts` and `src/config/index.ts`, and remove the
`export * from './config/index.js';` line from `src/index.ts`. Nothing
else in the repo references it yet.
