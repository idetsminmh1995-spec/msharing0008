// Notation Engine -- entry point.
//
// Phase 2's toolchain smoke-test stub has grown into the real public API,
// starting with Phase 3's core data model.

/** Semantic version of the engine itself, bumped by hand for now. */
export const ENGINE_VERSION = '0.0.0';

export * from './core/index.js';
export * from './glyphs/index.js';
export * from './geometry/index.js';
export * from './render/index.js';
export * from './config/index.js';
export * from './parser/index.js';
export * from './layout/index.js';
export * from './render-from-musicxml.js';
