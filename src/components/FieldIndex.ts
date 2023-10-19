import { Component, Notice, TFile } from "obsidian"
import MetadataMenu from "main"
import Field from "../fields/Field";
import { FileClass } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FieldSetting from "src/settings/FieldSetting";
import { resolveLookups } from "src/commands/resolveLookups";
import { updateLookups } from "src/commands/updateLookups";
import { updateFormulas, cleanRemovedFormulasFromIndex } from "src/commands/updateFormulas";
import cryptoRandomString from "crypto-random-string";
import { FieldType } from "src/types/fieldTypes";
import { Status as LookupStatus, Type as LookupType } from "src/types/lookupTypes";
import { updateCanvas } from "src/commands/updateCanvas";
import { CanvasData } from "obsidian/canvas";
import { V1FileClassMigration, V2FileClassMigration } from "src/fileClass/fileClassMigration";
import { Note } from "src/note/note";
import initDb from "src/db/index"
import * as fieldsValues from "src/db/stores/fieldsValues"
import * as updates from "src/db/stores/updates";
import { BookmarkItem } from "types";

/*
on tente de se faire notre propre index
1. stocker les valeurs dans indexedDB et les mettre à jour quand workspace.on("modify")
2. verifier la persistance quand on redémarre le plugin: la réindexation ne doit pas se faire si le mtime du fichier n'a pas bougé
3. remplacer les appels à dataview pour chopper les valeurs de ces fields
*/

export interface IndexedExistingField {
    id: string,
    filePath: string,
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

abstract class FieldIndexBuilder extends Component {
    public changedFiles: TFile[] = []
    public classFilesPath: string | null;
    public bookmarksGroupsMatchingFileClasses: Map<string, FileClass>;
    public canvasLastFiles: Map<string, string[]>
    public dv: any;
    public dvReady: boolean = false;
    public fieldsFromGlobalFileClass: Field[];
    public fileChanged: boolean = false;
    public fileClassesAncestors: Map<string, string[]>
    public fileClassesFields: Map<string, Field[]>;
    public fileClassesName: Map<string, FileClass>;
    public fileClassesPath: Map<string, FileClass>;
    public fileFormulaFieldLastValue: Map<string, string>;
    public fileFormulaFieldsStatus: Map<string, LookupStatus>;
    public fileLookupFieldLastOutputType: Map<string, keyof typeof LookupType>;
    public fileLookupFieldLastValue: Map<string, string>;
    public fileLookupFieldsStatus: Map<string, LookupStatus>;
    public fileLookupFiles: Map<string, any[]>;
    public filesFields: Map<string, Field[]>;
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
    public firstIndexingDone: boolean = false;
    public lastRevision: 0;
    public loadTime: number;
    public lookupQueries: Map<string, Field>;
    public previousFileLookupFilesValues: Map<string, number>;
    public tagsMatchingFileClasses: Map<string, FileClass>;
    public v1FileClassesPath: Map<string, FileClass>;
    public v2FileClassesPath: Map<string, FileClass>;
    public valuesListNotePathValues: Map<string, string[]>;

    constructor(public plugin: MetadataMenu, public cacheVersion: string, public onChange: () => void) {
        super()
        this.flushCache();
        this.canvasLastFiles = new Map();
        this.fileFormulaFieldLastValue = new Map();
        this.fileFormulaFieldsStatus = new Map()
        this.fileLookupFieldLastOutputType = new Map();
        this.fileLookupFieldLastValue = new Map();
        this.fileLookupFieldsStatus = new Map();
        this.fileLookupFiles = new Map();
        this.previousFileLookupFilesValues = new Map();
        this.dv = this.plugin.app.plugins.plugins.dataview;
        this.classFilesPath = plugin.settings.classFilesPath;
    }

    public flushCache() {
        //these maps are rebuilt at each indexing
        this.filesFields = new Map();
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

export default class FieldIndex extends FieldIndexBuilder {

    constructor(public plugin: MetadataMenu, public cacheVersion: string, public onChange: () => void) {
        super(plugin, cacheVersion, onChange)
    }

    async onload(): Promise<void> {

        this.loadTime = Date.now();
        initDb()

        await (async () => { })(); //only way to have metadata button to show up at reload !?!

        if (this.dv?.api.index.initialized) {
            this.dv = this.plugin.app.plugins.plugins.dataview;
            this.lastRevision = this.dv.api.index.revision;
            this.dvReady = true;
            await this.fullIndex("dv is running", false);
        }

        this.registerEvent(
            this.plugin.app.metadataCache.on("dataview:index-ready", async () => {
                this.dv = this.plugin.app.plugins.plugins.dataview;
                this.dvReady = true;
                await this.fullIndex("dv index", false);
                this.lastRevision = this.dv.api.index.revision;
            })
        )


        this.registerEvent(
            this.plugin.app.metadataCache.on('resolved', async () => {
                console.log("metadata cache resolved")
                if (this.plugin.app.metadataCache.inProgressTaskCount === 0) {
                    this.fileChanged = true;
                    await this.fullIndex("cache resolved", false, true);
                    await this.indexFieldsValues(this.changedFiles)
                    await this.getFilesLookupAndFormulaFieldsExists();
                    /*
                    this.lastRevision = this.dv?.api.index.revision || 0;
                    */
                }
            })
        )

        this.registerEvent(
            this.plugin.app.vault.on("modify", async (file) => {
                console.log(`file ${file.path} changed`)
                if (file instanceof TFile) {
                    if (file.extension === "md") {
                        this.changedFiles.push(file)
                        //use this once we don't need dataview metadata cache updated anymore
                        //resolveLookups and resolveFormulas have to use our own index
                        /* 
                        
                        cleanRemovedFormulasFromIndex(this.plugin);
                        this.getFilesLookupAndFormulaFieldsExists(file);
                        if (this.classFilesPath && file.path.startsWith(this.classFilesPath)) {
                            await this.fullIndex("fileClass changed")
                            const fileClassName = this.fileClassesPath.get(file.path)?.name
                            const canvasFields = (fileClassName && this.fileClassesFields.get(fileClassName)?.filter(field => field.type === FieldType.Canvas)) || []
                            canvasFields.forEach(async field => {
                                const canvasFile = this.plugin.app.vault.getAbstractFileByPath(field.options.canvasPath)
                                if (canvasFile instanceof TFile && canvasFile.extension === "canvas") {
                                    await updateCanvas(this.plugin, { canvas: canvasFile })
                                }
                            })
                        } else {
                            await this.updateFormulas(false);
                            this.resolveLookups(false);
                            const fileClassName = FileClass.getFileClassNameFromPath(this.plugin, file.path)
                            await this.updateLookups(fileClassName, false, false);
                        }
                        */
                    } else if (file.extension === "canvas") {
                        await updateCanvas(this.plugin, { canvas: file });
                    }
                }
            })
        )

        this.registerEvent(
            this.plugin.app.metadataCache.on('dataview:metadata-change', async (op: any, file: TFile) => {
                //console.log("some file changed", this.fileChanged);
                //console.log("new revision", this.dv?.api.index.revision)
                if (op === "update"
                    //dataview is triggering "update" on metadatacache.on("resolve") even if no change in the file. It occurs at app launch
                    //check if the file mtime is older that plugin load -> in this case no file has change, no need to upldate lookups
                    //@ts-ignore
                    && this.plugin.app.metadataCache.fileCache[file.path].mtime >= this.loadTime
                    && this.dv?.api.index.revision !== this.lastRevision
                    && this.fileChanged
                    && this.dvReady
                ) {
                    //maybe fullIndex didn't catch new files that have to be updated: let's rebuild getFileFieldsExist for this file
                    cleanRemovedFormulasFromIndex(this.plugin);
                    await this.getFilesLookupAndFormulaFieldsExists(file);
                    if (this.classFilesPath && file.path.startsWith(this.classFilesPath)) {
                        await this.fullIndex("fileClass changed")
                        const fileClassName = this.fileClassesPath.get(file.path)?.name
                        const canvasFields = (fileClassName && this.fileClassesFields.get(fileClassName)?.filter(field => field.type === FieldType.Canvas)) || []
                        canvasFields.forEach(async field => {
                            const canvasFile = this.plugin.app.vault.getAbstractFileByPath(field.options.canvasPath)
                            if (canvasFile instanceof TFile && canvasFile.extension === "canvas") {
                                await updateCanvas(this.plugin, { canvas: canvasFile })
                            }
                        })
                    } else {
                        await this.updateFormulas(false);
                        this.resolveLookups(false);
                        const fileClassName = FileClass.getFileClassNameFromPath(this.plugin, file.path)
                        await this.updateLookups(fileClassName, false, false);
                    }
                    this.lastRevision = this.dv.api.index.revision
                }
            })
        )

        this.plugin.app.workspace.trigger("metadata-menu:indexed")
    }

    public getNewFieldId(): string {
        const ids: string[] = [];
        for (const fileClassFields of this.fileClassesFields.values()) {
            for (const field of fileClassFields) {
                ids.push(field.id)
            }
        }
        for (const field of this.plugin.presetFields) {
            ids.push(field.id)
        }
        let id = cryptoRandomString({ length: 6, type: "alphanumeric" })
        while (ids.includes(id)) {
            id = cryptoRandomString({ length: 6, type: "alphanumeric" })
        }
        return id
    }

    async fullIndex(event: string, force_update_all = false, without_lookups = false): Promise<void> {
        console.log("start index [", event, "]", this.lastRevision, "->", this.dv?.api.index.revision)
        let start = Date.now(), time = Date.now()
        //FIXME usefull?
        this.plugin.indexStatus.setState("indexing")
        this.flushCache();
        this.getFileClassesAncestors();
        this.getGlobalFileClass();
        this.getFileClasses();
        this.getLookupQueries();
        this.resolveFileClassMatchingTags();
        this.resolveFileClassMatchingFilesPaths();
        this.resolveFileClassMatchingBookmarksGroups();
        this.resolveFileClassQueries();
        this.getFilesFieldsFromFileClass();
        this.getFilesFields();
        //await this.getFilesLookupAndFormulaFieldsExists();
        await this.getCanvasesFiles();
        await this.getValuesListNotePathValues();
        this.resolveLookups(without_lookups);
        await this.updateLookups("full Index", without_lookups, force_update_all);
        if (force_update_all || !this.firstIndexingDone) await this.updateFormulas(force_update_all); //calculate formulas at start of with force update
        this.firstIndexingDone = true;
        await this.migrateFileClasses();
        this.plugin.app.workspace.trigger("metadata-menu:updated-index");
        console.log("end index [", event, "]", this.lastRevision, "->", this.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    }

    public async indexFieldsValues(changedFiles?: TFile[]) {
        console.log("start indexing values")
        const lastUpdate: number | undefined = (await updates.get() as { id: number, value: number } || undefined)?.value
        console.log("last update: ", lastUpdate)
        let start = Date.now(), time = Date.now()
        const putPayload: IndexedExistingField[] = []
        const delPayload: string[] = []
        const indexedEF: IndexedExistingField[] = await fieldsValues.getElement('all') //await db.getElement("fieldsValuesStore", 'all')
        const files = this.plugin.app.vault.getMarkdownFiles()
            .filter(_f => !lastUpdate || _f.stat.mtime >= lastUpdate)
            .filter(_f => !changedFiles?.length || changedFiles.map(__f => __f.path).includes(_f.path))
        await Promise.all(files.map(async f => {
            const fileIndexedEF = indexedEF.filter(eF => eF.filePath === f.path)
            const note = new Note(this.plugin, f)
            await note.build()
            note.existingFields.forEach(eF => {
                const id = `${f.path}_____${eF.indexedPath}`
                putPayload.push({
                    id: id,
                    filePath: f.path,
                    fieldType: eF.field.type,
                    fieldId: eF.field.id,
                    fileClassName: eF.field.fileClassName,
                    indexedPath: eF.indexedPath || eF.field.id,
                    indexedId: eF.indexedId,
                    value: eF.value,
                    time: f.stat.mtime
                })
            })
            /* remove disappeared fields */
            const noteEF = note.existingFields.map(_eF => _eF.indexedPath)
            fileIndexedEF.forEach(eF => {
                if (!noteEF.includes(eF.indexedPath)) {
                    delPayload.push(`${f.path}_____${eF.indexedPath}`)
                }
            })
        }))
        console.log(`updating ${putPayload.length} items`)
        await fieldsValues.bulkEditElements(putPayload)
        console.log(`removing ${delPayload.length} items`)
        fieldsValues.bulkRemoveElements(delPayload)
        await updates.update()
        this.changedFiles = []
        //if (file) console.log(file.name, await fieldsValues.getElementsForFilePath(file.path))
        console.log("end indexing values", `${(Date.now() - start)}ms`)
    }

    resolveLookups(without_lookups: boolean): void {
        if (!without_lookups) resolveLookups(this.plugin);
    }

    async migrateFileClasses(): Promise<void> {
        await this.migrateV1FileClasses();
        //await this.migrateV2FileClasses();
    }

    async migrateV1FileClasses(): Promise<void> {
        if ([...this.v1FileClassesPath.keys()].length) {
            const remainingV1FileClass = this.v1FileClassesPath.values().next().value
            if (remainingV1FileClass) {
                const migration = new V1FileClassMigration(this.plugin)
                await migration.migrate(remainingV1FileClass)
                //console.log("migrated ", remainingV1FileClass.name, "to v2")
            }
        }
    }

    async migrateV2FileClasses(): Promise<void> {
        if (
            [...this.v2FileClassesPath.keys()].length &&
            ![...this.v1FileClassesPath.keys()].length
        ) {
            const remainingV2FileClass = this.v2FileClassesPath.values().next().value
            if (remainingV2FileClass) {
                const migration = new V2FileClassMigration(this.plugin)
                await migration.migrate(remainingV2FileClass)
                //console.log("migrated ", remainingV2FileClass.name, "to v3")
            }
        }
    }

    async getCanvasesFiles(): Promise<void> {
        const canvases = this.plugin.app.vault.getFiles().filter(t => t.extension === "canvas")
        canvases.forEach(async canvas => {
            const currentFilesPaths: string[] = []
            let { nodes, edges }: CanvasData = { nodes: [], edges: [] };
            const rawContent = await this.plugin.app.vault.read(canvas)
            if (rawContent) {
                try {
                    const canvasContent = JSON.parse(rawContent) as CanvasData;
                    nodes = canvasContent.nodes;
                    edges = canvasContent.edges
                } catch (error) {
                    //console.log(error)
                    new Notice(`Couldn't read ${canvas.path}`)
                }
            }
            nodes?.forEach(async node => {
                if (node.type === "file") {
                    const targetFilePath = node.file
                    if (!currentFilesPaths.includes(targetFilePath)) currentFilesPaths.push(targetFilePath)
                }
            })
            this.canvasLastFiles.set(canvas.path, currentFilesPaths)
        })
    }

    async updateLookups(source: string = "", without_lookups: boolean, force_update_all: boolean): Promise<void> {
        if (!without_lookups) {
            if (force_update_all) {
                await updateLookups(this.plugin, source, undefined, true)
            } else {
                await updateLookups(this.plugin, source);
            }
        }
    }

    async updateFormulas(force_update_all: boolean): Promise<void> {
        await updateFormulas(this.plugin, undefined, force_update_all);
    }

    async getValuesListNotePathValues(): Promise<void> {
        this.fileClassesName.forEach((fileClass) => {
            fileClass.attributes.forEach(async attr => {
                if (typeof attr.options === "object" && !!(attr.options as Record<string, any>)["valuesListNotePath"]) {
                    this.valuesListNotePathValues.set(
                        (attr.options as Record<string, any>).valuesListNotePath,
                        await FieldSetting.getValuesListFromNote(
                            this.plugin,
                            (attr.options as Record<string, any>).valuesListNotePath
                        )
                    )
                }
            })
        })
        this.plugin.presetFields.forEach(async setting => {
            if (setting.options.valuesListNotePath) {
                this.valuesListNotePathValues.set(
                    setting.options.valuesListNotePath,
                    await FieldSetting.getValuesListFromNote(
                        this.plugin,
                        setting.options.valuesListNotePath
                    )
                )
            }
        })
    }

    getFileClassesAncestors(): void {
        const classFilesPath = this.plugin.settings.classFilesPath
        //1. iterate over fileClasses to init fileClassesAncestors
        if (classFilesPath) {
            this.plugin.app.vault.getMarkdownFiles()
                .filter(f => f.path.includes(classFilesPath))
                .forEach(f => {
                    const fileClassName = FileClass.getFileClassNameFromPath(this.plugin, f.path)
                    if (fileClassName) {
                        const parent = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.extends
                        if (parent) {
                            const parentFile = this.plugin.app.vault.getAbstractFileByPath(`${classFilesPath}${parent}.md`)
                            if (parentFile) {
                                this.fileClassesAncestors.set(fileClassName, [parent])
                            } else {
                                this.fileClassesAncestors.set(fileClassName, [])
                            }
                        } else {
                            this.fileClassesAncestors.set(fileClassName, [])
                        }
                    }
                })
        }
        //2. for each fileClass get ancestors recursively - stop when an ancestor is the fileClass
        [...this.fileClassesAncestors].forEach(([fileClassName, ancestors]) => {
            if (ancestors.length > 0) {
                this.getAncestorsRecursively(fileClassName)
            }
        })
    }


    getAncestorsRecursively(fileClassName: string) {
        const ancestors = this.fileClassesAncestors.get(fileClassName)
        if (ancestors && ancestors.length) {
            const lastAncestor = ancestors.last();
            const lastAncestorParent = this.fileClassesAncestors.get(lastAncestor!)?.[0];
            if (lastAncestorParent && lastAncestorParent !== fileClassName) {
                this.fileClassesAncestors.set(fileClassName, [...ancestors, lastAncestorParent]);
                this.getAncestorsRecursively(fileClassName);
            }
        }
    }

    getGlobalFileClass(): void {
        const globalFileClass = this.plugin.settings.globalFileClass
        if (!globalFileClass) {
            this.fieldsFromGlobalFileClass = []
        } else {
            try {
                this.fieldsFromGlobalFileClass = FileClass
                    .createFileClass(
                        this.plugin,
                        globalFileClass)
                    .attributes.map(attr => attr.getField())
            } catch (error) { }
        }
    }

    getFileClasses(): void {
        const classFilesPath = this.classFilesPath
        if (classFilesPath) {
            this.plugin.app.vault.getMarkdownFiles()
                .filter(f => f.path.includes(classFilesPath))
                .forEach(f => {
                    const fileClassName = FileClass.getFileClassNameFromPath(this.plugin, f.path)
                    if (fileClassName) {
                        try {
                            const fileClass = FileClass.createFileClass(this.plugin, fileClassName)
                            this.fileClassesFields.set(
                                fileClassName,
                                fileClass.attributes.map(attr => attr.getField())
                            )
                            this.fileClassesPath.set(f.path, fileClass)
                            this.fileClassesName.set(fileClass.name, fileClass)
                            const cache = this.plugin.app.metadataCache.getFileCache(f);
                            if (fileClass.getMajorVersion() === undefined || fileClass.getMajorVersion() as number < 2) {
                                this.v1FileClassesPath.set(f.path, fileClass)
                            } else if (fileClass.getMajorVersion() === 2) {
                                this.v2FileClassesPath.set(f.path, fileClass)
                            }
                            /*
                            ** Map with tags
                            */
                            if (cache?.frontmatter?.mapWithTag) {
                                if (cache?.frontmatter?.tagNames) {
                                    const _tagNames = cache?.frontmatter?.tagNames as string | string[];
                                    const tagNames = Array.isArray(_tagNames) ? [..._tagNames] : _tagNames.split(",").map(t => t.trim())
                                    tagNames.forEach(tag => {
                                        if (!tag.includes(" ")) {
                                            this.tagsMatchingFileClasses.set(tag, fileClass)
                                        }
                                    })
                                } else if (!fileClassName.includes(" ")) {
                                    this.tagsMatchingFileClasses.set(fileClassName, fileClass)
                                }
                            }
                            /*
                            ** Map with files paths
                            */
                            if (cache?.frontmatter?.filesPaths) {
                                const _filesPaths = cache?.frontmatter?.filesPaths as string | string[];
                                const filesPaths = Array.isArray(_filesPaths) ? [..._filesPaths] : _filesPaths.split(",").map(f => f.trim())
                                filesPaths.forEach(path => this.filesPathsMatchingFileClasses.set(path, fileClass))
                            }
                            /*
                            ** Map with bookmarks groups
                            */
                            if (cache?.frontmatter?.bookmarksGroups) {
                                const _bookmarksGroups = cache?.frontmatter?.bookmarksGroups as string | string[];
                                const bookmarksGroups = Array.isArray(_bookmarksGroups) ? [..._bookmarksGroups] : _bookmarksGroups.split(",").map(g => g.trim())
                                bookmarksGroups.forEach(group => this.bookmarksGroupsMatchingFileClasses.set(group, fileClass))
                            }
                        } catch (error) {
                            console.error(error)
                        }
                    }
                })
        }
    }

    getLookupQueries(): void {
        this.plugin.presetFields.filter(field => field.type === FieldType.Lookup).forEach(field => {
            this.lookupQueries.set(`presetField___${field.name}`, field)
        });
        [...this.fileClassesFields].forEach(([fileClassName, fields]) => {
            fields.filter(field => field.type === FieldType.Lookup).forEach(field => {
                this.lookupQueries.set(`${fileClassName}___${field.name}`, field)
            })
        })
    }

    private resolveFileClassBinding(
        itemMatchingFileClasses: Map<string, FileClass>,
        filesFieldsFromBinding: Map<string, Field[]>,
        itemToMatch: string,
        cFile: TFile | cFileWithTags | cFileWithGroups
    ): void {
        const fileClass = itemMatchingFileClasses.get(itemToMatch);
        const filePath = cFile.path;
        if (fileClass) {
            this.filesFileClasses.set(filePath, [...new Set([...(this.filesFileClasses.get(filePath) || []), fileClass])])
            this.filesFileClassesNames.set(cFile.path, [...new Set([...(this.filesFileClassesNames.get(filePath) || []), fileClass.name])])

            const fileFileClassesFieldsFromBinding = this.fileClassesFields.get(fileClass.name)
            const currentFields = filesFieldsFromBinding.get(filePath)

            if (fileFileClassesFieldsFromBinding) {
                const newFields = [...fileFileClassesFieldsFromBinding]
                const filteredCurrentFields = currentFields?.filter(field =>
                    !newFields.map(f => f.id).includes(field.id) &&
                    !fileClass.options?.excludes?.map(attr => attr.id).includes(field.id)
                ) || []
                newFields.push(...filteredCurrentFields)
                filesFieldsFromBinding.set(filePath, newFields)
            }
        }
    }

    resolveFileClassMatchingTags(): void {
        if (![...this.tagsMatchingFileClasses].length) return
        const mappedTags = [...this.tagsMatchingFileClasses.keys()].map(_t => `#${_t}`)
        const filesWithMappedTag: cFileWithTags[] = [];
        this.plugin.app.vault.getMarkdownFiles().forEach(_f => {
            const cache = app.metadataCache.getFileCache(_f)
            const filteredTags = cache?.tags?.filter(_t => mappedTags.includes(_t.tag))
            if (filteredTags?.length) {
                const fileWithTags: cFileWithTags = { path: _f.path, tags: [] }
                filteredTags.forEach(_t => fileWithTags.tags.push(_t.tag))
                filesWithMappedTag.push(fileWithTags)
            }
        })
        filesWithMappedTag.forEach((cFile: cFileWithTags) => {
            cFile.tags.forEach((_tag: string) => {
                const tag = _tag.replace(/^\#/, "")
                this.resolveFileClassBinding(
                    this.tagsMatchingFileClasses,
                    this.filesFieldsFromTags,
                    tag,
                    cFile
                )
            })
        })
    }

    resolveFileClassMatchingFilesPaths(): void {
        if (![...this.filesPathsMatchingFileClasses].length) return
        const paths = [...this.filesPathsMatchingFileClasses.keys()]
        const filesWithPath: TFile[] =
            this.plugin.app.vault.getMarkdownFiles().filter(_f => paths.includes(_f.parent.path))
        filesWithPath.forEach((file: TFile) => {
            this.resolveFileClassBinding(
                this.filesPathsMatchingFileClasses,
                this.filesFieldsFromFilesPaths,
                file.parent.path,
                file
            )
        })
    }

    private getFilesForItems(items: BookmarkItem[], groups: string[], filesWithGroups: cFileWithGroups[], path: string = "") {
        if (groups.includes(path || "/")) {
            items.filter(_i => _i.type === "file").forEach(_i => filesWithGroups.push({ path: _i.path, group: path || "/" }))
        }
        for (const group of items.filter(_i => _i.type === "group")) {
            const subPath = `${path}${path ? "/" : ""}${group.title}`
            this.getFilesForItems(group.items || [], groups, filesWithGroups, subPath)
        }
    }

    resolveFileClassMatchingBookmarksGroups(): void {
        if (![...this.bookmarksGroupsMatchingFileClasses].length) return
        const groups = [...this.bookmarksGroupsMatchingFileClasses.keys()]
        const bookmarks = this.plugin.app.internalPlugins.getPluginById("bookmarks")
        if (!bookmarks.enabled) return
        const filesWithGroups: cFileWithGroups[] = []
        this.getFilesForItems(bookmarks.instance.items || [], groups, filesWithGroups)

        filesWithGroups.forEach((cFile: cFileWithGroups) => {
            this.resolveFileClassBinding(
                this.bookmarksGroupsMatchingFileClasses,
                this.filesFieldsFromBookmarksGroups,
                cFile.group,
                cFile
            )
        })
    }

    resolveFileClassQueries(): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (!dvApi) return
        this.plugin.settings.fileClassQueries.forEach(sfcq => {
            const fcq = new FileClassQuery(sfcq.name, sfcq.id, sfcq.query, sfcq.fileClassName)
            fcq.getResults(dvApi).forEach((result: any) => {
                const fileClass = this.fileClassesName.get(fcq.fileClassName)
                if (fileClass) {
                    const f = result.file
                    this.filesFileClasses.set(f.path, [...new Set([...(this.filesFileClasses.get(f.path) || []), fileClass])])
                    this.filesFileClassesNames.set(f.path, [...new Set([...(this.filesFileClassesNames.get(f.path) || []), fileClass.name])])
                }
                const fileFileClassesFieldsFromQuery = this.fileClassesFields.get(fcq.fileClassName)
                if (fileFileClassesFieldsFromQuery) this.filesFieldsFromFileClassQueries.set(result.file.path, fileFileClassesFieldsFromQuery)
            })
        })
    }

    getFilesFieldsFromFileClass(): void {
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.classFilesPath
                || !f.path.includes(this.classFilesPath)
            )
            .forEach(f => {
                const fileFileClassesNames = [];
                const fileClassesCache: string[] | string = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.[this.plugin.settings.fileClassAlias]
                if (fileClassesCache) {
                    Array.isArray(fileClassesCache) ?
                        fileFileClassesNames.push(...fileClassesCache) :
                        fileFileClassesNames.push(...fileClassesCache.split(',').map(fcn => fcn.trim()))
                    fileFileClassesNames.forEach(fileFileClassName => {
                        const fileClass = this.fileClassesName.get(fileFileClassName)
                        if (fileClass) {
                            this.filesFileClasses.set(f.path, [...new Set([...(this.filesFileClasses.get(f.path) || []), fileClass])])
                            this.filesFileClassesNames.set(f.path, [...new Set([...(this.filesFileClassesNames.get(f.path) || []), fileClass.name])])
                            const fileClassesFieldsFromFile = this.fileClassesFields.get(fileFileClassName)
                            const currentFields = this.filesFieldsFromInnerFileClasses.get(f.path)
                            if (fileClassesFieldsFromFile) {
                                const newFields = [...fileClassesFieldsFromFile]
                                const filteredCurrentFields = currentFields?.filter(field =>
                                    !newFields.map(f => f.id).includes(field.id) &&
                                    !fileClass.options?.excludes?.map(attr => attr.id).includes(field.id)
                                ) || []
                                newFields.push(...filteredCurrentFields)
                                this.filesFieldsFromInnerFileClasses.set(f.path, newFields)
                            } else { this.filesFieldsFromInnerFileClasses.set(f.path, []); }
                        } else { this.filesFieldsFromInnerFileClasses.set(f.path, []); }
                    })
                } else { this.filesFieldsFromInnerFileClasses.set(f.path, []); }
            })
    }

    isLookupOrFormula(field: Field): boolean {
        return [FieldType.Lookup, FieldType.Formula].includes(field.type)
    }

    getFilesFields(): void {
        /*
        Priority order:
        1. Inner fileClass
        2.1 Tag match
        2.2 Path match
        3. fileClassQuery match
        4. Global fileClass
        5. settings preset fields
        */
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.classFilesPath || !f.path.includes(this.classFilesPath))
            .forEach(f => {
                const fileFieldsFromInnerFileClasses = this.filesFieldsFromInnerFileClasses.get(f.path)
                const fileFieldsFromQuery = this.filesFieldsFromFileClassQueries.get(f.path);
                const fileFieldsFromTag = this.filesFieldsFromTags.get(f.path);
                const fileFieldsFromPath = this.filesFieldsFromFilesPaths.get(f.path)
                const fileFieldsFromGroup = this.filesFieldsFromBookmarksGroups.get(f.path)

                if (
                    fileFieldsFromInnerFileClasses?.length ||
                    fileFieldsFromQuery?.length ||
                    fileFieldsFromTag?.length ||
                    fileFieldsFromPath?.length ||
                    fileFieldsFromGroup?.length
                ) {
                    const filesFields: Field[] = fileFieldsFromInnerFileClasses || [];
                    filesFields.push(...(fileFieldsFromTag || []).filter(field => !filesFields.map(f => f.id).includes(field.id)))
                    filesFields.push(...(fileFieldsFromPath || []).filter(field => !filesFields.map(f => f.id).includes(field.id)))
                    filesFields.push(...(fileFieldsFromGroup || []).filter(field => !filesFields.map(f => f.id).includes(field.id)))
                    filesFields.push(...(fileFieldsFromQuery || []).filter(field => !filesFields.map(f => f.id).includes(field.id)))
                    this.filesFields.set(f.path, filesFields);
                    const filesLookupAndFormulasFields: Field[] = filesFields.filter(f => this.isLookupOrFormula(f))
                    filesLookupAndFormulasFields.push(...(fileFieldsFromTag || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                    filesLookupAndFormulasFields.push(...(fileFieldsFromPath || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                    filesLookupAndFormulasFields.push(...(fileFieldsFromGroup || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                    filesLookupAndFormulasFields.push(...(fileFieldsFromQuery || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                    if (filesLookupAndFormulasFields.length) this.filesLookupsAndFormulasFields.set(f.path, filesLookupAndFormulasFields)
                } else if (this.fieldsFromGlobalFileClass.length) {
                    this.filesFields.set(f.path, this.fieldsFromGlobalFileClass)
                    const filesLookupAndFormulasFields = this.fieldsFromGlobalFileClass.filter(f => this.isLookupOrFormula(f))
                    if (filesLookupAndFormulasFields.length) this.filesLookupsAndFormulasFields.set(f.path, this.fieldsFromGlobalFileClass.filter(f => this.isLookupOrFormula(f)))
                    this.filesFileClasses.set(f.path, [this.fileClassesName.get(this.plugin.settings.globalFileClass!)!])
                    this.filesFileClassesNames.set(f.path, [this.plugin.settings.globalFileClass!])
                } else {
                    const fields = this.plugin.presetFields.map(prop => {
                        const property = new Field(this.plugin);
                        return Object.assign(property, prop);
                    });
                    this.filesFields.set(f.path, fields)
                    const filesLookupAndFormulasFields = fields.filter(f => this.isLookupOrFormula(f))
                    if (filesLookupAndFormulasFields.length) this.filesLookupsAndFormulasFields.set(f.path, fields.filter(f => this.isLookupOrFormula(f)))
                }
            })
    }

    private async getFilesLookupAndFormulaFieldsExists(file?: TFile): Promise<void> {
        let fileFields: Array<[string, Field[]]>
        if (file) {
            fileFields = [[file.path, this.filesLookupsAndFormulasFields.get(file.path) || []]]
        } else {
            fileFields = [...this.filesLookupsAndFormulasFields]
        }
        const lookups = await fieldsValues.getElementsForType<IndexedExistingField[]>("Lookup")
        const formulas = await fieldsValues.getElementsForType<IndexedExistingField[]>("Formula")
        const filesExistingFields: Record<string, IndexedExistingField[]> = {};
        [...lookups, ...formulas].forEach(iF => {
            filesExistingFields[iF.filePath] = [...(filesExistingFields[iF.filePath] || []), iF]
        });
        Object.keys(filesExistingFields).forEach(filePath => {
            const existingFields = filesExistingFields[filePath]
                .map(_f => Field.getFieldFromId(this.plugin, _f.fieldId, _f.fileClassName))
                .filter(_f => !!_f) as Field[]

            this.filesLookupAndFormulaFieldsExists.set(filePath, existingFields)
        })
        /*
        fileFields.forEach(([filePath, fields]) => {
            const dvFile = this.dv.api.page(filePath)
            const existingFields: Field[] = []
            fields.filter(f => [FieldType.Lookup, FieldType.Formula]
                .includes(f.type)).forEach(field => {
                    //TODO: change dvFile with filesFieldsValues
                    if (dvFile && dvFile[field.name] !== undefined) { existingFields.push(field) }
                })
            if (existingFields.length) {
                this.filesLookupAndFormulaFieldsExists.set(filePath, existingFields)
            } else {
                this.filesLookupAndFormulaFieldsExists.delete(filePath)
            }
        })
        */
    }
}
