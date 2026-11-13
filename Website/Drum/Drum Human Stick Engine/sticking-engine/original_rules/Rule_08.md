# RULE 8 — STICKING SEQUENCE CONTINUITY

## Purpose
Optimize hand assignments across sequences rather than treating notes independently.

## Primary Inputs
Sticking candidates; lookback/lookahead context

## Core Process
Evaluate continuity, future preparation, repeated patterns, crossing cost, ending/starting hand, and sequence stability.

## Primary Outputs
StickingSequence / sequence scores

## Core Principle
> Sequence quality outranks isolated note quality; use lookahead and commit horizons.

## Candidate Logic
Hard physical impossibilities are rejected. Soft preferences are scored. Multiple valid alternatives should remain available until the sequence solver has enough future context.

## Human-Performance Requirement
The engine should prefer coherent, economical, repeatable technique with bounded variation rather than random hand assignment.

## Rule 8 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 8 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
