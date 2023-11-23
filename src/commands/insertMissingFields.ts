import MetadataMenu from "main";
import { TFile } from "obsidian";
import Field from "src/fields/Field";
import ObjectListField from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import { frontmatterOnlyTypes } from "src/types/fieldTypes";
import { getFileFromFileOrPath } from "src/utils/fileUtils";
import { FieldsPayload, postValues } from "./postValues";

export async function insertMissingFields(
    plugin: MetadataMenu,
    fileOrFilePath: string | TFile,
    lineNumber: number,
    asList: boolean = false,
    asBlockquote: boolean = false,
    fileClassName?: string,
    indexedPath?: string
): Promise<void> {
    /*
    Insert "root" fields that are notre in the note.
    */
    const file = getFileFromFileOrPath(plugin, fileOrFilePath)
    const note = await Note.buildNote(plugin, file)

    const f = plugin.fieldIndex;
    const fields = f.filesFields.get(file.path)
    const filteredClassFields = fileClassName ? plugin.fieldIndex.fileClassesFields.get(fileClassName)?.filter(field => field.fileClassName === fileClassName) || undefined : undefined
    const fieldsToInsert: FieldsPayload = []
    if (!indexedPath) {
        fields?.filter(field => field.isRoot() && !note.existingFields.map(_f => _f.field.id).includes(field.id))
            .filter(field => filteredClassFields ? filteredClassFields.map(f => f.id).includes(field.id) : true)
            .forEach(field => {
                fieldsToInsert.push({ id: field.id, payload: { value: "" } })
            })
    } else {
        const { id, index } = Field.getIdAndIndex(indexedPath?.split("____").last())
        const existingFields = note.existingFields.filter(_f => {
            const upperIndexedIdsInPath = _f.indexedPath?.split("____")
            upperIndexedIdsInPath?.pop()
            return upperIndexedIdsInPath?.join("____") === indexedPath

        })
        const missingFields = note?.fields
            .filter(_f => _f.getFirstAncestor()?.id === id)
            .filter(_f => !existingFields.map(eF => eF.field.id).includes(_f.id)) || []
        //FIXME inserting is done in a  strange way when mixing frontmatter and inline insertion
        missingFields.forEach(field => {
            fieldsToInsert.push({ id: `${indexedPath}____${field.id}`, payload: { value: "" } })
        })
    }

    if (fieldsToInsert.length) await postValues(plugin, fieldsToInsert, file, lineNumber, asList, asBlockquote);
}