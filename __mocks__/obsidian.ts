export class FuzzySuggestModal { };
export class SuggestModal { };
export class Modal { };
export class Setting { };

/** Credit to @blacksmithgu for obsidian mocks in dataview */
/** Basic obsidian abstraction for any file or folder in a vault. */
export abstract class TAbstractFile {
}

/** Tracks file created/modified time as well as file system size. */
export interface FileStats {
}

/** A regular file in the vault. */
export class TFile extends TAbstractFile {
    /** instanceof tests do not pass without 
     * this alternate implementation
     */
    static [Symbol.hasInstance](instance: any) {
        return instance.hasOwnProperty("extension");
    }
}

/** A folder in the vault. */
export class TFolder {
}