/** Validate an optional event onset measured from the start of its containing measure. */
export function assertValidStartTick(startTick: number | undefined): void {
  if (startTick !== undefined && (!Number.isFinite(startTick) || startTick < 0)) {
    throw new RangeError(`startTick must be a finite non-negative number, got ${startTick}`);
  }
}
