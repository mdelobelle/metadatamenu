import MetadataMenu from "main";
import { TFile } from "obsidian";
import ObjectListField from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import { getFileFromFileOrPath } from "src/utils/fileUtils";
import { FieldsPayload, postValues } from "./postValues";

export async function insertMissingFields(
    plugin: MetadataMenu,
    fileOrFilePath: string | TFile,
    lineNumber: number,
    after: boolean = false,
    asList: boolean = false,
    asComment: boolean = false,
    fileClassName?: string,
    indexedPath?: string
): Promise<void> {
    /*
    Insert "root" fields that are notre in the note.
    TODO: insert missing fields of an objectFIeld
    */
    const file = getFileFromFileOrPath(plugin, fileOrFilePath)
    const note = new Note(plugin, file)
    await note.build()

    const f = plugin.fieldIndex;
    const fields = f.filesFields.get(file.path)
    const filteredClassFields = fileClassName ? plugin.fieldIndex.fileClassesFields.get(fileClassName)?.filter(field => field.fileClassName === fileClassName) || undefined : undefined
    const fieldsToInsert: FieldsPayload = []
    if (!indexedPath) {
        fields?.filter(field => field.isRoot() && !note.existingFields.map(_f => _f.field.id).includes(field.id))
            .filter(field => filteredClassFields ? filteredClassFields.map(f => f.id).includes(field.id) : true)
            .forEach(async field => {
                fieldsToInsert.push({ id: field.id, payload: { value: "" } })
            })
    } else {
        //exclude objectList, inserting fields for object list means nothing
        //TODO: insert fields that are children of this indexedPath but not present
        //case 1: object
        //case 2: objectListItem

    }

    if (fieldsToInsert.length) await postValues(plugin, fieldsToInsert, file, lineNumber, after, asList, asComment);
}