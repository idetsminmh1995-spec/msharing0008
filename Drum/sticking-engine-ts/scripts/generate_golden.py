#!/usr/bin/env python3
"""
Generates the golden files the TypeScript port is asserted against.

Run from `Drum/sticking-engine-ts/`:

    python3 scripts/generate_golden.py

It imports the REFERENCE engine from `../sticking-engine` -- the Python
is the source of truth, and this script never copies logic out of it.
Everything written under `test/parity/golden/` is the Python's own
output, so a parity test that passes means the port agrees with the
engine, not with a second opinion about the engine.
"""
import json
import os
import sys
import random
import hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
REFERENCE = os.path.join(HERE, '..', '..', 'sticking-engine')
GOLDEN = os.path.join(HERE, '..', 'test', 'parity', 'golden')
sys.path.insert(0, REFERENCE)


def write(name, payload):
    os.makedirs(GOLDEN, exist_ok=True)
    path = os.path.join(GOLDEN, name)
    with open(path, 'w') as fh:
        json.dump(payload, fh, indent=1, sort_keys=True)
        fh.write('\n')
    print(f'  {name}')


def deterministic_core():
    """Rule 12's two primitives, on their own, before any engine runs.

    Ported first and tested first because everything downstream is
    downstream of them: if `random.Random(n).uniform()` cannot be
    reproduced, no event's time or velocity can be either.
    """
    hashes = {s: hashlib.sha256(s.encode()).hexdigest() for s in [
        '', 'a', 'abc', '42:evt_00000001:time', '7:evt_00000123:vel',
        'the quick brown fox jumps over the lazy dog',
        'x' * 55, 'x' * 56, 'x' * 63, 'x' * 64, 'x' * 65,
        'unicode: ကခဂ — é',
    ]}

    streams = {}
    for seed in [0, 1, 42, 2 ** 31, 2 ** 32 - 1, 2 ** 32, 2 ** 53 + 1,
                 int('ffffffffffffffff', 16), int('0000000000000001', 16),
                 int(hashlib.sha256(b'42:evt_00000001:time').hexdigest()[:16], 16)]:
        rng = random.Random(seed)
        streams[str(seed)] = {
            'random': [rng.random() for _ in range(6)],
            'uniform': [rng.uniform(-1.2, 1.2) for _ in range(6)],
            'getrandbits8': [rng.getrandbits(8) for _ in range(6)],
        }

    return {'sha256': hashes, 'streams': streams}


# ---------------------------------------------------------------------------
# Full-engine fixtures
# ---------------------------------------------------------------------------

def rock_beat():
    """demo.py's own synthetic two-bar rock beat: hihat 8ths, snare on 2 and
    4, kick on 1 and 3, one ghost note, and a tom fill with a choked crash."""
    notes = []
    step = 0.25
    hits = [
        (0, 42, 95), (0, 36, 105), (1, 42, 88), (2, 38, 112), (3, 42, 88),
        (4, 42, 95), (4, 36, 105), (5, 42, 40), (6, 38, 112), (7, 42, 88),
        (8, 42, 95), (8, 36, 105), (9, 42, 88), (10, 38, 112), (11, 42, 88),
        (12, 50, 100), (13, 48, 98), (14, 45, 100), (15, 36, 104), (15, 49, 115),
    ]
    for beat, note, vel in hits:
        notes.append({"time": beat * step, "note": note, "velocity": vel})
    return notes


def sixteenth_run():
    """A fast single-surface run: the case where one hand physically cannot
    keep up and Rule 8's alternation has to carry it."""
    return [{"time": i * 0.0625, "note": 42, "velocity": 80 + (i % 3) * 10}
            for i in range(32)]


def crossing_run():
    """Hi-hat (far left) and floor tom (far right) alternating quickly --
    the case Rule 6's travel time and Rule 7's crossing aversion fight over."""
    notes = []
    for i in range(16):
        notes.append({"time": i * 0.2, "note": 42 if i % 2 == 0 else 43, "velocity": 96})
    return notes


def simultaneous_stack():
    """Two and then three manual events at the same instant: Rule 11's joint
    solve, and then the case that is physically impossible for two hands."""
    return [
        {"time": 0.0, "note": 42, "velocity": 90},
        {"time": 0.0, "note": 51, "velocity": 90},
        {"time": 0.5, "note": 42, "velocity": 90},
        {"time": 0.5, "note": 51, "velocity": 90},
        {"time": 0.5, "note": 38, "velocity": 90},
        {"time": 1.0, "note": 36, "velocity": 110},
        {"time": 1.0, "note": 44, "velocity": 70},
        {"time": 1.0, "note": 42, "velocity": 90},
    ]


def unmapped_and_edges():
    """Notes outside the GM drum map (dropped by Rule 2), the velocity
    extremes, and a ghost/accent threshold boundary."""
    return [
        {"time": 0.0, "note": 99, "velocity": 100},   # unmapped -> dropped
        {"time": 0.1, "note": 38, "velocity": 1},     # minimum velocity
        {"time": 0.3, "note": 38, "velocity": 50},    # exactly the ghost threshold
        {"time": 0.5, "note": 38, "velocity": 100},   # exactly the accent threshold
        {"time": 0.7, "note": 38, "velocity": 127},   # maximum velocity
        {"time": 0.9, "note": 46, "velocity": 120},   # open hihat + choke-capable
        {"time": 1.1, "note": 37, "velocity": 60},    # cross stick
        {"time": 1.3, "note": 53, "velocity": 90},    # ride bell
    ]


FIXTURES = [
    ("rock-beat-rock-42-HIGH", rock_beat, dict(genre="rock", seed=42, mode="HIGH")),
    ("rock-beat-jazz-7-FAST", rock_beat, dict(genre="jazz", seed=7, mode="FAST")),
    ("sixteenth-run-metal-3-HIGH", sixteenth_run, dict(genre="metal", seed=3, mode="HIGH")),
    ("crossing-run-funk-11-HIGH", crossing_run, dict(genre="funk", seed=11, mode="HIGH")),
    ("simultaneous-latin-5-FAST", simultaneous_stack, dict(genre="latin", seed=5, mode="FAST")),
    ("edges-generic-0-HIGH", unmapped_and_edges, dict(genre="generic", seed=0, mode="HIGH")),
    ("empty-generic-1-HIGH", lambda: [], dict(genre="generic", seed=1, mode="HIGH")),
]


def run_fixture(notes, genre, seed, mode):
    """Runs the REFERENCE engine and returns its result as plain data.

    The ID counter is reset first: the Python's is process-global and
    never resets, so a second fixture in the same process would start at
    whatever the first one left it at, and the port -- which resets
    between fixtures -- could never match. Resetting here makes each
    fixture independent in BOTH implementations.
    """
    import itertools
    from sticking_engine import Engine, EngineConfig
    from sticking_engine import datamodel
    from sticking_engine.datamodel import DrummerStyleProfile, PerformanceIntentContext

    datamodel._id_counter = itertools.count(1)

    engine = Engine(EngineConfig(
        style=DrummerStyleProfile(),
        intent=PerformanceIntentContext(),
        genre=genre, seed=seed, mode=mode,
    ))
    perf = engine.run(note_list=notes)
    return {
        "input": {"notes": notes, "genre": genre, "seed": seed, "mode": mode},
        "output": {
            "seed": perf.seed,
            "engine_version": perf.engine_version,
            "duration_s": perf.duration_s,
            "approved": perf.validation.approved,
            "issues": [
                {"severity": i.severity.value, "code": i.code, "event_id": i.event_id}
                for i in perf.validation.issues
            ],
            "events": [
                {
                    "event_id": e.event_id,
                    "source_id": e.source_id,
                    "time_seconds": e.time_seconds,
                    "limb": e.limb.value,
                    "instrument": e.instrument.value,
                    "stroke_type": e.stroke_type.value,
                    "velocity": e.velocity,
                    "microtiming_offset_ms": e.microtiming_offset_ms,
                    "dynamic_level": e.dynamic_level,
                }
                for e in perf.events
            ],
        },
    }


def kit_distances():
    """Every distance this kit geometry can actually produce, from
    CPython's own correctly-rounded `math.dist`.

    The port computes distances as sqrt(dx*dx + dy*dy), which is NOT
    correctly rounded in general -- it is used because `Math.hypot` in V8
    lands 1 ulp from CPython on values this engine hits constantly, and
    that ulp was enough to mirror an entire 16th-note passage. This file
    turns "they agree over this kit's range" from an assumption into a
    fact a test checks.
    """
    import math
    from sticking_engine.rule02_mapping import DrumMappingProfile
    from sticking_engine.rule06_reachability import neutral_position
    from sticking_engine.datamodel import Limb

    points = []
    profile = DrumMappingProfile()
    for instrument, target in profile.targets.items():
        points.append((instrument.value, target.x, target.y))
    for limb in Limb:
        pos = neutral_position(limb)
        points.append((f'neutral_{limb.value}', pos[0], pos[1]))

    pairs = []
    for name_a, ax, ay in points:
        for name_b, bx, by in points:
            pairs.append({
                'from': name_a, 'to': name_b,
                'x1': ax, 'y1': ay, 'x2': bx, 'y2': by,
                'distance': math.dist((ax, ay), (bx, by)),
            })
    return {'points': [{'name': n, 'x': x, 'y': y} for n, x, y in points], 'pairs': pairs}


def main():
    print('golden files:')
    write('kit-distances.json', kit_distances())
    write('deterministic-core.json', deterministic_core())
    for name, make_notes, cfg in FIXTURES:
        write(f'{name}.json', run_fixture(make_notes(), **cfg))
    write('index.json', [name for name, _, _ in FIXTURES])


if __name__ == '__main__':
    main()
