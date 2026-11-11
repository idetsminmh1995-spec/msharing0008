# RULE 20 — PERFORMANCE MEMORY

## Purpose
Store recent performance history so future decisions remain continuous and context-aware.

## Primary Inputs
Committed events; state transitions

## Core Process
Maintain recent hand, stroke, timing, movement, pattern, phrase, and transition history.

## Primary Outputs
MemoryContext

## Core Principle
> Memory records committed behavior only; speculative branches never contaminate long-term memory.

## Boundary
This rule shapes or validates its own layer but does not usurp decision ownership from other layers. Cross-layer changes are made through explicit contexts and repair requests.

## Traceability
Every meaningful change remains linked to event IDs, rule IDs, configuration/version data and, when relevant, the current state.

## Rule 20 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 20 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
