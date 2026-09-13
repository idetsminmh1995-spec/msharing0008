import { unzipSync, strFromU8 } from 'fflate';
import { diagnostic, type Diagnostic } from './diagnostic.js';
import type { DomParserLike } from './parse.js';
import { firstChildNamed } from './dom-helpers.js';

export interface UnzipMxlResult {
  /** The extracted score file's raw text, ready for parseMusicXml/renderFromMusicXml. Undefined when unzipping or the container.xml pointer couldn't be resolved -- check `diagnostics` for why. */
  readonly xmlText: string | undefined;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * §10.2: a `.mxl` file is a ZIP archive. `META-INF/container.xml` names
 * the real score file inside it -- the parser must read that pointer
 * rather than assuming a filename (some exporters use the score's own
 * title, others a generic name; nothing about the archive's OTHER entry
 * names is reliable). Uses `fflate`, a small well-established ZIP
 * reader, per the plan's own dependency decision -- not a notation
 * dependency, so this doesn't violate §1's independence requirement.
 *
 * §10.7/Phase 38: **never throws**, matching every other entry point in
 * this codebase -- a malformed archive is exactly the kind of malformed
 * input §10.7 already commits to recovering from with a `Diagnostic`,
 * not an exception, and there is no principled reason a `.mxl` archive
 * should be held to a different standard than a malformed `.musicxml`
 * file gets. Every real failure mode (corrupt/non-zip bytes, no
 * `container.xml`, no `<rootfile>` pointer, a pointer to a missing
 * entry) gets its own stable diagnostic code and leaves `xmlText`
 * undefined; the caller decides how to surface that, exactly like an
 * empty `Score` from `parseMusicXml` already works.
 */
export function unzipMxl(bytes: Uint8Array, domParser: new () => DomParserLike): UnzipMxlResult {
  const diagnostics: Diagnostic[] = [];

  let files: ReturnType<typeof unzipSync>;
  try {
    files = unzipSync(bytes);
  } catch {
    diagnostics.push(
      diagnostic(
        'error',
        'MXL_INVALID_ARCHIVE',
        'Could not read this file as a .mxl (ZIP) archive.',
      ),
    );
    return { xmlText: undefined, diagnostics };
  }

  const containerBytes = files['META-INF/container.xml'];
  if (containerBytes === undefined) {
    diagnostics.push(
      diagnostic(
        'error',
        'MXL_MISSING_CONTAINER',
        '.mxl archive has no META-INF/container.xml -- cannot find the score file inside it.',
      ),
    );
    return { xmlText: undefined, diagnostics };
  }

  const containerXml = strFromU8(containerBytes);
  const containerDoc = new domParser().parseFromString(containerXml, 'application/xml');
  const root = containerDoc.documentElement;
  const rootfilesEl = root !== null ? firstChildNamed(root, 'rootfiles') : undefined;
  const rootfileEl =
    rootfilesEl !== undefined ? firstChildNamed(rootfilesEl, 'rootfile') : undefined;
  const fullPath = rootfileEl?.getAttribute('full-path');
  if (fullPath === null || fullPath === undefined) {
    diagnostics.push(
      diagnostic(
        'error',
        'MXL_MISSING_ROOTFILE_POINTER',
        '.mxl archive\'s container.xml has no <rootfile full-path="..."> pointer.',
      ),
    );
    return { xmlText: undefined, diagnostics };
  }

  const scoreBytes = files[fullPath];
  if (scoreBytes === undefined) {
    diagnostics.push(
      diagnostic(
        'error',
        'MXL_MISSING_SCORE_FILE',
        `.mxl archive's container.xml points to "${fullPath}", but that file isn't in the archive.`,
      ),
    );
    return { xmlText: undefined, diagnostics };
  }

  return { xmlText: strFromU8(scoreBytes), diagnostics };
}
