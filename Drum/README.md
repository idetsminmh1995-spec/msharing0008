# `/Drum`

Everything in this folder is **drum-specific**, and that is the whole
point of it existing.

The rest of the repo is deliberately instrument-agnostic —
`notation-engine/` renders any MusicXML for any instrument, and knows
about percussion only as one clef among eight. The work in here is the
opposite: it only makes sense for a drum kit, because it reasons about
two hands, two feet, and how far a stick can travel between a hi-hat and
a floor tom in the time the music allows.

## `/Drum/sticking-engine`

A Python engine that takes a drum MIDI file (or a plain note list) and
decides, for every single note:

- **which limb** plays it — right hand, left hand, right foot, left foot;
- **what technique** the stroke uses — single, accent, ghost, rim shot,
  choke, …;
- **when the limb has to move** to get there, and whether it physically
  can.

It implements all 40 rules of the sticking specification. The rule
documents themselves are kept alongside the code in
`sticking-engine/original_rules/`, and `sticking-engine/RULE_MAP.md` is
the traceability table: rule number → the module that implements it.

### Running it

```bash
pip install mido --break-system-packages   # its one external dependency
cd Drum/sticking-engine
python3 demo.py                                    # built-in synthetic rock beat
python3 demo.py test_beat.mid --genre jazz --seed 7 --mode FAST
```

Verified here on both paths. The synthetic beat resolves to alternating
hands on the hi-hat, rim shots on 2 and 4, the ghost note detected from
its velocity, a three-tom fill and a choked crash, with
`Approved: True  Issues: 0`.

## `/Drum/sticking-engine-ts`

The same engine in TypeScript, so the browser can run it. Parity-tested
against the Python above, event by event — see `PORT.md` for what
"parity" is asserted to mean and for the three things that could not be
transliterated (CPython's random number generator, its correctly-rounded
`math.dist`, and its banker's rounding). `INTEGRATION-PLAN.md` at this
folder's root says why a port rather than a service, Pyodide or
precomputing.

```bash
cd Drum/sticking-engine-ts
npm install
npm run verify       # typecheck, lint, format, and the parity suite
python3 scripts/generate_golden.py   # re-record the Python's output
```

### Where it fits

The drum video page (`website/video-create/drum/`) shows a **Human
Sticking Engine** pill next to **Notation Engine** and **Video Engine**.
It is now that engine, live: card 5 letters every note the score
contains with the hand that plays it, under the staff, at the same x as
the notehead.

The bridge between the two engines is deliberately thin, and lives in
the page rather than in either engine:

```
MusicXML ──notation-engine──▶ score + playback data
                                      │
                    time, GM drum number, velocity
                                      │
                            sticking-engine (the port)
                                      │
                             limb per note ──▶ R / L
```

Velocities are DERIVED from what the score notates — the prevailing
dynamic marking, plus the note's own accent — because MusicXML has no
velocities and the sticking engine reads them for its ghost and accent
thresholds. A made-up number would show up as a made-up articulation.
Notes with no `<midi-unpitched>` instrument are skipped rather than
guessed at: a wrong GM number is a note placed on the wrong drum.

**Feet are not lettered.** An R or L on a kick reads as a stick.

## A note on the two uploads

This folder came from two archives, `Drum_Sticking_Engine.zip` and
`Sticking_Engine_Rules_01-40_41-files.zip`. The second one is
**byte-identical** to the first one's `original_rules/` directory
(verified file by file), so it is stored once rather than twice. Nothing
from either archive was dropped.

## `test_beat.mid`

The repo's root `.gitignore` ignores `*.mid`, which is right for the
sample files people drag in while testing. This one is different — it is
a 185-byte fixture the demo above is documented to take — so it has an
explicit exception in `.gitignore`. Without it the module would arrive
missing a file its own README tells you to run.
