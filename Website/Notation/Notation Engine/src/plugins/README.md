# src/plugins — DEFERRED, empty on purpose

This folder is a leftover Phase-1 placeholder. **No code belongs here yet.**

The plugin/extension-point system is deferred: no concrete extension use
case exists yet, and designing a plugin API before knowing what plugins
are for produces the wrong API. The module boundaries already allow new
features to be added without touching engine internals.

If a real extension need appears, write it into `../Notation Plan/PLAN.md`
first (Part I), then build it here.
