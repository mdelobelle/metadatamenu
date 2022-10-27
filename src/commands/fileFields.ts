import MetadataMenu from "main";
import { TFile } from "obsidian"
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { genuineKeys } from "src/utils/dataviewUtils";

export class FieldInfo {
    protected type?: FieldType = undefined;
    protected sourceType?: "fileClass" | "settings" = undefined;
    protected fileClass?: string = undefined;
    protected options?: Record<string, string> | string[] = undefined;
    protected isValid?: boolean = undefined;
    protected ignoreInMenu: boolean
    protected value: string = "";
    protected valuesListNotePath?: string = undefined;
    public unique: boolean = true

    public setInfos(
        plugin: MetadataMenu,
        file: TFile,
        fieldName: string,
        value: string,
        matchingFileClassQuery?: string | undefined
    ): void {
        this.value = value;
        this.ignoreInMenu = plugin.settings.globallyIgnoredFields.includes(fieldName);
        const field = plugin.fieldIndex.filesFields.get(file.path)?.find(field => field.name === fieldName)
        if (field) {
            const fieldManager = new FieldManager[field.type](plugin, field);
            this.isValid = fieldManager.validateValue(value)
            this.fileClass = field.fileClassName;
            this.type = field.type;
            this.options = field.options;
            this.sourceType = field.fileClassName ? "fileClass" : "settings"
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
    const fields: Record<string, FieldInfo> = {}
    const dvApi = plugin.app.plugins.plugins.dataview?.api
    //@ts-ignore
    if (dvApi) {
        const dvFile = dvApi.page(file.path)
        try {
            genuineKeys(dvFile).forEach(async key => {
                if (key !== "file") {
                    const fieldInfo = new FieldInfo;
                    fieldInfo.unique = !Object.keys(fields).includes(key);
                    fields[key] = fieldInfo;
                    fieldInfo.setInfos(plugin, file, key, dvFile[key]);
                }
            })
        } catch (error) {
            throw (error);
        }
    }

    return fields;
}