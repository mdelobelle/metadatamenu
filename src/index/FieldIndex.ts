import { Notice, TAbstractFile, TFile } from "obsidian"
import MetadataMenu from "main"
import { FileClass, createFileClass, getFileClassNameFromPath, indexFileClass } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FieldSetting from "src/settings/FieldSetting";
import { resolveLookups } from "src/commands/resolveLookups";
import { cleanRemovedLookupItemsFromIndex, updateLookups } from "src/commands/updateLookups";
import { updateFormulas, cleanRemovedFormulasFromIndex } from "src/commands/updateFormulas";
import { Status as LookupStatus, Status } from "src/types/lookupTypes";
import { updateCanvas, updateCanvasAfterFileClass } from "src/commands/updateCanvas";
import { CanvasData } from "obsidian/canvas";
import { V1FileClassMigration } from "src/fileClass/fileClassMigration";
import { BookmarkItem } from "src/typings/types";
import { IndexedFieldsPayload, postValues } from "src/commands/postValues";
import { cFileWithGroups, cFileWithTags, FieldIndexBuilder, FieldsPayloadToProcess, IndexedExistingField } from "./FieldIndexBuilder";
import { FileClassViewManager } from "src/components/FileClassViewManager";
import { Field, buildEmptyField } from "src/fields/Field";
import { waitFor } from "src/utils/syncUtils";

export default class FieldIndex extends FieldIndexBuilder {
    private launchTime: number
    public isIndexing = false;
    private readonly minInactivityTimeBeforeIndexing = 3000; // in ms
    private lastTypingId = 0;

    constructor(public plugin: MetadataMenu) {
        super(plugin)
        this.launchTime = Date.now()
    }

    private async onResolved() {
        this.lastTypingId++;
        const currentTypingId = this.lastTypingId;
        const self = this;
        setTimeout(() => {
            self.onResolvedImpl(currentTypingId);
        }, this.minInactivityTimeBeforeIndexing);
    }
    private async onResolvedImpl(typingId: number) {
        if (typingId != this.lastTypingId) {
            // console.log(`Wait for end of typing (typingId=${typingId}, lastTypingId=${this.lastTypingId})`);
            return;
        }
        // console.log("Finished typing");

        if (this.plugin.app.metadataCache.inProgressTaskCount === 0 && this.plugin.launched) {
            if (this.changedFiles.every(file => this.classFilesPath && file.path.startsWith(this.classFilesPath))) {
                this.plugin.app.metadataCache.trigger("metadata-menu:fileclass-indexed");
                await updateCanvasAfterFileClass(this.plugin, this.changedFiles)
            }
            await this.indexFields()
            this.plugin.app.metadataCache.trigger("metadata-menu:indexed");
            this.changedFiles = []
        }

        this.lastTypingId = 0;
    }

    async onload(): Promise<void> {

        this.registerEvent(
            this.bookmarks.instance.on("changed", async () => {
                if (this.bookmarks.enabled) {
                    const updateTime = this.bookmarks.lastSave
                    if (this.lastBookmarkChange === undefined || updateTime > this.lastBookmarkChange) {
                        await this.indexFields()
                        this.lastBookmarkChange = updateTime
                        this.plugin.app.metadataCache.trigger("metadata-menu:indexed"); //to rebuild the button
                    }
                }
            })
        )

        this.registerEvent(
            this.plugin.app.vault.on("modify", async (file) => {
                if (file instanceof TFile) {
                    if (file.extension === "md") {
                        this.changedFiles.push(file)
                        this.lastTimeBeforeResolving = Date.now()
                    } else if (file.extension === "canvas") {
                        await updateCanvas(this.plugin, { canvas: file });
                    }
                }
            })
        )

        this.registerEvent(
            this.plugin.app.vault.on("delete", async (file) => {
                this.filesFields.delete(file.path)
                await this.fullIndex()
            })
        )

        this.registerEvent(
            this.plugin.app.vault.on("rename", async (file, oldPath) => {
                this.filesFields.delete(oldPath)
                await this.fullIndex()
            })
        )

        this.registerEvent(
            this.plugin.app.metadataCache.on('resolved', this.onResolved, this)
        )

        this.registerEvent(
            this.plugin.app.metadataCache.on("dataview:index-ready", async () => {
                MDM_DEBUG && console.log("dataview index ready")
                this.dv = this.plugin.app.plugins.plugins.dataview;
            })
        )

        this.registerEvent(
            this.plugin.app.metadataCache.on('dataview:metadata-change', async (op: any, file: TFile) => {
                // await waitFor(() => { return !this.isIndexing; });
                // this.isIndexing = true;

                if (file.stat.mtime > this.launchTime && op === "update" && this.dvReady() && this.settings.isAutoCalculationEnabled) {
                    const filePayloadToProcess = this.dVRelatedFieldsToUpdate.get(file.path)
                    if (![...this.dVRelatedFieldsToUpdate.keys()].includes(file.path)) {
                        await this.resolveAndUpdateDVQueriesBasedFields(false)
                    } else if (filePayloadToProcess) {
                        filePayloadToProcess.status = "processed"
                    }
                    if ([...this.dVRelatedFieldsToUpdate.values()].every(item => item.status === "processed")) this.dVRelatedFieldsToUpdate = new Map()
                }

                // this.isIndexing = false;
            })
        )

        // this.lastTypingTime = Date.now();
    }

    public indexableFiles() {
        return this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.classFilesPath
                || !f.path.startsWith(this.classFilesPath))
            .filter(f => !this.settings.fileIndexingExcludedFolders.some(path => f.path.startsWith(path)))
            .filter(f => !this.settings.fileIndexingExcludedExtensions.some(extension => f.path.endsWith(extension)))
            .filter(f => !this.settings.fileIndexingExcludedRegex.some(regexStr => {
                try {
                    const regex = new RegExp(regexStr);
                    return regex.test(f.path)
                } catch (e) {
                    return true
                }
            }))
    }

    public indexableFileClasses() {
        const classFilesPath = this.classFilesPath
        if (classFilesPath) {
            return this.plugin.app.vault.getMarkdownFiles()
                .filter(f => f.path.startsWith(classFilesPath))
        }
        return []
    }

    public async fullIndex(forceUpdateAll = false): Promise<void> {
        this.plugin.indexStatus.setState("indexing")
        this.classFilesPath = this.plugin.settings.classFilesPath
        await this.indexFields()
        /*
        ** Asynchronously resolve queries
        */
        if (this.dvReady() && (this.settings.isAutoCalculationEnabled || forceUpdateAll)) {
            this.resolveAndUpdateDVQueriesBasedFields(forceUpdateAll);  //asynchronous
        }
        if (this.remainingLegacyFileClasses) await this.migrateFileClasses();
        this.plugin.app.metadataCache.trigger("metadata-menu:indexed");
    }

    public async indexFields(): Promise<void> {
        MDM_DEBUG && console.log("start indexing FIELDS");
        const start = Date.now()
        this.flushCache();
        this.getFileClassesAncestors();
        this.getFileClasses();
        this.getLookupQueries();
        this.resolveFileClassMatchingTags();
        this.resolveFileClassMatchingFilesPaths();
        this.resolveFileClassMatchingBookmarksGroups();
        this.resolveFileClassQueries();
        this.getFilesFieldsFromFileClass();
        const indexedFiles = this.getFilesFields();
        await this.getCanvasesFiles();
        await this.getValuesListNotePathValues();
        this.getFilesLookupAndFormulaFieldsExists();
        if (this.updatedManagedField) await this.updatedManagedField.goToPreviousModal()
        MDM_DEBUG && console.log("indexed FIELDS for ", indexedFiles, " files in ", (Date.now() - start) / 1000, "s")
    }

    public pushPayloadToUpdate(filePath: string, fieldsPayloadToUpdate: IndexedFieldsPayload) {
        const currentFieldsPayloadToUpdate: FieldsPayloadToProcess = this.dVRelatedFieldsToUpdate
            .get(filePath) || { status: "toProcess", fieldsPayload: [] }
        for (const fieldPayload of fieldsPayloadToUpdate) {
            currentFieldsPayloadToUpdate.status = "toProcess"
            const { indexedPath, payload } = fieldPayload
            const currentField = currentFieldsPayloadToUpdate?.fieldsPayload.find(item => item.indexedPath === indexedPath)
            if (currentField) currentField.payload = payload;
            else currentFieldsPayloadToUpdate.fieldsPayload.push(fieldPayload)
            this.dVRelatedFieldsToUpdate.set(filePath, currentFieldsPayloadToUpdate)
        }
    }

    public async applyUpdates(): Promise<void> {
        await Promise.all(
            [...(this.dVRelatedFieldsToUpdate.keys())].map(
                async filePath => {
                    const fieldsPayload = this.dVRelatedFieldsToUpdate.get(filePath)?.fieldsPayload
                    if (fieldsPayload) {
                        await postValues(this.plugin, fieldsPayload, filePath)
                        fieldsPayload.forEach(fieldPayload => {
                            const field = this.filesFields
                                .get(filePath)?.find(_f => _f.isRoot() && _f.id === fieldPayload.indexedPath)
                            if (field && field.type === "Lookup") this.fileLookupFieldsStatus
                                .set(`${filePath}__${field.name}`, LookupStatus.upToDate)
                            if (field && field.type === "Formula") this.fileFormulaFieldsStatus
                                .set(`${filePath}__${field.name}`, LookupStatus.upToDate)
                        })
                    }
                })
        )
        this.lastDVUpdatingTime = Date.now()
    }

    public async resolveAndUpdateDVQueriesBasedFields(
        force_update_all = false,
        forceUpdateOne?: { file: TFile, fieldName: string }
    ): Promise<void> {
        const start = Date.now()
        this.plugin.indexStatus.setState("indexing")
        cleanRemovedLookupItemsFromIndex(this.plugin)
        cleanRemovedFormulasFromIndex(this.plugin);
        this.getFilesLookupAndFormulaFieldsExists();

        resolveLookups(this.plugin);
        await updateLookups(this.plugin, forceUpdateOne, force_update_all)
        await updateFormulas(this.plugin, forceUpdateOne, force_update_all);
        await this.applyUpdates()
        this.plugin.app.metadataCache.trigger("metadata-menu:indexed");
        MDM_DEBUG && console.log("Resolved dvQ in ", (Date.now() - start) / 1000, "s")
    }

    async migrateFileClasses(): Promise<void> {
        await V1FileClassMigration.migrateV1FileClasses(this.plugin);
        this.remainingLegacyFileClasses = false;
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
                    MDM_DEBUG && console.log(error)
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

    async getValuesListNotePathValues(): Promise<void> {
        await Promise.all([...new Set(this.fileClassesName)].map(async ([fileClassName, fileClass]) => {
            await Promise.all(fileClass.attributes.map(async attr => {
                if (typeof attr.options === "object" && !!(attr.options as Record<string, any>)["valuesListNotePath"]) {
                    this.valuesListNotePathValues.set(
                        (attr.options as Record<string, any>).valuesListNotePath,
                        await FieldSetting.getValuesListFromNote(
                            this.plugin,
                            (attr.options as Record<string, any>).valuesListNotePath
                        )
                    )
                }
            }))
        }))
        await Promise.all(this.plugin.presetFields.map(async setting => {
            if (setting.options.valuesListNotePath) {
                this.valuesListNotePathValues.set(
                    setting.options.valuesListNotePath,
                    await FieldSetting.getValuesListFromNote(
                        this.plugin,
                        setting.options.valuesListNotePath
                    )
                )
            }
        }))
    }

    private getFileClassesAncestors(): void {
        //1. iterate over fileClasses to init fileClassesAncestors
        this.indexableFileClasses().forEach(f => {
            const fileClassName = getFileClassNameFromPath(this.settings, f.path)
            if (fileClassName) {
                const parents: string[] = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.extends || []
                const files: string[] = []
                parents.forEach((p) => {
                    if (this.plugin.app.vault.getAbstractFileByPath(`${this.classFilesPath || ""}${p}.md`)) {
                        files.push(p)
                    }
                })
                this.fileClassesAncestors.set(fileClassName, files)
            }
        });

        //2. for each fileClass get ancestors recursively - stop when an ancestor is the fileClass
        [...this.fileClassesAncestors].forEach(([fileClassName, ancestors]) => {
            if (ancestors.length > 0) {
                this.getAncestorsRecursively(fileClassName)
            }
        })
    }

    private getAncestorsRecursively(fileClassName: string) {
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

    private getFileClasses(): void {
        this.indexableFileClasses().forEach(f => indexFileClass(this, f));
        const globalFileClass = this.settings.globalFileClass
        if (!globalFileClass) {
            this.fieldsFromGlobalFileClass = []
        } else {
            this.fieldsFromGlobalFileClass = this.fileClassesFields.get(globalFileClass) || []
        }
        (async () => {
            await Promise.all(this.openFileClassManagerAfterIndex.map(async fileClassName => {
                const fileClass = this.fileClassesName.get(fileClassName)
                if (fileClass) {
                    const fileClassViewManager = new FileClassViewManager(this.plugin, fileClass, "settingsOption")
                    this.plugin.addChild(fileClassViewManager)
                    await fileClassViewManager.build()
                }
            }))
            this.openFileClassManagerAfterIndex = []
        })()
    }

    private getLookupQueries(): void {
        this.plugin.presetFields.filter(field => field.type === "Lookup").forEach(field => {
            this.lookupQueries.set(`presetField___${field.name}`, field)
        });
        [...this.fileClassesFields].forEach(([fileClassName, fields]) => {
            fields.filter(field => field.type === "Lookup").forEach(field => {
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

    private resolveFileClassMatchingTags(): void {

        if (!this.tagsMatchingFileClasses.size) return
        const mappedTags = [...this.tagsMatchingFileClasses.keys()].map(_t => `#${_t}`)
        const filesWithMappedTag: cFileWithTags[] = [];
        this.indexableFiles().forEach(_f => {
            const cache = this.plugin.app.metadataCache.getFileCache(_f)
            const cachedTags = cache?.frontmatter?.tags
            let fileTags: string[] = []
            if (Array.isArray(cachedTags)) {
                fileTags = cachedTags
            } else if (typeof cachedTags === "string") {
                fileTags = cachedTags.split(",").map(_t => _t.trim())
            }
            const filteredTagsFromFrontmatter = fileTags.filter(_t => mappedTags.includes(`#${_t}`))
            const filteredTagsFromFile = cache?.tags?.filter(_t => mappedTags.includes(_t.tag)).map(_t => _t.tag) || []
            const filteredTags = filteredTagsFromFrontmatter.concat(filteredTagsFromFile)
            if (filteredTags?.length) {
                const fileWithTags: cFileWithTags = { path: _f.path, tags: [] }
                filteredTags.forEach(_t => fileWithTags.tags.push(_t))
                filesWithMappedTag.push(fileWithTags)
            }
        })
        filesWithMappedTag.forEach((cFile: cFileWithTags) => {
            cFile.tags.forEach((_tag: string) => {
                const tag = _tag.replace(/^#/, "")
                this.resolveFileClassBinding(
                    this.tagsMatchingFileClasses,
                    this.filesFieldsFromTags,
                    tag,
                    cFile
                )
            })
        })
    }

    private resolveFileClassMatchingFilesPaths(): void {

        if (!this.filesPathsMatchingFileClasses.size) return
        const paths = [...this.filesPathsMatchingFileClasses.keys()]
        this.indexableFiles()
            .filter(_f => _f.parent !== null)
            .forEach((file: TFile) => {
                for (const path of paths) {
                    if (file.parent && file.parent.path.startsWith(path)) {
                        this.resolveFileClassBinding(
                            this.filesPathsMatchingFileClasses,
                            this.filesFieldsFromFilesPaths,
                            path,
                            file
                        )
                    }
                }
            })
    }

    private getFilesForItems(items: BookmarkItem[], groups: string[], filesWithGroups: cFileWithGroups[], path = "") {
        if (groups.includes(path || "/")) {
            items.filter(_i => _i.type === "file").forEach(_i => filesWithGroups.push({ path: _i.path, group: path || "/" }))
        }
        for (const group of items.filter(_i => _i.type === "group")) {
            const subPath = `${path}${path ? "/" : ""}${group.title}`
            this.getFilesForItems(group.items || [], groups, filesWithGroups, subPath)
        }
    }

    private resolveFileClassMatchingBookmarksGroups(): void {

        if (!this.bookmarksGroupsMatchingFileClasses.size) return
        const groups = [...this.bookmarksGroupsMatchingFileClasses.keys()]
        const bookmarks = this.bookmarks
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

    private resolveFileClassQueries(): void {

        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (!dvApi) return
        this.settings.fileClassQueries.forEach(sfcq => {
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

    private getFilesFieldsFromFileClass(): void {

        this.indexableFiles().forEach(f => {
            const fileFileClassesNames = [];
            const fileClassesCache: string[] | string = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.[this.settings.fileClassAlias]
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

    private isLookupOrFormula(field: Field): boolean {
        return ["Lookup", "Formula"].includes(field.type)
    }

    private getFilesFields(): number {
        /*
        associates fields to each indexable files according to the mapping
        between the file and the fileClasses
        Priority order:
        1. Inner fileClass
        2.1 Tag match
        2.2 Path match
        2.3 BookmarkGroup match
        3. fileClassQuery match
        4. Global fileClass
        5. settings preset fields

        compares the fieldSet of the file and updates filesFieldsLastChange accordingly
        */

        const filesToIndex = this.indexableFiles()
            .filter(_f => !this.changedFiles.length || //forceupdateAll
                this.changedFiles.filter(file => this.classFilesPath && file.path.startsWith(this.classFilesPath)).length || // a fileclass has changed forceupdate all
                this.changedFiles.includes(_f)
            )

        filesToIndex.forEach(f => {
            const fileFieldsFromInnerFileClasses = this.filesFieldsFromInnerFileClasses.get(f.path)
            const fileFieldsFromQuery = this.filesFieldsFromFileClassQueries.get(f.path);
            const fileFieldsFromTag = this.filesFieldsFromTags.get(f.path);
            const fileFieldsFromPath = this.filesFieldsFromFilesPaths.get(f.path)
            const fileFieldsFromGroup = this.filesFieldsFromBookmarksGroups.get(f.path)
            let fileFields: Field[]
            const previousFileFields: string[] | undefined = this.previousFilesFields.get(f.path)?.map(_f => _f.id) || []
            if (
                fileFieldsFromInnerFileClasses?.length ||
                fileFieldsFromQuery?.length ||
                fileFieldsFromTag?.length ||
                fileFieldsFromPath?.length ||
                fileFieldsFromGroup?.length
            ) {
                fileFields = fileFieldsFromInnerFileClasses || [];
                fileFields.push(...(fileFieldsFromTag || []).filter(field => !fileFields.map(f => f.id).includes(field.id)))
                fileFields.push(...(fileFieldsFromPath || []).filter(field => !fileFields.map(f => f.id).includes(field.id)))
                fileFields.push(...(fileFieldsFromGroup || []).filter(field => !fileFields.map(f => f.id).includes(field.id)))
                fileFields.push(...(fileFieldsFromQuery || []).filter(field => !fileFields.map(f => f.id).includes(field.id)))
                this.filesFields.set(f.path, fileFields);
                const filesLookupAndFormulasFields: Field[] = fileFields.filter(f => this.isLookupOrFormula(f))
                filesLookupAndFormulasFields.push(...(fileFieldsFromTag || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                filesLookupAndFormulasFields.push(...(fileFieldsFromPath || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                filesLookupAndFormulasFields.push(...(fileFieldsFromGroup || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                filesLookupAndFormulasFields.push(...(fileFieldsFromQuery || []).filter(field => !filesLookupAndFormulasFields.map(f => f.id).includes(field.id) && this.isLookupOrFormula(field)))
                if (filesLookupAndFormulasFields.length) this.filesLookupsAndFormulasFields.set(f.path, filesLookupAndFormulasFields)
            } else if (this.fieldsFromGlobalFileClass.length) {
                fileFields = this.fieldsFromGlobalFileClass
                this.filesFields.set(f.path, fileFields)
                const filesLookupAndFormulasFields = this.fieldsFromGlobalFileClass.filter(f => this.isLookupOrFormula(f))
                if (filesLookupAndFormulasFields.length) this.filesLookupsAndFormulasFields.set(f.path, this.fieldsFromGlobalFileClass.filter(f => this.isLookupOrFormula(f)))
                this.filesFileClasses.set(f.path, [this.fileClassesName.get(this.settings.globalFileClass!)!])
                this.filesFileClassesNames.set(f.path, [this.settings.globalFileClass!])
            } else {
                fileFields = this.plugin.presetFields.map(prop => {
                    const property = new (buildEmptyField(this.plugin, undefined))
                    return Object.assign(property, prop);
                });
                this.filesFields.set(f.path, fileFields)
                const filesLookupAndFormulasFields = fileFields.filter(f => this.isLookupOrFormula(f))
                if (filesLookupAndFormulasFields.length) this.filesLookupsAndFormulasFields.set(f.path, fileFields.filter(f => this.isLookupOrFormula(f)))
            }
            if (
                fileFields.some(f => !previousFileFields?.includes(f.id)) ||
                previousFileFields?.some(fId => !fileFields.map(_f => _f.id).includes(fId))
            ) {
                this.filesFieldsLastChange.set(f.path, Date.now())

            }
            this.previousFilesFields.set(f.path, fileFields)
        })
        return filesToIndex.length
    }

    private getFilesLookupAndFormulaFieldsExists(file?: TFile): void {
        if (!this.dvReady()) return
        [...this.filesFields.entries()].forEach(([filePath, fields]) => {
            const dvFormulaFields = fields.filter(
                f => f.isRoot()
                    && f.type === "Formula"
                    && this.dv.api.page(filePath)
                    && f.name in this.dv.api.page(filePath))
            if (!this.settings.isAutoCalculationEnabled) dvFormulaFields
                .forEach(field => this.fileFormulaFieldsStatus.set(`${filePath}__${field.name}`, Status.mayHaveChanged))
            const dvLookupFields = fields.filter(
                f => f.isRoot()
                    && f.type === "Lookup"
                    && this.dv.api.page(filePath)
                    && f.name in this.dv.api.page(filePath))
            if (!this.settings.isAutoCalculationEnabled) dvLookupFields
                .forEach(field => this.fileLookupFieldsStatus.set(`${filePath}__${field.name}`, Status.mayHaveChanged))
            this.filesLookupAndFormulaFieldsExists.set(filePath, [...dvFormulaFields, ...dvLookupFields])
        });
    }

    public dvQFieldChanged(path: string) {
        let changed = false
        this.filesLookupAndFormulaFieldsExists.get(path)?.forEach(field => {
            if (field.type === "Lookup") {
                changed = changed || this.fileLookupFieldsStatus.get(path + "__" + field.name) === Status.changed
            } else if (field.type === "Formula") {
                changed = changed || this.fileFormulaFieldsStatus.get(path + "__" + field.name) === Status.changed
            }
        })
        return changed
    }

    public dvQFieldMayHaveChanged(path: string) {
        let changed = false
        this.filesLookupAndFormulaFieldsExists.get(path)?.forEach(field => {
            if (field.type === "Lookup") {
                changed = changed || this.fileLookupFieldsStatus.get(path + "__" + field.name) === Status.mayHaveChanged
            } else if (field.type === "Formula") {
                changed = changed || this.fileFormulaFieldsStatus.get(path + "__" + field.name) === Status.mayHaveChanged
            }
        })
        return changed
    }

    public dvQFieldHasAnError(path: string) {
        let changed = false
        this.filesLookupAndFormulaFieldsExists.get(path)?.forEach(field => {
            if (field.type === "Lookup") {
                changed = changed || this.fileLookupFieldsStatus.get(path + "__" + field.name) === Status.error
            } else if (field.type === "Formula") {
                changed = changed || this.fileFormulaFieldsStatus.get(path + "__" + field.name) === Status.error
            }
        })
        return changed
    }

    public isIndexed(file: TFile): boolean {
        this.indexableFiles().map(f => f.path).includes(file.path)
        return true
    }
}
