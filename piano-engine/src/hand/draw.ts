/**
 * draw.ts — the posed hand, as one smooth shape.
 *
 * The hand is a single closed outline: up one side of each finger,
 * round its tip, down into the web, and back along the heel of the
 * palm. There is no seam anywhere on it because there is no join
 * anywhere in it.
 *
 * Two things make it read as an illustration rather than as five bars
 * and a blob:
 *
 *  - THE WEBS ARE SHALLOW. The notch between two fingers stops about
 *    half way down them and a thin CREASE carries on from there into
 *    the palm. Cutting the notches all the way to the knuckles is what
 *    makes a drawn hand look like a rake; a real hand is webbed, and
 *    what separates its fingers lower down is a line, not a gap.
 *  - THE FINGERS TAPER and end in a nail. A finger that is the same
 *    width from knuckle to tip is a sausage, and the nail is the one
 *    detail that costs nothing and is missed immediately when it is
 *    not there.
 *
 * The thumb is drawn as its own overlapping shape rather than as a
 * sixth bump on the outline: its joint is under the palm, not beside
 * the index finger's, so walked as part of the same path the two
 * cross, and a closed path that crosses itself draws the crossing as a
 * line through the hand.
 */

import { HEEL_BULGE, PALM_LENGTH, PALM_WIDTH } from './anatomy.js';
import { poseAxis, poseHeel } from './pose.js';
import type { HandPose, PosedFinger } from './pose.js';

export interface HandDrawing {
  /** The four fingers and the palm, as one closed path. */
  readonly outline: string;
  /** The thumb, as a stroke down its own middle. */
  readonly thumb: { readonly path: string; readonly width: number } | undefined;
  /** The creases between the fingers, and across the palm. */
  readonly creases: readonly string[];
  /** A nail on each fingertip. */
  readonly nails: readonly { readonly path: string }[];
}

interface Vec {
  x: number;
  y: number;
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}
function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}
function mul(a: Vec, k: number): Vec {
  return { x: a.x * k, y: a.y * k };
}
function unit(a: Vec): Vec {
  const n = Math.hypot(a.x, a.y) || 1;
  return { x: a.x / n, y: a.y / n };
}
/** Perpendicular, to the right of the direction given. */
function perp(a: Vec): Vec {
  return { x: -a.y, y: a.x };
}
function lerp(a: Vec, b: Vec, t: number): Vec {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function at(p: Vec): string {
  return `${round(p.x)} ${round(p.y)}`;
}
function round(v: number): number {
  return Math.round(v * 100) / 100;
}

/** One finger's own frame: along it, across it, and how wide at each end. */
interface Shaft {
  readonly from: Vec;
  readonly to: Vec;
  readonly along: Vec;
  readonly across: Vec;
  readonly halfBase: number;
  readonly halfTip: number;
}

function shaft(finger: PosedFinger): Shaft {
  const along = unit(sub(finger.tip, finger.knuckle));
  return {
    from: finger.knuckle,
    to: finger.tip,
    along,
    across: perp(along),
    // A finger is widest at the knuckle and narrowest at the nail.
    halfBase: (finger.thick / 2) * 1.08,
    halfTip: (finger.thick / 2) * 0.84,
  };
}

const side = (s: Shaft, which: -1 | 1, end: 'from' | 'to'): Vec =>
  add(s[end], mul(s.across, which * (end === 'from' ? s.halfBase : s.halfTip)));

/**
 * Where two neighbouring fingers are joined.
 *
 * Up the fingers rather than down at the knuckles: `WEB` is the
 * fraction of the shorter finger's length at which the gap between
 * them closes. A hand is webbed; two fingers side by side are one
 * shape for the lower half of their length.
 */
const WEB = 0.46;

/** How far up a finger its nail sits, and how much of its width. */
const NAIL_FROM_TIP = 0.3;
const NAIL_WIDTH = 0.62;

export function drawHand(
  pose: HandPose,
  fingers: readonly PosedFinger[],
  options: { readonly creases?: boolean; readonly nails?: boolean } = {},
): HandDrawing {
  const four = fingers
    .filter((f) => f.finger !== 1)
    .map((f) => ({ finger: f, shaft: shaft(f) }))
    .sort((a, b) => a.shaft.to.x - b.shaft.to.x);
  if (four.length === 0) return { outline: '', thumb: undefined, creases: [], nails: [] };

  const axis = poseAxis(pose);
  const heel = poseHeel(pose, PALM_LENGTH);
  const half = (PALM_WIDTH / 2) * pose.unit;
  const sideways = perp(axis);

  const parts: string[] = [];
  const creases: string[] = [];

  const first = four[0] as (typeof four)[number];
  const last = four[four.length - 1] as (typeof four)[number];
  const startPoint = side(first.shaft, -1, 'from');
  parts.push(`M ${at(startPoint)}`);

  four.forEach((entry, i) => {
    const s = entry.shaft;
    const leftBase = side(s, -1, 'from');
    const leftTip = side(s, -1, 'to');
    const rightTip = side(s, 1, 'to');
    const rightBase = side(s, 1, 'from');

    if (i > 0) {
      // The web between this finger and the one before it: a soft
      // valley part way UP them, not a cut down to the knuckles.
      const previous = four[i - 1] as (typeof four)[number];
      const fromSide = side(previous.shaft, 1, 'from');
      const toSide = leftBase;
      const depth = Math.min(
        Math.hypot(
          previous.shaft.to.x - previous.shaft.from.x,
          previous.shaft.to.y - previous.shaft.from.y,
        ),
        Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y),
      );
      const webFrom = add(side(previous.shaft, 1, 'from'), mul(previous.shaft.along, depth * WEB));
      const webTo = add(leftBase, mul(s.along, depth * WEB));
      const valley = lerp(webFrom, webTo, 0.5);
      parts.push(`L ${at(webFrom)}`);
      parts.push(`Q ${at(valley)} ${at(webTo)}`);
      if (options.creases !== false) {
        // And the short line that carries the gap on down into the
        // palm, so two fingers that are joined still read as two.
        const end = add(lerp(fromSide, toSide, 0.5), mul(axis, -depth * 0.12));
        creases.push(`M ${at(valley)} Q ${at(lerp(valley, end, 0.55))} ${at(end)}`);
      }
    }

    // Up the outside of the finger, round the nail, and back down.
    parts.push(i === 0 ? `L ${at(leftTip)}` : `L ${at(leftTip)}`);
    parts.push(`A ${round(s.halfTip * 1.08)} ${round(s.halfTip)} 0 0 1 ${at(rightTip)}`);
    if (i === four.length - 1) parts.push(`L ${at(rightBase)}`);
  });

  // Down the outside of the hand, round the heel, and back up.
  const rightEdge = add(heel, mul(sideways, half * 0.82));
  const leftEdge = add(heel, mul(sideways, -half * 0.82));
  const rightShoulder = add(
    add(last.shaft.from, mul(sideways, half * 0.18)),
    mul(axis, -pose.unit * 0.1),
  );
  const leftShoulder = add(
    add(first.shaft.from, mul(sideways, -half * 0.18)),
    mul(axis, -pose.unit * 0.1),
  );
  parts.push(
    `C ${at(rightShoulder)} ${at(add(rightEdge, mul(axis, half * 0.5)))} ${at(rightEdge)}`,
  );
  // Round the heel. The bulge is `HEEL_BULGE` of a white key past the
  // wrist point, and the page reserves exactly that much frame for it.
  const bulge = mul(axis, -HEEL_BULGE * pose.unit * 1.34);
  parts.push(`C ${at(add(rightEdge, bulge))} ${at(add(leftEdge, bulge))} ${at(leftEdge)}`);
  parts.push(`C ${at(add(leftEdge, mul(axis, half * 0.5)))} ${at(leftShoulder)} ${at(startPoint)}`);
  parts.push('Z');

  const thumbFinger = fingers.find((f) => f.finger === 1);
  const thumb =
    thumbFinger === undefined
      ? undefined
      : (() => {
          const s = shaft(thumbFinger);
          const bend = add(lerp(s.from, s.to, 0.5), mul(s.across, s.halfBase * 0.5));
          return { path: `M ${at(s.from)} Q ${at(bend)} ${at(s.to)}`, width: thumbFinger.thick };
        })();

  const nails =
    options.nails === false
      ? []
      : fingers.map((finger) => {
          const s = shaft(finger);
          const centre = add(s.to, mul(s.along, -s.halfTip * NAIL_FROM_TIP * 2));
          const w = s.halfTip * NAIL_WIDTH;
          const h = s.halfTip * 0.95;
          const a = add(centre, mul(s.across, -w));
          const b = add(centre, mul(s.across, w));
          return {
            path:
              `M ${at(a)} A ${round(w)} ${round(h)} 0 0 1 ${at(b)}` +
              ` A ${round(w)} ${round(h)} 0 0 1 ${at(a)} Z`,
          };
        });

  return { outline: parts.join(' '), thumb, creases, nails };
}
