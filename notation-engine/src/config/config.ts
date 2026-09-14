/**
 * The engine's single config object. PLAN.md §8 is where every one
 * of these sections eventually gets fully fleshed out (once the phase it
 * belongs to actually exists) and unified into the documented theming API
 * -- this file is where each section's SLOT gets reserved up front, so no
 * later phase needs to bolt a new top-level option onto some unrelated
 * object. Every section has a sensible default (see DEFAULT_CONFIG below)
 * and every section is independently overridable via resolveConfig().
 */

// ---- colors (Phase 18: note color system; Phase 48: full theming) ----

export interface ColorConfig {
  /** Default drawing color for everything (staff lines, stems, noteheads, text) unless a more specific override applies. */
  readonly ink: string;
  readonly background: string;
  /**
   * Per-element-category overrides, keyed by a category name Phase 18
   * will define (e.g. "notehead", "stem", "lyric"). Reserved as a generic
   * string-keyed map now since the exact category set isn't decided yet.
   */
  readonly overrides?: Readonly<Record<string, string>>;
}

// ---- layout (Phase 41/42: scroll vs page; Phase 44: arbitrary resize) ----

export type LayoutMode = 'scroll' | 'page';

export interface LayoutConfig {
  readonly mode: LayoutMode;
  /**
   * Real CSS pixels per staff space -- the single number Phase 44's
   * arbitrary-width/height resize changes (see Phase 6's
   * createSvgDocument, which takes exactly this value).
   */
  readonly pxPerStaffSpace: number;
}

// ---- cursor (Phase 45-47: cursor-moves vs notation-moves sync) ----

export type CursorMode = 'cursorMoves' | 'notationMoves';

export interface CursorConfig {
  readonly mode: CursorMode;
}

// ---- notehead mapping (Phase 16/17: per-instrument notehead shapes) ----

export interface NoteheadMappingConfig {
  /** The notehead glyph name (see Phase 5's getGlyph) used when nothing more specific matches. */
  readonly defaultShape: string;
  /**
   * Per-instrument/pitch overrides. The exact key scheme (by MIDI note
   * number? by instrument id + step?) is Phase 17's decision -- this slot
   * is reserved as a generic string-keyed map until that's designed, so
   * e.g. a drum kit's kick/snare/hi-hat mapping doesn't need a different
   * config shape than a pitched instrument's muted-note override.
   */
  readonly overridesByKey?: Readonly<Record<string, string>>;
}

// ---- beam style (Phase 24: straight/flat/curved) ----

export type BeamStyle = 'straight' | 'flat' | 'curved';

export interface BeamConfig {
  readonly style: BeamStyle;
}

// ---- bar/measure numbering (Phase 13) ----

export type BarNumberDisplay = 'off' | 'everyBar' | 'everyNBars' | 'systemStart';

export interface BarNumberConfig {
  readonly display: BarNumberDisplay;
  /** Only meaningful when display === 'everyNBars'. */
  readonly everyNBars?: number;
}

// ---- key signature style (Phase 11) ----

/** Only "standard" exists so far -- reserved as a union (not a bare string) so Phase 11 can add real alternatives later without a breaking type change for existing callers. */
export type KeySignatureStyle = 'standard';

export interface KeySignatureConfig {
  readonly style: KeySignatureStyle;
}

// ---- horizontal spacing (Phase 43, §14) ----

/**
 * §14's own published constants (LilyPond's, used as this engine's
 * defaults -- the product of decades of real engraving practice, not
 * invented here). `spacingIncrement` is roughly one notehead width;
 * `shortestDurationSpace` is how many increments the reference duration
 * itself gets. `minNoteDistance` is §14.2's own minimum-gap floor
 * (notehead + accidentals + dots + wide articulations, plus this), a
 * small value chosen the same way every other "reasonable small gap"
 * default in this codebase already was (Integration C's tab mask
 * padding, Phase 24's beam bulge, etc.) -- real, but not itself derived
 * from a single universal source, and fully overridable for exactly
 * that reason. `justify` disables stretching entirely per §14.3.
 */
export interface SpacingConfig {
  readonly spacingIncrement: number;
  readonly shortestDurationSpace: number;
  readonly minNoteDistance: number;
  readonly justify: boolean;
}

// ---- skyline / staff distance (Phase 44, §15) ----

/**
 * §15.1's own sensible default: "around 3.5 staff spaces at minimum;
 * generous scores use more." The skyline computes the REAL distance two
 * adjacent staves need given their actual content; this is only the
 * floor that applies even when both staves are otherwise empty.
 */
export interface StavesConfig {
  readonly minStaffDistance: number;
}

// ---- page geometry (Phase 46, §16.2) ----

/**
 * §16.2's own requirement: "page geometry (size, margins) comes from
 * `config.page`." Defaults match a standard A4 page in staff spaces at
 * a typical engraving scale (roughly 7mm per staff space, the same
 * scale most notation software defaults to) -- a reasonable starting
 * point, fully overridable, the same way every other config default in
 * this codebase already is.
 */
export interface PageConfig {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly marginTop: number;
  readonly marginBottom: number;
  readonly marginLeft: number;
  readonly marginRight: number;
}

// ---- drum mapping (Phase 41) ----

/**
 * §13.3: every field of the default GM percussion table
 * (`DEFAULT_DRUM_MAPPING_TABLE`, in `drums/drum-map.ts`) is overridable
 * here, keyed by GM MIDI note number -- "the default table is a
 * starting point, not a constraint: house styles differ on which line a
 * tom sits on, and the user must be able to change it." A partial entry
 * overrides only the fields it names for that note; fields it omits
 * keep the default table's own value for that entry.
 *
 * This shape is defined structurally here rather than importing
 * `DrumMapEntry` from `drums/` -- §4.1's dependency table is explicit
 * that `config/` may import from nothing else in the codebase.
 * `drums/`'s own `DrumMapEntry` is written to match this structurally,
 * so the two remain freely combinable wherever a caller (e.g.
 * `render-from-musicxml.ts`) merges a default table with these
 * overrides, without either module depending on the other.
 */
export interface DrumMapEntryOverride {
  readonly name?: string;
  readonly staffPosition?: number;
  readonly noteheadShape?: string;
  readonly stemDirection?: 'up' | 'down';
  readonly articulation?: string;
}

export interface DrumsConfig {
  readonly mapping?: Readonly<Record<number, DrumMapEntryOverride>>;
}

// ---- the whole thing ----

export interface EngineConfig {
  readonly colors: ColorConfig;
  readonly layout: LayoutConfig;
  readonly cursor: CursorConfig;
  readonly noteheadMapping: NoteheadMappingConfig;
  readonly beam: BeamConfig;
  readonly barNumbers: BarNumberConfig;
  readonly keySignature: KeySignatureConfig;
  readonly spacing: SpacingConfig;
  readonly staves: StavesConfig;
  readonly page: PageConfig;
  readonly drums: DrumsConfig;
}

/** Same shape as EngineConfig, but every section and every field within it is optional -- what callers pass to resolveConfig(). */
export interface PartialEngineConfig {
  readonly colors?: Partial<ColorConfig>;
  readonly layout?: Partial<LayoutConfig>;
  readonly cursor?: Partial<CursorConfig>;
  readonly noteheadMapping?: Partial<NoteheadMappingConfig>;
  readonly beam?: Partial<BeamConfig>;
  readonly barNumbers?: Partial<BarNumberConfig>;
  readonly keySignature?: Partial<KeySignatureConfig>;
  readonly spacing?: Partial<SpacingConfig>;
  readonly staves?: Partial<StavesConfig>;
  readonly page?: Partial<PageConfig>;
  readonly drums?: Partial<DrumsConfig>;
}

/**
 * Reasonable defaults for every section -- black ink on white, scroll
 * layout at a modest pixel scale, notation-moves cursor sync (matching
 * the earlier drum-video project's panning behavior), plain noteheads,
 * straight beams, bar numbers at each system start, standard key
 * signatures.
 */
export const DEFAULT_CONFIG: EngineConfig = {
  colors: {
    ink: '#000000',
    background: '#ffffff',
  },
  layout: {
    mode: 'scroll',
    pxPerStaffSpace: 10,
  },
  cursor: {
    mode: 'notationMoves',
  },
  noteheadMapping: {
    defaultShape: 'noteheadBlack',
  },
  beam: {
    style: 'straight',
  },
  barNumbers: {
    display: 'systemStart',
  },
  keySignature: {
    style: 'standard',
  },
  spacing: {
    spacingIncrement: 1.2,
    shortestDurationSpace: 2.0,
    minNoteDistance: 0.5,
    justify: true,
  },
  staves: {
    minStaffDistance: 3.5,
  },
  page: {
    // A4 (210mm x 297mm) at roughly 7mm per staff space -- a common
    // engraving scale, not a universal standard; fully overridable.
    pageWidth: 30,
    pageHeight: 42,
    marginTop: 3,
    marginBottom: 3,
    marginLeft: 2.5,
    marginRight: 2.5,
  },
  drums: {},
};

/**
 * Merges a partial config against DEFAULT_CONFIG, section by section --
 * every section not mentioned in `overrides` keeps its default wholesale,
 * and every field not mentioned within a section that IS overridden keeps
 * that section's default for just that field. This is the ONE function
 * the rest of the engine should call to get a usable config; nothing else
 * should read DEFAULT_CONFIG directly or hardcode a fallback value.
 */
export function resolveConfig(overrides?: PartialEngineConfig): EngineConfig {
  return {
    colors: { ...DEFAULT_CONFIG.colors, ...overrides?.colors },
    layout: { ...DEFAULT_CONFIG.layout, ...overrides?.layout },
    cursor: { ...DEFAULT_CONFIG.cursor, ...overrides?.cursor },
    noteheadMapping: { ...DEFAULT_CONFIG.noteheadMapping, ...overrides?.noteheadMapping },
    beam: { ...DEFAULT_CONFIG.beam, ...overrides?.beam },
    barNumbers: { ...DEFAULT_CONFIG.barNumbers, ...overrides?.barNumbers },
    keySignature: { ...DEFAULT_CONFIG.keySignature, ...overrides?.keySignature },
    spacing: { ...DEFAULT_CONFIG.spacing, ...overrides?.spacing },
    staves: { ...DEFAULT_CONFIG.staves, ...overrides?.staves },
    page: { ...DEFAULT_CONFIG.page, ...overrides?.page },
    drums: { ...DEFAULT_CONFIG.drums, ...overrides?.drums },
  };
}
