import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';

const KEY_RANGES = {
  61: { first: 36, last: 96 },
  73: { first: 28, last: 100 },
  76: { first: 28, last: 103 },
  88: { first: 21, last: 108 },
};
const KEYBOARD_WORLD_WIDTH = 8;
const STANDARD_WHITE_KEY_COUNT = 52;
const WHITE_KEY_WORLD_WIDTH = KEYBOARD_WORLD_WIDTH / STANDARD_WHITE_KEY_COUNT;
const FALLBACK_MM_PER_WHITE_KEY = 165 / 7;
const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FINGER_BONES = {
  1: ['Bone021', 'Bone017', 'Bone018', 'Bone019'],
  2: ['Bone012', 'Bone', 'Bone001', 'Bone002'],
  3: ['Bone013', 'Bone003', 'Bone004', 'Bone005'],
  4: ['Bone014', 'Bone006', 'Bone007', 'Bone008'],
  5: ['Bone015', 'Bone009', 'Bone010', 'Bone011'],
};
const HAND_ENGINE = window.PianoHandEngine || null;
const FALLBACK_UNITS_PER_MM = KEYBOARD_WORLD_WIDTH / (52 * FALLBACK_MM_PER_WHITE_KEY);

let instance;

function isWhite(midi) { return WHITE_PITCHES.has(midi % 12); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function spanFor(value) {
  if (typeof value === 'object' && value && Number.isFinite(value.first) && Number.isFinite(value.last)) return value;
  return KEY_RANGES[value] || KEY_RANGES[88];
}
function noteName(midi) { return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`; }
function midiInRange(midi, span) { return midi >= span.first && midi <= span.last; }
function validatePairAnchors(manifest, leftRoot, rightRoot) {
  if (!(manifest?.metersPerSourceUnit > 0) || !manifest?.tips) {
    return { valid: false, reason: 'missing-anchor-scale' };
  }
  if (!leftRoot || !rightRoot) return { valid: false, reason: 'missing-wrist-root' };
  const roots = { left: leftRoot, right: rightRoot };
  for (const side of ['left', 'right']) {
    for (const finger of ['1', '2', '3', '4', '5']) {
      const tip = manifest.tips[side]?.[finger];
      if (!Array.isArray(tip) || tip.length !== 3 || tip.some((value) => !Number.isFinite(value))) {
        return { valid: false, reason: `missing-${side}-finger-${finger}-tip` };
      }
      const distalName = FINGER_BONES[finger]?.at(-1);
      const boneName = side === 'right' ? `${distalName}_1` : distalName;
      if (!distalName || !roots[side].getObjectByName(boneName)?.isBone) {
        return { valid: false, reason: `missing-${side}-finger-${finger}-distal-bone` };
      }
    }
  }
  return { valid: true, reason: 'anchors-and-distal-bones-present' };
}

class PianoHand3DRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x11151b);
    this.cameraViewWidth = KEYBOARD_WORLD_WIDTH + 0.5;
    this.camera = new THREE.OrthographicCamera(-4.25, 4.25, 2, -2, 0.01, 100);
    this.camera.up.set(0, 0, -1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.setAttribute('aria-label', '3D piano with animated hands');
    container.replaceChildren(this.renderer.domElement);

    this.controls = null;
    this.keys = new Map();
    this.keyGroup = new THREE.Group();
    this.scene.add(this.keyGroup);
    this.hands = { right: null, left: null };
    this.handReady = false;
    this.handBones = { right: new Map(), left: new Map() };
    this.initialQuaternions = { right: new Map(), left: new Map() };
    this.handTipOffsets = { right: null, left: null };
    this.handTipBoneOffsets = { right: new Map(), left: new Map() };
    this.handModelScale = 1;
    this.calibrationValidation = null;
    this.activeOptions = null;
    this.currentSpan = null;
    this.keyboard = null;
    this.keyboardWidthMm = HAND_ENGINE ? HAND_ENGINE.keyboardWidthMm(88) : 52 * FALLBACK_MM_PER_WHITE_KEY;
    this.unitsPerMm = HAND_ENGINE ? KEYBOARD_WORLD_WIDTH / this.keyboardWidthMm : FALLBACK_UNITS_PER_MM;
    this.frontEdgeWorldZ = HAND_ENGINE ? HAND_ENGINE.WHITE_KEY_DEPTH_MM * this.unitsPerMm / 2 : 0.525;
    this.handRig = HAND_ENGINE ? HAND_ENGINE.handRigFor('medium') : null;
    this.targetHandPositions = {
      right: new THREE.Vector3(1.35, 0.35, 0.75),
      left: new THREE.Vector3(-1.35, 0.35, 0.75),
    };
    this.clock = new THREE.Clock();

    this.scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x26303b, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(2, 4, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);
    const rim = new THREE.DirectionalLight(0x6cb9ff, 1.1);
    rim.position.set(-4, 2, -3);
    this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 12),
      new THREE.MeshStandardMaterial({ color: 0x151c25, roughness: 0.88, metalness: 0.04 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.42;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.readyPromise = this.loadHand();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  async loadHand() {
    try {
      const [gltf, anchorsResponse] = await Promise.all([
        new GLTFLoader().loadAsync('../../assets/hand/hands_pair.glb?v=3'),
        fetch('../../assets/hand/hands_pair_fingertips.json?v=2').then((response) => {
          if (!response.ok) throw new Error(`Hand fingertip anchor data returned HTTP ${response.status}.`);
          return response.json();
        }),
      ]);
      this.handTipOffsets = anchorsResponse.tips;
      this.handModelScale = this.unitsPerMm * anchorsResponse.metersPerSourceUnit * 1000;
      const leftRoot = gltf.scene.getObjectByName('PianoHandLeftRoot');
      const rightRoot = gltf.scene.getObjectByName('PianoHandRightRoot');
      if (!leftRoot || !rightRoot) throw new Error('Bilateral GLB must contain distinct left/right wrist roots.');
      this.calibrationValidation = validatePairAnchors(anchorsResponse, leftRoot, rightRoot);
      this.container.dataset.glbAnchorValidation = this.calibrationValidation.valid ? 'anchors-and-distal-bones-present' : 'invalid';
      if (!this.calibrationValidation.valid) {
        this.container.dataset.glbAnchorValidationError = this.calibrationValidation.reason;
        throw new Error(`Piano hand GLB validation failed: ${this.calibrationValidation.reason}.`);
      }
      this.createHand('left', leftRoot);
      this.createHand('right', rightRoot);
      this.handReady = true;
      this.update(this.activeOptions || {}, { snap: true });
      return true;
    } catch (error) {
      console.error('Piano hand GLB failed to load:', error);
      this.handReady = false;
      this.container.dataset.handError = 'true';
      this.container.dataset.handErrorMessage = error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  createHand(side, root) {
    root.parent?.remove(root);
    root.rotation.set(0, 0, 0);
    root.scale.set(this.handModelScale, this.handModelScale, -this.handModelScale);
    root.position.set(side === 'left' ? -1.35 : 1.35, 0.35, 0.75);
    root.userData.side = side;
    root.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      if (object.isBone) {
        this.handBones[side].set(object.name, object);
        this.initialQuaternions[side].set(object.name, object.quaternion.clone());
      }
    });
    this.scene.add(root);
    this.hands[side] = root;
    this.cacheFingerTipBones(side, root);
    this.targetHandPositions[side].copy(root.position);
  }

  cacheFingerTipBones(side, root) {
    root.updateMatrixWorld(true);
    for (const [finger, names] of Object.entries(FINGER_BONES)) {
      const name = side === 'right' ? `${names.at(-1)}_1` : names.at(-1);
      const bone = this.handBones[side].get(name);
      const anchor = this.handTipOffsets[side]?.[finger];
      if (!bone || !anchor) continue;
      const world = root.localToWorld(new THREE.Vector3(anchor[0], anchor[1], anchor[2]));
      this.handTipBoneOffsets[side].set(Number(finger), bone.worldToLocal(world));
    }
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.setCameraViewport(width, height);
    this.renderer.setSize(width, height, false);
  }

  setCameraViewport(width, height) {
    const viewWidth = this.cameraViewWidth;
    const viewHeight = viewWidth * height / width;
    this.camera.left = -viewWidth / 2;
    this.camera.right = viewWidth / 2;
    this.camera.top = viewHeight / 2;
    this.camera.bottom = -viewHeight / 2;
    this.camera.updateProjectionMatrix();
  }

  clearKeys() {
    this.keys.clear();
    this.keyGroup.clear();
    this.keyboard = null;
  }

  buildKeys(span, colors, handEngineData) {
    const range = spanFor(span);
    if (this.currentSpan && this.currentSpan.first === range.first && this.currentSpan.last === range.last) return;
    this.currentSpan = { first: range.first, last: range.last };
    this.clearKeys();

    if (HAND_ENGINE) {
      const keyboard = handEngineData?.keyboard || HAND_ENGINE.buildKeyboard(range);
      this.keyboard = keyboard;
      this.keyboardWidthMm = HAND_ENGINE.keyboardWidthMm(range);
      this.unitsPerMm = KEYBOARD_WORLD_WIDTH / HAND_ENGINE.keyboardWidthMm(88);
      this.frontEdgeWorldZ = HAND_ENGINE.WHITE_KEY_DEPTH_MM * this.unitsPerMm / 2;
      this.cameraViewWidth = this.keyboardWidthMm * this.unitsPerMm + 0.5;
      for (const key of keyboard.keys) {
        const height = key.isBlack ? 0.22 : 0.14;
        const visualWidthMm = Math.max(1, key.width - (key.isBlack ? 0.3 : 0.8));
        const x = (key.x + key.width / 2 - this.keyboardWidthMm / 2) * this.unitsPerMm;
        const y = key.y * this.unitsPerMm - height / 2;
        const z = this.frontEdgeWorldZ - (key.z + key.depth / 2) * this.unitsPerMm;
        this.addPhysicalKey(key, x, y, z, visualWidthMm * this.unitsPerMm, key.depth * this.unitsPerMm, height);
      }
    } else {
      const whiteMidi = [];
      for (let midi = range.first; midi <= range.last; midi += 1) if (isWhite(midi)) whiteMidi.push(midi);
      const whiteWidth = WHITE_KEY_WORLD_WIDTH;
      this.cameraViewWidth = whiteMidi.length * whiteWidth + 0.5;
      const startX = -whiteMidi.length * whiteWidth / 2;
      const xByMidi = new Map();
      whiteMidi.forEach((midi, index) => xByMidi.set(midi, startX + (index + 0.5) * whiteWidth));
      for (const midi of whiteMidi) this.addKey(midi, xByMidi.get(midi), false, whiteWidth, colors);
      for (let midi = range.first; midi <= range.last; midi += 1) {
        if (isWhite(midi)) continue;
        const left = xByMidi.get(midi - 1);
        const right = xByMidi.get(midi + 1);
        if (left !== undefined && right !== undefined) this.addKey(midi, (left + right) / 2, true, whiteWidth, colors);
      }
    }

    // Exact overhead view: the far edge of the keyboard is at the top;
    // the engine's z=0 key edge and hands are toward the player.
    this.camera.up.set(0, 0, -1);
    this.camera.position.set(0, 10, 0.2);
    this.camera.lookAt(0, 0.05, 0.2);
  }

  addPhysicalKey(key, x, y, z, width, depth, height) {
    const material = new THREE.MeshStandardMaterial({
      color: key.isBlack ? 0x10151b : 0xe7ebef,
      roughness: 0.34,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
      midi: key.midi,
      baseY: y,
      press: 0,
      baseColor: material.color.clone(),
      black: key.isBlack,
      physicalKey: key,
    };
    mesh.name = `key_${key.midi}_${noteName(key.midi)}`;
    this.keyGroup.add(mesh);
    this.keys.set(key.midi, mesh);
  }

  addKey(midi, x, black, whiteWidth, colors) {
    const width = black ? whiteWidth * 0.60 : whiteWidth * 0.94;
    const depth = black ? 0.68 : 1.05;
    const height = black ? 0.22 : 0.14;
    const material = new THREE.MeshStandardMaterial({
      color: black ? 0x10151b : 0xe7ebef,
      roughness: 0.34,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, 0, black ? -0.18 : 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { midi, baseY: 0, press: 0, baseColor: material.color.clone(), black };
    mesh.name = `key_${midi}_${noteName(midi)}`;
    this.keyGroup.add(mesh);
    this.keys.set(midi, mesh);
  }

  fingerNumber(note) {
    const finger = Number(note?.finger);
    return finger >= 1 && finger <= 5 ? finger : undefined;
  }

  pressDepthMm(note, timeMs) {
    if (!HAND_ENGINE || !Number.isFinite(note?.startSeconds) || !Number.isFinite(note?.endSeconds)) {
      return note && note.startSeconds <= timeMs / 1000 && note.endSeconds > timeMs / 1000 ? 0.12 : 0;
    }
    return HAND_ENGINE.keyPressDepthMm(timeMs, {
      timeMs: note.startSeconds * 1000,
      durationMs: Math.max(1, (note.endSeconds - note.startSeconds) * 1000),
    });
  }

  poseForSide(sideNotes, timeMs) {
    if (!HAND_ENGINE) return { pose: null, depthByFinger: new Map() };
    const pose = { ...HAND_ENGINE.POSES.fiveFinger };
    const depthByFinger = new Map();
    for (const note of sideNotes) {
      const finger = this.fingerNumber(note);
      if (!finger) continue;
      const depth = this.pressDepthMm(note, timeMs);
      depthByFinger.set(finger, Math.max(depthByFinger.get(finger) || 0, depth));
    }
    for (const [finger, depth] of depthByFinger) {
      const amount = clamp(depth / HAND_ENGINE.KEY_DIP_MM, 0, 1);
      const pressed = HAND_ENGINE.pressedPose(HAND_ENGINE.POSES.fiveFinger, finger, amount);
      pose[finger] = pressed[finger];
    }
    return { pose, depthByFinger };
  }

  applyHandPose(root, pose) {
    const side = root.userData.side;
    if (!pose) {
      this.resetHand(root);
      return;
    }
    const bones = this.handBones[side];
    const rest = this.initialQuaternions[side];
    for (const [finger, names] of Object.entries(FINGER_BONES)) {
      const state = pose[finger];
      const angles = state ? [state.mcp, state.pip, state.dip] : [0, 0, 0];
      names.forEach((name, index) => {
        const boneName = side === 'right' ? `${name}_1` : name;
        const bone = bones.get(boneName);
        if (!bone) return;
        const initial = rest.get(boneName);
        if (initial) bone.quaternion.copy(initial);
        if (index === 0) return;
        const angle = angles[index - 1] || 0;
        // The root's Z reflection turns both palms toward the piano and thumbs
        // inward; compensate its handedness so positive flexion bends down to
        // the key surface instead of curling the fingers back toward the wrist.
        if (angle) {
          const thumbMcp = finger === '1' && index === 1;
          const axis = thumbMcp
            ? new THREE.Vector3(0, 0, side === 'left' ? 1 : -1)
            : new THREE.Vector3(1, 0, 0);
          const modelAngle = thumbMcp ? angle * 3.3 : angle;
          bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis, modelAngle));
        }
      });
    }
  }

  resetHand(root) {
    const side = root.userData.side;
    const bones = this.handBones[side];
    const rest = this.initialQuaternions[side];
    for (const names of Object.values(FINGER_BONES)) {
      for (const name of names) {
        const boneName = side === 'right' ? `${name}_1` : name;
        const bone = bones.get(boneName);
        const initial = rest.get(boneName);
        if (bone && initial) bone.quaternion.copy(initial);
      }
    }
  }

  engineWristToWorld(wrist) {
    return new THREE.Vector3(
      (wrist.x - this.keyboardWidthMm / 2) * this.unitsPerMm,
      wrist.y * this.unitsPerMm,
      this.frontEdgeWorldZ - wrist.z * this.unitsPerMm,
    );
  }

  worldToEngineWrist(world) {
    return {
      x: world.x / this.unitsPerMm + this.keyboardWidthMm / 2,
      y: world.y / this.unitsPerMm,
      z: (this.frontEdgeWorldZ - world.z) / this.unitsPerMm,
    };
  }

  handTipWorldOffset(side, finger) {
    const root = this.hands[side];
    const names = FINGER_BONES[finger];
    if (!root || !names) return null;
    const name = side === 'right' ? `${names.at(-1)}_1` : names.at(-1);
    const bone = this.handBones[side].get(name);
    const point = this.handTipBoneOffsets[side].get(finger);
    if (bone && point) {
      root.updateMatrixWorld(true);
      return bone.localToWorld(point.clone()).sub(root.position);
    }
    const anchor = this.handTipOffsets[side]?.[finger];
    return anchor ? new THREE.Vector3(anchor[0], anchor[1], anchor[2]).multiply(root.scale).applyQuaternion(root.quaternion) : null;
  }

  restHandTarget(side, pose) {
    if (HAND_ENGINE && this.keyboard?.byMidi) {
      const midi = side === 'left' ? 48 : 72;
      const key = this.keyboard.byMidi.get(midi) || this.keyboard.keys[0];
      const offset = this.handTipWorldOffset(side, 3);
      if (key && offset) return this.engineWristToWorld(HAND_ENGINE.keyStrikePoint(key)).sub(offset);
      if (key) {
        const strike = HAND_ENGINE.keyStrikePoint(key);
        const skeleton = HAND_ENGINE.solveHandSkeleton({
          hand: side,
          rig: this.handRig,
          wrist: { x: 0, y: 0, z: 0 },
          wristRotation: { x: 0, y: 0, z: 0 },
          fingers: pose || HAND_ENGINE.POSES.fiveFinger,
        });
        const tip = skeleton.fingers[3].tip;
        return this.engineWristToWorld({
          x: strike.x - tip.x,
          y: strike.y - tip.y,
          z: strike.z - tip.z,
        });
      }
    }
    return new THREE.Vector3(side === 'left' ? -1.35 : 1.35, 0.35, 0.75);
  }

  handTarget(side, sideNotes, pose, timeMs) {
    if (HAND_ENGINE && this.keyboard && sideNotes.length && pose) {
      const wristTargets = [];
      for (const note of sideNotes) {
        const finger = this.fingerNumber(note);
        const tipOffset = finger ? this.handTipWorldOffset(side, finger) : null;
        if (!tipOffset || !note.keyPosition) continue;
        const press = this.pressDepthMm(note, timeMs);
        wristTargets.push(this.engineWristToWorld({ x: note.keyPosition.x, y: note.keyPosition.y - press, z: note.keyPosition.z }).sub(tipOffset));
      }
      if (wristTargets.length) {
        const target = wristTargets.reduce((sum, item) => sum.add(item), new THREE.Vector3());
        return target.multiplyScalar(1 / wristTargets.length);
      }
    }
    if (sideNotes.length) {
      const baseX = side === 'left' ? -1.35 : 1.35;
      const averageKeyX = sideNotes.reduce((sum, note) => sum + this.keyX(note.midi), 0) / sideNotes.length;
      return new THREE.Vector3(clamp(averageKeyX, baseX - 2.5, baseX + 2.5), 0.35, 0.75);
    }
    return this.restHandTarget(side, pose);
  }

  update(options, { snap = false } = {}) {
    this.activeOptions = options;
    if (!options || !options.width || !options.height) return;
    const span = spanFor(options.size);
    const colors = options.colors || { leftHand: '#FFC400', rightHand: '#4FA3FF' };
    const handEngineData = options.handEngineData || null;
    this.buildKeys(span, colors, handEngineData);
    this.resize();

    const seconds = Number.isFinite(options.seconds) ? options.seconds : 0;
    const timeMs = seconds * 1000;
    const notes = Array.isArray(options.notes) ? options.notes : [];
    const fingered = Array.isArray(options.fingeredNotes) ? options.fingeredNotes : [];
    const active = notes.filter((note) => midiInRange(note.midi, span) && note.startSeconds <= seconds && note.endSeconds > seconds);
    const contact = notes.filter((note) => {
      if (!midiInRange(note.midi, span)) return false;
      const interval = {
        timeMs: note.startSeconds * 1000,
        durationMs: Math.max(1, (note.endSeconds - note.startSeconds) * 1000),
      };
      return HAND_ENGINE?.isKeyContactActive
        ? HAND_ENGINE.isKeyContactActive(timeMs, interval)
        : timeMs >= interval.timeMs && timeMs < interval.timeMs + interval.durationMs + 70;
    });
    const fingerById = new Map(fingered.filter((note) => note.id !== undefined).map((note) => [note.id, note.finger]));
    const attachFinger = (note) => ({
      ...note,
      // Note IDs are the only stable identity. A MIDI pitch can occur many
      // times in a phrase, so a pitch fallback can put a repeated note's
      // finger on the wrong event.
      finger: note.finger ?? fingerById.get(note.id),
    });
    const activeWithFinger = active.map(attachFinger);
    const contactWithFinger = contact.map(attachFinger);
    const activeByMidi = new Map();
    for (const note of activeWithFinger) {
      const list = activeByMidi.get(note.midi) || [];
      list.push(note);
      activeByMidi.set(note.midi, list);
    }
    const contactByMidi = new Map();
    for (const note of contactWithFinger) {
      const list = contactByMidi.get(note.midi) || [];
      list.push(note);
      contactByMidi.set(note.midi, list);
    }

    for (const [midi, key] of this.keys) {
      const soundingNotes = activeByMidi.get(midi) || [];
      const contactNotes = contactByMidi.get(midi) || [];
      const note = soundingNotes[0];
      const hand = note?.hand === 'left' ? 'left' : 'right';
      const color = hand === 'left' ? colors.leftHand : colors.rightHand;
      const press = contactNotes.reduce((deepest, item) => Math.max(deepest, this.pressDepthMm(item, timeMs)), 0);
      key.userData.press = HAND_ENGINE ? press * this.unitsPerMm : press;
      key.position.y = key.userData.baseY - key.userData.press;
      key.material.color.set(note ? color : key.userData.baseColor);
    }

    for (const side of ['left', 'right']) {
      delete this.container.dataset[`${side}EngineIkErrorMm`];
      delete this.container.dataset[`${side}EngineIkConverged`];
      const root = this.hands[side];
      if (!root) continue;
      const sideNotes = contactWithFinger.filter((note) => note.hand === side);
      const { pose } = this.poseForSide(sideNotes, timeMs);
      this.applyHandPose(root, pose);
      let target = this.handTarget(side, sideNotes, pose, timeMs);
      const ik = this.solveFingerTargets(side, sideNotes, target, pose, timeMs);
      if (ik) {
        this.applyHandPose(root, ik.fingers || pose);
        target = this.handTarget(side, sideNotes, ik.fingers || pose, timeMs);
      }
      if (ik) {
        this.container.dataset[`${side}EngineIkErrorMm`] = ik.maxErrorMm.toFixed(2);
        this.container.dataset[`${side}EngineIkConverged`] = String(ik.converged);
      }
      this.targetHandPositions[side].copy(target);
      if (snap) root.position.copy(target);
    }
  }

  solveFingerTargets(side, sideNotes, wristWorld, pose, timeMs) {
    if (!HAND_ENGINE?.solveFingerTargets || !this.handRig || sideNotes.length === 0) return null;
    const targets = sideNotes.flatMap((note) => {
      const finger = this.fingerNumber(note);
      if (!finger || !note.keyPosition) return [];
      return [{
        finger,
        target: {
          x: note.keyPosition.x,
          y: note.keyPosition.y - this.pressDepthMm(note, timeMs),
          z: note.keyPosition.z,
        },
      }];
    });
    if (targets.length === 0) return null;
    const solution = HAND_ENGINE.solveFingerTargets({
      hand: side,
      rig: this.handRig,
      wrist: this.worldToEngineWrist(wristWorld),
      wristRotation: { x: 0, y: 0, z: 0 },
      fingers: pose,
      targets,
      // The current GLB mapping has no verified spread-axis calibration;
      // do not let the solver use motion the renderer cannot yet reproduce.
      allowSpread: false,
      toleranceMm: 1.5,
    });
    // The engine's IK is fitted to its parametric skeleton, not yet to this
    // skinned GLB. Never apply a visibly unconverged solution to the real rig;
    // the measured distal-bone anchors still place its actual tip at the key.
    return solution.converged ? solution : null;
  }

  keyX(midi) { return this.keys.get(midi)?.position.x || 0; }

  renderToCanvas(options, context, box) {
    this.update(options, { snap: true });
    const width = Math.max(1, Math.round(box.w));
    const height = Math.max(1, Math.round(box.h));
    this.renderer.setSize(width, height, false);
    this.setCameraViewport(width, height);
    this.renderer.render(this.scene, this.camera);
    context.drawImage(this.renderer.domElement, box.x, box.y, width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    for (const side of ['left', 'right']) {
      const root = this.hands[side];
      if (!root) continue;
      root.position.lerp(this.targetHandPositions[side], Math.min(1, delta * 9));
    }
    this.renderer.render(this.scene, this.camera);
  }
}

window.PianoHand3D = {
  renderer: null,
  mount(container) {
    if (!this.renderer || this.renderer.container !== container) this.renderer = new PianoHand3DRenderer(container);
    else if (this.renderer.renderer.domElement.parentElement !== container) container.replaceChildren(this.renderer.renderer.domElement);
    return this.renderer;
  },
  async ready(container) {
    const renderer = this.mount(container);
    return await renderer.readyPromise;
  },
  update(options) {
    if (!options?.container) return;
    this.mount(options.container).update(options);
  },
  renderToCanvas(options, context, box) {
    if (!options?.container) return;
    this.mount(options.container).renderToCanvas(options, context, box);
  },
};
window.dispatchEvent(new Event('piano-hand-3d-ready'));
