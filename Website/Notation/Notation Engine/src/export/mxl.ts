import { zipSync, strToU8 } from 'fflate';
import { stringToUtf8 } from './svg.js';

/**
 * §10.2: a `.mxl` file is a ZIP archive whose `META-INF/container.xml`
 * names the real score file inside it. `unzipMxl` reads that pointer, so
 * the writer has to produce one: an archive without it is not a `.mxl`,
 * it is a zip that happens to contain MusicXML.
 *
 * The archive is written with a fixed timestamp by default, so the same
 * score serializes to the same bytes twice -- the same reproducibility
 * rule the PDF encoder follows.
 */

export interface ExportMxlOptions {
  /** Name of the score entry inside the archive. Must match the container pointer. */
  readonly scoreFileName?: string;
  /** A fixed timestamp, for byte-reproducible archives. */
  readonly creationDate?: Date;
}

const CONTAINER_XML = (fullPath: string): string =>
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<container>\n' +
  '  <rootfiles>\n' +
  `    <rootfile full-path="${fullPath}" media-type="application/vnd.recordare.musicxml+xml"/>\n` +
  '  </rootfiles>\n' +
  '</container>\n';

/** The media type a `.mxl` archive declares for itself, per the compressed MusicXML spec. */
const MXL_MEDIA_TYPE = 'application/vnd.recordare.musicxml';

/**
 * ZIP timestamps start at 1980 -- a date before that is not representable,
 * so it is the fixed default rather than the Unix epoch.
 */
const ZIP_EPOCH = new Date(Date.UTC(1980, 0, 1));

/** A compressed MusicXML (`.mxl`) archive from a MusicXML document. */
export function exportMxl(xmlText: string, options: ExportMxlOptions = {}): Uint8Array {
  const scoreFileName = options.scoreFileName ?? 'score.xml';
  const mtime = options.creationDate ?? ZIP_EPOCH;
  return zipSync(
    {
      // The spec wants `mimetype` first and stored uncompressed, so a
      // reader can identify the archive without inflating anything.
      mimetype: [strToU8(MXL_MEDIA_TYPE), { level: 0 }],
      'META-INF/container.xml': stringToUtf8(CONTAINER_XML(scoreFileName)),
      [scoreFileName]: stringToUtf8(xmlText),
    },
    { mtime },
  );
}
