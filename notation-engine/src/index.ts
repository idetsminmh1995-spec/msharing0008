// Notation Engine -- entry point.
//
// Phase 2's toolchain smoke-test stub has grown into the real public API,
// starting with Phase 3's core data model.

/** Semantic version of the engine itself, bumped by hand for now. */
export const ENGINE_VERSION = '0.0.0';

export * from './core/index.js';
export * from './glyphs/index.js';
