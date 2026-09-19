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

// ---- fonts (Phase 50/§8.2: the music font, the text font, and every text size) ----

export interface FontSizeConfig {
  /** In staff spaces, like every other size in this engine -- NOT CSS pixels, so a font size survives `resize` unchanged. */
  readonly barNumber: number;
  readonly lyric: number;
  readonly dynamic: number;
  readonly tempo: number;
  readonly chordSymbol: number;
}

export interface FontsConfig {
  /**
   * The SMuFL music font every notehead/clef/rest/flag/accidental is
   * drawn in. The engine's own glyph METRICS come from Bravura
   * (`glyphs/data/bravura_metadata.json`), so substituting a
   * metric-incompatible font moves glyphs relative to their anchors --
   * a SMuFL-compliant alternative with Bravura-compatible metrics is
   * the supported case, not any arbitrary font.
   */
  readonly musicFont: string;
  /** The ordinary text font for bar numbers and other non-glyph text. */
  readonly textFont: string;
  readonly lyricFont: string;
  readonly sizes: FontSizeConfig;
}

// ---- cursor (Phase 45-47: cursor-moves vs notation-moves sync) ----

export type CursorMode = 'cursorMoves' | 'notationMoves';

export interface CursorConfig {
  readonly mode: CursorMode;
  /**
   * Phase 49/§17.2: `notationMoves` only -- where in the viewport the
   * fixed marker sits, as a 0..1 fraction of its width. Ignored by
   * `cursorMoves`, where the marker goes to the note rather than the
   * note coming to the marker.
   */
  readonly fixedFraction: number;
  /** Marker thickness in staff spaces. */
  readonly thickness: number;
  /** Marker colour. Its own field rather than `colors.ink`: a cursor is an overlay on the music, and is conventionally NOT the same colour as the notes it sits over. */
  readonly color: string;
  /** 0..1 marker opacity. */
  readonly opacity: number;
}

// ---- notehead mapping (Phase 16/17: per-instrument notehead shapes) ----

export interface NoteheadMappingConfig {
  /**
   * The notehead SHAPE FAMILY used when nothing more specific matches --
   * one of 'normal', 'x', 'circle-x', 'diamond', 'triangle', 'square',
   * 'slash', 'plus' (§9.7's own table, in `geometry/notehead.ts`).
   *
   * A shape family, not a glyph name: the fill still follows the
   * duration, so 'normal' means noteheadWhole/Half/Black as the note
   * requires. Naming one fixed glyph here would draw every whole note
   * filled.
   */
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
 *
 * Both numbers are CLEARANCES -- the empty space between two staves, not
 * the distance between their lines. `minStaffDistance` measures from the
 * upper staff's bottom line to the lower staff's top line, and 4.0 (one
 * staff height, the upper end of §15.1's "generous scores use more") is
 * this engine's own default.
 */
export interface StavesConfig {
  readonly minStaffDistance: number;
  /**
   * §15.2: the floor between the BOTTOM staff of one system and the TOP
   * staff of the next. Systems are conventionally separated by more than
   * the staves within a system, so this is deliberately its own number
   * rather than reusing `minStaffDistance`.
   */
  readonly minSystemDistance: number;
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

// ---- debug (Phase 51, §18.3) ----

/**
 * §18.3's own severity ladder. `silent` returns nothing, `error` only
 * errors, `warn` errors + warnings, and `info`/`debug` everything --
 * `debug` is distinguished from `info` not by which diagnostics pass
 * (both pass all three severities) but by it being the level at which a
 * host says "give me everything you have", which future internal tracing
 * can key off without changing what `info` means today.
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface DebugConfig {
  /** Filters the `diagnostics` a render returns (§10.7's single channel -- there is no console logging anywhere in this engine). */
  readonly logLevel: LogLevel;
  /** Overlay every drawn element's real bounding box on the SVG. */
  readonly drawBoundingBoxes: boolean;
  /** Overlay §15's north/south skylines, per staff. */
  readonly drawSkyline: boolean;
  /** Colour of the bounding-box overlay. Its own field, not `colors.overrides`: an overlay is not part of the music. */
  readonly boundingBoxColor: string;
  readonly skylineColor: string;
}

// ---- the whole thing ----

export interface EngineConfig {
  readonly colors: ColorConfig;
  readonly layout: LayoutConfig;
  readonly fonts: FontsConfig;
  readonly cursor: CursorConfig;
  readonly noteheadMapping: NoteheadMappingConfig;
  readonly beam: BeamConfig;
  readonly barNumbers: BarNumberConfig;
  readonly keySignature: KeySignatureConfig;
  readonly spacing: SpacingConfig;
  readonly staves: StavesConfig;
  readonly page: PageConfig;
  readonly drums: DrumsConfig;
  readonly debug: DebugConfig;
}

/** Same shape as EngineConfig, but every section and every field within it is optional -- what callers pass to resolveConfig(). */
export interface PartialEngineConfig {
  readonly colors?: Partial<ColorConfig>;
  readonly layout?: Partial<LayoutConfig>;
  readonly fonts?: Partial<Omit<FontsConfig, 'sizes'>> & {
    readonly sizes?: Partial<FontSizeConfig>;
  };
  readonly cursor?: Partial<CursorConfig>;
  readonly noteheadMapping?: Partial<NoteheadMappingConfig>;
  readonly beam?: Partial<BeamConfig>;
  readonly barNumbers?: Partial<BarNumberConfig>;
  readonly keySignature?: Partial<KeySignatureConfig>;
  readonly spacing?: Partial<SpacingConfig>;
  readonly staves?: Partial<StavesConfig>;
  readonly page?: Partial<PageConfig>;
  readonly drums?: Partial<DrumsConfig>;
  readonly debug?: Partial<DebugConfig>;
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
    // 20 real pixels per staff space -- the scale `renderFromMusicXml`
    // has always emitted, now stated here instead of inside the renderer.
    pxPerStaffSpace: 20,
  },
  fonts: {
    musicFont: 'Bravura',
    // The project's own UI font, with a generic fallback so a host that
    // has not loaded it still gets proportional text rather than serif.
    textFont: 'Manrope, sans-serif',
    lyricFont: 'Manrope, sans-serif',
    // Staff spaces, not pixels (see FontSizeConfig) -- §13.1's own bar
    // number size, and the text sizes the renderer already drew at.
    sizes: {
      barNumber: 1.6,
      lyric: 1.8,
      dynamic: 2.2,
      tempo: 1.8,
      chordSymbol: 1.8,
    },
  },
  cursor: {
    mode: 'notationMoves',
    fixedFraction: 1 / 3,
    thickness: 0.3,
    color: '#C81E2C',
    opacity: 0.85,
  },
  noteheadMapping: {
    defaultShape: 'normal',
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
    minStaffDistance: 4.0,
    // §15.2's own "systems are separated by more than staves are" -- the
    // same kind of sensible, fully overridable default as every other
    // number in this object.
    minSystemDistance: 6.0,
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
  debug: {
    // 'info' keeps every diagnostic the engine produces, which is what
    // every caller got before this section existed -- a filter whose
    // default drops information would be a surprising regression.
    logLevel: 'info',
    drawBoundingBoxes: false,
    drawSkyline: false,
    // Translucent primaries: an overlay has to be legible ON TOP of black
    // notation without being mistaken for part of it.
    boundingBoxColor: 'rgba(0, 120, 255, 0.55)',
    skylineColor: 'rgba(220, 40, 40, 0.75)',
  },
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
    // `fonts` is the one section with a nested object, so its `sizes` gets
    // the same field-by-field merge the sections themselves get -- overriding
    // one size must not drop the other four.
    fonts: {
      ...DEFAULT_CONFIG.fonts,
      ...overrides?.fonts,
      sizes: { ...DEFAULT_CONFIG.fonts.sizes, ...overrides?.fonts?.sizes },
    },
    cursor: { ...DEFAULT_CONFIG.cursor, ...overrides?.cursor },
    noteheadMapping: { ...DEFAULT_CONFIG.noteheadMapping, ...overrides?.noteheadMapping },
    beam: { ...DEFAULT_CONFIG.beam, ...overrides?.beam },
    barNumbers: { ...DEFAULT_CONFIG.barNumbers, ...overrides?.barNumbers },
    keySignature: { ...DEFAULT_CONFIG.keySignature, ...overrides?.keySignature },
    spacing: { ...DEFAULT_CONFIG.spacing, ...overrides?.spacing },
    staves: { ...DEFAULT_CONFIG.staves, ...overrides?.staves },
    page: { ...DEFAULT_CONFIG.page, ...overrides?.page },
    drums: { ...DEFAULT_CONFIG.drums, ...overrides?.drums },
    debug: { ...DEFAULT_CONFIG.debug, ...overrides?.debug },
  };
}
