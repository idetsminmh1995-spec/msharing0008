# src/theme — SUPERSEDED, empty on purpose

This folder is a leftover Phase-1 placeholder. **No code belongs here.**

Theming was folded into the single typed **`config/`** module rather than
keeping a second parallel system: colours, fonts, sizes, notehead mapping,
beam style, bar-number display and every other visual token all live in
`EngineConfig`. A separate `theme/` module would have been a duplicate
system with an unclear boundary against `config/`.

Extend `src/config/config.ts`, not here. This folder and its README can be
deleted at any time.
