# RULE 1 — INPUT / MIDI PREPARATION

## Purpose
Convert the source MIDI into a clean, lossless, canonical input representation without making performance decisions.

## Primary Inputs
Raw MIDI; tempo map; time-signature map; track/channel metadata

## Core Process
Parse events, preserve source identity, normalize time units, detect malformed events, and expose a deterministic source timeline.

## Primary Outputs
NormalizedMidiData / SourceMidiEvent[]

## Core Principle
> Source data is immutable; parsing must never invent musical intent; every source event keeps a stable ID.

## Core Constraints
- Preserve source-event identity.
- Keep musical analysis deterministic.
- Do not perform downstream hand, stroke, motion or animation decisions prematurely.

## Integration
The output of this rule becomes a typed input to the next analytical layer. Downstream modules may enrich the data but must not silently rewrite upstream truth.

## Rule 1 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 1 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
