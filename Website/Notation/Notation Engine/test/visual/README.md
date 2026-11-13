# test/visual

Visual/snapshot-regression tests -- headless SVG render -> pixel/DOM
snapshot compare, so every later phase has a regression safety net.

See PLAN.md Phase 8 and `../../Doc/phase-08-testing-harness.md` for the
full record. `rendering.test.js` + `__snapshots__/` hold the actual
snapshot-compare test.
