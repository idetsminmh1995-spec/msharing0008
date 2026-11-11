# Piano Hand Plan

This folder owns piano hand splitting, fingering, kinematics, inverse-kinematics targets, hand poses, calibration, and performance motion planning.

- [Piano Hand architecture and roadmap](ARCHITECTURE.md)
- [Piano Hand Engine implementation](../../Engine/piano-hand-engine/)
- [Piano Hand Engine tests](../../Engine/piano-hand-engine/test/)
- [Piano Plan](../Piano%20Plan/)

The hand engine produces physical, serialisable performance data consumed by the Piano Video renderer. It does not own shared notation parsing or video muxing. The architecture document records the current Phase 1–3 implementation, the partial synthetic-rig IK work, and the remaining calibrated GLB, wrist-motion, chord, humanisation, and renderer phases.
