import { App, TFile } from "obsidian"
import MetadataMenu from "main"
import { getValues } from "./commands/getValues";
import { replaceValues } from "./commands/replaceValues";

export interface IMetadataMenuApi {
    getValues: (app: App, file: TFile, attribute: string) => Promise<string[]>;
    replaceValues: (app: App, file: TFile, attribute: string, input: string) => Promise<void>;
}

export class MetadataMenuApi {
    constructor(private plugin: MetadataMenu) {
    }

    public make(): IMetadataMenuApi {
        return {
            getValues: this.getValues(),
            replaceValues: this.replaceValues()
        };
    }

    private getValues(): (app: App, file: TFile, attribute: string) => Promise<string[]> {
        return async (app: App, file: TFile, attribute: string) => getValues(app, file, attribute)
    }

    private replaceValues(): (app: App, file: TFile, attribute: string, input: string) => Promise<void> {
        return async (app: App, file: TFile, attribute: string, input: string) => replaceValues(app, file, attribute, input)
    }
}