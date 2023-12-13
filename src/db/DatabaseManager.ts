import MetadataMenu from "main";
import { Component } from "obsidian";
import { FileClassViewStore } from "./stores/fileClassViews";

export enum Stores {
    "fileClassView" = "fileClassView"
}
type DataBaseIndex = {
    name: string;
    fields: string | string[];
    unique: boolean
}

export const INDEXES: Record<keyof typeof Stores, DataBaseIndex[]> = {
    fileClassView: [
        { name: 'fileClassView', fields: 'fileClassName', unique: true }
    ]
};


export class IndexDatabase extends Component {
    public name: string
    public fileClassViews: FileClassViewStore
    constructor(
        private plugin: MetadataMenu
    ) {
        super()
        this.init()
        this.buildStores()
    }

    onload(): void {
    }

    public init() {
        DEBUG && console.log("create or open db")
        this.name = `metadata_menu_${this.plugin.app.appId ||
            this.plugin.app.vault.adapter.basePath ||
            this.plugin.app.vault.getName()}`
        if (!this.name) return
        const request = indexedDB.open(this.name, 2);
        request.onerror = (err) => {
            console.error(`IndexedDB error: ${request.error}`, err);
        }
        request.onsuccess = () => {
            const db = request.result;
        }
        request.onupgradeneeded = () => {
            const db = request.result;
            Object.keys(INDEXES).forEach((storeName: keyof typeof Stores) => {
                const storeIndexes = INDEXES[storeName]
                const store = db.createObjectStore(storeName, { keyPath: 'id' });
                const indexes = [{ name: 'id', fields: 'id', unique: true }, ...storeIndexes]
                indexes.forEach((index) => store.createIndex(index.name, index.fields, { unique: index.unique }));
            })
        };
    }

    public buildStores() {
        this.fileClassViews = this.addChild(new FileClassViewStore(this))
    }

    onunload(): void {

    }

}
