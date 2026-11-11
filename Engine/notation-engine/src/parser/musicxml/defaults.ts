/**
 * defaults.ts -- `<defaults>` and `<credit>`: what the file says about
 * its own appearance, and what it says about itself.
 *
 * Everything under `<defaults>` is the exporting program stating the
 * engraving it used, in TENTHS. A tenth is a tenth of the distance
 * between two staff lines, which makes the conversion to this engine's
 * own unit a division by ten and nothing else: `<line-width
 * type="staff">1.1</line-width>` is a staff line 0.11 staff spaces
 * thick, and `<staff-distance>65</staff-distance>` is 6.5 of them.
 *
 * `<scaling>` is the one piece that is NOT in tenths -- it is what ties
 * tenths to the physical page ("40 tenths is 7 millimetres"), which is
 * the only number here a renderer drawing to a screen can ignore. It is
 * parsed anyway: a host exporting to PDF at the file's own size needs
 * it, and §10.7's rule is that nothing in the file is dropped silently.
 *
 * None of this overrides the HOST. `config` still wins, because a page
 * the host has themed is the host's decision; the file's own numbers sit
 * between the host's config and the music font's built-in defaults.
 */

import { attrOf, childrenNamed, firstChildNamed, textOf } from './dom-helpers.js';

/** How many MusicXML tenths make one staff space. Fixed by the format, not by any file. */
export const TENTHS_PER_STAFF_SPACE = 10;

/** Tenths to staff spaces. */
export function tenthsToStaffSpaces(tenths: number): number {
  return tenths / TENTHS_PER_STAFF_SPACE;
}

/**
 * The `<line-width type="...">` values this engine can actually use,
 * mapped to the name it knows them by. A type the engine has no use for
 * is still parsed into `lineWidths` -- this map only names the ones
 * that reach the drawing.
 */
export interface ScoreLineWidths {
  readonly staff?: number;
  readonly stem?: number;
  readonly beam?: number;
  readonly leger?: number;
  readonly lightBarline?: number;
  readonly heavyBarline?: number;
  readonly slurMiddle?: number;
  readonly slurTip?: number;
  readonly tieMiddle?: number;
  readonly tieTip?: number;
  readonly tupletBracket?: number;
  readonly wedge?: number;
  readonly ending?: number;
  readonly bracket?: number;
}

const LINE_WIDTH_NAMES: Readonly<Record<string, keyof ScoreLineWidths>> = {
  staff: 'staff',
  stem: 'stem',
  beam: 'beam',
  leger: 'leger',
  'light barline': 'lightBarline',
  'heavy barline': 'heavyBarline',
  'slur middle': 'slurMiddle',
  'slur tip': 'slurTip',
  'tie middle': 'tieMiddle',
  'tie tip': 'tieTip',
  'tuplet bracket': 'tupletBracket',
  wedge: 'wedge',
  ending: 'ending',
  bracket: 'bracket',
};

export interface ScoreScaling {
  /** Millimetres on paper that `tenths` tenths measure. */
  readonly millimetres: number;
  readonly tenths: number;
  /** One staff space, in millimetres -- what the two numbers above are actually for. */
  readonly staffSpaceMm: number;
}

/** A `<page-layout>`, in staff spaces. */
export interface ScorePageLayout {
  readonly width?: number;
  readonly height?: number;
  readonly leftMargin?: number;
  readonly rightMargin?: number;
  readonly topMargin?: number;
  readonly bottomMargin?: number;
}

export interface ScoreFont {
  readonly family?: string;
  /** In points, as the file writes it -- a text size, not a staff-space measurement. */
  readonly size?: number;
}

export interface ScoreDefaults {
  readonly scaling?: ScoreScaling;
  readonly pageLayout?: ScorePageLayout;
  /** In staff spaces, converted from the file's tenths. */
  readonly lineWidths: ScoreLineWidths;
  /** `<note-size type="...">`, as a FRACTION of full size (the file writes a percentage). */
  readonly noteSizes: Readonly<Record<string, number>>;
  readonly musicFont?: ScoreFont;
  readonly wordFont?: ScoreFont;
  readonly lyricFont?: ScoreFont;
}

/** What the score calls itself: `<work>` and `<identification><creator>`. */
export interface ScoreIdentity {
  readonly workTitle?: string;
  readonly workNumber?: string;
  readonly movementTitle?: string;
  readonly movementNumber?: string;
  /** `<creator type="composer">` and friends, keyed by that `type` ('composer', 'lyricist', ...). */
  readonly creators: Readonly<Record<string, string>>;
  /** `<rights>`, in document order. */
  readonly rights: readonly string[];
  /** The software that wrote the file, from `<encoding><software>`. */
  readonly software: readonly string[];
}

/**
 * One `<credit>` -- a piece of text the file places on the page itself
 * (its title block, as the exporting program laid it out).
 *
 * Kept with its stated position in staff spaces so a host can place it
 * where the file did, and with its `type` so a host that would rather
 * lay the page out itself can still tell a title from a composer line.
 */
export interface ScoreCredit {
  readonly page: number;
  readonly types: readonly string[];
  readonly words: string;
  readonly x?: number;
  readonly y?: number;
  readonly justify?: string;
  readonly valign?: string;
  readonly fontSize?: number;
}

function numberOf(el: Element | undefined): number | undefined {
  const text = textOf(el);
  if (text === undefined) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function numberAttrOf(el: Element, name: string): number | undefined {
  const raw = attrOf(el, name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function tenthsAttr(el: Element, name: string): number | undefined {
  const n = numberAttrOf(el, name);
  return n === undefined ? undefined : tenthsToStaffSpaces(n);
}

function tenthsChild(parent: Element, name: string): number | undefined {
  const n = numberOf(firstChildNamed(parent, name));
  return n === undefined ? undefined : tenthsToStaffSpaces(n);
}

function parseFont(el: Element | undefined): ScoreFont | undefined {
  if (el === undefined) return undefined;
  const family = attrOf(el, 'font-family');
  const size = numberAttrOf(el, 'font-size');
  if (family === undefined && size === undefined) return undefined;
  return { ...(family !== undefined ? { family } : {}), ...(size !== undefined ? { size } : {}) };
}

/** Parses `<defaults>`, or returns undefined when the file has none (most hand-written files do not). */
export function parseDefaults(root: Element): ScoreDefaults | undefined {
  const el = firstChildNamed(root, 'defaults');
  if (el === undefined) return undefined;

  let scaling: ScoreScaling | undefined;
  const scalingEl = firstChildNamed(el, 'scaling');
  if (scalingEl !== undefined) {
    const millimetres = numberOf(firstChildNamed(scalingEl, 'millimeters'));
    const tenths = numberOf(firstChildNamed(scalingEl, 'tenths'));
    if (millimetres !== undefined && tenths !== undefined && tenths > 0) {
      scaling = {
        millimetres,
        tenths,
        staffSpaceMm: (millimetres / tenths) * TENTHS_PER_STAFF_SPACE,
      };
    }
  }

  let pageLayout: ScorePageLayout | undefined;
  const pageEl = firstChildNamed(el, 'page-layout');
  if (pageEl !== undefined) {
    // An odd/even pair of <page-margins> is the common case; a single
    // 'both' is also legal. The first one found is used -- this engine
    // lays out one continuous page, so there is no left/right pair for
    // the two to differ between.
    const marginsEl = firstChildNamed(pageEl, 'page-margins');
    pageLayout = {
      ...optional('width', tenthsChild(pageEl, 'page-width')),
      ...optional('height', tenthsChild(pageEl, 'page-height')),
      ...(marginsEl !== undefined
        ? {
            ...optional('leftMargin', tenthsChild(marginsEl, 'left-margin')),
            ...optional('rightMargin', tenthsChild(marginsEl, 'right-margin')),
            ...optional('topMargin', tenthsChild(marginsEl, 'top-margin')),
            ...optional('bottomMargin', tenthsChild(marginsEl, 'bottom-margin')),
          }
        : {}),
    };
  }

  const lineWidths: Record<string, number> = {};
  const noteSizes: Record<string, number> = {};
  const appearanceEl = firstChildNamed(el, 'appearance');
  if (appearanceEl !== undefined) {
    for (const widthEl of childrenNamed(appearanceEl, 'line-width')) {
      const type = attrOf(widthEl, 'type');
      const value = numberOf(widthEl);
      if (type === undefined || value === undefined) continue;
      const name = LINE_WIDTH_NAMES[type];
      if (name !== undefined) lineWidths[name] = tenthsToStaffSpaces(value);
    }
    for (const sizeEl of childrenNamed(appearanceEl, 'note-size')) {
      const type = attrOf(sizeEl, 'type');
      const value = numberOf(sizeEl);
      // The file writes a PERCENTAGE of full size; a multiplier is what
      // every consumer actually wants.
      if (type !== undefined && value !== undefined) noteSizes[type] = value / 100;
    }
  }

  return {
    ...(scaling !== undefined ? { scaling } : {}),
    ...(pageLayout !== undefined ? { pageLayout } : {}),
    lineWidths,
    noteSizes,
    ...optional('musicFont', parseFont(firstChildNamed(el, 'music-font'))),
    ...optional('wordFont', parseFont(firstChildNamed(el, 'word-font'))),
    ...optional('lyricFont', parseFont(firstChildNamed(el, 'lyric-font'))),
  };
}

/** Parses `<work>` and `<identification>` -- what the score calls itself and who wrote it. */
export function parseIdentity(root: Element): ScoreIdentity {
  const creators: Record<string, string> = {};
  const rights: string[] = [];
  const software: string[] = [];

  const workEl = firstChildNamed(root, 'work');
  const identificationEl = firstChildNamed(root, 'identification');
  if (identificationEl !== undefined) {
    for (const creatorEl of childrenNamed(identificationEl, 'creator')) {
      const type = attrOf(creatorEl, 'type') ?? 'composer';
      const text = textOf(creatorEl);
      if (text !== undefined && text !== '') creators[type] = text;
    }
    for (const rightsEl of childrenNamed(identificationEl, 'rights')) {
      const text = textOf(rightsEl);
      if (text !== undefined && text !== '') rights.push(text);
    }
    const encodingEl = firstChildNamed(identificationEl, 'encoding');
    if (encodingEl !== undefined) {
      for (const softwareEl of childrenNamed(encodingEl, 'software')) {
        const text = textOf(softwareEl);
        if (text !== undefined && text !== '') software.push(text);
      }
    }
  }

  return {
    ...optional('workTitle', nonEmpty(textOf(firstChildNamed(workEl ?? root, 'work-title')))),
    ...optional('workNumber', nonEmpty(textOf(firstChildNamed(workEl ?? root, 'work-number')))),
    ...optional('movementTitle', nonEmpty(textOf(firstChildNamed(root, 'movement-title')))),
    ...optional('movementNumber', nonEmpty(textOf(firstChildNamed(root, 'movement-number')))),
    creators,
    rights,
    software,
  };
}

/** Parses every `<credit>` -- the text the file places on its own title page. */
export function parseCredits(root: Element): readonly ScoreCredit[] {
  const credits: ScoreCredit[] = [];
  for (const el of childrenNamed(root, 'credit')) {
    const types = childrenNamed(el, 'credit-type')
      .map((t) => textOf(t))
      .filter((t): t is string => t !== undefined && t !== '');
    const wordsEls = childrenNamed(el, 'credit-words');
    // Several <credit-words> in one <credit> are one run of text split
    // by formatting changes, so they are joined rather than reported as
    // separate credits.
    const words = wordsEls
      .map((w) => textOf(w) ?? '')
      .filter((w) => w !== '')
      .join(' ');
    if (words === '') continue;
    const first = wordsEls[0];
    credits.push({
      page: (first !== undefined ? numberAttrOf(el, 'page') : undefined) ?? 1,
      types,
      words,
      ...(first !== undefined
        ? {
            ...optional('x', tenthsAttr(first, 'default-x')),
            ...optional('y', tenthsAttr(first, 'default-y')),
            ...optional('justify', attrOf(first, 'justify')),
            ...optional('valign', attrOf(first, 'valign')),
            ...optional('fontSize', numberAttrOf(first, 'font-size')),
          }
        : {}),
    });
  }
  return credits;
}

function nonEmpty(text: string | undefined): string | undefined {
  return text === undefined || text === '' ? undefined : text;
}

/** `{ key: value }` when the value exists, `{}` when it does not -- keeps `exactOptionalPropertyTypes` happy without a conditional spread at every field. */
function optional<K extends string, V>(key: K, value: V | undefined): Record<K, V> | object {
  return value === undefined ? {} : { [key]: value };
}

/**
 * The `<system-layout>`/`<staff-layout>` one `<print>` carries, in staff
 * spaces. Returns undefined when it carries neither, which is the common
 * case for a `<print>` that only asks for a system break.
 *
 * A `<staff-layout>`'s `<staff-distance>` is the gap ABOVE that staff,
 * which is why it is keyed by the staff NUMBER rather than returned as
 * one value: on a grand staff only staff 2 states one, and it means the
 * distance from staff 1 down to staff 2.
 */
export function parsePrintLayout(printEl: Element):
  | {
      staffDistances?: Readonly<Record<number, number>>;
      systemDistance?: number;
      topSystemDistance?: number;
      systemLeftMargin?: number;
      systemRightMargin?: number;
    }
  | undefined {
  const staffDistances: Record<number, number> = {};
  for (const staffEl of childrenNamed(printEl, 'staff-layout')) {
    const number = numberAttrOf(staffEl, 'number') ?? 1;
    const distance = tenthsChild(staffEl, 'staff-distance');
    if (distance !== undefined) staffDistances[number] = distance;
  }

  const systemEl = firstChildNamed(printEl, 'system-layout');
  const marginsEl =
    systemEl === undefined ? undefined : firstChildNamed(systemEl, 'system-margins');

  const layout = {
    ...(Object.keys(staffDistances).length > 0 ? { staffDistances } : {}),
    ...(systemEl !== undefined
      ? {
          ...optional('systemDistance', tenthsChild(systemEl, 'system-distance')),
          ...optional('topSystemDistance', tenthsChild(systemEl, 'top-system-distance')),
        }
      : {}),
    ...(marginsEl !== undefined
      ? {
          ...optional('systemLeftMargin', tenthsChild(marginsEl, 'left-margin')),
          ...optional('systemRightMargin', tenthsChild(marginsEl, 'right-margin')),
        }
      : {}),
  };
  return Object.keys(layout).length > 0 ? layout : undefined;
}
