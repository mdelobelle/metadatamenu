import MetadataMenu from "main";
import { TFile } from "obsidian";
import Field from "src/fields/_Field";
import { Note } from "src/note/note";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { getFileFromFileOrPath } from "src/utils/fileUtils";


export type FieldPayload = {
    value: string,
    addToCurrentValues?: boolean,
    style?: Record<keyof typeof FieldStyleLabel, boolean>
}

export type IndexedFieldsPayload = Array<{
    indexedPath: string, //is the indexedPath of the field in the note, not the fieldId per say
    payload: FieldPayload
}>

//create or update values starting at line or in frontmatter if no line
export async function postValues(
    plugin: MetadataMenu,
    payload: IndexedFieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    asList: boolean = false,
    asBlockquote: boolean = false
): Promise<void> {
    if (payload.some(_p => !_p.indexedPath)) {
        console.error("One payload's field is missing an indexed path")
        return
    }
    const file = getFileFromFileOrPath(plugin, fileOrFilePath);
    const note = await Note.buildNote(plugin, file)
    await note.createOrUpdateFields(payload, lineNumber, asList, asBlockquote)
    const changes = []
    for (const item of payload) {
        const { id, index } = Field.getIdAndIndex(item.indexedPath.split("____").last())
        const field = plugin.fieldIndex.filesFields.get(file.path)?.find(f => f.id === id)
        const fieldName = field?.name
        const value = item.payload.value
        changes.push({
            indexedPath: item.indexedPath,
            fieldName: fieldName,
            index: index,
            value: value
        })
    }
    plugin.app.metadataCache.trigger("metadata-menu:fields-changed", { file: file, changes: changes })
}
