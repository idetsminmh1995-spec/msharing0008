# Realistic Rigged Human Hand Asset

This directory contains the browser-ready hand asset used by the Three.js proof
of concept:

- `hand_model.glb` — browser-ready glTF binary with the mesh, skin, armature,
  materials, and animation clips.

## Source and license

The model was downloaded from:

- Source repository: https://github.com/emmalieker/anatomical-hand-model
- Author: Emma L. D. Lieker
- License: Creative Commons Attribution-NonCommercial 4.0 International
  (CC BY-NC 4.0): https://creativecommons.org/licenses/by-nc/4.0/

This copy is included for non-commercial evaluation and development only.
Attribution is required, and changes must be indicated. The asset must be
replaced with a CC0, permissive commercial asset, or an original model before
commercial distribution.

## Model capabilities

The GLB contains a 21-bone FK armature, separate finger joints, skinning,
and the `Pose_OK` and `RigAction` animation clips. The demo at
`website/hand-demo/index.html` loads the GLB with Three.js, plays the embedded
clips, lists the skeleton, and exposes controls for changing the active pose.
