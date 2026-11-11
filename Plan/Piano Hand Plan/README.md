# Piano Hand Plan

This folder owns piano hand splitting, fingering, kinematics, inverse-kinematics targets, hand poses, and performance motion planning.

- [Piano Hand Engine implementation](../../Engine/piano-hand-engine/)
- [Piano Hand Engine tests](../../Engine/piano-hand-engine/test/)
- [Piano Plan](../Piano%20Plan/)

The hand engine produces performance data consumed by the Piano Video renderer; it does not own the shared notation or video muxing contracts.
