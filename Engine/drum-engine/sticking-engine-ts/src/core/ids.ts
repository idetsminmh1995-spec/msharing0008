/**
 * Rule 27's stable source IDs: `evt_00000001`, `src_00000002`, …
 *
 * One counter shared across every prefix, exactly like the Python's
 * module-level `itertools.count(1)`. That sharing is not incidental --
 * it means an ID's number tells you the order the object was created in
 * across the whole engine, and it means the port has to consume the
 * counter in the same places the Python does or the IDs stop lining up
 * and a parity diff becomes unreadable.
 */
let counter = 1;

export function newId(prefix: string): string {
  return `${prefix}_${String(counter++).padStart(8, '0')}`;
}

/**
 * Restarts the counter.
 *
 * The Python's counter is process-global and never resets, so each
 * golden fixture is generated in a fresh interpreter. The port's tests
 * run several fixtures in one process, so they call this between them --
 * which is also why it is exported rather than hidden: a caller that
 * wants reproducible IDs across runs needs to be able to say so.
 */
export function resetIdCounter(): void {
  counter = 1;
}
