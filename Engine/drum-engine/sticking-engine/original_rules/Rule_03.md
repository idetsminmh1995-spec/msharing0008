# RULE 3 — MUSICAL TIME, BEAT & SUBDIVISION ANALYSIS

## Purpose
Establish the musical clock and structural time context used by every downstream rule.

## Primary Inputs
DrumEvent[]; tempo map; time signature

## Core Process
Compute measure/beat/subdivision positions, beat strength, syncopation context, and exact musical-to-seconds conversion.

## Primary Outputs
TimingContext[]; MusicalTimeline

## Core Principle
> Musical time and physical time remain distinct but explicitly linked.

## Core Constraints
- Preserve source-event identity.
- Keep musical analysis deterministic.
- Do not perform downstream hand, stroke, motion or animation decisions prematurely.

## Integration
The output of this rule becomes a typed input to the next analytical layer. Downstream modules may enrich the data but must not silently rewrite upstream truth.

## Rule 3 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 3 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
