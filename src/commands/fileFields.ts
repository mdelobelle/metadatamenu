import { cp } from "fs";
import MetadataMenu from "main";
import { TFile } from "obsidian"
import { createFileClass, FileClass } from "src/fileClass/fileClass";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { genericFieldRegex } from "src/utils/parser";
import { getField } from "./getField";

export class FieldInfo {
    type?: FieldType = undefined;
    sourceType?: "fileClass" | "settings" = undefined;
    fileClass?: string = undefined;
    options?: Record<string, string> | string[] = undefined;
    isValid?: boolean = undefined;
    ignoreInMenu: boolean
    value: string = "";
    valuesListNotePath?: string = undefined;

    async setInfos(plugin: MetadataMenu, fieldName: string, value: string, fileClass?: FileClass): Promise<void> {
        this.value = value;
        this.ignoreInMenu = plugin.settings.globallyIgnoredFields.includes(fieldName);
        if (fileClass) {
            const fileClassFields = fileClass.attributes.map(attr => attr.name);
            if (fileClassFields.includes(fieldName)) {
                const field = getField(plugin, fieldName, fileClass);
                if (field) {
                    const fieldManager = new FieldManager[field.type](field);
                    this.isValid = await fieldManager.validateValue(value)
                    this.sourceType = "fileClass";
                    const attribute = fileClass.attributes.filter(a => a.name === fieldName)[0];
                    this.fileClass = attribute.origin;
                    this.type = attribute.type;
                    this.options = attribute.options;
                }
            }
        } else if (plugin.settings.presetFields.map(f => f.name).includes(fieldName)) {
            const field = getField(plugin, fieldName);
            if (field) {
                const fieldManager = new FieldManager[field.type](field);
                this.isValid = await fieldManager.validateValue(value)
                this.type = field.type;
                this.options = field.options;
                this.valuesListNotePath = field.valuesListNotePath;
                this.sourceType = "settings";
            }
        }
    }
}

export async function fileFields(plugin: MetadataMenu, fileOrfilePath: TFile | string): Promise<Record<string, FieldInfo>> {
    /*
    returns all fields with source, type, options, isValid, ignored
    */
    let file: TFile;
    if (fileOrfilePath instanceof TFile) {
        file = fileOrfilePath;
    } else {
        const _file = app.vault.getAbstractFileByPath(fileOrfilePath)
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
            fileClass = await createFileClass(plugin, plugin.settings.globalFileClass)
        } catch (error) {
            fileClass = undefined;
        }
    }
    if (frontmatter) {
        const { position, ...attributes } = frontmatter;
        // check if there's a fileClass
        const fileClassAlias = plugin.settings.fileClassAlias;
        if (Object.keys(attributes).includes(fileClassAlias)) {
            const fileClassName = attributes[fileClassAlias];
            try {
                fileClass = await createFileClass(plugin, fileClassName)
            } catch (error) {
                fileClass = undefined;
            }
        }
        // then explore frontmatter fields aka attributes
        Object.keys(attributes).forEach(async key => {
            const fieldInfo = new FieldInfo;
            fields[key] = fieldInfo;
            await fieldInfo.setInfos(plugin, key, attributes[key], fileClass);
        });
    }
    // let's explore the rest of the file: get inline fields
    const regex = new RegExp(`^${genericFieldRegex}::\s*(?<values>.+)?`, "u");
    const result: string = await plugin.app.vault.read(file)
    result.split('\n').map(async line => {
        const regexResult = line.match(regex);
        const { attribute: _attribute, values } = regexResult?.groups || {}
        if (_attribute) {
            const fieldName = _attribute.trim()
            const fieldInfo = new FieldInfo;
            fields[fieldName] = fieldInfo;
            await fieldInfo.setInfos(plugin, fieldName, values, fileClass);
        }
    });
    return fields;
}