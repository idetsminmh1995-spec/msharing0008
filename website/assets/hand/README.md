# Legacy Piano hand-model assets — retired

The previous hand-model reset removed these 3D files from the current `main` tree on 2026-11-12:

- `hand_model.glb` — the older single-hand demo model.
- `hands_pair.glb` — the former production left/right hand rig.
- `hands_pair_source.blend` — the source Blender project for that pair.

They remain available in earlier Git history; the reset did not rewrite history. No current Piano page loads the legacy renderer or requests these model files. The Piano **Hands** mode and the interactive `/hand-demo/` are temporarily disabled while replacement assets are built from scratch. Piano video export remains on the Falling Notes design.

The JSON calibration/anchor records, exporter source, and license information in this directory are retained only as historical provenance. They are not proof that a replacement model is calibrated. The older demo model was identified as CC BY-NC 4.0; the former hand pair was identified as CC0. Check the original source and license again before reusing either model from history.

New model files should be placed in the organized top-level [`3D model/`](../../../3D%20model/) folders only after recording their source and license, verifying scale/orientation, and passing a model-load test. The current hand-model source asset directory intentionally contains no GLB, glTF, Blender, OBJ, or FBX model.
