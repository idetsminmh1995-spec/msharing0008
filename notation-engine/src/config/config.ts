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
  /**
   * The colour of the background rectangle drawn behind the whole
   * score.
   *
   * **`'none'` or `'transparent'` draws no rectangle at all** -- not a
   * rectangle that happens to be see-through. That is what a host
   * compositing the notation over something else needs: a video frame,
   * a dark page, a PNG with a real alpha channel. A `fill="none"` rect
   * would still be an element in the document, still hit-testable, and
   * would still fill an exported PNG with opaque white in any
   * rasteriser that treats a missing fill as the default.
   */
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
   * Shrink a system's height to what its music actually reaches.
   *
   * A system reserves four staff spaces above the top line and eight
   * below the bottom one, for everything a score may carry there. Most
   * scores carry far less, and on a PAGE that reserve is just margin --
   * but in a video frame, where the staff is given a fixed band of the
   * picture, every space of it is height the notes did not get. A drum
   * chart spent half its box on room nothing was drawn in.
   *
   * With this on, the reserve becomes the real reach of the notes, their
   * stems and their beams, plus a space of margin. The STAFF does not
   * change size in staff spaces -- nothing about the engraving moves --
   * the box around it just stops being bigger than the music, so a host
   * scaling that box to a fixed height gets bigger notes for free.
   *
   * It is off by default, and it refuses itself on a score it cannot
   * measure: anything with dynamics, lyrics, slurs or tuplets keeps the
   * full reserve, because those are placed by passes that run after this
   * is decided and trimming to the notes alone would cut them off.
   */
  readonly fitSystemHeight?: boolean;
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

/**
 * Whether the metronome mark the file carries is DRAWN.
 *
 * `'auto'` draws it wherever the file puts one, which is what a page of
 * music wants. `'off'` draws none -- for a frame that already states
 * the tempo somewhere else, where a second copy over the staff is both
 * a repetition and, because the engine reserves the room for it above
 * every system, four staff spaces of height the music could have had.
 *
 * It never changes the TIMING. The tempo map playback is driven from
 * is built from the file either way; this decides only what is drawn.
 */
export type TempoMarkDisplay = 'auto' | 'off';

export interface TempoMarkConfig {
  readonly display: TempoMarkDisplay;
}

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
/**
 * Which law decides how much room a note's duration earns.
 *
 * `'musescore'` is MuseScore's: a quarter note gets `quarterNoteSpace`
 * and every doubling MULTIPLIES that by `durationSlope`. `'increment'`
 * is §14's own: every doubling ADDS `spacingIncrement`. They agree at
 * the reference duration and nowhere else, and the difference is
 * visible at a glance -- under §14 a whole note is 4.8 staff spaces,
 * under MuseScore's 7.9.
 *
 * The default is `'musescore'`, because every score this engine is
 * given was written in MuseScore and a reader comparing the two should
 * not have to wonder which one moved the notes.
 */
export type SpacingLaw = 'musescore' | 'increment';

export interface SpacingConfig {
  readonly law: SpacingLaw;
  /**
   * `'musescore'` only: the staff spaces a quarter note is worth before
   * any stretch. MuseScore's `DEFAULT_QUARTER_NOTE_SPACE`.
   */
  readonly quarterNoteSpace: number;
  /**
   * `'musescore'` only: the factor a note's space is multiplied by each
   * time its duration doubles. MuseScore's `measureSpacing` style.
   */
  readonly durationSlope: number;
  /**
   * `'musescore'` only: MuseScore's `spacingDensity`, which DIVIDES.
   * Above 1 the music is packed tighter, below 1 it is let out.
   */
  readonly spacingDensity: number;
  /** `'increment'` only: the staff spaces one doubling of duration adds. */
  readonly spacingIncrement: number;
  /** `'increment'` only: the reference duration's own space, in increments. */
  readonly shortestDurationSpace: number;
  readonly minNoteDistance: number;
  readonly justify: boolean;
  /**
   * The minimum width, in staff spaces, of one measure's NOTE AREA (so:
   * not counting whatever clef/key/time header that measure draws), for
   * a measure one whole note long. Shorter or longer measures scale
   * with their own notated duration.
   *
   * §14's proportional spacing answers "how far apart are these notes",
   * which says nothing at all about a bar holding one whole rest -- that
   * bar came out barely wider than the rest itself, and a bar of three
   * quarters came out noticeably narrower than its neighbours of four.
   * A reader reported exactly this: a bar needs a standard width even
   * when nothing is written in it. Engraving practice agrees; so does
   * every other notation program.
   *
   * 8.0 is MuseScore's own `minMeasureWidth`, and it is the right floor
   * for the spacing law that now sits above it: under MuseScore's law a
   * plain 4/4 bar of four quarter notes is 14 staff spaces of note
   * area, so 8 lifts the sparse bars without touching the ordinary
   * ones. (Under §14's increment law the same bar was 10.2 and the
   * floor had to be 12. The two numbers go together; moving one without
   * the other makes every bar the same width.)
   *
   * This engine scales it by the measure's own notated length, which
   * MuseScore does not: a 2/4 bar should not be as wide as a 4/4 one.
   * That part is ours.
   */
  readonly minMeasureWidth: number;
}

// ---- skyline / staff distance (Phase 44, §15) ----

/**
 * The floor that applies even when both staves are otherwise empty. The
 * skyline computes the REAL distance two adjacent staves need given
 * their actual content; this is only what it may never go below.
 *
 * Both numbers are CLEARANCES -- the empty space between two staves, not
 * the distance between their lines -- which is how MuseScore states its
 * own, and the defaults are MuseScore's: `staffDistance` 6.5 and
 * `minSystemDistance` 8.5. They sit above §15.1's "around 3.5 staff
 * spaces at minimum; generous scores use more", which is where this
 * engine's own earlier 4.0 and 6.0 came from -- MuseScore is simply the
 * more generous of the two, and the scores being read were engraved to
 * it.
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
  /**
   * One exact SMuFL glyph, for a drum no shape family contains -- see
   * `DrumMapEntry.noteheadGlyph`. Naming a `noteheadShape` and no glyph
   * CLEARS whatever glyph the default table had for that drum, since
   * the two say the same thing and the one the caller wrote wins.
   */
  readonly noteheadGlyph?: string;
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
  readonly tempoMarks: TempoMarkConfig;
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
  readonly tempoMarks?: Partial<TempoMarkConfig>;
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
      // MuseScore's own Tempo text style is 12pt, and its default
      // spatium is 1.75mm; 12pt is 4.2336mm, so one staff space is
      // 2.42 of them. Rounded to 2.4.
      tempo: 2.4,
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
  tempoMarks: {
    display: 'auto',
  },
  keySignature: {
    style: 'standard',
  },
  spacing: {
    // MuseScore's horizontal law and its own numbers for it:
    // DEFAULT_QUARTER_NOTE_SPACE 3.5, measureSpacing 1.5, spacingDensity
    // 1.0, minNoteDistance 0.35, minMeasureWidth 8.0 -- see
    // `musescore/style.ts` and `musescore/spacing.ts` for where each was
    // read from. §14's own increment law is still here and still
    // reachable by setting `law: 'increment'`.
    law: 'musescore',
    quarterNoteSpace: 3.5,
    durationSlope: 1.5,
    spacingDensity: 1.0,
    spacingIncrement: 1.2,
    shortestDurationSpace: 2.0,
    minNoteDistance: 0.35,
    justify: true,
    minMeasureWidth: 8.0,
  },
  staves: {
    // MuseScore's `staffDistance` and `minSystemDistance`. Both are
    // clearances -- empty space between two staves, not the distance
    // between their lines -- which is how MuseScore states them too.
    minStaffDistance: 6.5,
    minSystemDistance: 8.5,
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
    tempoMarks: { ...DEFAULT_CONFIG.tempoMarks, ...overrides?.tempoMarks },
    keySignature: { ...DEFAULT_CONFIG.keySignature, ...overrides?.keySignature },
    spacing: { ...DEFAULT_CONFIG.spacing, ...overrides?.spacing },
    staves: { ...DEFAULT_CONFIG.staves, ...overrides?.staves },
    page: { ...DEFAULT_CONFIG.page, ...overrides?.page },
    drums: { ...DEFAULT_CONFIG.drums, ...overrides?.drums },
    debug: { ...DEFAULT_CONFIG.debug, ...overrides?.debug },
  };
}
