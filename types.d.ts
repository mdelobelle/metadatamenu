import "obsidian";
//@ts-ignore
import { DataviewApi } from "obsidian-dataview";
import { MetadataMenuApi } from "src/MetadataMenuApi"

declare module "obsidian" {
    interface App {
        appId?: string;
        plugins: {
            enabledPlugins: Set<string>;
            plugins: {
                [id: string]: any;
                dataview?: {
                    api?: DataviewApi;
                };
                metadatamenu?: {
                    api?: MetadataMenuApi;
                };
            };
        };
    }
    interface MetadataCache {
        on(
            name: "dataview:api-ready",
            //@ts-ignore
            callback: (api: DataviewPlugin["api"]) => any,
            ctx?: any
        ): EventRef;
        on(
            name: "dataview:metadata-change",
            callback: (
                ...args:
                    | [op: "rename", file: TAbstractFile, oldPath: string]
                    | [op: "delete", file: TFile]
                    | [op: "update", file: TFile]
            ) => any,
            ctx?: any
        ): EventRef;
        on(
            name: "dataview:index-ready",
            callback: () => any,
            ctx?: any
        ): EventRef;
    }
}