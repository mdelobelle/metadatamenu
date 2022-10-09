import MetadataMenu from "main";
import { TFile } from "obsidian"
import { FileClass } from "src/fileClass/fileClass";
import FileClassQuery from "src/fileClass/FileClassQuery";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { genuineKeys } from "src/utils/dataviewUtils";
import { getField } from "./getField";

export class FieldInfo {
    protected type?: FieldType = undefined;
    protected sourceType?: "fileClass" | "settings" = undefined;
    protected fileClass?: string = undefined;
    protected fileClassQuery?: string = undefined;
    protected options?: Record<string, string> | string[] = undefined;
    protected isValid?: boolean = undefined;
    protected ignoreInMenu: boolean
    protected value: string = "";
    protected valuesListNotePath?: string = undefined;
    public unique: boolean = true

    public setInfos(
        plugin: MetadataMenu,
        fieldName: string,
        value: string,
        fileClass?: FileClass,
        matchingFileClassQuery?: string | undefined
    ): void {
        this.value = value;
        this.ignoreInMenu = plugin.settings.globallyIgnoredFields.includes(fieldName);
        if (fileClass) {
            const fileClassFields = fileClass.attributes.map(attr => attr.name);
            if (fileClassFields.includes(fieldName)) {
                const field = getField(plugin, fieldName, fileClass);
                if (field) {
                    const fieldManager = new FieldManager[field.type](plugin, field);
                    this.isValid = fieldManager.validateValue(value)
                    const attribute = fileClass.attributes.filter(a => a.name === fieldName)[0];
                    this.fileClass = attribute.origin;
                    this.fileClassQuery = matchingFileClassQuery;
                    this.type = attribute.type;
                    this.options = attribute.options;
                }
            }
        } else if (plugin.settings.presetFields.map(f => f.name).includes(fieldName)) {
            const field = getField(plugin, fieldName);
            if (field) {
                const fieldManager = new FieldManager[field.type](plugin, field);
                this.isValid = fieldManager.validateValue(value)
                this.type = field.type;
                this.options = field.options;
                this.sourceType = "settings";
            }
        }
    }
}

export function fileFields(plugin: MetadataMenu, fileOrfilePath: TFile | string): Record<string, FieldInfo> {
    /*
    returns all fields with source, type, options, isValid, ignored
    */
    let file: TFile;
    if (fileOrfilePath instanceof TFile) {
        file = fileOrfilePath;
    } else {
        const _file = plugin.app.vault.getAbstractFileByPath(fileOrfilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const frontmatter = plugin.app.metadataCache.getCache(file.path)?.frontmatter;
    const fields: Record<string, FieldInfo> = {}
    let fileClass: FileClass | undefined;
    if (plugin.settings.globalFileClass) {
        try {
            fileClass = FileClass.createFileClass(plugin, plugin.settings.globalFileClass)
        } catch (error) {
            fileClass = undefined;
        }
    }
    const fileClassQueries = plugin.settings.fileClassQueries;
    let matchingFileClassQuery: string | undefined = undefined;
    if (fileClassQueries.length > 0) {
        while (!matchingFileClassQuery && fileClassQueries.length > 0) {
            const fileClassQuery = new FileClassQuery();
            Object.assign(fileClassQuery, fileClassQueries.pop() as FileClassQuery)
            if (fileClassQuery.matchFile(file)) {
                try {
                    fileClass = FileClass.createFileClass(plugin, fileClassQuery.fileClassName);
                    matchingFileClassQuery = fileClassQuery.name;
                } catch (error) {
                    matchingFileClassQuery = undefined;
                }
            }
        }
    }
    if (frontmatter) {
        const { position, ...attributes } = frontmatter;
        // check if there's a fileClass
        const fileClassAlias = plugin.settings.fileClassAlias;
        if (Object.keys(attributes).includes(fileClassAlias)) {
            const fileClassName = attributes[fileClassAlias];
            try {
                fileClass = FileClass.createFileClass(plugin, fileClassName);
                matchingFileClassQuery = undefined;
            } catch (error) {
                fileClass = undefined;
            }
        }
        // then explore frontmatter fields aka attributes
        Object.keys(attributes).forEach(async key => {
            const fieldInfo = new FieldInfo;
            fieldInfo.unique = !Object.keys(fields).includes(key);
            fields[key] = fieldInfo;
            await fieldInfo.setInfos(plugin, key, attributes[key], fileClass);
        });
    }
    // let's explore the rest of the file: get inline fields

    const dataview = plugin.app.plugins.plugins.dataview
    //@ts-ignore
    if (dataview) {
        const dvFile = dataview.api.page(file.path)
        try {
            genuineKeys(dvFile).forEach(async key => {
                if (key !== "file") {
                    const fieldInfo = new FieldInfo;
                    fieldInfo.unique = !Object.keys(fields).includes(key);
                    fields[key] = fieldInfo;
                    await fieldInfo.setInfos(plugin, key, dvFile[key], fileClass, matchingFileClassQuery);
                }
            })
        } catch (error) {
            throw (error);
        }
    }

    return fields;
}