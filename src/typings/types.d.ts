import MetadataMenu from "main";
import "obsidian";
import { EventRef } from "obsidian";
//@ts-ignore
import { DataviewApi } from "obsidian-dataview";
import { IMetadataMenuApi } from "src/MetadataMenuApi";

interface InternalPlugin {
    enabled: boolean;
}

interface HTMLDateInputElement extends HTMLInputElement {
    showPicker: () => void
}

interface BookmarkItem {
    ctime: number;
    type: 'file' | 'folder' | 'group';
    path: string;
    title: string;
    items?: BookmarkItem[];
}

type FrontmatterValue = string | number | boolean | FrontmatterObject;

interface FrontmatterObject {
    [key: string]: FrontmatterValue;
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

interface Property {
    key: string,
    type: string,
    value: string
}


declare module "obsidian" {

    interface App {
        viewRegistry: ViewRegistry
    }

    interface Editor {
        editorComponent: {
            table?: any
        }
    }

    interface View {
        component: any
    }

    interface MarkdownView {
        metadataEditor: {
            rendered: Array<{
                iconEl: HTMLElement,
                containerEl: HTMLDivElement,
                keyEl: HTMLDivElement,
                valueEl: HTMLDivElement,
                entry: {
                    key: string
                }
            }>,
            properties: Array<Property>,
            addPropertyButtonEl: HTMLDivElement,
            contentEl: HTMLDivElement
        }
    }
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
    interface FrontMatterCache {
        /**
         * @public
         */
        [key: string]: any;
        tags?: string | string[]
    }

    interface MetadataCache {
        fileCache: Record<string, { mtime: number }>
        inProgressTaskCount: number;
        initialized: boolean;
        db: {
            name: string
        }
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
        on(name: "metadata-menu:fileclass-indexed", callback: () => void, ctx?: any): EventRef;
        on(name: "layout-ready", callback: () => void, ctx?: any): EventRef;
        on(name: "layout-change", callback: Debouncer<[_file: TFile], void>, ctx?: any): EventRef;
    }
    interface ViewRegistry extends Events {
        /**
         * Mapping of file extensions to view type
         */
        typeByExtension: Record<string, string>;
        /**
         * Mapping of view type to view constructor
         */
        viewByType: Record<string, (leaf: WorkspaceLeaf) => View>;

        /**
         * Get the view type associated with a file extension
         * @param extension File extension
         */
        getTypeByExtension: (extension: string) => string;
        /**
         * Get the view constructor associated with a view type
         */
        getViewCreatorByType: (type: string) => (leaf: WorkspaceLeaf) => View;
        /**
         * Check whether a view type is registered
         */
        isExtensionRegistered: (extension: string) => boolean;
        /**
         * Register a view type for a file extension
         * @param extension File extension
         * @param type View type
         * @remark Prefer registering the extension via the Plugin class
         */
        registerExtensions: (extension: string[], type: string) => void;
        /**
         * Register a view constructor for a view type
         */
        registerView: (type: string, viewCreator: (leaf: WorkspaceLeaf) => View) => void;
        /**
         * Register a view and its associated file extensions
         */
        registerViewWithExtensions: (extensions: string[], type: string, viewCreator: (leaf: WorkspaceLeaf) => View) => void;
        /**
         * @internal
         */
        trigger: (type: string) => void;
        /**
         * Unregister extensions for a view type
         */
        unregisterExtensions: (extension: string[]) => void;
        /**
         * Unregister a view type
         */
        unregisterView: (type: string) => void;
    }

    interface WorkspaceLeaf {
        id: string
    }

    interface WorkspaceRoot {
        children: Array<{
            children: Array<WorkspaceLeaf>
        }>
    }

    interface Menu {
        setSectionSubmenu: (label: string, options: { title: string, icon: string }) => any
    }

    interface Component {
        _children: Component[],
        _events: any[]
    }
}

declare global {

    interface Window {
        MetadataMenuAPI?: IMetadataMenuApi;
        MetadataMenu?: MetadataMenu;
        DEBUG?: boolean
    }
}