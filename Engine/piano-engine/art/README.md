# art/

The owner's own hand drawings, kept here as the SOURCE for
`src/hand/artwork.ts`.

- **`Hands.svg`** — two mirrored hands, fingers up, wrists down, filled
  `#FFD6A4`, on a 2100×2100 canvas (Adobe Illustrator 24.3). This is
  the one the engine draws: its LEFT-hand path (the one starting at
  `M530.4,893.1`) was converted into `HAND_OUTLINE`, and the right hand
  is that outline mirrored, exactly as the file itself does it.
- **`Hand.svg`** — one hand, black, on a 2836×2836 canvas. Kept because
  the owner supplied it; nothing reads it. It is a flatter, more
  iconic hand, and the engine wanted the one with real finger
  silhouettes.

These files are not loaded at runtime. `src/hand/artwork.ts` carries
the outline as absolute cubic segments already converted into white
keys, so the bundle has no asset to fetch and no second place for the
drawing to disagree with itself. The conversion is documented, with its
measurements, at the top of that file; this folder is what it was
measured FROM.
