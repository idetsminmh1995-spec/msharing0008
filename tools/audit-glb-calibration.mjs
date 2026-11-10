#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const [
  ,
  ,
  inputArg = "website/assets/hand/hand_model.glb",
  outputArg = "website/assets/hand/hand-calibration.json",
] = process.argv;
const inputPath = path.resolve(inputArg);
const outputPath = path.resolve(outputArg);

const glb = fs.readFileSync(inputPath);
const json = readGlbJson(glb);
const nodes = json.nodes ?? [];
const parentByIndex = new Map();
for (const [index, node] of nodes.entries()) {
  for (const child of node.children ?? []) parentByIndex.set(child, index);
}

const names = new Map(nodes.map((node, index) => [node.name, index]));
const expectedChains = {
  1: ["thumb_trapez", "thumb_meta", "thumb_prox", "thumb_dist"],
  2: ["index_meta", "index_prox", "index_midd", "index_dist"],
  3: ["midd_meta", "midd_prox", "midd_midd", "midd_dist"],
  4: ["ring_meta", "ring_prox", "ring_midd", "ring_dist"],
  5: ["pinky_meta", "pinky_prox", "pinky_midd", "pinky_dist"],
};
const chainAudit = {};
for (const [finger, chain] of Object.entries(expectedChains)) {
  chainAudit[finger] = chain.map((name) => {
    const index = names.get(name);
    if (index === undefined) throw new Error(`Missing GLB bone: ${name}`);
    const node = nodes[index];
    const parentIndex = parentByIndex.get(index);
    const translation = vector3(node.translation ?? [0, 0, 0]);
    const parentName =
      parentIndex === undefined ? null : (nodes[parentIndex]?.name ?? null);
    return {
      name,
      parent: parentName,
      localTranslation: translation,
      localBoneLength: length(translation),
    };
  });
}

const wristIndex = names.get("radius_ulna");
if (wristIndex === undefined)
  throw new Error("Missing GLB wrist bone: radius_ulna");
const skeletonJointNames = nodes
  .filter(
    (node) =>
      node.name &&
      node.name !== "Rig" &&
      node.name !== "Hand" &&
      node.name !== "Nails",
  )
  .map((node) => node.name);
const clips = (json.animations ?? [])
  .map((animation) => animation.name ?? null)
  .filter(Boolean);
const manifest = {
  version: 1,
  model: path.basename(inputPath),
  calibrated: false,
  skeleton: {
    jointCount: skeletonJointNames.length,
    wristBone: "radius_ulna",
    boneChains: Object.fromEntries(Object.entries(expectedChains)),
    animationClips: clips,
  },
  audit: {
    source: path.relative(process.cwd(), inputPath),
    gltfVersion: json.asset?.version ?? null,
    generator: json.asset?.generator ?? null,
    rootNode:
      nodes.find((node, index) => !parentByIndex.has(index))?.name ?? null,
    jointNames: skeletonJointNames,
    wrist: {
      parent: nodes[parentByIndex.get(wristIndex)]?.name ?? null,
      localTranslation: vector3(nodes[wristIndex].translation ?? [0, 0, 0]),
    },
    chains: chainAudit,
  },
  status: {
    skeletonAudited: true,
    parentChainsAudited: true,
    boneLengthsMeasured: true,
    fingertipLandmarksMeasured: false,
    jointAxesMeasured: false,
    engineToGlbTransformMeasured: false,
  },
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
console.log(
  `Audited ${manifest.skeleton.jointCount} joints, ${clips.length} animation clips, 5 finger chains.`,
);

function readGlbJson(buffer) {
  if (buffer.toString("utf8", 0, 4) !== "glTF")
    throw new Error("Not a GLB file");
  let offset = 12;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    const chunk = buffer.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    if (chunkType === 0x4e4f534a)
      return JSON.parse(chunk.toString("utf8").trim());
  }
  throw new Error("GLB JSON chunk not found");
}
function vector3(values) {
  return { x: values[0] ?? 0, y: values[1] ?? 0, z: values[2] ?? 0 };
}
function length(value) {
  return Math.hypot(value.x, value.y, value.z);
}
