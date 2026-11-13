# RULE 24 — AUDIO–ANIMATION SYNCHRONIZATION

## Purpose
Keep sound, impact, animation and performance time aligned through one authoritative timeline.

## Primary Inputs
PerformanceTimeline; ImpactEvent; AnimationTimeline

## Core Process
Schedule audio events, compensate for device latency where needed, monitor drift, and perform soft/hard resynchronization.

## Primary Outputs
SynchronizedAudioTimeline / SyncState

## Core Principle
> One authoritative clock; audio and animation follow the solved performance rather than re-deciding it.

## Boundary
This rule shapes or validates its own layer but does not usurp decision ownership from other layers. Cross-layer changes are made through explicit contexts and repair requests.

## Traceability
Every meaningful change remains linked to event IDs, rule IDs, configuration/version data and, when relevant, the current state.

## Rule 24 Boundary
This rule does not silently take ownership of another rule's decisions. Any cross-layer change must be expressed through an explicit candidate, context, validation result, repair request, or state transition.

## Integration Note
Rule 24 is designed to compose with the surrounding Rules 1–40 as part of one deterministic, traceable human-drummer performance system.
