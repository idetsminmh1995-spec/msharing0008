# src/config

The single typed config schema every other module reads from -- nothing
user-facing is hardcoded anywhere else in the engine. Covers colors,
layout mode, cursor mode, notehead mapping, beam style, bar-number display,
key-signature style and W x H resize.

Main entry points: `resolveConfig`, `DEFAULT_CONFIG`, `EngineConfig` in
`config.ts`. The defaults a caller does not override come from
`src/notation-defaults/`, where each value sits beside the public
specification or house decision it comes from. See
`../Notation Plan/PLAN.md` Part H for the runtime-validation work still
open.
