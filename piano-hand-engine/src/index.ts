/**
 * piano-hand-engine — MusicXML/MIDI to a pair of hands playing.
 *
 * Phases 1 to 3 are built: the instrument's geometry in millimetres,
 * one rigged hand with real bone lengths and joint limits, every note
 * placed on an exact key, and both hands' fingering solved as a search
 * over the whole phrase. Everything after that -- the IK, the motion
 * planner and the renderer -- is deliberately absent rather than
 * stubbed.
 *
 * See `README.md` for the pipeline and what each phase adds.
 */

export const ENGINE_VERSION = '0.1.0';

export * from './core/types.js';
export * from './core/timeline.js';
export * from './keyboard/pianoGeometry.js';
export * from './keyboard/keyPosition.js';
export * from './kinematics/handPose.js';
export * from './core/solver.js';
export * from './fingering/handSpan.js';
export * from './fingering/handSplit.js';
export * from './fingering/fingeringCost.js';
export * from './fingering/fingeringSolver.js';
