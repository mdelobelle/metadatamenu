import MetadataMenu from "main";
import { TFile } from "obsidian";
import { fieldModifier } from "./commands/fieldModifier";
import { IFieldInfo, fileFields } from "./commands/fileFields";
import { getValues, getValuesForIndexedPath } from "./commands/getValues";
import { insertMissingFields } from "./commands/insertMissingFields";
import { FieldsPayload, postValues } from "./commands/postValues";

export interface IMetadataMenuApi {
    getValues: (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]>;
    getValuesForIndexedPath: (fileOrFilePath: TFile | string, indexedPath: string) => Promise<string>;
    fileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, IFieldInfo>>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => HTMLElement;
    insertMissingFields: (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string) => Promise<void>;
    postValues: (fileOrFilePath: TFile | string, payload: FieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void>;
}

export class MetadataMenuApi {

    constructor(private plugin: MetadataMenu) { }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            getValuesForIndexedPath: this.getValuesForIndexedPath(),
            fieldModifier: this.fieldModifier(),
            fileFields: this.fileFields(),
            insertMissingFields: this.insertMissingFields(),
            postValues: this.postValues(),
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

    private insertMissingFields(): (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string) => Promise<void> {
        return async (fileOrFilePath: string | TFile, lineNumber: number, asList: boolean, asBlockquote: boolean, fileClassName?: string) => insertMissingFields(this.plugin, fileOrFilePath, lineNumber, asList, asBlockquote, fileClassName)
    }

    private postValues(): (fileOrFilePath: string | TFile, payload: FieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => Promise<void> {
        return async (fileOrFilePath: string | TFile, payload: FieldsPayload, lineNumber?: number, asList?: boolean, asBlockquote?: boolean) => postValues(this.plugin, payload, fileOrFilePath, lineNumber, asList, asBlockquote)
    }
}