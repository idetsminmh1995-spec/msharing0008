import { CoreSettingsJson } from "./CoreSettingsJson";
import { DisplaySettingsJson } from "./DisplaySettingsJson";
import { NotationSettingsJson } from "./NotationSettingsJson";
import { ImporterSettingsJson } from "./ImporterSettingsJson";
import { PlayerSettingsJson } from "./PlayerSettingsJson";
import { ExporterSettingsJson } from "./ExporterSettingsJson";
/**
 * This public class contains instance specific settings for alphaTab
 * @json
 * @json_declaration
 * @public
 * @target web
 */
export interface SettingsJson {
    /**
     * The core settings control the general behavior of alphatab like
     * what modules are active.
     * @json_on_parent
     * @json_partial_names
     */
    core?: CoreSettingsJson;
    /**
     * The display settings control how the general layout and display of alphaTab is done.
     * @json_on_parent
     * @json_partial_names
     */
    display?: DisplaySettingsJson;
    /**
     * The notation settings control how various music notation elements are shown and behaving.
     * @json_partial_names
     */
    notation?: NotationSettingsJson;
    /**
     * All settings related to importers that decode file formats.
     * @json_partial_names
     */
    importer?: ImporterSettingsJson;
    /**
     * Contains all player related settings
     * @json_partial_names
     */
    player?: PlayerSettingsJson;
    /**
     * All settings related to exporter that export file formats.
     * @json_partial_names
     */
    exporter?: ExporterSettingsJson;
}
