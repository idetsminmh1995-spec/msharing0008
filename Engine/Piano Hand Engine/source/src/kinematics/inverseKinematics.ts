import type { Euler, Finger, FingerState, Hand, Vec3 } from '../core/types.js';
import { ALL_FINGERS } from '../core/types.js';
import type { HandRig } from './handPose.js';
import { clampFingerState, solveHandSkeleton } from './handPose.js';

const JOINTS = ['mcp', 'pip', 'dip', 'spread'] as const;
type Joint = (typeof JOINTS)[number];

export interface FingerTarget {
  readonly finger: Finger;
  readonly target: Vec3;
}

export interface FingerIKInput {
  readonly hand: Hand;
  readonly rig: HandRig;
  readonly wrist: Vec3;
  readonly wristRotation: Euler;
  readonly fingers: Readonly<Record<Finger, FingerState>>;
  readonly finger: Finger;
  readonly target: Vec3;
  readonly allowSpread?: boolean;
  readonly toleranceMm?: number;
  readonly maxIterations?: number;
}

export interface FingerIKResult {
  readonly finger: Finger;
  readonly state: FingerState;
  readonly tip: Vec3;
  readonly errorMm: number;
  readonly converged: boolean;
  readonly iterations: number;
}

export interface HandIKInput extends Omit<FingerIKInput, 'finger' | 'target'> {
  readonly targets: readonly FingerTarget[];
}

export interface HandIKResult {
  readonly fingers: Readonly<Record<Finger, FingerState>>;
  readonly results: readonly FingerIKResult[];
  readonly maxErrorMm: number;
  readonly converged: boolean;
}

/** Solve one fingertip against a fixed wrist using bounded damped least squares. */
export function solveFingerTarget(input: FingerIKInput): FingerIKResult {
  const toleranceMm = input.toleranceMm ?? 1;
  const maxIterations = input.maxIterations ?? 40;
  let state = clampFingerState(input.fingers[input.finger]);
  let damping = 0.25;
  let iterations = 0;
  let tip = tipFor(input, state);
  let error = distance(tip, input.target);
  const activeJoints = input.allowSpread === false ? JOINTS.slice(0, 3) : JOINTS;

  for (; iterations < maxIterations && error > toleranceMm; iterations += 1) {
    const residual = subtract(input.target, tip);
    const jacobian = jacobianFor(input, state, activeJoints);
    const normal = gramMatrix(jacobian, damping);
    const dual = solve3(normal, [residual.x, residual.y, residual.z]);
    if (!dual) break;

    const step = jacobian.map(
      (column) => column.x * (dual[0] ?? 0) + column.y * (dual[1] ?? 0) + column.z * (dual[2] ?? 0),
    );
    const largest = Math.max(...step.map(Math.abs));
    const scale = largest > 0.2 ? 0.2 / largest : 1;
    const candidate = clampFingerState({
      mcp: state.mcp + (step[0] ?? 0) * scale,
      pip: state.pip + (step[1] ?? 0) * scale,
      dip: state.dip + (step[2] ?? 0) * scale,
      spread: state.spread + (activeJoints.includes('spread') ? (step[3] ?? 0) * scale : 0),
    });
    const candidateTip = tipFor(input, candidate);
    const candidateError = distance(candidateTip, input.target);

    if (candidateError + 1e-7 < error) {
      state = candidate;
      tip = candidateTip;
      error = candidateError;
      damping = Math.max(0.025, damping * 0.7);
    } else {
      damping = Math.min(8, damping * 2);
      if (damping === 8) break;
    }
  }

  return {
    finger: input.finger,
    state,
    tip,
    errorMm: error,
    converged: error <= toleranceMm,
    iterations,
  };
}

/** Solve all simultaneously targeted fingers against the same wrist pose. */
export function solveFingerTargets(input: HandIKInput): HandIKResult {
  const targetsByFinger = new Map<Finger, Vec3[]>();
  for (const target of input.targets) {
    const targets = targetsByFinger.get(target.finger) ?? [];
    targets.push(target.target);
    targetsByFinger.set(target.finger, targets);
  }

  const fingers = { ...input.fingers } as Record<Finger, FingerState>;
  const results: FingerIKResult[] = [];
  for (const finger of ALL_FINGERS) {
    const targets = targetsByFinger.get(finger);
    if (!targets?.length) continue;
    const centroid = mean(targets);
    const result = solveFingerTarget({
      hand: input.hand,
      rig: input.rig,
      wrist: input.wrist,
      wristRotation: input.wristRotation,
      fingers,
      finger,
      target: centroid,
      ...(input.allowSpread === undefined ? {} : { allowSpread: input.allowSpread }),
      ...(input.toleranceMm === undefined ? {} : { toleranceMm: input.toleranceMm }),
      ...(input.maxIterations === undefined ? {} : { maxIterations: input.maxIterations }),
    });
    fingers[finger] = result.state;
    const worstTargetError = Math.max(...targets.map((target) => distance(result.tip, target)));
    results.push({
      ...result,
      errorMm: worstTargetError,
      converged: worstTargetError <= (input.toleranceMm ?? 1),
    });
  }

  return {
    fingers,
    results,
    maxErrorMm: results.reduce((max, result) => Math.max(max, result.errorMm), 0),
    converged: results.every((result) => result.converged),
  };
}

function tipFor(input: FingerIKInput, state: FingerState): Vec3 {
  const fingers = { ...input.fingers, [input.finger]: state };
  return solveHandSkeleton({
    hand: input.hand,
    rig: input.rig,
    wrist: input.wrist,
    wristRotation: input.wristRotation,
    fingers,
  }).fingers[input.finger].tip;
}

function jacobianFor(
  input: FingerIKInput,
  state: FingerState,
  joints: readonly Joint[],
): readonly Vec3[] {
  const epsilon = 0.001;
  return joints.map((joint) => {
    const value = state[joint];
    const plus = clampFingerState({ ...state, [joint]: value + epsilon });
    const plusDelta = plus[joint] - value;
    if (Math.abs(plusDelta) > 1e-9) {
      return scale(subtract(tipFor(input, plus), tipFor(input, state)), 1 / plusDelta);
    }
    const minus = clampFingerState({ ...state, [joint]: value - epsilon });
    const minusDelta = value - minus[joint];
    if (minusDelta > 1e-9) {
      return scale(subtract(tipFor(input, state), tipFor(input, minus)), 1 / minusDelta);
    }
    return { x: 0, y: 0, z: 0 };
  });
}

function gramMatrix(jacobian: readonly Vec3[], damping: number): number[][] {
  const columns = [
    jacobian.map((column) => column.x),
    jacobian.map((column) => column.y),
    jacobian.map((column) => column.z),
  ];
  return columns.map((row, i) =>
    columns.map((column, j) =>
      row.reduce(
        (sum, value, k) => sum + value * (column[k] ?? 0),
        i === j ? damping * damping : 0,
      ),
    ),
  );
}

function solve3(
  matrix: readonly (readonly number[])[],
  vector: readonly number[],
): number[] | null {
  const rows = matrix.map((row, i) => [...row, vector[i] ?? 0]);
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(rows[row]?.[column] ?? 0) > Math.abs(rows[pivot]?.[column] ?? 0)) pivot = row;
    }
    const pivotValue = rows[pivot]?.[column] ?? 0;
    if (Math.abs(pivotValue) < 1e-12) return null;
    [rows[column], rows[pivot]] = [rows[pivot] ?? [], rows[column] ?? []];
    const pivotRow = rows[column];
    if (!pivotRow) return null;
    for (let j = column; j < 4; j += 1) pivotRow[j] = (pivotRow[j] ?? 0) / pivotValue;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = rows[row]?.[column] ?? 0;
      for (let j = column; j < 4; j += 1) {
        const target = rows[row];
        if (target) target[j] = (target[j] ?? 0) - factor * (pivotRow[j] ?? 0);
      }
    }
  }
  return rows.map((row) => row[3] ?? 0);
}

function mean(points: readonly Vec3[]): Vec3 {
  const sum = points.reduce((value, point) => add(value, point), { x: 0, y: 0, z: 0 });
  return scale(sum, 1 / points.length);
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(point: Vec3, amount: number): Vec3 {
  return { x: point.x * amount, y: point.y * amount, z: point.z * amount };
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
