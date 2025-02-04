import MetadataMenu from "main";
import { Component, TFile } from "obsidian";
import { IndexedFieldsPayload } from "src/commands/postValues";
import { Field, IFieldManager } from "src/fields/Field";
import { BaseOptions } from "src/fields/base/BaseField";
import { FileClass } from "src/fileClass/fileClass";
import { MetadataMenuSettings } from "src/settings/MetadataMenuSettings";
import { Status as LookupStatus, Type as LookupType } from "src/types/lookupTypes";
import { BookmarkInternalPlugin } from "src/typings/types";

export interface IndexedExistingField {
    id: string,
    filePath: string,
    fieldName: string,
    fieldType: string,
    fieldId: string,
    fileClassName: string | undefined
    indexedPath: string,
    indexedId: string | undefined,
    value: any,
    time: number
}

export interface cFileWithTags {
    path: string,
    tags: string[]
}

export interface cFileWithGroups {
    path: string,
    group: string
}

export interface FieldsPayloadToProcess {
    status: "toProcess" | "processed",
    fieldsPayload: IndexedFieldsPayload
}

export type NewType = LookupStatus;

export abstract class FieldIndexBuilder extends Component {
    public changedFiles: TFile[] = []
    public openFileClassManagerAfterIndex: string[] = []
    public classFilesPath: string | null;
    public bookmarksGroupsMatchingFileClasses: Map<string, FileClass>;
    public canvasLastFiles: Map<string, string[]>
    public dv: any;
    public dvReady: () => boolean;
    public fieldsFromGlobalFileClass: Field[];
    public fileClassesAncestors: Map<string, string[]>
    public fileClassesFields: Map<string, Field[]>;
    public fileClassesName: Map<string, FileClass>;
    public fileClassesPath: Map<string, FileClass>;
    public fileFormulaFieldLastValue: Map<string, string>;
    public fileFormulaFieldsStatus: Map<string, NewType>;
    public fileLookupFieldLastOutputType: Map<string, keyof typeof LookupType>;
    public fileLookupFieldLastValue: Map<string, string>;
    public fileLookupFieldsStatus: Map<string, LookupStatus>;
    public fileLookupFiles: Map<string, any[]>;
    public filesFields: Map<string, Field[]>;
    public filesFieldsLastChange: Map<string, number>;
    public previousFilesFields: Map<string, Field[]>
    public filesFieldsFromBookmarksGroups: Map<string, Field[]>;
    public filesFieldsFromFileClassQueries: Map<string, Field[]>;
    public filesFieldsFromFilesPaths: Map<string, Field[]>;
    public filesFieldsFromInnerFileClasses: Map<string, Field[]>;
    public filesFieldsFromTags: Map<string, Field[]>;
    public filesFileClasses: Map<string, FileClass[]>;
    public filesFileClassesNames: Map<string, string[] | undefined>;
    public filesLookupAndFormulaFieldsExists: Map<string, Field[]>;
    public filesLookupsAndFormulasFields: Map<string, Field[]>;
    public filesPathsMatchingFileClasses: Map<string, FileClass>;
    public lastRevision = 0;
    public lookupQueries: Map<string, Field>;
    public tagsMatchingFileClasses: Map<string, FileClass>;
    public v1FileClassesPath: Map<string, FileClass>;
    public v2FileClassesPath: Map<string, FileClass>;
    public valuesListNotePathValues: Map<string, string[]>;
    public dVRelatedFieldsToUpdate: Map<string, FieldsPayloadToProcess>
    public remainingLegacyFileClasses: boolean
    public lastBookmarkChange: number
    public bookmarks: BookmarkInternalPlugin
    public lastDVUpdatingTime: number
    public lastTimeBeforeResolving: number
    public settings: MetadataMenuSettings
    public updatedManagedField: IFieldManager<TFile, BaseOptions> | undefined

    constructor(public plugin: MetadataMenu) {
        super()
        this.settings = this.plugin.settings
        this.init();
        this.dvReady = () => this.dv?._loaded && !!this.plugin.app.plugins.plugins.dataview?.index.initialized
    }

    public init() {
        this.flushCache();
        //following props will persist at each indexing.
        this.filesFields = new Map();
        this.previousFilesFields = new Map();
        this.filesFieldsLastChange = new Map();
        this.remainingLegacyFileClasses = false
        this.canvasLastFiles = new Map();
        this.fileFormulaFieldLastValue = new Map();
        this.fileFormulaFieldsStatus = new Map()
        this.fileLookupFieldLastOutputType = new Map();
        this.fileLookupFieldLastValue = new Map();
        this.fileLookupFieldsStatus = new Map();
        this.fileLookupFiles = new Map();
        this.dv = this.plugin.app.plugins.plugins.dataview;
        this.classFilesPath = this.settings.classFilesPath;
        this.dVRelatedFieldsToUpdate = new Map()
        this.bookmarks = this.plugin.app.internalPlugins.getPluginById("bookmarks")
    }

    public flushCache() {
        //these props are rebuilt at each indexing
        //this.filesFields = new Map();
        this.filesLookupsAndFormulasFields = new Map();
        this.filesLookupAndFormulaFieldsExists = new Map();
        this.fileClassesFields = new Map();
        this.fieldsFromGlobalFileClass = [];
        this.filesFieldsFromTags = new Map();
        this.filesFieldsFromFilesPaths = new Map();
        this.filesFieldsFromBookmarksGroups = new Map();
        this.filesFieldsFromFileClassQueries = new Map();
        this.filesFieldsFromInnerFileClasses = new Map();
        this.fileClassesPath = new Map();
        this.v1FileClassesPath = new Map();
        this.v2FileClassesPath = new Map();
        this.fileClassesName = new Map();
        this.fileClassesAncestors = new Map();
        this.valuesListNotePathValues = new Map();
        this.tagsMatchingFileClasses = new Map();
        this.filesPathsMatchingFileClasses = new Map();
        this.bookmarksGroupsMatchingFileClasses = new Map();
        this.filesFileClasses = new Map();
        this.filesFileClassesNames = new Map();
        this.lookupQueries = new Map();
    }
}