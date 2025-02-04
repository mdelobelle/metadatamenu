import MetadataMenu from "main";
import { TFile } from "obsidian";
import { getIdAndIndex } from "src/fields/Field";
import { Note } from "src/note/note";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { getFileFromFileOrPath } from "src/utils/fileUtils";
import { getValuesForIndexedPath } from "./getValues";
// @ts-ignore
import equal from "fast-deep-equal";


export type FieldPayload = {
    value: string,
    addToCurrentValues?: boolean,
    style?: Record<keyof typeof FieldStyleLabel, boolean>
}

export type IndexedFieldsPayload = Array<{
    // name(fileOrFilePath: string | TFile, name: any): unknown;
    indexedPath: string, //is the indexedPath of the field in the note, not the fieldId per say
    payload: FieldPayload
}>

//create or update values starting at line or in frontmatter if no line
export async function postValues(
    plugin: MetadataMenu,
    payload: IndexedFieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    asList = false,
    asBlockquote = false
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
        const { id, index } = getIdAndIndex(item.indexedPath.split("____").last())
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

export async function postValues_synced(plugin: MetadataMenu,
    payload: IndexedFieldsPayload,
    fileOrFilePath: TFile | string,
    lineNumber?: number,
    asList = false,
    asBlockquote = false): Promise<boolean> {
    const has_new_values = async (): Promise<boolean> => {
        return await payload.every(async (single_payload) => {
            const single_payload_orig = await getValuesForIndexedPath(plugin, fileOrFilePath, single_payload.indexedPath);
            if (single_payload_orig) {
                console.log("has_new_values", single_payload_orig);
                return true;
            }
            return false;
        });
        // for (const single_payload of payload) {
        //     const single_payload_orig = await getValuesForIndexedPath(plugin, fileOrFilePath, single_payload.indexedPath);
        //     if (single_payload_orig) {
        //         console.log("has_new_values", single_payload_orig);
        //         return true;
        //     }
        // }

        // return false;
    };
    // let current_payloads = await get_values();
    // MDM_DEBUG && console.log("payloads_orig", current_payloads);

    // Post the new one
    await postValues(plugin, payload, fileOrFilePath, lineNumber, asList, asBlockquote);
    // MDM_DEBUG && console.log("payload", payload);

    // Wait for dataview to be ready.
    const f = plugin.fieldIndex;
    await f.applyUpdates();
    await f.indexFields();
    plugin.app.workspace.trigger("dataview:refresh-views");

    // Wait that the value is in fact updated.
    const timeout = 3000;
    const start = Date.now();
    let prev_time = start;
    let now = Date.now();
    let do_have_new_values = false;
    while (((now - start) < timeout) && (!do_have_new_values)) {
        if ((now - prev_time) >= 100) {
            do_have_new_values = await has_new_values();
            prev_time = now;
        }
        now = Date.now();
    }

    if (!do_have_new_values) {
        MDM_DEBUG && console.error(`[postValues_synced] Failed (no new values)`);
    }

    // // Wait for dataview to be ready.
    // await f.applyUpdates();

    // const f = this.plugin.fieldIndex;
    // await f.indexFields();
    // this.plugin.app.workspace.trigger("dataview:refresh-views");

    return true;
}