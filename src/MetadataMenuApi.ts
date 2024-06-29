import MetadataMenu from "main";
import { TFile } from "obsidian";
import { fieldModifier } from "./commands/fieldModifier";
import { IFieldInfo, fileFields, namedFileFields } from "./commands/fileFields";
import { getValues, getValuesForIndexedPath } from "./commands/getValues";
import { insertMissingFields } from "./commands/insertMissingFields";
import { IndexedFieldsPayload, postValues } from "./commands/postValues";
import { NamedFieldsPayload, postNamedFieldsValues } from "./commands/postNamedFieldsValues";
import { updateFormulas, updateSingleFormula } from "./commands/updateFormulas";
// @ts-ignore
import equal from "fast-deep-equal";
import { waitFor } from "./utils/syncUtils";
import { Note } from "./note/note";
import { getFileFromFileOrPath } from "./utils/fileUtils";

export interface IMetadataMenuApi {
    getValues: (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]>;
    getValuesForIndexedPath: (fileOrFilePath: TFile | string, indexedPath: string) => Promise<string>;
    fileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>>;
    namedFileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => HTMLElement;
    insertMissingFields: (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string, indexedPath?: string,
        waitForIndexing?: boolean) => Promise<void>;
    postValues: (fileOrFilePath: TFile | string, payload: IndexedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void>;
    postNamedFieldsValues: (fileOrFilePath: TFile | string, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void>;
    postNamedFieldsValues_synced: (fileOrFilePath: TFile | string, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<boolean>;
    updateFormulas: (forceUpdateOne?: { file: TFile, fieldName: string }, forceUpdateAll?: boolean, doLock?: boolean) => Promise<void>;
    updateSingleFormula: (forceUpdateOne: { file: TFile, fieldName: string }) => Promise<void>;
    applyUpdates: () => Promise<void>;
    lock: () => Promise<void>;
    unlock: () => Promise<void>;
}

export class MetadataMenuApi {

    constructor(private plugin: MetadataMenu) { }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            getValuesForIndexedPath: this.getValuesForIndexedPath(),
            fieldModifier: this.fieldModifier(),
            fileFields: this.fileFields(),
            namedFileFields: this.namedFileFields(),
            insertMissingFields: this.insertMissingFields(),
            postValues: this.postValues(),
            postNamedFieldsValues: this.postNamedFieldsValues(),
            postNamedFieldsValues_synced: this.postNamedFieldsValues_synced(),
            updateFormulas: this.updateFormulas(),
            updateSingleFormula: this.updateSingleFormula(),
            applyUpdates: this.applyUpdates(),
            lock: this.lock(),
            unlock: this.unlock()
        };
    }

    private getValues(): (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]> {
        return async (fileOrFilePath: TFile | string, attribute: string) => getValues(this.plugin, fileOrFilePath, attribute)
    }


    private getValuesForIndexedPath(): (fileOrFilePath: TFile | string, indexedPath: string) => Promise<string> {
        return async (fileOrFilePath: TFile | string, indexedPath: string) => getValuesForIndexedPath(this.plugin, fileOrFilePath, indexedPath)
    }

    private fieldModifier(): (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => HTMLElement {
        return (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => fieldModifier(this.plugin, dv, p, fieldName, attrs)
    }

    private fileFields(): (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>> {
        return async (fileOrFilePath: TFile | string) => fileFields(this.plugin, fileOrFilePath)
    }

    private namedFileFields(): (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>> {
        return async (fileOrFilePath: TFile | string) => namedFileFields(this.plugin, fileOrFilePath)
    }

    private insertMissingFields(): (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string, indexedPath?: string,
        waitForIndexing?: boolean) => Promise<void> {
        return async (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string, indexedPath?: string, waitForIndexing?: boolean) => {
            const file: TFile = getFileFromFileOrPath(this.plugin, fileOrFilePath);
            await Note.getExistingFields(this.plugin, file);

            await insertMissingFields(this.plugin, file.path, lineNumber, asList, asBlockquote, fileClassName, indexedPath, waitForIndexing)
        }
    }

    private postValues(): (fileOrFilePath: string | TFile, payload: IndexedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void> {
        return async (fileOrFilePath: string | TFile, payload: IndexedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => postValues(this.plugin, payload, fileOrFilePath, lineNumber, asList, asBlockquote)
    }

    private postNamedFieldsValues(): (fileOrFilePath: string | TFile, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void> {
        return async (fileOrFilePath: string | TFile, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => postNamedFieldsValues(this.plugin, payload, fileOrFilePath, lineNumber, asList, asBlockquote)
    }

    private postNamedFieldsValues_synced(): (fileOrFilePath: string | TFile, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<boolean> {
        return async (fileOrFilePath: string | TFile, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => {

            const get_values = async () => {
                // Get the values
                const payloads_orig: NamedFieldsPayload = [];
                for (const single_payload of payload) {
                    const single_payload_orig = await this.getValues()(fileOrFilePath, single_payload.name);
                    payloads_orig.push({
                        name: single_payload.name,
                        payload: { value: single_payload_orig[0] }
                    });
                }
                return payloads_orig;
            };
            let current_payloads = await get_values();
            MDM_DEBUG && console.log("payloads_orig", current_payloads);

            // Post the new one
            await postNamedFieldsValues(this.plugin, payload, fileOrFilePath, lineNumber, asList, asBlockquote);
            MDM_DEBUG && console.log("payload", payload);

            // Wait for dataview to be ready.
            const f = this.plugin.fieldIndex;
            await f.applyUpdates();
            await f.indexFields();
            this.plugin.app.workspace.trigger("dataview:refresh-views");

            // Wait that the value is in fact updated.
            const timeout = 3000;
            const start = Date.now();
            let prev_time = start;
            let now = Date.now();
            while (((now - start) < timeout) && (!equal(current_payloads, payload))) {
                if ((now - prev_time) >= 100) {
                    current_payloads = await get_values();
                    MDM_DEBUG && console.log("test payload", current_payloads, "vs", payload);

                    prev_time = now;
                }
                now = Date.now();
            }

            if (!equal(current_payloads, payload)) {
                MDM_DEBUG && console.log("Failed. current", current_payloads, "wanted", payload);
                return false;
            }

            // // Wait for dataview to be ready.
            // await f.applyUpdates();

            // const f = this.plugin.fieldIndex;
            // await f.indexFields();
            // this.plugin.app.workspace.trigger("dataview:refresh-views");

            return true;
        };
    }


    private updateFormulas(): (
        forceUpdateOne?: { file: TFile, fieldName: string },
        forceUpdateAll?: boolean,
        doLock?: boolean
    ) => Promise<void> {
        return async (
            forceUpdateOne?: { file: TFile, fieldName: string },
            forceUpdateAll?: boolean,
            doLock?: boolean
        ) => {
            const f = this.plugin.fieldIndex;
            // if (doLock) {
            //     await waitFor(() => { return !f.isIndexing; });
            //     f.isIndexing = true;
            // }
            await updateFormulas(this.plugin, forceUpdateOne, forceUpdateAll);
            await f.applyUpdates();
            await this.plugin.fieldIndex.indexFields();
            this.plugin.app.workspace.trigger("dataview:refresh-views");
            // if (doLock) {
            //     f.isIndexing = false;
            // }
        };
    }

    private updateSingleFormula(): (forceUpdateOne: { file: TFile, fieldName: string }) => Promise<void> {
        return async (forceUpdateOne: { file: TFile, fieldName: string }) => {
            // const f = this.plugin.fieldIndex;
            // await waitFor(() => { return !f.isIndexing; });
            // f.isIndexing = true;

            // no await on purpose for parallelization
            await updateSingleFormula(this.plugin, forceUpdateOne);

            // f.isIndexing = false;
        };
    }

    private applyUpdates(): () => Promise<void> {
        return async () => {
            await this.plugin.fieldIndex.applyUpdates();
            // await this.plugin.fieldIndex.indexFields();
            // this.plugin.app.workspace.trigger("dataview:refresh-views");

        };
    }

    private lock(): () => Promise<void> {
        return async () => {
            const f = this.plugin.fieldIndex;
            await waitFor(() => { return !f.isIndexing; });
            f.isIndexing = true;
        };
    }

    private unlock(): () => Promise<void> {
        return async () => {
            this.plugin.fieldIndex.isIndexing = false;
        };
    }
}