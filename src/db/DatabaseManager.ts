import MetadataMenu from "main";
import { Component } from "obsidian";
import { FieldsValuesStore } from "./stores/fieldsValues";
import { UpdatesStore } from "./stores/updates";

export enum Stores {
    "updates" = "updates",
    "fieldsValues" = "fieldsValues",
    "fileFieldsDefinition" = "fileFieldsDefinition"
}
type DataBaseIndex = {
    name: string;
    fields: string | string[];
    unique: boolean
}

export const INDEXES: Record<keyof typeof Stores, DataBaseIndex[]> = {
    updates: [],
    fieldsValues: [
        { name: 'filePath', fields: 'filePath', unique: false },
        { name: 'fieldType', fields: 'fieldType', unique: false }
    ],
    fileFieldsDefinition: []
};


export class IndexDatabase extends Component {
    public name: string
    public updates: UpdatesStore
    public fieldsValues: FieldsValuesStore
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
        const request = indexedDB.open(this.name, 1);
        request.onerror = (err) => {
            console.error(`IndexedDB error: ${request.error}`, err);
        }
        request.onsuccess = () => {
            const db = request.result;
            this.plugin.app.workspace.trigger("metadata-menu:db-ready")
        }
        request.onupgradeneeded = () => {
            const db = request.result;
            Object.keys(INDEXES).forEach((storeName: keyof typeof Stores) => {
                const storeIndexes = INDEXES[storeName]
                const store = db.createObjectStore(storeName, { keyPath: 'id' });
                const indexes = [{ name: 'id', fields: 'id', unique: true }, ...storeIndexes]
                indexes.forEach((index) => store.createIndex(index.name, index.fields, { unique: index.unique }));
            })
            this.plugin.app.workspace.trigger("metadata-menu:db-ready")
        };
    }

    public buildStores() {
        this.updates = this.addChild(new UpdatesStore(this))
        this.fieldsValues = this.addChild(new FieldsValuesStore(this))
    }

    onunload(): void {

    }

}
