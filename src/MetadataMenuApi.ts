import { TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";
import { fieldModifier } from "./commands/fieldModifier";
import { fileFields, FieldInfo } from "./commands/fileFields";


export interface IMetadataMenuApi {
    getValues: (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]>;
    replaceValues: (fileOrFilePath: TFile | string, attribute: string, input: string) => Promise<void>;
    fileFields: (fileOrFilePath: TFile | string) => Promise<Record<string, FieldInfo>>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => Promise<HTMLElement>;
}

export class MetadataMenuApi {

    constructor(private plugin: MetadataMenu) {
    }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            replaceValues: this.replaceValues(),
            fieldModifier: this.fieldModifier(),
            fileFields: this.fileFields()
        };
    }

    private getValues(): (fileOrFilePath: TFile | string, attribute: string) => Promise<string[]> {
        return async (fileOrFilePath: TFile | string, attribute: string) => getValues(this.plugin.app, fileOrFilePath, attribute)
    }

    private replaceValues(): (fileOrFilePath: TFile | string, attribute: string, input: string) => Promise<void> {
        return async (fileOrFilePath: TFile | string, attribute: string, input: string) => replaceValues(this.plugin.app, fileOrFilePath, attribute, input)
    }

    private fieldModifier(): (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => Promise<HTMLElement> {
        return (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => fieldModifier(this.plugin, dv, p, fieldName, attrs)
    }

    private fileFields(): (fileOrFilePath: TFile | string) => Promise<Record<string, FieldInfo>> {
        return async (fileOrFilePath: TFile | string) => fileFields(this.plugin, fileOrFilePath)
    }
}