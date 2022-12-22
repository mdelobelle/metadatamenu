import { TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";
import { insertValues } from "./commands/insertValues";
import { fieldModifier } from "./commands/fieldModifier";
import { fileFields, FieldInfo } from "./commands/fileFields";
import { insertMissingFields } from "./commands/insertMissingFields";
import { postValues, FieldsPayload } from "./commands/postValues";

export interface IMetadataMenuApi {
    getValues: (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]>;
    replaceValues: (fileOrFilePath: TFile | string, attribute: string, input: string) => Promise<void>;
    insertValues: (fileOrFilePath: TFile | string, fieldName: string, value: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean) => Promise<void>
    fileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, FieldInfo>>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => HTMLElement;
    insertMissingFields: (fileOrFilePath: string | TFile, lineNumber: number, inFrontmatter: boolean, after: boolean, asList: boolean, asComment: boolean, fileClassName?: string) => Promise<void>;
    postValues: (fileOrFilePath: TFile | string, payload: FieldsPayload, lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean) => Promise<void>;
}

export class MetadataMenuApi {

    constructor(private plugin: MetadataMenu) { }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            replaceValues: this.replaceValues(),
            insertValues: this.insertValues(),
            fieldModifier: this.fieldModifier(),
            fileFields: this.fileFields(),
            insertMissingFields: this.insertMissingFields(),
            postValues: this.postValues()
        };
    }

    private getValues(): (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]> {
        return async (fileOrFilePath: TFile | string, attribute: string) => getValues(this.plugin, fileOrFilePath, attribute)
    }

    private replaceValues(): (fileOrFilePath: TFile | string, attribute: string, input: string) => Promise<void> {
        return async (fileOrFilePath: TFile | string, attribute: string, input: string) => await this.plugin.fileTaskManager.pushTask(() => { replaceValues(this.plugin, fileOrFilePath, attribute, `${input}`) })
    }

    private insertValues(): (fileOrFilePath: TFile | string, fieldName: string, value: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean) => Promise<void> {
        return async (fileOrFilePath: TFile | string, fieldName: string, value: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean, asList?: boolean, asComment?: boolean) => await this.plugin.fileTaskManager.pushTask(() => { insertValues(this.plugin, fileOrFilePath, fieldName, value, lineNumber, inFrontmatter, after, asList, asComment) })
    }

    private fieldModifier(): (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => HTMLElement {
        return (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => fieldModifier(this.plugin, dv, p, fieldName, attrs)
    }

    private fileFields(): (fileOrFilePath: TFile | string) => Promise<Record<string, FieldInfo>> {
        return async (fileOrFilePath: TFile | string) => fileFields(this.plugin, fileOrFilePath)
    }

    private insertMissingFields(): (fileOrFilePath: string | TFile, lineNumber: number, inFrontmatter: boolean, after: boolean, asList: boolean, asComment: boolean, fileClassName?: string) => Promise<void> {
        return async (fileOrFilePath: string | TFile, lineNumber: number, inFrontmatter: boolean, after: boolean, asList: boolean, asComment: boolean, fileClassName?: string) => insertMissingFields(this.plugin, fileOrFilePath, lineNumber, inFrontmatter, after, asList, asComment, fileClassName)
    }

    private postValues(): (fileOrFilePath: string | TFile, payload: FieldsPayload, lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean) => Promise<void> {
        return async (fileOrFilePath: string | TFile, payload: FieldsPayload, lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean) => postValues(this.plugin, payload, fileOrFilePath, lineNumber, after, asList, asComment)
    }
}