import MetadataMenu from "main";
import { genuineKeys } from "src/utils/dataviewUtils";
import { insertValues } from "./insertValues";

export async function insertMissingFields(
    plugin: MetadataMenu,
    dvFile: any,
    lineNumber: number,
    inFrontmatter: boolean,
    after: boolean,
    asList: boolean,
    asComment: boolean,
    fileClassName?: string
): Promise<void> {
    const f = plugin.fieldIndex;
    const tm = plugin.fileTaskManager;
    const fields = f.filesFields.get(dvFile.file.path)
    const currentFieldsNames = genuineKeys(dvFile)
    const filteredClassFields = fileClassName ? plugin.fieldIndex.fileClassesFields.get(fileClassName)?.filter(field => field.fileClassName === fileClassName) || undefined : undefined
    fields?.filter(field => !currentFieldsNames.includes(field.name))
        .filter(field => filteredClassFields ? filteredClassFields.map(f => f.name).includes(field.name) : true)
        .forEach(async field => {
            await tm.pushTask(() => { insertValues(plugin, dvFile.file.path, field.name, "", lineNumber, inFrontmatter, after, asList, asComment) })
        })
}