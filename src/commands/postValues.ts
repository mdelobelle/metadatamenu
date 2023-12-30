import MetadataMenu from "main";
import { TFile } from "obsidian";
import { Note } from "src/note/note";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { getFileFromFileOrPath } from "src/utils/fileUtils";


export type FieldPayload = {
    value: string,
    addToCurrentValues?: boolean,
    style?: Record<keyof typeof FieldStyleLabel, boolean>
}

export type FieldsPayload = Array<{
    indexedPath: string, //is the indexedPath of the field in the note, not the fieldId per say
    payload: FieldPayload
}>

//create or update values starting at line or in frontmatter if no line
export async function postValues(
    plugin: MetadataMenu,
    payload: FieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    asList: boolean = false,
    asBlockquote: boolean = false
): Promise<void> {
    const file = getFileFromFileOrPath(plugin, fileOrFilePath);
    const note = await Note.buildNote(plugin, file)
    await note.createOrUpdateFields(payload, lineNumber, asList, asBlockquote)
}
