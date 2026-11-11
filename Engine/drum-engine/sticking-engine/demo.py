#!/usr/bin/env python3
"""
demo.py — runnable example for the sticking_engine package.

Usage:
    python3 demo.py                      # runs the built-in synthetic beat
    python3 demo.py path/to/song.mid      # runs your own MIDI file (drum channel 10)
    python3 demo.py path/to/song.mid --genre jazz --seed 7 --mode FAST

Output:
    - a printed sticking table in the terminal
    - a JSON export at ./output_performance.json
"""

import sys
import argparse
from sticking_engine import Engine, EngineConfig
from sticking_engine.datamodel import DrummerStyleProfile, PerformanceIntentContext, Hand
from sticking_engine import notation


def synthetic_rock_beat():
    """A simple two-bar rock beat: hihat 8ths, snare on 2 & 4, kick on 1 & 3,
    with a ghost note and a short tom fill at the end of bar 2."""
    notes = []
    step = 0.25  # 8th notes at 120bpm
    hits = [
        # (beat_index, note, velocity)
        (0, 42, 95), (0, 36, 105),
        (1, 42, 88),
        (2, 38, 112),
        (3, 42, 88),
        (4, 42, 95), (4, 36, 105),
        (5, 42, 40),   # ghost
        (6, 38, 112),
        (7, 42, 88),
        # bar 2
        (8, 42, 95), (8, 36, 105),
        (9, 42, 88),
        (10, 38, 112),
        (11, 42, 88),
        (12, 50, 100),   # fill: high tom
        (13, 48, 100),   # fill: mid tom
        (14, 45, 100),   # fill: low tom
        (15, 49, 115),   # crash
        (15, 36, 105),   # kick under crash
    ]
    for beat_i, note, vel in hits:
        notes.append({"time": beat_i * step, "note": note, "velocity": vel})
    return notes


def main():
    parser = argparse.ArgumentParser(description="Drum sticking engine demo")
    parser.add_argument("midi", nargs="?", default=None, help="path to a .mid file")
    parser.add_argument("--genre", default="rock")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--mode", default="HIGH", choices=["FAST", "HIGH"])
    parser.add_argument("--dominant", default="R", choices=["R", "L"])
    parser.add_argument("--out", default="output_performance.json")
    args = parser.parse_args()

    style = DrummerStyleProfile(dominant_hand=Hand.RIGHT if args.dominant == "R" else Hand.LEFT)
    intent = PerformanceIntentContext()
    engine = Engine(EngineConfig(
        style=style, intent=intent, genre=args.genre, seed=args.seed, mode=args.mode,
    ))

    if args.midi:
        performance = engine.run(midi_path=args.midi)
    else:
        print("(no MIDI file given — running the built-in synthetic rock beat)\n")
        performance = engine.run(note_list=synthetic_rock_beat())

    notation.print_table(performance)
    print()
    print(f"Approved: {performance.validation.approved}  "
          f"Issues: {len(performance.validation.issues)}  "
          f"Duration: {performance.duration_s:.2f}s")

    notation.to_json(performance, args.out)
    print(f"\nFull JSON export written to {args.out}")


if __name__ == "__main__":
    main()
