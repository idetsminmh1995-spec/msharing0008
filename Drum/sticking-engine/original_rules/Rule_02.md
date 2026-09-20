# RULE 2 — INSTRUMENT, SURFACE & TARGET MAPPING

## Purpose
Map MIDI events to canonical drum instruments, playable surfaces, and physical targets.

## Primary Inputs
SourceMidiEvent; DrumMappingProfile

## Core Process
Resolve instrument, surface, target position, playability, and technique metadata while preserving source-event identity.

## Primary Outputs
DrumEvent[]

## Core Principle
> Mapping is deterministic and configurable; mapping does not choose the hand or final stroke.

## Core Constraints
- Preserve source-event identity.
- Keep musical analysis deterministic.
- Do not perform downstream hand, stroke, motion or animation decisions prematurely.

## Integration
The output of this rule becomes a typed input to the next analytical layer. Downstream modules may enrich the data but must not silently rewrite upstream truth.

## Rule 2 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 2 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
