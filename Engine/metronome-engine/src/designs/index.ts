/**
 * The eleven designs, in the order a picker should show them.
 *
 * Order is part of the contract: the page stores a design by id, but a
 * numbered list is what the person sees, and a design that moved would
 * silently change what "design 4" means in someone's notes.
 */

import { pendulum } from './01-pendulum.js';
import { beatDots } from './02-beat-dots.js';
import { pulseRing } from './03-pulse-ring.js';
import { barMeter } from './04-bar-meter.js';
import { sweepDial } from './05-sweep-dial.js';
import { bigNumber } from './06-big-number.js';
import { segmentRing } from './07-segment-ring.js';
import { travelLine } from './08-travel-line.js';
import { flashFrame } from './09-flash-frame.js';
import { bounceBall } from './10-bounce-ball.js';
import { stackBlocks } from './11-stack-blocks.js';
import type { Design } from '../types.js';

export const DESIGNS: readonly Design[] = [
  pendulum,
  beatDots,
  pulseRing,
  barMeter,
  sweepDial,
  bigNumber,
  segmentRing,
  travelLine,
  flashFrame,
  bounceBall,
  stackBlocks,
];

export const DEFAULT_DESIGN_ID = DESIGNS[0]?.id ?? 'pendulum';

export function designById(id: string): Design | undefined {
  return DESIGNS.find((design) => design.id === id);
}
