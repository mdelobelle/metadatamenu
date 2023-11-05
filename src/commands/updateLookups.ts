import MetadataMenu from "main";
import { Notice, TFile } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import * as Lookup from "src/types/lookupTypes";
import { FieldsPayload, postValues } from "./postValues";
import { ExistingField } from "src/fields/ExistingField";

export function arraysAsStringAreEqual(a: string, b: string) {
    const aAsArray = typeof a === "string" ? a.split(",").map(v => v.trim()) : []
    const bAsArray = typeof b === "string" ? b.split(",").map(v => v.trim()) : []
    return aAsArray.every(item => bAsArray.includes(item)) && bAsArray.every(item => aAsArray.includes(item))
}

function renderValue(field: Field, pages: any, plugin: MetadataMenu, tFile: TFile, renderingErrors: string[]): string {
    let newValue = ""
    switch (field.options.outputType) {
        case Lookup.Type.LinksList:
        case Lookup.Type.LinksBulletList:
            {
                const newValuesArray = pages?.map((dvFile: any) => {
                    return FieldManager.buildMarkDownLink(plugin, tFile, dvFile.file.path);
                });
                newValue = (newValuesArray || []).join(", ");
            }
            break
        case Lookup.Type.CustomList:
        case Lookup.Type.CustomBulletList:
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
    return newValue
}

export async function updateLookups(
    plugin: MetadataMenu,
    forceUpdateOne?: { file: TFile, fieldName: string },
    forceUpdateAll: boolean = false
): Promise<void> {
    const start = Date.now()
    const f = plugin.fieldIndex;
    const renderingErrors: string[] = []
    const payloads: Record<string, FieldsPayload> = {}
    const updatedFields: string[] = []
    await Promise.all([...f.fileLookupFiles.keys()].map(async lookupFileId => {
        const matchRegex = /(?<filePath>.*)__related__(?<fileClassName>.*)___(?<fieldName>.*)/
        const { filePath, fieldName } = lookupFileId.match(matchRegex)?.groups || {}
        const tFile = plugin.app.vault.getAbstractFileByPath(filePath) as TFile
        if (!tFile) return
        payloads[filePath] = payloads[filePath] || []
        let newValue = "";
        const pages = f.fileLookupFiles.get(lookupFileId)
        const field = f.filesFields.get(filePath)?.find(field => field.name == fieldName)
        if (field) {
            const outputType = field.options.outputType
            if (!f.fileLookupFieldLastOutputType.get(lookupFileId)) f.fileLookupFieldLastOutputType.set(lookupFileId, outputType)
            newValue = renderValue(field, pages, plugin, tFile, renderingErrors)
            //check if value has changed in order not to create an infinite loop
            const currentValue = (await ExistingField.getExistingFieldFromIndexForIndexedPath(plugin, tFile, field.id))?.value
            const shouldCheckForUpdate =
                field.options.autoUpdate ||
                field.options.autoUpdate === undefined ||
                forceUpdateAll ||//field is autoUpdated OR
                ( //field is not autoupdated and we have to check for request to update this one
                    forceUpdateOne?.file.path === tFile.path &&
                    forceUpdateOne?.fieldName === field.name
                )
            const valueHasChanged = (!currentValue && newValue !== "") || !arraysAsStringAreEqual(currentValue || "", newValue)
            const formatHasChanged = outputType !== f.fileLookupFieldLastOutputType.get(lookupFileId)
            if (shouldCheckForUpdate) {
                f.fileLookupFieldLastValue.set(lookupFileId, newValue);
                f.fileLookupFieldLastOutputType.set(lookupFileId, outputType);
            }// make sure that this is set at first indexing}
            if (shouldCheckForUpdate && (valueHasChanged || formatHasChanged)) {
                const previousValuesCount = plugin.fieldIndex.previousFileLookupFilesValues.get(lookupFileId) || 0
                payloads[filePath].push({ id: field.id, payload: { value: newValue, previousItemsCount: previousValuesCount } })
                updatedFields.push(`${filePath}__${fieldName}`)
            }
            if (!valueHasChanged && !formatHasChanged) {
                f.fileLookupFieldsStatus.set(`${filePath}__${fieldName}`, Lookup.Status.upToDate)
            }
        }

    }))
    Object.entries(payloads).forEach(async ([filePath, fieldsPayload]) => {
        f.pushPayloadToUpdate(filePath, fieldsPayload)
    })
    updatedFields.forEach(field => f.fileLookupFieldsStatus.set(field, Lookup.Status.upToDate))
    if (renderingErrors.length) new Notice(`Those fields have incorrect output rendering functions:\n${renderingErrors.join(",\n")}`)
}
