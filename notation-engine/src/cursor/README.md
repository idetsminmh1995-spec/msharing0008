# src/cursor — SUPERSEDED, empty on purpose

This folder is a leftover Phase-1 placeholder. **No code belongs here.**

`PLAN.md` v2 replaced the "cursor" module with a broader
**`playback/`** module (§17): a position API plus an event stream that a host
application drives a cursor, an animation, or a video renderer from. The two
cursor sync modes v1 planned as separate phases are now one module with a
`mode` option (§2.4).

Build that work in `src/playback/`, not here. This folder and its README can
be deleted once `playback/` exists.
