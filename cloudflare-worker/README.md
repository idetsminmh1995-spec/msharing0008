# Drum Asset Worker (Cloudflare)

A thin Cloudflare Worker that proxies the `msharing0008` R2 bucket for the
Drum MIDI → Video app. The frontend never talks to R2 directly — it only
calls this Worker, which holds the R2 binding.

Live at: **https://msharing0008.idetsminmh1995.workers.dev**

## R2 bucket layout expected

```
drums/
  {drumSetName}/
    16x9/
      Drum Bg.png
      R{note}.png
      L{note}.png
    9x16/
      ...
    1x1/
      ...
```

- Aspect folders are named `16x9`, `9x16`, `1x1` (no colon — URL-safe).
- The background image is named `Drum Bg.png` and sits directly in the
  aspect folder (no separate `Bg/` subfolder).
- Upload your Drum Set folders into the `msharing0008` bucket following this
  structure (Cloudflare dashboard drag-and-drop, `wrangler r2 object put`,
  or rclone). New Drum Sets are picked up automatically — nothing to change
  in code.

### Naming a drum set: `Brand - Model`

The drum page shows **Brand** and **Model** as two dropdowns, and it
derives both from the folder name — the Worker is not involved and the
bucket needs no reorganising.

```
drums/Yamaha - Stage Custom/16x9/...      -> Yamaha  /  Stage Custom
drums/Pearl | Masters Maple/16x9/...      -> Pearl   /  Masters Maple
drums/Tama__Starclassic/16x9/...          -> Tama    /  Starclassic
drums/drum1/16x9/...                      -> Other   /  drum1
```

The separator must be **spaced** (` - `, ` – `, ` — `, ` | `) or a
**double underscore** (`__`). A bare hyphen is not a separator, so
`Stage-Custom` stays one model name rather than becoming a brand called
"Stage". A folder with no separator keeps working exactly as it always
has — it just appears under **Other**.

### Hit photos: `R{note}.png` / `L{note}.png` — or just `{note}.png`

Each of these is a **full-frame overlay** of the stick or foot that
plays that drum, composited over `Drum Bg.png`. The drum page lights one
as each note is played, and which side it picks comes from the sticking
engine (`Drum/`).

Hands carry a side, feet do not:

```
drums/{set}/16x9/R38.png    right hand on the snare
drums/{set}/16x9/L38.png    left hand on the snare
drums/{set}/16x9/36.png     kick 36
drums/{set}/16x9/35.png     kick 35 -- a different photo, not the same drum
drums/{set}/16x9/44.png     the hi-hat pedal
```

- A **hand** needs its side, because the photo is a stick coming from
  the left or from the right: `R38.png` and `L38.png` are two different
  pictures of the same snare.
- A **foot** does not, because a pedal going down looks the same
  whichever foot pushed it. The kick and the hi-hat pedal are the bare
  `{note}.png`.
- **The note number is never swapped for another one.** General MIDI
  calls both 35 and 36 a kick, but in a bucket they are two different
  kick photos, so a score written with 35 lights `35.png` and nothing
  else. Lighting `36.png` instead would be lighting the wrong drum.
- If the photo for a stroke's own number is missing, the stroke is
  skipped and the browser console names exactly which limb and which
  drum had no photo, rather than lighting a neighbour's picture. (The
  opposite naming — `R36.png` for a foot, `38.png` for a hand — is
  still accepted as a last resort, since that is the same note number
  and only the side prefix differs.)

### Count voices: `Voices/{n}.wav`

The count-in reads its voice samples from the **shared** (non-drum-set)
area, one per beat of the bar:

```
Voices/1.wav   Voices/2.wav   Voices/3.wav   ...
```

served at `/assets/shared/Voices/1.wav`. Upload as many as your longest
bar needs (`1`–`6` covers 6/8; `1`–`12` covers 12/8). **Nothing breaks
if they are absent**: the page synthesises a count instead and says so
under the Count-in card, so a missing sample is never silence you have
to diagnose.

### Bar announcements: `Counts vocal/M{n}.wav`

Two cards read these. **Count Voice** (card 5) names the bar you are in
at every bar of the piece, and **Count-in Style B** (card 4) names the
bar at the top of each count-in bar instead of counting its beats. Both
come from the same shared area:

```
Counts vocal/M1.wav   Counts vocal/M2.wav   Counts vocal/M3.wav   ...
```

served at `/assets/shared/Counts%20vocal/M1.wav` — the space in the
folder name is fine, the Worker decodes each path segment before
building the R2 key.

The number is the **written** bar number, taken from the score's own
performance timeline, so a repeated bar 5 is announced as `M5` again on
the second pass rather than as `M9`, and tempo changes are already
folded into when it fires. Upload as many as your longest lesson needs;
a bar with no sample simply passes in silence and the hint under the
card names which ones those were. In the count-in, a bar with no sample
falls back to the synthesised click rather than going quiet, so a
count-in is always audible.

## Endpoints

- `GET /api/drum-sets` → `{ "drumSets": ["drum1", ...] }`
- `GET /api/drum-sets/:drumSet/:aspect/manifest` → asset filenames for that
  drum set + aspect ratio, e.g.
  `{ "drumSet": "drum1", "aspect": "16x9", "hasBackground": true, "backgroundFile": "Drum Bg.png", "files": ["R38.png", "L38.png", ...] }`.
  `:aspect` is one of `16x9`, `9x16`, `1x1`.
- `GET /assets/:drumSet/:aspect/*filePath` → streams the actual PNG, e.g.
  `/assets/drum1/16x9/Drum%20Bg.png` or `/assets/drum1/16x9/R38.png`.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Deployed automatically via Cloudflare Workers Builds (GitHub-connected) on
every push to `main`. To deploy manually instead:

```bash
npx wrangler login   # first time only
npm run deploy
```

The R2 bucket binding (`DRUM_ASSETS` → `msharing0008`) is already configured
in the root `wrangler.toml`. Before going to production, set
`ALLOWED_ORIGINS` to your actual Cloudflare Pages frontend URL instead of `"*"`.

## Security notes

- No R2 credentials ever reach the browser — only this Worker has the binding.
- `..` path segments are rejected to prevent path traversal into unrelated keys.
- CORS is restricted via `ALLOWED_ORIGINS`; tighten it before production.
