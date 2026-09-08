/**
 * Lists all types of fermatas
 * @public
 */
export declare enum FermataType {
    /**
     * A short fermata (triangle symbol)
     */
    Short = 0,
    /**
     * A medium fermata (round symbol)
     */
    Medium = 1,
    /**
     * A long fermata (rectangular symbol)
     */
    Long = 2
}
/**
 * Represents a fermata.
 * @json
 * @json_strict
 * @public
 */
export declare class Fermata {
    /**
     * Gets or sets the type of fermata.
     */
    type: FermataType;
    /**
     * Gets or sets the actual length of the fermata.
     */
    length: number;
}
