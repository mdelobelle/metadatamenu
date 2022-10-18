export class FuzzySuggestModal { };
export class SuggestModal { };
export class Modal { };
export class Setting { };

/** Credit to @blacksmithgu for obsidian mocks in dataview */
/** Basic obsidian abstraction for any file or folder in a vault. */
export abstract class TAbstractFile {
    /**
     * @public
     */
    path: string;
    /**
     * @public
     */
    name: string;
}

/** Tracks file created/modified time as well as file system size. */
export interface FileStats {
    /** @public */
    ctime: number;
    /** @public */
    mtime: number;
    /** @public */
    size: number;
}

/** A regular file in the vault. */
export class TFile extends TAbstractFile {
    /** instanceof tests do not pass without 
     * this alternate implementation
     */
    static [Symbol.hasInstance](instance: any) {
        return instance.hasOwnProperty("extension");
    }

    stat: FileStats;

    basename: string;

    extension: string;
}

/** A folder in the vault. */
export class TFolder extends TAbstractFile {
    children: TAbstractFile[];
}