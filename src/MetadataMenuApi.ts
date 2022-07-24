import { App, TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";
import { fieldWithMenu } from "./commands/fieldWithMenu";


export interface IMetadataMenuApi {
    getValues: (app: App, file: TFile, attribute: string) => Promise<string[]>;
    replaceValues: (app: App, file: TFile, attribute: string, input: string) => Promise<void>;
    fieldWithMenu: (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => HTMLElement;
}

export class MetadataMenuApi {
    constructor(private plugin: MetadataMenu) {
    }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            replaceValues: this.replaceValues(),
            fieldWithMenu: this.fieldWithMenu()
        };
    }

    private getValues(): (app: App, file: TFile, attribute: string) => Promise<string[]> {
        return async (app: App, file: TFile, attribute: string) => getValues(app, file, attribute)
    }

    private replaceValues(): (app: App, file: TFile, attribute: string, input: string) => Promise<void> {
        return async (app: App, file: TFile, attribute: string, input: string) => replaceValues(app, file, attribute, input)
    }

    private fieldWithMenu(): (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => HTMLElement {
        return (dv: any, p: any, fieldName: string, attrs?: { cls: string, attr: Record<string, string> }) => fieldWithMenu(this.plugin, dv, p, fieldName, attrs)
    }
}