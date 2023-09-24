import MetadataMenu from "main";
import { TFile } from "obsidian";
import { Note } from "src/note/note";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { getFileFromFileOrPath } from "src/utils/fileUtils";


export type FieldPayload = {
    value: string,
    previousItemsCount?: number,
    addToCurrentValues?: boolean,
    style?: Record<keyof typeof FieldStyleLabel, boolean>
}

export type FieldsPayload = Array<{
    name: string,
    id?: string,
    payload: FieldPayload
}>

//create or update values starting at line or in frontmatter if no line
export async function postValues(
    plugin: MetadataMenu,
    payload: FieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    after: boolean = true,
    asList: boolean = false,
    asComment: boolean = false
): Promise<void> {
    const file = getFileFromFileOrPath(plugin, fileOrFilePath);
    const note = new Note(plugin, file)
    await note.buildLines()
    note.createOrUpdateFields(payload, lineNumber)

}