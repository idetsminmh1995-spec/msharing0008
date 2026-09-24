# metronome-engine

Eleven metronome video designs, written in TypeScript and drawn as SVG.
Each one lays itself out for **16:9, 9:16 and 1:1** — thirty-three
layouts in all — and none of them is a scaled copy of another.

```ts
import { renderMetronomeFrame, listDesigns } from 'metronome-engine';

const svg = renderMetronomeFrame({
  design: 'sweep-dial',
  aspect: '9x16',
  style: 'black',
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

| # | id | What makes it different |
|---|---|---|
| 1 | `pendulum` | The instrument itself: a weighted arm swinging over a scale. |
| 2 | `beat-dots` | One dot per beat — a row, a column or an arc. |
| 3 | `pulse-ring` | Rings thrown outward on each beat, fading as they grow. |
| 4 | `bar-meter` | Columns that stay filled, so you see what is LEFT of the bar. |
| 5 | `sweep-dial` | One continuous sweep round the whole bar. |
| 6 | `big-number` | The count filling the frame; the rest is a thin rail. |
| 7 | `segment-ring` | The same circle as 5, read as discrete wedges. |
| 8 | `travel-line` | A marker on a track: across, down, or right round the frame. |
| 9 | `flash-frame` | A border that flares on the beat — for peripheral vision. |
| 10 | `bounce-ball` | A ball that arcs and LANDS, so the contact is what you read. |
| 11 | `stack-blocks` | Accumulates: a bar of 7 looks different from a bar of 3. |

## What a design is, and is not

A design is handed one frame's state and returns that frame's SVG. It
never reads a clock, an audio element or the DOM — which is what lets
the same call render a live preview, an exported frame and a test, with
nothing able to differ between them.

Designs also never name a colour or a canvas size. Those come from
`theme.ts` and `layout.ts`, so the black/white switch is one decision
rather than eleven, and 9:16 is a genuinely different arrangement
rather than 16:9 squeezed sideways.

## Ratios

| aspect | canvas | what changes |
|---|---|---|
| `16x9` | 1920×1080 | Title left, tempo right; wide designs run horizontally. |
| `9x16` | 1080×1920 | Title centred and shallow; the stage takes far more of the frame, and horizontal runs become vertical ones. |
| `1x1` | 1080×1080 | Centred stack; rows become arcs and loops. |

## Build

```
npm run verify    # typecheck, lint, format, tests
npm run build     # dist/metronome-engine.js -> window.MetronomeDesigns
```

`website/assets/metronome-engine.js` is a copy of that bundle, which
`website/video-create/metronome/` loads.
