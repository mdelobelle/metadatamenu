import { App, TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";
import { fieldModifier } from "./commands/fieldModifier";


export interface IMetadataMenuApi {
    getValues: (app: App, file: TFile, attribute: string) => Promise<string[]>;
    replaceValues: (app: App, file: TFile, attribute: string, input: string) => Promise<void>;
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

    private getValues(): (app: App, file: TFile, attribute: string) => Promise<string[]> {
        return async (app: App, file: TFile, attribute: string) => getValues(app, file, attribute)
    }

    private replaceValues(): (app: App, file: TFile, attribute: string, input: string) => Promise<void> {
        return async (app: App, file: TFile, attribute: string, input: string) => replaceValues(app, file, attribute, input)
    }

    private fieldModifier(): (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => Promise<HTMLElement> {
        return (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => fieldModifier(this.plugin, dv, p, fieldName, attrs)
    }
}