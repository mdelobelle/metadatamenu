import MetadataMenu from "main";
import { Notice, TFile } from "obsidian";
import { FieldManager } from "src/fields/FieldManager";
import * as Lookup from "src/types/lookupTypes";
import { replaceValues } from "./replaceValues";

export async function updateLookups(
    plugin: MetadataMenu,
    force_update_all: boolean = false,
    source: string = "",
    forceUpdateOne?: { file: TFile, fieldName: string }
): Promise<void> {
    const start = Date.now()
    //console.log("start update lookups [", source, "]", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision)
    const f = plugin.fieldIndex;
    let renderingErrors: string[] = []
    for (let id of f.fileLookupFiles.keys()) {
        const matchRegex = /(?<filePath>.*)__related__(?<fileClassName>.*)___(?<fieldName>.*)/
        const { filePath, fileClassName, fieldName } = id.match(matchRegex)?.groups || {}
        const tFile = plugin.app.vault.getAbstractFileByPath(filePath) as TFile
        if (tFile) {
            let newValue = "";
            const pages = f.fileLookupFiles.get(id)
            const field = f.filesFields.get(filePath)?.find(field => field.name == fieldName)

            if (field) {
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
                //check if value has changed in order not to create an infinite loop
                const currentValue = f.fileLookupFieldLastValue.get(id)
                const shouldCheckForUpdate =
                    field.options.autoUpdate ||
                    field.options.autoUpdate === undefined || //field is autoUpdated OR
                    ( //field is not autoupdated and we have to check for request to update this one
                        forceUpdateOne?.file.path === tFile.path &&
                        forceUpdateOne?.fieldName === field.name
                    )
                const valueHasChanged = (!currentValue && newValue !== "") || currentValue !== newValue
                if (force_update_all || (shouldCheckForUpdate && valueHasChanged)) {
                    const previousValuesCount = plugin.fieldIndex.previousFileLookupFilesValues.get(tFile.path + "__related__" + fileClassName + "___" + fieldName) || 0
                    if (f.firstIndexingDone) await plugin.fileTaskManager.pushTask(() => replaceValues(plugin, tFile, fieldName, newValue, previousValuesCount));
                    f.fileLookupFieldLastValue.set(id, newValue);
                    f.fileLookupFieldsStatus.set(`${filePath}__${fieldName}`, Lookup.Status.upToDate)
                } else if (source !== "full Index") { // this case is for fileClass changes, no need for rewrite other lookups after cache update
                    plugin.fieldIndex.fileChanged = false
                }
                if (!valueHasChanged) {
                    f.fileLookupFieldsStatus.set(`${filePath}__${fieldName}`, Lookup.Status.upToDate)
                }
            }
        }
    }
    if (renderingErrors.length) new Notice(`Those fields have incorrect output rendering functions:\n${renderingErrors.join(",\n")}`)
    //console.log("finished update lookups [", source, "]", plugin.fieldIndex.lastRevision, "->", plugin.fieldIndex.dv?.api.index.revision, `${(Date.now() - start)}ms`)
}