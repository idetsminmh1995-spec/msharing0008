# src/plugins — DEFERRED, empty on purpose

This folder is a leftover Phase-1 placeholder. **No code belongs here yet.**

`PLAN.md` v2 deferred the plugin/extension-point system (§2.4): no
concrete extension use case exists yet, and designing a plugin API before
knowing what plugins are for produces the wrong API. The module boundaries in
§4 already allow new features to be added without touching engine internals.

If a real extension need appears, specify it in `PLAN.md` first, then
build it here.
