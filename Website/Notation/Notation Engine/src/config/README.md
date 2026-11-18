# src/config

The single typed config schema every other module reads from -- nothing
user-facing is hardcoded anywhere else in the engine. Covers colors,
layout mode, cursor mode, notehead mapping, beam style, bar-number display,
key-signature style and W x H resize.

Main entry points: `resolveConfig`, `DEFAULT_CONFIG`, `EngineConfig` in
`config.ts`. A caller that wants to know what it got wrong should use
`resolveConfigWithDiagnostics`, which returns the same config plus
`ConfigDiagnostic`s for an out-of-range number, an unknown enum value, or a
mistyped field name -- the renderer routes these into the same
`diagnostics` channel a bad score file uses. The defaults a caller does not
override come from `src/notation-defaults/`, where each value sits beside
the public specification or house decision it comes from.
