#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
const tool = path.join(repo, "tools/audit-glb-calibration.mjs");
const glb = path.join(repo, "website/assets/hand/hand_model.glb");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "piano-glb-audit-"));
try {
  const firstPath = path.join(temp, "first.json");
  const secondPath = path.join(temp, "second.json");
  execFileSync(process.execPath, [tool, glb, firstPath], {
    cwd: repo,
    stdio: "pipe",
  });
  execFileSync(process.execPath, [tool, glb, secondPath], {
    cwd: repo,
    stdio: "pipe",
  });
  const first = JSON.parse(fs.readFileSync(firstPath, "utf8"));
  const second = JSON.parse(fs.readFileSync(secondPath, "utf8"));
  assert.deepEqual(second, first, "GLB audit output must be deterministic");
  assert.equal(first.skeleton.jointCount, 21);
  assert.deepEqual(first.skeleton.animationClips, ["Pose_OK", "RigAction"]);
  assert.equal(first.status.skeletonAudited, true);
  assert.equal(first.status.parentChainsAudited, true);
  assert.equal(first.status.boneLengthsMeasured, true);
  assert.equal(first.status.fingertipLandmarksMeasured, false);
  for (const finger of ["1", "2", "3", "4", "5"]) {
    assert.equal(first.audit.chains[finger].length, 4);
    assert.ok(
      first.audit.chains[finger].every((bone) => bone.parent !== undefined),
    );
    assert.ok(
      first.audit.chains[finger].every((bone) => bone.localBoneLength > 0),
    );
  }
  console.log("GLB calibration audit test passed");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
