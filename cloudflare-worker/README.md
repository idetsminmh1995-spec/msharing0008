# Drum Asset Worker (Cloudflare)

A thin Cloudflare Worker that proxies the `msharing0008` R2 bucket for the
Drum MIDI → Video app. The frontend never talks to R2 directly — it only
calls this Worker, which holds the R2 binding.

Live at: **https://msharing-api.idetsminmh1995.workers.dev** — the URL
both video pages have as `API_BASE`. In the Cloudflare dashboard that is
the Worker named **msharing-api**, which is the one to edit; a Worker of
another name may answer on its own URL, but no page is calling it.

## R2 bucket layout expected

```
drums/
  {Brand}/
    {Model}/
      16x9/
        Drum Bg.png
        R{note}.png
        L{note}.png
      9x16/
        ...
      1x1/
        ...
```

Two real folders, e.g.

```
drums/MSDrums/MS Drum 1/16x9/Drum Bg.png
drums/MSDrums/MS Drum 1/9x16/Drum Bg.png
drums/RolandDrums/TD-27/16x9/R38.png
```

- The **brand folder** fills the Brand dropdown, the **model folder**
  inside it fills Drum Kit. Adding a brand is making a folder; adding a
  kit is making one inside it. Nothing in the code names either.
- Aspect folders are named `16x9`, `9x16`, `1x1` (no colon — URL-safe).
- The background image is named `Drum Bg.png` and sits directly in the
  aspect folder (no separate `Bg/` subfolder).
- Upload your Drum Set folders into the `msharing0008` bucket following this
  structure (Cloudflare dashboard drag-and-drop, `wrangler r2 object put`,
  or rclone). New Drum Sets are picked up automatically — nothing to change
  in code.

### Kits filed the old way still work

The bucket used to hold kits one level down — `drums/{name}/16x9/` —
with the brand written into the name. Those folders are still listed,
so nothing has to be moved before new kits land beside them:

```
drums/MSDrums/MS Drum 1/16x9/...          -> MSDrums /  MS Drum 1   (folders)
drums/Yamaha - Stage Custom/16x9/...      -> Yamaha  /  Stage Custom (name)
drums/Pearl | Masters Maple/16x9/...      -> Pearl   /  Masters Maple
drums/Tama__Starclassic/16x9/...          -> Tama    /  Starclassic
drums/drum1/16x9/...                      -> Other   /  drum1
```

A folder directly under `drums/` is read as a kit when its own children
are aspect folders, and as a brand when they are not — the bucket's
shape answers it, so no name has to be reserved. Only for those old
one-level folders does the page still split the NAME, on a **spaced**
separator (` - `, ` – `, ` — `, ` | `) or a **double underscore**
(`__`); a bare hyphen is not one, so `Stage-Custom` stays a model name.
A name with no separator appears under **Other**.

New kits should use the two folders. It is the same information without
the guessing: a model called `MS Drum 1 - Studio` cannot be read as a
brand when the brand is a folder of its own.

### Hit photos: `R{note}.png` / `L{note}.png` — or just `{note}.png`

Each of these is a **full-frame overlay** of the stick or foot that
plays that drum, composited over `Drum Bg.png`. The drum page lights one
as each note is played, and which side it picks comes from the sticking
engine (`Drum/`).

Hands carry a side, feet do not:

```
drums/MSDrums/MS Drum 1/16x9/R38.png    right hand on the snare
drums/MSDrums/MS Drum 1/16x9/L38.png    left hand on the snare
drums/MSDrums/MS Drum 1/16x9/36.png     kick 36
drums/MSDrums/MS Drum 1/16x9/35.png     kick 35 -- a different photo, not the same drum
drums/MSDrums/MS Drum 1/16x9/44.png     the hi-hat pedal
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

### Count voice: `Counts vocal/M{n}.wav`

The second voice, and `{n}` is the **beat of the bar** -- not the bar
number:

```
Counts vocal/M1.wav   Counts vocal/M2.wav   Counts vocal/M3.wav   ...
```

served at `/assets/shared/Counts%20vocal/M1.wav` -- the space in the
folder name is fine, the Worker decodes each path segment before
building the R2 key.

Two cards read them, and both count beats:

- **Count Voice** (card 5) counts every beat of every bar for the whole
  piece: `M1 M2 M3 M4 | M1 M2 M3 M4 | ...`. Four samples count a
  hundred bars, because the number is where you are in the BAR.
- **Count-in Style B** (card 4) counts the one count-in bar with these
  instead of the `Voices/` numbers. Same four beats, different voice.

Upload one per beat of your longest bar (`M1`-`M4` covers 4/4, `M1`-`M6`
covers 6/8, `M1`-`M12` covers 12/8). The beat times come from the
score's own performance timeline, so repeats are already unfolded and a
tempo change moves the rest of its bar with it. A beat with no sample
passes in silence and the hint under card 5 names which; in the
count-in it falls back to the synthesised click instead, so a count-in
is always audible.

### Thank You clip: `Thank Video/{aspect}/{kind}/{aspect} {Colour} {Kind}.mp4`

The ending both video pages append to a generated take:

```
Thank Video/16x9/drum/16x9 Black Drum.mp4
Thank Video/16x9/drum/16x9 White Drum.mp4
Thank Video/9x16/metronome/9x16 Black Metronome.mp4
```

The folder is the aspect and then the instrument in lower case; the
file name repeats the aspect, then the frame's colour and the
instrument capitalised. Served at
`/assets/shared/Thank%20Video/16x9/drum/16x9%20Black%20Drum.mp4`.

**The instrument word is the bucket's, not the code's.** The Piano
page's clips are filed under **`paino`**, so that is what the page
asks for:

```
Thank Video/16x9/paino/16x9 Black Paino.mp4
Thank Video/16x9/paino/16x9 White Paino.mp4
Thank Video/9x16/paino/9x16 Black Paino.mp4
Thank Video/9x16/paino/9x16 White Paino.mp4
Thank Video/1x1/paino/1x1 Black Paino.mp4
```

Renaming the folder in R2 is a one-word change in the page (`kind`),
and the walk outward below keeps takes closing while the two disagree.

Which one a page asks for follows the frame it just recorded: the Drum
page uses its Video Style radio, and the Metronome page uses whether
the chosen design's palette is light or dark -- the design owns the
look there, so a white design should not end on a black card.

The Metronome page's INSTRUMENT is per design, because not every one
of the eleven has an ending of its own yet. `OUTRO_KIND` in that page
names the ones that are spoken for and everything else falls through
to `metronome`. Today it holds one entry: **`pendulum` closes with the
`drum` clip**. Giving another design its own ending is a line there
plus the file in the bucket, and thanks to the walk outward below the
line can go in first.

**A bucket with only some of them still works.** Each page tries the
exact match, then the same clip in the other colour, then the drum clip
of the same shape, and finally `Thank Video/16x9/drum/16x9 Black
Drum.mp4`. With none of them uploaded the take is written without an
ending and the message under the button says so, rather than failing.

The clip is downloaded in full BEFORE recording starts -- a download
landing mid-take shows up as dropped frames -- and played from a blob,
because a `<video>` streaming from the Worker's origin would taint the
canvas being recorded and would want Range requests the Worker does not
answer.

## Endpoints

- `GET /api/drum-sets` → every kit in the bucket, as folders:
  `{ "kits": [{ "path": "MSDrums/MS Drum 1", "brand": "MSDrums", "model": "MS Drum 1" }, ...], "drumSets": ["MSDrums/MS Drum 1", ...] }`.
  `brand` is `null` for a kit filed straight under `drums/`. `drumSets`
  is the same list as bare paths, kept so a page deployed before the
  Worker keeps listing kits instead of going blank between the two.
- `GET /api/drum-sets/:brand/:model/:aspect/manifest` → asset filenames for
  that kit + aspect ratio, e.g.
  `{ "drumSet": "MSDrums/MS Drum 1", "aspect": "16x9", "hasBackground": true, "backgroundFile": "Drum Bg.png", "files": ["R38.png", "L38.png", ...] }`.
  `:aspect` is one of `16x9`, `9x16`, `1x1`, and a kit filed one level
  down asks for it one segment shorter — the aspect is what the Worker
  splits the path on, not a fixed segment count.
- `GET /assets/:brand/:model/:aspect/*filePath` → streams the actual PNG,
  e.g. `/assets/MSDrums/MS%20Drum%201/16x9/Drum%20Bg.png`.

## Local development

```bash
npm install
npm run dev
```

## Deploy

**The live Worker is edited in the Cloudflare dashboard.** `src/index.ts`
in this repo is a reference copy and can lag behind what is deployed, so
read the dashboard before assuming what is running — and if Workers
Builds is still connected to this repo, a push to `main` would deploy
this copy over the dashboard's. Check that it is switched off, or keep
the two in step yourself.

To deploy from a checkout instead:

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
