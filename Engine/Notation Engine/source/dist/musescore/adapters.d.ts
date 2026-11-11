/**
 * adapters.ts — the one place MuseScore's numbers meet this engine's.
 *
 * Everything else in this folder is MuseScore's data in MuseScore's own
 * terms. This file turns it into the shapes this engine already takes,
 * so a host can say "render this the way MuseScore would" by passing
 * one config object rather than by rewriting a renderer.
 *
 * It is opt-in, and that is deliberate. Nothing in the engine imports
 * this file; nothing changes for anyone who does not call it. The
 * engine's own defaults remain the engine's own.
 */
import type { DrumMapEntryOverride } from '../config/config.js';
import { type MuseScoreDrum } from './drumset.js';
import { type MuseScoreOverrides } from './overrides.js';
/**
 * MuseScore's notehead groups, in this engine's own shape-family names.
 *
 * Only the groups a drumset or a MusicXML file can produce. A group
 * with no family of its own here is left out rather than approximated:
 * `drumMappingFromMuseScore` falls back to the glyph itself for those,
 * which is exact.
 */
export declare const NOTEHEAD_GROUP_TO_SHAPE: Readonly<Record<string, string>>;
/**
 * The notehead this engine should draw for one MuseScore drum.
 *
 * A HEAD_CUSTOM drum names a SMuFL glyph outright -- MuseScore's slap,
 * china cymbal, muted conga and muted surdo all do -- and that glyph is
 * returned as-is, because a shape family that does not contain it would
 * be a worse answer than the real one.
 */
export declare function noteheadForDrum(drum: MuseScoreDrum): string;
/**
 * Which way a drum stem points in this engine's chart.
 *
 * Drum files commonly place kick and hi-hat in separate voices and write
 * the kick with `<stem>down</stem>`. That makes a simultaneous kick/hi-hat
 * pattern visually split in two. This engine uses the chart convention the
 * product needs instead: percussion stems always point up, so a kick,
 * hi-hat and any other drum struck together read as one upright pattern.
 */
export declare function stemDirectionForDrum(_drum: MuseScoreDrum): 'up' | 'down';
/**
 * MuseScore's standard drumset, as `config.drums.mapping`.
 *
 * Staff positions are converted out of MuseScore's top-down lines into
 * this engine's bottom-up ones for a staff of `staffLines` -- five
 * unless a caller says otherwise, since that is what a drum part is.
 *
 * Pass `overrides` to fold in a kit of your own on top: see
 * `overrides.ts`. The owner's own MuseScore customisations belong
 * there, not in an edit to the table this is built from.
 */
export declare function drumMappingFromMuseScore(overrides?: MuseScoreOverrides, staffLines?: number): Readonly<Record<number, DrumMapEntryOverride>>;
/**
 * Which voice MuseScore puts each drum in, by MIDI pitch.
 *
 * Separate from the mapping above because this engine's drum config has
 * no voice field: voice is decided by the file, not by the kit. It remains
 * exposed for hosts that need the source file's voice assignments, while
 * stem rendering itself keeps percussion stems upright.
 */
export declare function drumVoicesFromMuseScore(): Readonly<Record<number, number>>;
