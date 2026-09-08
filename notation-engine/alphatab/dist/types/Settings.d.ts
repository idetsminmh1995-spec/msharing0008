import { CoreSettings } from "./CoreSettings";
import { DisplaySettings } from "./DisplaySettings";
import { ImporterSettings } from "./ImporterSettings";
import { NotationSettings } from "./NotationSettings";
import { PlayerSettings } from "./PlayerSettings";
import type { SettingsJson } from "./generated/SettingsJson";
import { ExporterSettings } from "./ExporterSettings";
/**
 * This public class contains instance specific settings for alphaTab
 * @json
 * @json_declaration
 * @public
 */
export declare class Settings {
    /**
     * The core settings control the general behavior of alphatab like
     * what modules are active.
     * @json_on_parent
     * @json_partial_names
     */
    readonly core: CoreSettings;
    /**
     * The display settings control how the general layout and display of alphaTab is done.
     * @json_on_parent
     * @json_partial_names
     */
    readonly display: DisplaySettings;
    /**
     * The notation settings control how various music notation elements are shown and behaving.
     * @json_partial_names
     */
    readonly notation: NotationSettings;
    /**
     * All settings related to importers that decode file formats.
     * @json_partial_names
     */
    readonly importer: ImporterSettings;
    /**
     * Contains all player related settings
     * @json_partial_names
     */
    readonly player: PlayerSettings;
    /**
     * All settings related to exporter that export file formats.
     * @json_partial_names
     */
    readonly exporter: ExporterSettings;
    setSongBookModeSettings(): void;
    static get songBook(): Settings;
    /**
     * @target web
     */
    fillFromJson(json: SettingsJson): void;
    /**
     * handles backwards compatibility aspects on the settings, removed in 2.0
     * @internal
     */
    handleBackwardsCompatibility(): void;
}
