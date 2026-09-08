import type { Track } from "./../../model/Track";
import type { RenderStaff } from "./RenderStaff";
import type { StaffSystem, SystemBracket } from "./StaffSystem";
/**
 * Represents the group of rendered staves belonging to an individual track.
 * This includes staves like effects, notation representations (numbered, tabs,..) and multiple
 * staffs (grand staff).
 * @internal
 */
export declare class StaffTrackGroup {
    track: Track;
    staffSystem: StaffSystem;
    staves: RenderStaff[];
    firstVisibleStaff?: RenderStaff;
    lastVisibleStaff?: RenderStaff;
    bracket: SystemBracket | null;
    constructor(staffSystem: StaffSystem, track: Track);
    addStaff(staff: RenderStaff): void;
}
