import "obsidian";
//@ts-ignore
import { DataviewApi } from "obsidian-dataview";

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
            };
        };
    }
    interface MetadataCache {
        inProgressTaskCount: number;
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
    interface Workspace {
        /** Sent to rendered dataview components to tell them to possibly refresh */
        on(name: "metadata-menu:indexed", callback: () => void, ctx?: any): EventRef;
        on(name: "metadata-menu:updated-index", callback: () => void, ctx?: any): EventRef;
    }
}