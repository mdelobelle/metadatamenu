import MetadataMenu from "main";
import { TFile } from "obsidian";
import { fieldModifier } from "./commands/fieldModifier";
import { IFieldInfo, fileFields, namedFileFields } from "./commands/fileFields";
import { getValues, getValuesForIndexedPath } from "./commands/getValues";
import { insertMissingFields } from "./commands/insertMissingFields";
import { IndexedFieldsPayload, postValues } from "./commands/postValues";
import { NamedFieldsPayload, postNamedFieldsValues } from "./commands/postNamedFieldsValues";
import { updateFormulas } from "./commands/updateFormulas";
import { getFileFromFileOrPath } from "./utils/fileUtils";
// @ts-ignore
import equal from "fast-deep-equal";

export interface IMetadataMenuApi {
    getValues: (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]>;
    getValuesForIndexedPath: (fileOrFilePath: TFile | string, indexedPath: string) => Promise<string>;
    fileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>>;
    namedFileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => HTMLElement;
    insertMissingFields: (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string) => Promise<void>;
    postValues: (fileOrFilePath: TFile | string, payload: IndexedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void>;
    postNamedFieldsValues: (fileOrFilePath: TFile | string, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void>;
    postNamedFieldsValues_synced: (fileOrFilePath: TFile | string, payload: NamedFieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<boolean>;
    updateFormulas: (forceUpdateOne?: { file: TFile, fieldName: string }, forceUpdateAll?: boolean) => void;
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

    private insertMissingFields(): (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string) => Promise<void> {
        return async (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string) => insertMissingFields(this.plugin, fileOrFilePath, lineNumber, asList, asBlockquote, fileClassName)
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

            // let dv_views_ready = false;
            // const set_dv_views_ready = () => {
            //     dv_views_ready = true;
            // };
            // const workspace = this.plugin.app.workspace;
            // // @ts-ignore
            // this.plugin.registerEvent(workspace.on("dataview:refresh-views", set_dv_views_ready));

            // Post the new one
            await postNamedFieldsValues(this.plugin, payload, fileOrFilePath, lineNumber, asList, asBlockquote);
            MDM_DEBUG && console.log("payload", payload);

            // Only return when the value is in fact updated.
            const timeout = 3000;
            let start = Date.now();
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

            // Wait for dataview to be ready.

            await this.plugin.fieldIndex.indexFields();
            this.plugin.app.workspace.trigger("dataview:refresh-views");
            // const file = getFileFromFileOrPath(this.plugin, fileOrFilePath);
            // payload.forEach((single_payload) => {                
            //     this.plugin.fieldIndex.resolveAndUpdateDVQueriesBasedFields(false, { file: file as TFile, fieldName: single_payload.name });
            // });


            // const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
            // const index_timeout = 6000;
            // start = Date.now();
            // now = Date.now();
            // while (((now - start) < index_timeout) && !dv_views_ready) {
            //     sleep(100);
            //     now = Date.now();
            // }

            // workspace.off("dataview:refresh-views", set_dv_views_ready);

            // if (!dv_views_ready) {
            //     console.log("Failed, index_ready", dv_views_ready);
            // }

            // return dv_views_ready;
            
            return true;
        };
    }


    private updateFormulas(): (
        forceUpdateOne?: { file: TFile, fieldName: string },
        forceUpdateAll?: boolean
    ) => void {
        return async (
            forceUpdateOne?: { file: TFile, fieldName: string },
            forceUpdateAll?: boolean
        ) => {
            await updateFormulas(this.plugin, forceUpdateOne, forceUpdateAll);
            await this.plugin.fieldIndex.applyUpdates();
        };
    }
}