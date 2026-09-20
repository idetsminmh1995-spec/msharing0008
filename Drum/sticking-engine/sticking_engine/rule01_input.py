"""
rule01_input.py — RULE 1: INPUT / MIDI PREPARATION

Purpose: Convert the source MIDI into a clean, lossless, canonical input
representation without making performance decisions.

Core Principle: "Source data is immutable; parsing must never invent musical
intent; every source event keeps a stable ID."

This module ONLY parses. It never assigns hands, instruments-as-drum-roles,
or musical meaning beyond raw note/velocity/time. That is Rule 2's job.
"""

from __future__ import annotations
from typing import List, Optional
import mido

from .datamodel import (
    SourceMidiEvent, TempoPoint, TimeSignaturePoint, NormalizedMidiData, new_id
)


def _ticks_to_seconds(ticks: int, tempo_map_ticks: List[TempoPoint], ticks_per_beat: int) -> float:
    """Convert absolute ticks to absolute seconds using a piecewise tempo map."""
    seconds = 0.0
    last_tick = 0
    last_bpm = 120.0
    for tp in tempo_map_ticks:
        if tp.time_ticks >= ticks:
            break
        seconds += (tp.time_ticks - last_tick) * (60.0 / last_bpm) / ticks_per_beat
        last_tick = tp.time_ticks
        last_bpm = tp.bpm
    seconds += (ticks - last_tick) * (60.0 / last_bpm) / ticks_per_beat
    return seconds


def parse_midi_file(path: str, drum_channel: Optional[int] = None) -> NormalizedMidiData:
    """RULE 1 entry point. Parses a .mid file into NormalizedMidiData.

    drum_channel: if given, only note-on events on this MIDI channel are kept
                  (channel 9 / "10" in 1-indexed GM convention is typical for drums).
                  If None, all note-on events with velocity > 0 are kept.
    """
    mid = mido.MidiFile(path)
    ticks_per_beat = mid.ticks_per_beat

    tempo_map: List[TempoPoint] = [TempoPoint(0.0, 0, 120.0)]
    ts_map: List[TimeSignaturePoint] = [TimeSignaturePoint(0.0, 0, 4, 4)]
    raw_events = []
    malformed = 0

    for track in mid.tracks:
        abs_ticks = 0
        for msg in track:
            abs_ticks += msg.time
            if msg.type == "set_tempo":
                bpm = mido.tempo2bpm(msg.tempo)
                sec = _ticks_to_seconds(abs_ticks, tempo_map, ticks_per_beat)
                tempo_map.append(TempoPoint(sec, abs_ticks, bpm))
            elif msg.type == "time_signature":
                sec = _ticks_to_seconds(abs_ticks, tempo_map, ticks_per_beat)
                ts_map.append(TimeSignaturePoint(sec, abs_ticks, msg.numerator, msg.denominator))
            elif msg.type == "note_on" and msg.velocity > 0:
                if drum_channel is not None and msg.channel != drum_channel:
                    continue
                if not (0 <= msg.note <= 127):
                    malformed += 1
                    continue
                raw_events.append((abs_ticks, msg.channel, msg.note, msg.velocity, track.name))

    tempo_map.sort(key=lambda t: t.time_ticks)
    events: List[SourceMidiEvent] = []
    for abs_ticks, channel, note, velocity, track_name in raw_events:
        sec = _ticks_to_seconds(abs_ticks, tempo_map, ticks_per_beat)
        events.append(SourceMidiEvent(
            source_id=new_id("src"),
            time_seconds=sec,
            time_ticks=abs_ticks,
            channel=channel,
            note=note,
            velocity=velocity,
            track_name=track_name or "",
        ))

    events.sort(key=lambda e: e.time_seconds)

    return NormalizedMidiData(
        events=events,
        tempo_map=tempo_map,
        time_signature_map=ts_map,
        ticks_per_beat=ticks_per_beat,
        malformed_event_count=malformed,
    )


def from_note_list(notes: List[dict]) -> NormalizedMidiData:
    """Convenience constructor used for synthetic/programmatic input (tests,
    demos, or non-MIDI sources). Still produces the same canonical, immutable
    NormalizedMidiData contract that Rule 1 promises downstream.

    Each dict: {"time": seconds, "note": int, "velocity": int, "channel": int}
    """
    events = [
        SourceMidiEvent(
            source_id=new_id("src"),
            time_seconds=float(n["time"]),
            time_ticks=int(n["time"] * 480 * 2),  # nominal, not used downstream
            channel=int(n.get("channel", 9)),
            note=int(n["note"]),
            velocity=int(n.get("velocity", 100)),
            track_name=n.get("track_name", ""),
        )
        for n in notes
    ]
    events.sort(key=lambda e: e.time_seconds)
    return NormalizedMidiData(
        events=events,
        tempo_map=[TempoPoint(0.0, 0, 120.0)],
        time_signature_map=[TimeSignaturePoint(0.0, 0, 4, 4)],
        ticks_per_beat=960,
        malformed_event_count=0,
    )
