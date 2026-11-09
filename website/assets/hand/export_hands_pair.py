"""Convert the supplied BlendSwap bilateral hand model into a browser GLB.

Run from the repository root:
  blender -b website/assets/hand/hands_pair_source.blend --python website/assets/hand/export_hands_pair.py

The output contains explicit left/right wrist roots, each with its own skinned
mesh and armature. No side is created by mirroring the opposite hand.
"""
from pathlib import Path
import json
import bpy
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
OUT = HERE / "hands_pair.glb"
TIP_OUT = HERE / "hands_pair_fingertips.json"
TIP_BONES = {
    "1": "Bone.019",
    "2": "Bone.002",
    "3": "Bone.005",
    "4": "Bone.008",
    "5": "Bone.011",
}

# Preserve the author's two distinct meshes and armatures, but give both meshes
# the same neutral skin material. The source uses a legacy Cycles mix shader
# that does not export reliably to glTF.
skin = bpy.data.materials.new("Shared Natural Skin")
skin.use_nodes = True
nodes = skin.node_tree.nodes
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
bsdf = nodes.new("ShaderNodeBsdfPrincipled")
bsdf.inputs["Base Color"].default_value = (0.60, 0.34, 0.27, 1.0)
bsdf.inputs["Roughness"].default_value = 0.58
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.28
skin.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

pairs = [
    ("left", "Hand_Left", "Hand.L"),
    ("right", "Hand_Right", "Hand.R"),
]
roots = []
tip_offsets = {}
for side, arm_name, mesh_name in pairs:
    arm = bpy.data.objects.get(arm_name)
    mesh = bpy.data.objects.get(mesh_name)
    if not arm or not mesh or arm.type != "ARMATURE" or mesh.type != "MESH":
        raise RuntimeError(f"Missing expected {side} armature/mesh: {arm_name}, {mesh_name}")
    if not any(mod.type == "ARMATURE" and mod.object == arm for mod in mesh.modifiers):
        raise RuntimeError(f"{mesh_name} is not skinned to {arm_name}")

    wrist = arm.data.bones.get("Bone.020")
    if not wrist:
        raise RuntimeError(f"{arm_name} is missing the wrist/root bone Bone.020")
    wrist_world = arm.matrix_world @ wrist.head_local
    arm_world = arm.matrix_world.copy()
    side_tips = {}
    for finger, bone_name in TIP_BONES.items():
        bone = arm.data.bones.get(bone_name)
        if not bone:
            raise RuntimeError(f"{arm_name} is missing fingertip bone {bone_name}")
        delta = arm_world @ bone.tail_local - wrist_world
        # glTF/Three.js is Y-up; Blender's Z-up world is rotated to (x,z,-y).
        side_tips[finger] = [round(float(delta.x), 7), round(float(delta.z), 7), round(float(-delta.y), 7)]
    tip_offsets[side] = side_tips
    root = bpy.data.objects.new(f"PianoHand{side.title()}Root", None)
    bpy.context.collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.08
    root.matrix_world.translation = wrist_world

    arm.parent = root
    arm.matrix_parent_inverse = Matrix.Identity(4)
    # Explicitly express the original armature world transform in the new
    # wrist-root space; this keeps the wrist at local (0,0,0) after export.
    arm.matrix_basis = root.matrix_world.inverted() @ arm_world
    mesh.data.materials.clear()
    mesh.data.materials.append(skin)
    for polygon in mesh.data.polygons:
        polygon.use_smooth = True
    # The source's level-3 Multires subdivision expands each ~1.1k-face hand
    # into ~70k vertices. Keep the surface smooth while limiting download size.
    for modifier in mesh.modifiers:
        if modifier.type == "MULTIRES":
            modifier.levels = min(modifier.levels, 2)
            modifier.render_levels = min(modifier.render_levels, 2)
    mesh.hide_render = False
    mesh.hide_viewport = False

    arm.hide_render = False
    arm.hide_viewport = False
    roots.append(root)

# Exclude authoring-only camera/lights and unrelated scene objects.
keep = {root for root in roots}
for side, arm_name, mesh_name in pairs:
    keep.add(bpy.data.objects[arm_name])
    keep.add(bpy.data.objects[mesh_name])
for obj in list(bpy.data.objects):
    if obj not in keep:
        bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_animations=False,
    export_skins=True,
    export_yup=True,
    export_lights=False,
    export_cameras=False,
    export_materials="EXPORT",
    export_image_format="AUTO",
)
TIP_OUT.write_text(json.dumps({
    "source": "BlendSwap Hands Rigged / Human Hands with armature (CC0 1.0)",
    "coordinateSystem": "glTF Y-up; offsets from each wrist root in Blender source units",
    "metersPerSourceUnit": 0.15,
    "tips": tip_offsets,
}, indent=2) + "\n", encoding="utf-8")
print(f"Exported bilateral hands to {OUT}")
