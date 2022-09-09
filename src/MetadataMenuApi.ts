import { TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";
import { insertValues } from "./commands/insertValues";
import { fieldModifier } from "./commands/fieldModifier";
import { fileFields, FieldInfo } from "./commands/fileFields";

export interface IMetadataMenuApi {
    getValues: (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]>;
    replaceValues: (fileOrFilePath: TFile | string, attribute: string, input: string) => Promise<void>;
    insertValues: (fileOrFilePath: TFile | string, fieldName: string, value: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean) => Promise<void>
    fileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, FieldInfo>>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => Promise<HTMLElement>;
}

export class MetadataMenuApi {

    private plugin: MetadataMenu

    constructor(plugin: MetadataMenu) {
        this.plugin = plugin
    }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            replaceValues: this.replaceValues(),
            insertValues: this.insertValues(),
            fieldModifier: this.fieldModifier(),
            fileFields: this.fileFields()
        };
    }

    private getValues(): (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]> {
        return async (fileOrFilePath: TFile | string, attribute: string) => getValues(this.plugin, fileOrFilePath, attribute)
    }

    private replaceValues(): (fileOrFilePath: TFile | string, attribute: string, input: string) => Promise<void> {
        return async (fileOrFilePath: TFile | string, attribute: string, input: string) => replaceValues(this.plugin, fileOrFilePath, attribute, input)
    }

    private insertValues(): (fileOrFilePath: TFile | string, fieldName: string, value: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean) => Promise<void> {
        return async (fileOrFilePath: TFile | string, fieldName: string, value: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean) => insertValues(this.plugin, fileOrFilePath, fieldName, value, lineNumber, inFrontmatter, after)
    }

    private fieldModifier(): (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => Promise<HTMLElement> {
        return (dv: any, p: any, fieldName: string, attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }) => fieldModifier(this.plugin, dv, p, fieldName, attrs)
    }

    private fileFields(): (fileOrFilePath: TFile | string) => Promise<Record<string, FieldInfo>> {
        return async (fileOrFilePath: TFile | string) => fileFields(this.plugin, fileOrFilePath)
    }
}