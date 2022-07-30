import { App, TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";
import { fieldModifier } from "./commands/fieldModifier";


export interface IMetadataMenuApi {
    getValues: (file: TFile, attribute: string) => Promise<string[]>;
    replaceValues: (file: TFile, attribute: string, input: string) => Promise<void>;
    fieldModifier: (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => Promise<HTMLElement>;
}

export class MetadataMenuApi {
    constructor(private plugin: MetadataMenu) {
    }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            replaceValues: this.replaceValues(),
            fieldModifier: this.fieldModifier()
        };
    }

    private getValues(): (file: TFile, attribute: string) => Promise<string[]> {
        return async (file: TFile, attribute: string) => getValues(this.plugin.app, file, attribute)
    }

    private replaceValues(): (file: TFile, attribute: string, input: string) => Promise<void> {
        return async (file: TFile, attribute: string, input: string) => replaceValues(this.plugin.app, file, attribute, input)
    }

    private fieldModifier(): (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => Promise<HTMLElement> {
        return (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => fieldModifier(this.plugin, dv, p, fieldName, attrs)
    }
}