/**
 * piano-hand-engine — MusicXML/MIDI to a pair of hands playing.
 *
 * Phases 1 and 2 are built: the instrument's geometry in millimetres,
 * one rigged hand with real bone lengths and joint limits, and every
 * note of a performance placed on an exact key. Everything after that
 * -- the hand split, the fingering solver, the motion planner, the IK
 * and the renderer -- is deliberately absent rather than stubbed.
 *
 * See `README.md` for the pipeline and what each phase adds.
 */

export const ENGINE_VERSION = '0.1.0';

export * from './core/types.js';
export * from './core/timeline.js';
export * from './keyboard/pianoGeometry.js';
export * from './keyboard/keyPosition.js';
export * from './kinematics/handPose.js';
