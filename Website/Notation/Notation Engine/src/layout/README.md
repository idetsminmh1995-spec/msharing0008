# src/layout

The two layout modes -- horizontal continuous-scroll (`scroll.ts`) and
paginated (`page.ts`) -- plus the formatter/spacing algorithm (`spacing.ts`,
`spacing-diagnostic.ts`), the vertical system stack and skyline collision
placement (`system.ts`, `skyline.ts`, `skyline-placement.ts`), and responsive
W x H resize (`resize.ts`).

See PLAN.md §14-§16, especially §16.3 (arbitrary
width/height resize, a hard requirement).
