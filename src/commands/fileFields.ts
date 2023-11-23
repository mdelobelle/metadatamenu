import MetadataMenu from "main";
import { TFile } from "obsidian"
import { ExistingField } from "src/fields/ExistingField";
import { FieldManager, FieldType } from "src/types/fieldTypes";


export interface IFieldInfo {
    id: string,
    name: string,
    type: FieldType
    value: string;
    indexedPath: string | undefined
    sourceType: "fileClass" | "settings"
    fileClassName: string | undefined;
    isValid: boolean;
    options: Record<string, any>
    ignoredInMenu: boolean;
}

export class FieldInfo {

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public eF: ExistingField
    ) {
    }

    public getInfos(): IFieldInfo {
        const field = this.eF.field
        const fieldManager = new FieldManager[field.type](this.plugin, field);
        return {
            ignoredInMenu: this.plugin.settings.globallyIgnoredFields.includes(this.eF.field.name),
            isValid: fieldManager.validateValue(this.eF.value),
            fileClassName: this.eF.field.fileClassName,
            type: this.eF.field.type,
            options: this.eF.field.options,
            sourceType: this.eF.field.fileClassName ? "fileClass" : "settings",
            indexedPath: this.eF.indexedPath,
            id: this.eF.field.id,
            name: this.eF.field.name,
            value: this.eF.value
        }
    }
}

export async function fileFields(plugin: MetadataMenu, fileOrfilePath: TFile | string): Promise<Record<string, IFieldInfo>> {
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
    const eFs = await ExistingField.getExistingFieldsFromIndexForFilePath(plugin, file)
    const fields: Record<string, IFieldInfo> = {}
    for (const eF of eFs) {
        if (eF.indexedPath) fields[eF.indexedPath] = (new FieldInfo(plugin, file, eF)).getInfos()
    }
    return fields;
}