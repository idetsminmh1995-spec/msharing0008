# The port, and how it is kept honest

This is `Drum/sticking-engine` (Python) in TypeScript, so the drum page
can run it in the browser. **The Python is the reference**; when the two
disagree, the Python is right and this is wrong, in that order.

Why a port at all rather than a service, Pyodide, or precomputing:
`Drum/INTEGRATION-PLAN.md`.

## The layout mirrors the Python, on purpose

| Python | TypeScript |
|---|---|
| `sticking_engine/datamodel.py` | `src/datamodel.ts` |
| `sticking_engine/rule01_input.py` | `src/rule01-input.ts` |
| `sticking_engine/rule08_11_29_39_solver.py` | `src/rule08-11-29-39-solver.ts` |
| … one file per file … | … |
| `sticking_engine/engine.py` | `src/engine.ts` |

`../sticking-engine/RULE_MAP.md` therefore still answers "which file
implements Rule N?" for both. A reorganisation that breaks that mapping
costs more than it saves.

## Parity is a test, not a claim

`scripts/generate_golden.py` runs the **reference** engine over seven
fixtures and writes its output to `test/parity/golden/`.
`test/parity/engine-parity.test.js` runs the port over the same recorded
inputs and asserts:

- **exactly** the same limb, instrument, stroke type, velocity and
  source id for every event, in the same order;
- the same performed times, microtiming and dynamic levels to within
  1e-9 seconds;
- the same validation verdict and the same issue list;
- the same duration.

The fixtures are chosen to be the cases the rules themselves single out,
not seven versions of one beat: a rate no single hand can hold, a
crossing the profile resists, two and then three simultaneous manual
events (three being impossible for two hands), unmapped notes, the exact
ghost and accent velocity thresholds, an empty input, all six genre
idioms, and both Rule 40 search modes.

Regenerate after any change to the Python:

```bash
cd Drum/sticking-engine-ts
python3 scripts/generate_golden.py
npm run verify
```

## Three places the port could not simply be transliterated

**1. Rule 12 draws from CPython's own random number generator.** Every
event's performed time and velocity comes out of
`random.Random(int(sha256(f"{seed}:{event_id}").hexdigest()[:16], 16))`,
and Rule 26 promises the same seed reproduces the same performance —
so the generator is part of the contract, not an implementation detail
a port may swap. `src/core/mt19937.ts` is MT19937 with CPython's
`init_by_array` seeding, `random()`, `uniform()` and `getrandbits()`;
`src/core/sha256.ts` is a synchronous SHA-256. Both are tested against
values from a real interpreter, including 64-bit seeds (the engine's
real ones, which a JS `number` would silently truncate) and the
message-padding boundaries.

**2. Distance has to be CPython's, to the last bit.** See
`src/core/geometry.ts` — `Math.hypot` and `sqrt(dx*dx+dy*dy)` each land
1 ulp from CPython's correctly-rounded `math.dist` on values this kit
produces, and one ulp mirrored an entire 16th-note passage in the first
parity run. The module reproduces `vector_norm` and is checked against
all 400 distances the geometry can produce.

**3. Python's `round()` is banker's rounding.** `round(98.5)` is 98 in
Python and 99 in JavaScript. Velocities land on exact halves often
enough for that to cross Rule 9's ghost/accent thresholds, so
`rule12-humanization.ts` and `rule03-04-timing-density.ts` both round
Python's way.

## How the page uses it

`website/video-create/drum/` loads `assets/sticking-engine.js` next to
`assets/notation-engine.js` and letters every note under the staff. The
bridge lives in the page, not in either engine: it builds the note list
from the parsed score (time from the tempo map, GM number from
`<midi-unpitched>`, velocity derived from the notated dynamic plus the
note's own accent), runs the engine, and puts an R or L at the x the
notation engine reports for that note.

Two details worth knowing before changing it:

- **`resetIdCounter()` is called before every run.** The engine hands
  out `src_00000001`, `src_00000002`… from one counter in note-list
  order, and the page reads that number back to know which note an event
  came from. Without the reset, a second run starts where the first left
  off and every letter lands on the wrong note.
- **Feet get no letter.** An R or L on a kick reads as a stick.

## What is deliberately not ported

`rule01`'s **MIDI-file** path. The Python reads `.mid` with `mido`; the
page feeds a note list built from a score `notation-engine` has already
parsed. Reimplementing a MIDI parser here would be a third one in this
repo. A `.mid` adapter on top of `notation-engine`'s own `parseMidiFile`
is the right home for that, and would be *equivalent*, not
byte-identical — two independent MIDI parsers agreeing on every
malformed file is not a promise worth making.

`notation.print_table`'s stdout formatting is a text helper, not a rule;
`src/notation.ts` returns the lines instead of printing them.
