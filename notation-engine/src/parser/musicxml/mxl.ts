import { unzipSync, strFromU8 } from 'fflate';
import type { DomParserLike } from './parse.js';
import { firstChildNamed } from './dom-helpers.js';

/**
 * §10.2: a `.mxl` file is a ZIP archive. `META-INF/container.xml` names
 * the real score file inside it -- the parser must read that pointer
 * rather than assuming a filename (some exporters use the score's own
 * title, others a generic name; nothing about the archive's OTHER entry
 * names is reliable). Uses `fflate`, a small well-established ZIP
 * reader, per the plan's own dependency decision -- not a notation
 * dependency, so this doesn't violate §1's independence requirement.
 *
 * Returns the score file's raw *text* content, ready to hand to
 * `parseMusicXml`/`renderFromMusicXml` exactly like an uncompressed
 * `.musicxml` file's contents would be. Throws with a clear message if
 * the archive doesn't contain a readable `container.xml` pointer or the
 * file it points to -- this is a malformed-*archive* condition (not
 * malformed musical content), so it is reported the same way a truly
 * unreadable input would be elsewhere in this codebase, rather than
 * invented as a new silent-recovery case.
 */
export function unzipMxl(bytes: Uint8Array, domParser: new () => DomParserLike): string {
  const files = unzipSync(bytes);

  const containerBytes = files['META-INF/container.xml'];
  if (containerBytes === undefined) {
    throw new Error(
      '.mxl archive has no META-INF/container.xml -- cannot find the score file inside it.',
    );
  }
  const containerXml = strFromU8(containerBytes);
  const containerDoc = new domParser().parseFromString(containerXml, 'application/xml');
  const root = containerDoc.documentElement;
  const rootfilesEl = root !== null ? firstChildNamed(root, 'rootfiles') : undefined;
  const rootfileEl =
    rootfilesEl !== undefined ? firstChildNamed(rootfilesEl, 'rootfile') : undefined;
  const fullPath = rootfileEl?.getAttribute('full-path');
  if (fullPath === null || fullPath === undefined) {
    throw new Error('.mxl archive\'s container.xml has no <rootfile full-path="..."> pointer.');
  }

  const scoreBytes = files[fullPath];
  if (scoreBytes === undefined) {
    throw new Error(
      `.mxl archive's container.xml points to "${fullPath}", but that file isn't in the archive.`,
    );
  }
  return strFromU8(scoreBytes);
}
