import MetadataMenu from "main";
import { TFile } from "obsidian";
import { genuineKeys } from "src/utils/dataviewUtils";
import { insertValues } from "./insertValues";

export async function insertMissingFields(
    plugin: MetadataMenu,
    fileOrFilePath: string | TFile,
    lineNumber: number,
    inFrontmatter: boolean = false,
    after: boolean = false,
    asList: boolean = false,
    asComment: boolean = false,
    fileClassName?: string
): Promise<void> {
    let file: TFile;
    if (fileOrFilePath instanceof TFile) {
        file = fileOrFilePath;
    } else {
        const _file = plugin.app.vault.getAbstractFileByPath(fileOrFilePath)
        if (_file instanceof TFile && _file.extension == "md") {
            file = _file;
        } else {
            throw Error("path doesn't correspond to a proper file");
        }
    }
    const dvApi = plugin.app.plugins.plugins.dataview?.api
    if (dvApi) {
        const f = plugin.fieldIndex;
        const tm = plugin.fileTaskManager;
        const fields = f.filesFields.get(file.path)
        const currentFieldsNames = genuineKeys(dvApi.page(file.path))
        const filteredClassFields = fileClassName ? plugin.fieldIndex.fileClassesFields.get(fileClassName)?.filter(field => field.fileClassName === fileClassName) || undefined : undefined
        fields?.filter(field => !currentFieldsNames.includes(field.name))
            .filter(field => filteredClassFields ? filteredClassFields.map(f => f.name).includes(field.name) : true)
            .forEach(async field => {
                await tm.pushTask(() => { insertValues(plugin, file.path, field.name, "", lineNumber, inFrontmatter, after, asList, asComment) })
            })
    }
}