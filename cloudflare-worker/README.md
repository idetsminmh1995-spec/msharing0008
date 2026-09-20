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

Both namings work, and the page prefers whichever suits the limb:

```
drums/{set}/16x9/R38.png    right hand on the snare
drums/{set}/16x9/L38.png    left hand on the snare
drums/{set}/16x9/36.png     the kick -- one pedal photo serves either foot
drums/{set}/16x9/44.png     the hi-hat pedal
```

- A **hand** needs its side, because the photo is a stick coming from
  the left or from the right. `R{note}.png` is tried first, then the
  bare `{note}.png`.
- A **foot** usually does not, so the bare `{note}.png` is tried first,
  then `R{note}.png`/`L{note}.png`. A kit that uploaded only `36.png`
  for the kick is not missing anything.
- If neither exists, **the same drum's other GM numbers are tried** —
  35 and 36 are both a kick, 41 and 43 both a floor tom — so a bucket
  with `36.png` still lights for a score written with 35.
- If none of those exists the stroke is skipped, and the Sticking card
  names exactly which limb and which drum had no photo, rather than
  lighting a neighbour's picture.

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
