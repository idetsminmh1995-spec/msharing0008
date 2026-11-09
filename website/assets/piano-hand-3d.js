import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/SkeletonUtils.js';

const KEY_RANGES = {
  61: { first: 36, last: 96 },
  73: { first: 28, last: 100 },
  76: { first: 28, last: 103 },
  88: { first: 21, last: 108 },
};
const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'little'];
const FINGER_BONES = {
  1: ['thumb_trapez', 'thumb_meta', 'thumb_prox', 'thumb_dist'],
  2: ['index_meta', 'index_prox', 'index_midd', 'index_dist'],
  3: ['midd_meta', 'midd_prox', 'midd_midd', 'midd_dist'],
  4: ['ring_meta', 'ring_prox', 'ring_midd', 'ring_dist'],
  5: ['pinky_meta', 'pinky_prox', 'pinky_midd', 'pinky_dist'],
};
const HAND_OFFSETS = { 1: -0.48, 2: -0.18, 3: 0.08, 4: 0.34, 5: 0.60 };

let instance;

function isWhite(midi) { return WHITE_PITCHES.has(midi % 12); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function spanFor(value) {
  if (typeof value === 'object' && value && Number.isFinite(value.first) && Number.isFinite(value.last)) return value;
  return KEY_RANGES[value] || KEY_RANGES[88];
}
function noteName(midi) { return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`; }
function midiInRange(midi, span) { return midi >= span.first && midi <= span.last; }

class PianoHand3DRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x11151b);
    this.camera = new THREE.PerspectiveCamera(22, 1, 0.01, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.setAttribute('aria-label', '3D piano with animated hands');
    container.replaceChildren(this.renderer.domElement);

    this.controls = null;
    this.keys = new Map();
    this.keyGroup = new THREE.Group();
    // The prototype key bed needs more front-to-back presence in a wide video crop.
    this.keyGroup.scale.z = 1.8;
    this.scene.add(this.keyGroup);
    this.hands = { right: null, left: null };
    this.handTemplate = null;
    this.handReady = false;
    this.handBones = new Map();
    this.initialQuaternions = new Map();
    this.activeOptions = null;
    this.currentSpan = null;
    this.targetHandX = { right: 0, left: 0 };
    this.handX = { right: 0, left: 0 };
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

    this.loadHand();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  async loadHand() {
    try {
      const gltf = await new GLTFLoader().loadAsync('../../assets/hand/hand_model.glb');
      this.handTemplate = gltf.scene;
      // Player POV: the imported hand is laid over the keyboard so the
      // wrist enters from the player's side and the fingers point toward
      // the keys, instead of presenting a front-facing floating hand.
      this.handTemplate.scale.setScalar(0.13);
      this.handTemplate.rotation.set(-Math.PI / 2, 0.1, Math.PI + 0.08);
      this.handTemplate.position.set(0, 0.15, 1.5);
      this.handTemplate.traverse((object) => {
        if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
        if (object.isBone) {
          if (!this.handBones.has(object.name)) this.handBones.set(object.name, object);
          if (!this.initialQuaternions.has(object.name)) this.initialQuaternions.set(object.name, object.quaternion.clone());
        }
      });
      this.createHand('right', false);
      this.createHand('left', true);
      this.handReady = true;
      this.update(this.activeOptions || {});
    } catch (error) {
      console.error('Piano hand GLB failed to load:', error);
      this.container.dataset.handError = 'true';
    }
  }

  createHand(side, mirror) {
    const root = SkeletonUtils.clone(this.handTemplate);
    root.scale.x *= mirror ? -1 : 1;
    // The source mesh's fingers point toward the player. Turn the whole
    // hand around the world-up axis so wrists stay near the player and
    // fingers reach forward onto the keys; X is reversed for both hands.
    root.quaternion.premultiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
    );
    root.position.x = mirror ? -1.35 : 1.35;
    root.position.y = 0.15;
    root.position.z = 1.5;
    root.userData.side = side;
    root.traverse((object) => {
      if (object.isMesh) {
        object.material = object.material.clone();
        object.material.color = new THREE.Color(side === 'right' ? 0x4fa3ff : 0xffc400);
      }
    });
    this.scene.add(root);
    this.hands[side] = root;
  }

  resize() {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  clearKeys() {
    this.keys.clear();
    this.keyGroup.clear();
  }

  buildKeys(span, colors) {
    if (this.currentSpan && this.currentSpan.first === span.first && this.currentSpan.last === span.last) return;
    this.currentSpan = span;
    this.clearKeys();
    const whiteMidi = [];
    for (let midi = span.first; midi <= span.last; midi += 1) if (isWhite(midi)) whiteMidi.push(midi);
    const whiteWidth = 8 / Math.max(whiteMidi.length, 1);
    const startX = -whiteMidi.length * whiteWidth / 2;
    const xByMidi = new Map();
    whiteMidi.forEach((midi, index) => xByMidi.set(midi, startX + (index + 0.5) * whiteWidth));
    for (const midi of whiteMidi) this.addKey(midi, xByMidi.get(midi), false, whiteWidth, colors);
    for (let midi = span.first; midi <= span.last; midi += 1) {
      if (isWhite(midi)) continue;
      const before = midi - 1;
      const after = midi + 1;
      const left = xByMidi.get(before);
      const right = xByMidi.get(after);
      if (left === undefined || right === undefined) continue;
      this.addKey(midi, (left + right) / 2, true, whiteWidth, colors);
    }
    // Performer-side overhead view (~68 degrees above the key plane): the
    // keys sit toward the far edge and the wrists enter from the near edge.
    this.camera.position.set(0, 7.5, 3.5);
    this.camera.lookAt(0, 0.05, 0.55);
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

  setFingerPose(root, finger, pressed) {
    const boneNames = FINGER_BONES[finger];
    if (!boneNames) return;
    for (const [index, name] of boneNames.entries()) {
      const bone = root.getObjectByName(name);
      if (!bone) continue;
      const initial = this.initialQuaternions.get(name);
      if (initial) bone.quaternion.copy(initial);
      if (pressed) bone.rotation.x = -(0.20 + index * 0.07);
    }
  }

  resetHand(root) {
    for (const name of Object.keys(FINGER_BONES).flatMap((finger) => FINGER_BONES[finger])) {
      const bone = root.getObjectByName(name);
      const initial = this.initialQuaternions.get(name);
      if (bone && initial) bone.quaternion.copy(initial);
    }
  }

  fingerNumber(note) {
    const finger = Number(note?.finger);
    return finger >= 1 && finger <= 5 ? finger : undefined;
  }

  update(options) {
    this.activeOptions = options;
    if (!options || !options.width || !options.height) return;
    const span = spanFor(options.size);
    const colors = options.colors || { leftHand: '#FFC400', rightHand: '#4FA3FF' };
    this.buildKeys(span, colors);
    this.resize();

    const seconds = Number.isFinite(options.seconds) ? options.seconds : 0;
    const notes = Array.isArray(options.notes) ? options.notes : [];
    const fingered = Array.isArray(options.fingeredNotes) ? options.fingeredNotes : [];
    const active = notes.filter((note) => midiInRange(note.midi, span) && note.startSeconds <= seconds && note.endSeconds > seconds);
    const activeFingered = fingered.filter((note) => midiInRange(note.midi, span) && note.startSeconds <= seconds && note.endSeconds > seconds);
    const byMidi = new Map(activeFingered.map((note) => [note.midi, note]));

    for (const [midi, key] of this.keys) {
      const note = active.find((item) => item.midi === midi);
      const hand = note?.hand === 'left' ? 'left' : 'right';
      const color = hand === 'left' ? colors.leftHand : colors.rightHand;
      key.userData.press = note ? 0.12 : 0;
      key.material.color.set(note ? color : key.userData.baseColor);
    }

    for (const side of ['left', 'right']) {
      const root = this.hands[side];
      if (!root) continue;
      this.resetHand(root);
      const sideNotes = active.filter((note) => (note.hand === 'left') === (side === 'left'));
      const baseX = side === 'left' ? -1.35 : 1.35;
      const target = sideNotes.length ? sideNotes.reduce((sum, note) => sum + this.keyX(note.midi), 0) / sideNotes.length : baseX;
      this.targetHandX[side] = clamp(target - baseX, -2.5, 2.5);
      for (const note of sideNotes) {
        const detail = byMidi.get(note.midi);
        const finger = this.fingerNumber(detail);
        if (finger) this.setFingerPose(root, finger, true);
      }
    }
  }

  keyX(midi) { return this.keys.get(midi)?.position.x || 0; }

  renderToCanvas(options, context, box) {
    this.update(options);
    const width = Math.max(1, Math.round(box.w));
    const height = Math.max(1, Math.round(box.h));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
    context.drawImage(this.renderer.domElement, box.x, box.y, width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    for (const side of ['left', 'right']) {
      const root = this.hands[side];
      if (!root) continue;
      this.handX[side] = THREE.MathUtils.lerp(this.handX[side], this.targetHandX[side], Math.min(1, delta * 9));
      root.position.x = (side === 'left' ? -1.35 : 1.35) + this.handX[side];
    }
    for (const key of this.keys.values()) {
      key.position.y = THREE.MathUtils.lerp(key.position.y, key.userData.baseY - key.userData.press, Math.min(1, delta * 14));
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
