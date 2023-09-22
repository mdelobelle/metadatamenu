import MetadataMenu from "main";
import { TFile } from "obsidian";
import { genuineKeys } from "src/utils/dataviewUtils";
import { getFileFromFileOrPath } from "src/utils/fileUtils";
import { FieldsPayload, postValues } from "./postValues";

export async function insertMissingFields(
    plugin: MetadataMenu,
    fileOrFilePath: string | TFile,
    lineNumber: number,
    after: boolean = false,
    asList: boolean = false,
    asComment: boolean = false,
    fileClassName?: string
): Promise<void> {
    const file = getFileFromFileOrPath(plugin, fileOrFilePath)
    const dvApi = plugin.app.plugins.plugins.dataview?.api
    if (dvApi) {
        const f = plugin.fieldIndex;
        const tm = plugin.fileTaskManager;
        const fields = f.filesFields.get(file.path)
        const currentFieldsNames = genuineKeys(plugin, dvApi.page(file.path))
        const filteredClassFields = fileClassName ? plugin.fieldIndex.fileClassesFields.get(fileClassName)?.filter(field => field.fileClassName === fileClassName) || undefined : undefined
        const fieldsToInsert: FieldsPayload = []
        fields?.filter(field => !currentFieldsNames.includes(field.name))
            .filter(field => filteredClassFields ? filteredClassFields.map(f => f.name).includes(field.name) : true)
            .forEach(async field => {
                fieldsToInsert.push({ name: field.name, payload: { value: "" } })
            })
        if (fieldsToInsert.length) await postValues(plugin, fieldsToInsert, file, lineNumber, after, asList, asComment);
    }
}