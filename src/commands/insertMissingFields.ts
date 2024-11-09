import MetadataMenu from "main";
import { TFile } from "obsidian";
import { Note } from "src/note/note";
import { getFileFromFileOrPath } from "src/utils/fileUtils";
import { IndexedFieldsPayload, postValues, postValues_synced } from "./postValues";
import { getIdAndIndex } from "src/fields/Field";

export async function insertMissingFields(
    plugin: MetadataMenu,
    fileOrFilePath: string | TFile,
    lineNumber: number,
    asList: boolean = false,
    asBlockquote: boolean = false,
    fileClassName?: string,
    indexedPath?: string,
    waitForIndexing = false
): Promise<void> {
    /*
    Insert "root" fields that are not in the note.
    */
    const file = getFileFromFileOrPath(plugin, fileOrFilePath)
    const note = await Note.buildNote(plugin, file)

    const f = plugin.fieldIndex;
    const fields = f.filesFields.get(file.path)
    const filteredClassFields = fileClassName ? plugin.fieldIndex.fileClassesFields.get(fileClassName)?.filter(field => field.fileClassName === fileClassName) || undefined : undefined
    const fieldsToInsert: IndexedFieldsPayload = []
    if (!indexedPath) {
        fields?.filter(field => field.isRoot() && !note.existingFields.map(_f => _f.field.id).includes(field.id))
            .filter(field => filteredClassFields ? filteredClassFields.map(f => f.id).includes(field.id) : true)
            .reverse()
            .forEach(field => {
                fieldsToInsert.push({ indexedPath: field.id, payload: { value: "" } })
            })
    } else {
        const { id, index } = getIdAndIndex(indexedPath?.split("____").last())
        const existingFields = note.existingFields.filter(_f => {
            const upperIndexedIdsInPath = _f.indexedPath?.split("____")
            upperIndexedIdsInPath?.pop()
            return upperIndexedIdsInPath?.join("____") === indexedPath

        })
        const missingFields = note?.fields
            .filter(_f => _f.getFirstAncestor()?.id === id)
            .filter(_f => !existingFields.map(eF => eF.field.id).includes(_f.id)).reverse() || []
        //FIXME (P2) inserting is done in a  strange way when mixing frontmatter and inline insertion
        missingFields.forEach(field => {
            fieldsToInsert.push({ indexedPath: `${indexedPath}____${field.id}`, payload: { value: "" } })
        })
    }

    if (fieldsToInsert.length) {
        if (!waitForIndexing) {
            await postValues(plugin, fieldsToInsert, file, lineNumber, asList, asBlockquote);
        }
        else {
            await postValues_synced(plugin, fieldsToInsert, file, lineNumber, asList, asBlockquote);
        }
    }
}
