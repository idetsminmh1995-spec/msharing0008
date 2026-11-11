# src/core

The instrument-agnostic score model: `Pitch`, `Duration`, `Note`, `Rest`,
`Chord`, `Voice`, `Measure`, `Part`, and `Score`. It contains musical and
measure-local event data, not rendering geometry or SVG.

`Note`, `Rest`, and `Chord` may carry `startTick`, the event onset measured
from the beginning of its measure. The MusicXML parser supplies this value
from its cursor; callers building a `Score` directly can supply it through the
same typed factories. When omitted, timing consumers retain their sequential
duration fallback for simple hand-built scores. Explicit positions must be
finite and non-negative; fractional ticks are allowed for fine subdivisions.

See PLAN.md §6 and §4.3 (the "any instrument, any line count" architectural
requirement) and Phase 4 (duration/tick math).
