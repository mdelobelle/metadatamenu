import { Component, Notice, TFile } from "obsidian"
import MetadataMenu from "main"
import Field from "./Field";
import { FileClass } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import FieldSetting from "src/settings/FieldSetting";
import { FieldType } from "src/types/fieldTypes";
import { replaceValues } from "src/commands/replaceValues";
import { FieldManager } from "./FieldManager";
import * as Lookup from "../types/lookupTypes"

export default class FieldIndex extends Component {

    public fileClassesFields: Map<string, Field[]>;
    public fieldsFromGlobalFileClass: Field[];
    public filesFieldsFromFileClassQueries: Map<string, Field[]>;
    public filesFieldsFromInnerFileClasses: Map<string, Field[]>;
    public filesFields: Map<string, Field[]>;
    public filesFileClass: Map<string, FileClass>
    public fileClassesPath: Map<string, FileClass>
    public fileClassesName: Map<string, FileClass>
    public valuesListNotePathValues: Map<string, string[]>
    public filesFileClassName: Map<string, string | undefined>
    public fileLookupFiles: Map<string, any[]>
    public fileLookupFieldLastValue: Map<string, string>
    public fileLookupParents: Map<string, string[]>
    public dv: any
    public lastRevision: 0

    constructor(private plugin: MetadataMenu, public cacheVersion: string, public onChange: () => void) {
        super()
        this.fileClassesFields = new Map();
        this.fieldsFromGlobalFileClass = [];
        this.filesFieldsFromFileClassQueries = new Map();
        this.filesFieldsFromInnerFileClasses = new Map();
        this.filesFields = new Map();
        this.filesFileClass = new Map();
        this.fileClassesPath = new Map();
        this.fileClassesName = new Map();
        this.filesFileClassName = new Map();
        this.valuesListNotePathValues = new Map();
        this.fileLookupFiles = new Map();
        this.fileLookupParents = new Map();
        this.fileLookupFieldLastValue = new Map();
        this.dv = this.plugin.app.plugins.plugins.dataview
    }

    async onload(): Promise<void> {

        if (this.dv?.api.index.initialized) {
            this.dv = this.plugin.app.plugins.plugins.dataview
            this.lastRevision = this.dv.api.index.revision
            await this.fullIndex("dv init");
        }

        this.plugin.registerEvent(
            this.plugin.app.metadataCache.on("dataview:index-ready", async () => {
                this.dv = this.plugin.app.plugins.plugins.dataview
                await this.fullIndex("dv index", true);
                this.lastRevision = this.dv.api.index.revision
            })
        )

        this.plugin.registerEvent(
            this.plugin.app.metadataCache.on('resolved', async () => {
                if (this.plugin.app.metadataCache.inProgressTaskCount === 0) {
                    await this.fullIndex("cache resolved");
                    this.lastRevision = this.dv?.api.index.revision || 0
                }
            })
        )

        this.plugin.registerEvent(
            this.plugin.app.metadataCache.on('dataview:metadata-change', async (op: any, file: TFile) => {
                if (op === "update" && this.dv.api.index.revision !== this.lastRevision) {
                    if (file.path.includes(this.plugin.settings.classFilesPath)) {
                        this.fullIndex("fileClass changed")
                    } else {
                        this.resolveLookups();
                        await this.updateLookups();
                    }
                    this.lastRevision = this.dv.api.index.revision
                }
            })
        )

    }

    async fullIndex(event: string, force_update_lookups = false): Promise<void> {
        //console.log("start full index", event, this.lastRevision, "->", this.dv?.api.index.revision)
        const start = Date.now()
        this.getGlobalFileClass();
        this.getFileClasses();
        this.resolveFileClassQueries();
        this.getFilesFieldsFromFileClass();
        this.getFilesFields();
        await this.getValuesListNotePathValues();
        this.resolveLookups();
        await this.updateLookups(force_update_lookups);
        //console.log("full index", event, this.lastRevision, "->", this.dv?.api.index.revision, `${(Date.now() - start)}ms`)
    }

    resolveLookups(): void {
        Array.from(this.filesFields).filter((value: [string, Field[]]) => {
            const [filePath, fields] = value;
            const dvPage = this.dv.api.page(filePath);
            if (dvPage) {
                fields.filter(field => field.type === FieldType.Lookup && Object.keys(dvPage).includes(field.name)).forEach(lookupField => {

                    const queryRelatedDVFiles = (new Function("dv", `return ${lookupField.options.dvQueryString}`))(this.dv.api).values as Array<any>
                    const fileRelatedDVFiles = queryRelatedDVFiles.filter(f => f[lookupField.options.targetFieldName]?.path === filePath)
                    this.fileLookupFiles.set(`${filePath}__related__${lookupField.name}`, fileRelatedDVFiles)
                    fileRelatedDVFiles.forEach(dvFile => {
                        const parents = this.fileLookupParents.get(dvFile.file.path) || []
                        if (!parents.includes(filePath)) parents.push(filePath)
                        this.fileLookupParents.set(dvFile.file.path, parents)
                    })
                })
            }
        })
        for (let id of this.fileLookupFiles.keys()) {
            const [filePath, fieldName] = id.split("__related__")
            const dvPage = this.dv.api.page(filePath);
            if (dvPage === undefined) {
                for (const file in this.fileLookupParents.keys()) {
                    const newParents = this.fileLookupParents.get(file)?.remove(filePath) || []
                    this.fileLookupParents.set(file, newParents);
                }
                this.fileLookupFiles.delete(id);
                this.fileLookupFieldLastValue.delete(id);
            } else if (dvPage[fieldName] === undefined) {
                this.fileLookupFiles.delete(id);
                this.fileLookupFieldLastValue.delete(id);
            }
        }
    }

    async updateLookups(force_update: boolean = false): Promise<void> {
        //console.log("start update lookups", this.lastRevision, "->", this.dv?.api.index.revision)
        let renderingErrors: string[] = []
        for (let id of this.fileLookupFiles.keys()) {
            const [filePath, fieldName] = id.split("__related__")
            const tFile = this.plugin.app.vault.getAbstractFileByPath(filePath) as TFile
            if (tFile) {
                let newValue = "";
                const pages = this.fileLookupFiles.get(id)
                const field = this.filesFields.get(filePath)?.find(field => field.name == fieldName)
                switch (field?.options.outputType) {
                    case Lookup.Type.LinksList:
                        {
                            const newValuesArray = pages?.map((dvFile: any) => {
                                return FieldManager.buildMarkDownLink(this.plugin, tFile, dvFile.file.path);
                            });
                            newValue = (newValuesArray || []).join(", ");
                        }
                        break
                    case Lookup.Type.CustomList:
                        {
                            const renderingFunction = new Function("page", `return ${field.options.customListFunction}`)
                            const newValuesArray = pages?.map((dvFile: any) => {
                                try {
                                    return renderingFunction(dvFile)
                                } catch {
                                    if (!renderingErrors.includes(field.name)) renderingErrors.push(field.name)
                                    return ""
                                }
                            })
                            newValue = (newValuesArray || []).join(", ");
                        }
                        break
                    case Lookup.Type.CustomSummarizing:
                        {
                            const customSummarizingFunction = field.options.customSummarizingFunction

                            const summarizingFunction = new Function("pages",
                                customSummarizingFunction
                                    .replace(/\{\{summarizedFieldName\}\}/g, field.options.summarizedFieldName))
                            try {
                                newValue = summarizingFunction(pages).toString();
                            } catch {
                                if (!renderingErrors.includes(field.name)) renderingErrors.push(field.name)
                                newValue = ""
                            }
                        }
                        break
                    case Lookup.Type.BuiltinSummarizing:
                        {
                            const builtinFunction = field.options.builtinSummarizingFunction as keyof typeof Lookup.BuiltinSummarizing
                            const summarizingFunction = new Function("pages",
                                Lookup.BuiltinSummarizingFunction[builtinFunction]
                                    .replace(/\{\{summarizedFieldName\}\}/g, field.options.summarizedFieldName))
                            try {
                                newValue = summarizingFunction(pages).toString();
                            } catch {
                                if (!renderingErrors.includes(field.name)) renderingErrors.push(field.name)
                                newValue = ""
                            }
                        }
                        break
                    default:
                        break
                }
                //check if value has changed in order not to create an infinite loop
                const currentValue = this.fileLookupFieldLastValue.get(id)
                if (force_update || (!currentValue && newValue !== "") || currentValue !== newValue) {
                    await replaceValues(this.plugin, tFile, fieldName, newValue);
                    this.fileLookupFieldLastValue.set(id, newValue)
                }
            }
        }
        if (renderingErrors.length) new Notice(`Those fields have incorrect output rendering functions:\n${renderingErrors.join(",\n")}`)
        //console.log("finished update lookups", this.lastRevision, "->", this.dv?.api.index.revision)
    }

    async getValuesListNotePathValues(): Promise<void> {
        this.plugin.settings.presetFields.forEach(async setting => {
            if (setting.valuesListNotePath) {
                this.valuesListNotePathValues.set(setting.valuesListNotePath, await FieldSetting.getValuesListFromNote(this.plugin, setting.valuesListNotePath))
            }
        })
    }

    getGlobalFileClass(): void {
        const globalFileClass = this.plugin.settings.globalFileClass
        if (!globalFileClass) {
            this.fieldsFromGlobalFileClass = []
        } else {
            this.fieldsFromGlobalFileClass = FileClass.createFileClass(this.plugin, globalFileClass).attributes.map(attr => attr.getField())
        }
    }

    getFileClasses(): void {
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => f.path.includes(this.plugin.settings.classFilesPath))
            .forEach(f => {
                const fileClass = FileClass.createFileClass(this.plugin, f.basename)
                this.fileClassesFields.set(f.basename, fileClass.attributes.map(attr => attr.getField()))
                this.fileClassesPath.set(f.path, fileClass)
                this.fileClassesName.set(fileClass.name, fileClass)
            })
    }
    resolveFileClassQueries(): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        this.plugin.settings.fileClassQueries.forEach(sfcq => {
            const fcq = new FileClassQuery(sfcq.name, sfcq.id, sfcq.query, sfcq.fileClassName)
            fcq.getResults(dvApi).forEach((result: any) => {
                if (this.fileClassesName.get(fcq.fileClassName)) {
                    this.filesFileClass.set(result.file.path, this.fileClassesName.get(fcq.fileClassName)!);
                    this.filesFileClassName.set(result.file.path, fcq.fileClassName)
                }
                const fileFileClassesFieldsFromQuery = this.fileClassesFields.get(fcq.fileClassName)
                if (fileFileClassesFieldsFromQuery) this.filesFieldsFromFileClassQueries.set(result.file.path, fileFileClassesFieldsFromQuery)
            })
        })
    }

    getFilesFieldsFromFileClass(): void {
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !f.path.includes(this.plugin.settings.classFilesPath))
            .forEach(f => {
                const fileFileClassName = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter?.[this.plugin.settings.fileClassAlias]
                if (fileFileClassName) {
                    if (this.fileClassesName.get(fileFileClassName)) {
                        this.filesFileClass.set(f.path, this.fileClassesName.get(fileFileClassName)!);
                        this.filesFileClassName.set(f.path, fileFileClassName)
                    }
                    const fileClassesFieldsFromFile = this.fileClassesFields.get(fileFileClassName)
                    if (fileClassesFieldsFromFile) {
                        this.filesFieldsFromInnerFileClasses.set(f.path, fileClassesFieldsFromFile);
                        return
                    }
                    this.filesFieldsFromInnerFileClasses.set(f.path, []);
                    return
                }
                this.filesFieldsFromInnerFileClasses.set(f.path, []);
            })
    }

    getFilesFields(): void {
        this.plugin.app.vault.getMarkdownFiles()
            .filter(f => !f.path.includes(this.plugin.settings.classFilesPath))
            .forEach(f => {
                const fileFieldsFromInnerFileClasses = this.filesFieldsFromInnerFileClasses.get(f.path)
                if (fileFieldsFromInnerFileClasses?.length) {
                    this.filesFields.set(f.path, fileFieldsFromInnerFileClasses);
                    return
                } else {
                    const fileClassFromQuery = this.filesFieldsFromFileClassQueries.get(f.path);
                    if (fileClassFromQuery) {
                        this.filesFields.set(f.path, fileClassFromQuery)
                    } else if (this.fieldsFromGlobalFileClass.length) {
                        this.filesFields.set(f.path, this.fieldsFromGlobalFileClass)
                        this.filesFileClassName.set(f.path, this.plugin.settings.globalFileClass)
                    } else {
                        this.filesFields.set(f.path, this.plugin.settings.presetFields)
                        this.filesFileClassName.set(f.path, undefined)
                    }
                }
            })
    }
}