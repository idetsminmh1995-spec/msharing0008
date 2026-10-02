# metronome-engine

Eleven metronome video designs, written in TypeScript and drawn as SVG.
Each one lays itself out for **16:9, 9:16 and 1:1** — thirty-three
layouts in all — and none of them is a scaled copy of another.

```ts
import { renderMetronomeFrame, listDesigns } from 'metronome-engine';

const svg = renderMetronomeFrame({
  design: 'sweep-dial',
  aspect: '9x16',
  frame: {
    beat: 3,
    beatsPerBar: 4,
    phase: 0.35,          // 0 at the instant of the beat, 1 just before the next
    bar: 2,
    bpm: 120,
    timeSignature: { numerator: 4, denominator: 4 },
  },
  title: 'Lesson 5',
  logoUrl: '/assets/logo/mark.webp',
});
```

## The designs

| # | id | What makes it different | Look |
|---|---|---|---|
| 1 | `pendulum` | The instrument itself: a neon case with an arm swinging over its scale. | Black & neon red |
| 2 | `beat-dots` | One dot per beat — a row, a column or an arc. | Black & red |
| 3 | `pulse-ring` | Rings thrown outward on each beat, fading as they grow. | Night blue |
| 4 | `bar-meter` | Columns that stay filled, so you see what is LEFT of the bar. | Paper & ink |
| 5 | `sweep-dial` | One continuous sweep round the whole bar. | Charcoal & amber |
| 6 | `big-number` | The count filling the frame; the rest is a thin rail. | White & red |
| 7 | `segment-ring` | The same circle as 5, read as discrete wedges. | Deep green |
| 8 | `travel-line` | A marker on a track: across, down, or right round the frame. | Off-white & ink blue |
| 9 | `flash-frame` | A border that flares on the beat — for peripheral vision. | True black & hot red |
| 10 | `bounce-ball` | A ball that arcs and LANDS, so the contact is what you read. | Cream & orange |
| 11 | `stack-blocks` | Accumulates: a bar of 7 looks different from a bar of 3. | Slate & violet |

**There is no black/white switch.** The look belongs to the design:
picking design 6 is picking white-and-red the same way it is picking a
big number. Six of the eleven are dark and five are light, deliberately
mixed — a list where every other entry changes ground is far easier to
tell apart in a picker than eleven variations on black.

## What a design is, and is not

A design is handed one frame's state and returns that frame's SVG. It
never reads a clock, an audio element or the DOM — which is what lets
the same call render a live preview, an exported frame and a test, with
nothing able to differ between them.

Designs also never name a colour or a canvas size. Those come from
`theme.ts` and `layout.ts`, so a palette can be re-cut without opening a
single design file, and 9:16 is a genuinely different arrangement rather
than 16:9 squeezed sideways.

## The frame's furniture

Two things sit in the same place in all thirty-three layouts, because a
channel's worth of videos should not move them around:

- **The logo is always the top-left corner.** A mark that moves between
  designs is a mark the eye has to hunt for, and on a run of videos the
  corner it sits in IS the branding. Its size is one constant,
  `LOGO_FRACTION`, read by both `logoBox` and `bands` — the top band
  reserves room for the mark, so a size those two disagreed about would
  let a design draw underneath it. With no logo, nothing is drawn at all
  — a placeholder box in an exported video is worse than empty space.
- **The tempo and the metre are large, and always the same two
  colours.** The tempo figure in yellow with `BPM` under it in red, and
  the metre's figures in that same yellow either side of a red slash —
  a sixth of the short side, not a line of small type in a corner. On a
  lesson video the tempo is the second thing a viewer looks for after
  the count, and it has to survive being watched on a phone. The pair
  does NOT take each design's own accent: one treatment across all
  eleven means a viewer who has watched one of these videos knows where
  to look in the next. Only the ground moves it — on a light design the
  yellow deepens to a gold, because `#F9D100` on paper is a figure
  nobody can read.

  It is `tempoStats`, drawn by the renderer for every design, and it
  keeps its own room: a column down each side in landscape, a row along
  the bottom in the two narrow shapes, reserved out of `bands` so no
  design can draw into it. Its type is fitted to that room rather than
  the room to the type, so a three-figure tempo and a 12/8 bar change
  nothing about where anything sits.

A design may set `ownHeader` and draw its own title and mark instead.
`pendulum` is the only one that does: its big title with a rule under it
is the design, and the shared header would put a second one on top of
it. The readout is never a design's business — `pendulum` used to carry
its own copy of exactly this arrangement, and a second copy is a second
thing to keep in step.

## Ratios

| aspect | canvas | what changes |
|---|---|---|
| `16x9` | 1920×1080 | Title left; the readout flanks the stage, a column each side; wide designs run horizontally. |
| `9x16` | 1080×1920 | Title centred and shallow; the readout is a row along the bottom; the stage takes far more of the frame, and horizontal runs become vertical ones. |
| `1x1` | 1080×1080 | Centred stack, readout along the bottom; rows become arcs and loops. |

## Build

```
npm run verify    # typecheck, lint, format, tests
npm run build     # dist/metronome-engine.js -> window.MetronomeDesigns
```

`website/assets/metronome-engine.js` is a copy of that bundle, which
`website/video-create/metronome/` loads.
