import "obsidian";
import { EventRef } from "obsidian";
//@ts-ignore
import { DataviewApi } from "obsidian-dataview";

interface InternalPlugin {
    enabled: boolean;
}

interface BookmarkItem {
    ctime: number;
    type: 'file' | 'folder' | 'group';
    path: string;
    title: string;
    items?: BookmarkItem[];
}

interface BookmarkInternalPlugin extends InternalPlugin {
    instance: {
        items: BookmarkItem[];
        on(name: "changed", callback: () => void, ctx?: any): EventRef;
    };
    lastSave: number;
}

interface InternalPlugins {
    bookmarks: BookmarkInternalPlugin;
}

declare module "obsidian" {
    interface App {
        appId?: string;
        plugins: {
            enabledPlugins: Set<string>;
            plugins: {
                [id: string]: any;
                dataview?: {
                    api?: DataviewApi;
                    index: {
                        initialized: boolean
                    }
                };
            };
        };
        internalPlugins: {
            plugins: InternalPlugins;
            getPluginById<T extends keyof InternalPlugins>(id: T): InternalPlugins[T];
        };
        statusBar: {
            containerEl: HTMLDivElement;
        }
    }
    interface DataAdapter {
        basePath: string
    }
    interface MetadataCache {
        fileCache: Record<string, { mtime: number }>
        inProgressTaskCount: number;
        initialized: boolean;
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
        on(name: "metadata-menu:indexed", callback: () => void, ctx?: any): EventRef;
        on(name: "layout-change", callback: Debouncer<[_file: TFile], void>, ctx?: any): EventRef;
    }
    interface Menu {
        setSectionSubmenu: (label: string, options: { title: string, icon: string }) => any
    }
}