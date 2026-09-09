# Notation Engine 2 (VexFlow)

Pre-built browser bundle of [VexFlow](https://github.com/vexflow/vexflow), built
from the official source (`vexflow/build/cjs/vexflow.js`) as an alternative to
the alphaTab-based Notation Engine (kept untouched in `notation-engine/`).

## Important difference from alphaTab

VexFlow is a **low-level rendering library only** — it draws notes/staves/etc.
from data you construct yourself (Note, Voice, Formatter, Renderer objects).
Unlike alphaTab, VexFlow has **no built-in**:
- MusicXML or MIDI importer (we'd need to parse MusicXML ourselves and map it
  to VexFlow's own API calls)
- Playback cursor or scroll/sync mechanism (we'd need to build position
  tracking and a moving cursor from scratch)

This means more custom work than the alphaTab integration, but also more
direct control over exactly how notes/cursor/scroll behave — which may better
suit the "fixed cursor, notation scrolls" design we're going for.

## What's in here

```
notation-engine-2/
  vexflow/
    build/cjs/
      vexflow.js       -- full bundle (rendering + bundled Bravura font), what the app loads
      vexflow-core.js  -- core only, no bundled font (smaller, needs font loaded separately)
      vexflow-bravura.js
    LICENSE
```

The app would load `notation-engine-2/vexflow/build/cjs/vexflow.js` directly
from this same GitHub Pages repo (same-origin, matching how the alphaTab
build is loaded), once MusicXML parsing + rendering + cursor logic is built
on top of it.

## Rebuilding after making changes

```bash
git clone https://github.com/vexflow/vexflow.git
cd vexflow
PUPPETEER_SKIP_DOWNLOAD=true npm install   # puppeteer (dev-only, for visual tests) fails to download otherwise
npx grunt build:cjs                        # builds build/cjs/*.js -- this is the part we actually use
```

Copy the new `build/cjs/` here afterward, replacing the old one.
