# Piano hand models

## Production bilateral model

The Piano Video **Hands** renderer uses `hands_pair.glb`. It contains two separate authored meshes and two independent armatures: `PianoHandLeftRoot` / `Hand_Left` / `Hand.L`, and `PianoHandRightRoot` / `Hand_Right` / `Hand.R`. The production renderer maps notes to these actual left/right rigs; it does not mirror one hand to create the other. Both meshes use the same natural-skin base color so their skin color cannot diverge through the left/right key-highlight color controls.

The camera is orthographic and looks straight down (90° overhead). `hands_pair_fingertips.json` stores wrist-relative fingertip anchors measured from the Blender armatures. The renderer resolves each anchor onto that digit's distal bone, then recalculates its world position after the finger bends; the Piano Hand Engine's strike points therefore line up with the animated fingertip rather than a static rest pose. The source model's wrist-to-fingertip direction is reversed along the keyboard axis while its vertical/dorsal orientation and each hand's own thumb side are preserved.

The source provided by the repository owner is kept as `hands_pair_source.blend`; `LICENSE.html` is the license/asset information shipped inside that source ZIP. The BlendSwap listing identifies the model as **Hands Rigged** by SparrowHawk and marks it CC0: <https://blendswap.com/blend/22269>. The bundled license page describes the Blender asset as **Human Hands with armature** (Blend #92895) under **Creative Commons Zero 1.0**. The source describes a left and a right hand, distinct in appearance (one feminine-looking, one masculine-looking). CC0 does not require attribution, but the source and license are retained here for provenance.

To regenerate the browser asset with Blender 4.x:

```sh
blender -b website/assets/hand/hands_pair_source.blend \
  --python website/assets/hand/export_hands_pair.py
```

The export script preserves each original skinned mesh and armature, creates explicit wrist roots, applies one common skin material, and caps the source level-3 multires modifier at level 2 for browser-size output. The resulting GLB has two skins, no embedded texture dependencies and no duplicated/mirrored hand. Verify with:

```sh
node --input-type=module --check < website/assets/piano-hand-3d.js
```

## Earlier single-hand demo asset

`hand_model.glb` and `hand_model.blend` are retained for `website/hand-demo/index.html`, which demonstrates the earlier one-hand rig. That separate asset came from <https://github.com/emmalieker/anatomical-hand-model> by Emma L. D. Lieker under **CC BY-NC 4.0** and is restricted to non-commercial use; it is not the model used by the production Piano Video Hands renderer. Attribution and license: <https://creativecommons.org/licenses/by-nc/4.0/>.
