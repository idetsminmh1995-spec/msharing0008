# src/config

The single typed config schema every other module reads from -- nothing
user-facing is hardcoded anywhere else in the engine. Stubs for: colors,
layout mode, cursor mode, notehead mapping, beam style, bar-number display,
key-signature style, W x H resize.

See PLAN.md Phase 7 (this is where it's defined) and Phase 48 (where every
section gets filled in/unified), and `../../Doc/phase-07-config-schema.md`
for the full record. Main entry points: `resolveConfig`, `DEFAULT_CONFIG`,
`EngineConfig` in `config.ts`.
