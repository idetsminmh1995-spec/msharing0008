# src/config

The single typed config schema every other module reads from -- nothing
user-facing is hardcoded anywhere else in the engine. Stubs for: colors,
layout mode, cursor mode, notehead mapping, beam style, bar-number display,
key-signature style, W x H resize.

See PLAN.md §8 (the full config specification, including the sections still
to be added as their modules land), and `../../Doc/phase-07-config-schema.md`
for the full record. Main entry points: `resolveConfig`, `DEFAULT_CONFIG`,
`EngineConfig` in `config.ts`.
