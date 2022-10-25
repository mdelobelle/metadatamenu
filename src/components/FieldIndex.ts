import { Component, TFile } from "obsidian"
import MetadataMenu from "main"
import Field from "../fields/Field";
import { FileClass } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FieldSetting from "src/settings/FieldSetting";
import { updateLookups, resolveLookups } from "../fields/fieldManagers/LookupField";

export default class FieldIndex extends Component {

    public fileClassesFields: Map<string, Field[]>;
    public fieldsFromGlobalFileClass: Field[];
    public filesFieldsFromTags: Map<string, Field[]>;
    public filesFieldsFromFileClassQueries: Map<string, Field[]>;
    public filesFieldsFromInnerFileClasses: Map<string, Field[]>;
    public filesFields: Map<string, Field[]>;
    public filesFileClasses: Map<string, FileClass[]>;
    public filesFileClassesNames: Map<string, string[] | undefined>;
    public fileClassesAncestors: Map<string, string[]>
    public fileClassesPath: Map<string, FileClass>;
    public fileClassesName: Map<string, FileClass>;
    public valuesListNotePathValues: Map<string, string[]>;
    public tagsMatchingFileClasses: Map<string, FileClass>;
    public fileLookupFiles: Map<string, any[]>;
    public previousFileLookupFilesValues: Map<string, number>;
    public fileLookupFieldLastValue: Map<string, string>;
    public fileLookupParents: Map<string, string[]>;
    public dv: any;
    public lastRevision: 0;
    public fileChanged: boolean = false;
    public dvReady: boolean = false;
    public loadTime: number;

    constructor(private plugin: MetadataMenu, public cacheVersion: string, public onChange: () => void) {
        super()
        this.flushCache();
        this.fileLookupFiles = new Map();
        this.fileLookupParents = new Map();
        this.fileLookupFieldLastValue = new Map();
        this.previousFileLookupFilesValues = new Map();
        this.dv = this.plugin.app.plugins.plugins.dataview;
    }

    async onload(): Promise<void> {

        this.loadTime = Date.now()

        if (this.dv?.api.index.initialized) {
            this.dv = this.plugin.app.plugins.plugins.dataview;
            this.lastRevision = this.dv.api.index.revision;
            this.dvReady = true;
            await this.fullIndex("dv is running");
        }

        this.plugin.registerEvent(
            this.plugin.app.metadataCache.on("dataview:index-ready", async () => {
                this.dv = this.plugin.app.plugins.plugins.dataview;
                this.dvReady = true;
                await this.fullIndex("dv index", true);
                this.lastRevision = this.dv.api.index.revision;
            })
        )

        this.plugin.registerEvent(
            this.plugin.app.metadataCache.on('resolved', async () => {
                //console.log("obsidian resolved")
                if (this.plugin.app.metadataCache.inProgressTaskCount === 0) {
                    this.fileChanged = true;
                    await this.fullIndex("cache resolved");
                    this.lastRevision = this.dv?.api.index.revision || 0;
                }
            })
        )

        this.plugin.registerEvent(
            this.plugin.app.metadataCache.on('dataview:metadata-change', async (op: any, file: TFile) => {
                //console.log("some file changed", this.fileChanged);
                if (op === "update"
                    //dataview is triggering "update" on metadatacache.on("resolve") even if no change in the file. It occurs at app launch
                    //check if the file mtime is older that plugin load -> in this case no file has change, no need to upldate lookups
                    //@ts-ignore
                    && this.plugin.app.metadataCache.fileCache[file.path].mtime >= this.loadTime
                    && this.dv?.api.index.revision !== this.lastRevision
                    && this.fileChanged
                    && this.dvReady
                ) {
                    const classFilesPath = this.plugin.settings.classFilesPath
                    if (classFilesPath && file.path.includes(classFilesPath)) {
                        this.fullIndex("fileClass changed")
                    } else {
                        this.resolveLookups();
                        await this.updateLookups(false, file.basename);
                    }
                    this.lastRevision = this.dv.api.index.revision
                }
            })
        )
    }

    private flushCache() {
        this.filesFields = new Map();
        this.fileClassesFields = new Map();
        this.fieldsFromGlobalFileClass = [];
        this.filesFieldsFromTags = new Map();
        this.filesFieldsFromFileClassQueries = new Map();
        this.filesFieldsFromInnerFileClasses = new Map();
        this.fileClassesPath = new Map();
        this.fileClassesName = new Map();
        this.fileClassesAncestors = new Map();
        this.valuesListNotePathValues = new Map();
        this.tagsMatchingFileClasses = new Map();
        this.filesFileClasses = new Map();
        this.filesFileClassesNames = new Map();
    }

    async fullIndex(event: string, force_update_lookups = false): Promise<void> {
        //console.log("start index [", event, "]", this.lastRevision, "->", this.dv?.api.index.revision)
        const start = Date.now()
        this.flushCache();
        this.getFileClassesAncestors();
        this.getGlobalFileClass();
        this.getFileClasses();
        this.resolveFileClassMatchingTags();
        this.resolveFileClassQueries();
        this.getFilesFieldsFromFileClass();
        this.getFilesFields();
        await this.getValuesListNotePathValues();
        this.resolveLookups();
        await this.updateLookups(force_update_lookups, "full Index");
        //console.log("end index [", event, "]", this.lastRevision, "->", this.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    }

    resolveLookups(): void {
        resolveLookups(this.plugin);
    }

    async updateLookups(force_update: boolean = false, source: string = ""): Promise<void> {
        await updateLookups(this.plugin, force_update, source);
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
        this.plugin.settings.presetFields.forEach(async setting => {
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
        if (this.plugin.settings.classFilesPath) {
            this.plugin.app.vault.getMarkdownFiles()
                .filter(f => f.path.includes(this.plugin.settings.classFilesPath!))
                .forEach(f => {
                    const parent = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.extends
                    if (parent) {
                        this.fileClassesAncestors.set(f.basename, [parent])
                    } else {
                        this.fileClassesAncestors.set(f.basename, [])
                    }
                })
        }
        [...this.fileClassesAncestors].forEach(([fileClassName, ancestors]) => {
            if (ancestors.length > 0) {
                this.getAncestorsRecursively(fileClassName, ancestors[0])
            }
        })
    }

    getAncestorsRecursively(fileClassName: string, ancestorName: string) {
        const ancestors = this.fileClassesAncestors.get(fileClassName)
        if (ancestors && ancestors.length) {
            const lastAncestor = ancestors.last();
            const lastAncestorParent = this.fileClassesAncestors.get(lastAncestor!)?.[0];
            if (lastAncestorParent && lastAncestorParent !== fileClassName) {
                this.fileClassesAncestors.set(fileClassName, [...ancestors, lastAncestorParent]);
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
        if (this.plugin.settings.classFilesPath) {
            this.plugin.app.vault.getMarkdownFiles()
                .filter(f => f.path.includes(this.plugin.settings.classFilesPath!))
                .forEach(f => {
                    try {
                        const fileClass = FileClass.createFileClass(this.plugin, f.basename)
                        this.fileClassesFields.set(
                            f.basename,
                            fileClass.attributes.map(attr => attr.getField())
                        )
                        this.fileClassesPath.set(f.path, fileClass)
                        this.fileClassesName.set(fileClass.name, fileClass)
                        const cache = this.plugin.app.metadataCache.getFileCache(f);
                        if (cache?.frontmatter?.matchWithTag) {
                            this.tagsMatchingFileClasses.set(f.basename, fileClass)
                        }
                    } catch { }
                })
        }
    }

    resolveFileClassMatchingTags(): void {
        if (![...this.tagsMatchingFileClasses].length) return
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.plugin.settings.classFilesPath
                || !f.path.includes(this.plugin.settings.classFilesPath)
            )
            .forEach(f => {
                const tags = []
                const cache = this.plugin.app.metadataCache.getCache(f.path);
                if (cache?.frontmatter?.tags) {
                    Array.isArray(cache.frontmatter.tags) ? tags.push(...cache.frontmatter.tags) : tags.push(...cache.frontmatter.tags.split(','))
                }
                if (cache?.tags) {
                    tags.push(...cache.tags.map(t => t.tag.replace(/\#(.*)/, "$1")))
                }
                tags.forEach(tag => {
                    const fileClass = this.tagsMatchingFileClasses.get(tag);
                    if (fileClass) {
                        this.filesFileClasses.set(f.path, [...(this.filesFileClasses.get(f.path) || []), fileClass])
                        this.filesFileClassesNames.set(f.path, [...(this.filesFileClassesNames.get(f.path) || []), fileClass.name])

                        const fileFileClassesFieldsFromTag = this.fileClassesFields.get(fileClass.name)
                        const currentFields = this.filesFieldsFromTags.get(f.path)

                        if (fileFileClassesFieldsFromTag) {
                            const newFields = [...fileFileClassesFieldsFromTag]
                            const filteredCurrentFields = currentFields?.filter(field => !newFields.map(f => f.name).includes(field.name)) || []
                            newFields.push(...filteredCurrentFields)
                            this.filesFieldsFromTags.set(f.path, newFields)
                        }
                    }

                });
                [...this.tagsMatchingFileClasses].forEach(([tag, fileClass]) => {

                })
            })
    }

    resolveFileClassQueries(): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        this.plugin.settings.fileClassQueries.forEach(sfcq => {
            const fcq = new FileClassQuery(sfcq.name, sfcq.id, sfcq.query, sfcq.fileClassName)
            fcq.getResults(dvApi).forEach((result: any) => {
                const fileClass = this.fileClassesName.get(fcq.fileClassName)
                if (fileClass) {
                    const f = result.file
                    this.filesFileClasses.set(f.path, [...(this.filesFileClasses.get(f.path) || []), fileClass])
                    this.filesFileClassesNames.set(f.path, [...(this.filesFileClassesNames.get(f.path) || []), fileClass.name])
                }
                const fileFileClassesFieldsFromQuery = this.fileClassesFields.get(fcq.fileClassName)
                if (fileFileClassesFieldsFromQuery) this.filesFieldsFromFileClassQueries.set(result.file.path, fileFileClassesFieldsFromQuery)
            })
        })
    }

    getFilesFieldsFromFileClass(): void {
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.plugin.settings.classFilesPath
                || !f.path.includes(this.plugin.settings.classFilesPath)
            )
            .forEach(f => {
                const fileFileClassesNames = [];
                const fileClassesCache = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.[this.plugin.settings.fileClassAlias]
                if (fileClassesCache) {
                    Array.isArray(fileClassesCache) ? fileFileClassesNames.push(...fileClassesCache) : fileFileClassesNames.push(...fileClassesCache.split(','))
                    fileFileClassesNames.forEach(fileFileClassName => {
                        const fileClass = this.fileClassesName.get(fileFileClassName)
                        if (fileClass) {
                            this.filesFileClasses.set(f.path, [...(this.filesFileClasses.get(f.path) || []), fileClass])
                            this.filesFileClassesNames.set(f.path, [...(this.filesFileClassesNames.get(f.path) || []), fileClass.name])
                            const fileClassesFieldsFromFile = this.fileClassesFields.get(fileFileClassName)
                            const currentFields = this.filesFieldsFromInnerFileClasses.get(f.path)
                            if (fileClassesFieldsFromFile) {
                                const newFields = [...fileClassesFieldsFromFile]
                                const filteredCurrentFields = currentFields?.filter(field => !newFields.map(f => f.name).includes(field.name)) || []
                                newFields.push(...filteredCurrentFields)
                                this.filesFieldsFromInnerFileClasses.set(f.path, newFields)
                            } else { this.filesFieldsFromInnerFileClasses.set(f.path, []); }
                        } else { this.filesFieldsFromInnerFileClasses.set(f.path, []); }
                    })
                } else { this.filesFieldsFromInnerFileClasses.set(f.path, []); }
            })
    }

    getFilesFields(): void {
        /*
        Priority order:
        1. Inner fileClass
        2. fileClassQuery match
        3. Tag match
        4. Global fileClass
        5. settings preset fields
        */
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !this.plugin.settings.classFilesPath || !f.path.includes(this.plugin.settings.classFilesPath))
            .forEach(f => {
                const fileFieldsFromInnerFileClasses = this.filesFieldsFromInnerFileClasses.get(f.path)
                if (fileFieldsFromInnerFileClasses?.length) {
                    this.filesFields.set(f.path, fileFieldsFromInnerFileClasses);
                } else {
                    const fileFieldsFromQuery = this.filesFieldsFromFileClassQueries.get(f.path);
                    if (fileFieldsFromQuery) {
                        this.filesFields.set(f.path, fileFieldsFromQuery)
                    } else {
                        const fileFieldsFromTag = this.filesFieldsFromTags.get(f.path);
                        if (fileFieldsFromTag) {
                            this.filesFields.set(f.path, fileFieldsFromTag)
                        } else if (this.fieldsFromGlobalFileClass.length) {
                            this.filesFields.set(f.path, this.fieldsFromGlobalFileClass)
                            this.filesFileClasses.set(f.path, [this.fileClassesName.get(this.plugin.settings.globalFileClass!)!])
                            this.filesFileClassesNames.set(f.path, [this.plugin.settings.globalFileClass!])
                        } else {
                            this.filesFields.set(f.path, this.plugin.settings.presetFields)
                        }
                    }
                }
            })
    }
}