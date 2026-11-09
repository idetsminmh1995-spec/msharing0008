/**
 * piano-hand-engine — MusicXML/MIDI to a pair of hands playing.
 *
 * Phases 1 to 3 are built: piano geometry in millimetres, a parametric
 * hand skeleton with segment lengths and joint limits, exact key targets,
 * and phrase-level fingering. A bounded finger-target IK solver is now
 * included for the synthetic Engine rig; it is not yet calibrated to the
 * website's skinned GLB. Wrist motion planning remains unfinished.
 *
 * See `README.md` for the pipeline and what each phase adds.
 */

export const ENGINE_VERSION = '0.1.0';

export * from './core/types.js';
export * from './core/timeline.js';
export * from './keyboard/pianoGeometry.js';
export * from './keyboard/keyPosition.js';
export * from './kinematics/handPose.js';
export * from './kinematics/inverseKinematics.js';
export * from './core/solver.js';
export * from './fingering/handSpan.js';
export * from './fingering/handSplit.js';
export * from './fingering/fingeringCost.js';
export * from './fingering/fingeringSolver.js';
