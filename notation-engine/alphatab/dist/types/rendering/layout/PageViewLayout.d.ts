import { VerticalLayoutBase } from "./VerticalLayoutBase";
/**
 * This layout arranges the bars into a fixed width and dynamic height region.
 * @internal
 */
export declare class PageViewLayout extends VerticalLayoutBase {
    get name(): string;
    protected getBarsPerSystem(systemIndex: number): number;
    protected get shouldApplyBarScale(): boolean;
}
