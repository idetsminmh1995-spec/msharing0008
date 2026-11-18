# src/layout

The two layout modes -- horizontal continuous-scroll (`scroll.ts`) and
paginated (`page.ts`) -- plus the formatter/spacing algorithm (`spacing.ts`,
`spacing-diagnostic.ts`), the vertical system stack and skyline collision
placement (`system.ts`, `skyline.ts`, `skyline-placement.ts`), and responsive
W x H resize (`resize.ts`).

See `../Notation Plan/PLAN.md` Part F (staff/tablature layout), which
covers arbitrary width/height resize and page reflow. `resize.ts` now
carries the public `planResize()` decision (pure-scale vs re-flow), and
`page.ts` grows a page to hold a system taller than its usable height so
page-mode output neither clips nor overlaps.
