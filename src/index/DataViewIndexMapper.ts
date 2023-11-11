import MetadataMenu from "main";
import { Component } from "obsidian";
import FieldIndex from "./FieldIndex";

export class MappedIndex extends Component {
    //private index: FieldIndex
    private dataviewDBName: string
    constructor(
        private plugin: MetadataMenu
    ) {
        super();
        //this.index = plugin.fieldIndex

    }

    async onload(): Promise<void> {
        const appId = this.plugin.app.appId
        if (appId) {
            this.dataviewDBName = `dataview/cache/${appId}`;
        }
    }

    async build() {
        const dvFiles = await this.getDVFiles()
        console.log(dvFiles.length)
    }

    private getDVFiles() {
        let db: IDBDatabase;
        const store = "keyvaluepairs"
        const open = indexedDB.open(this.dataviewDBName);
        return new Promise<any>((resolve, reject) => {
            open.onsuccess = () => {
                let request!: IDBRequest;
                db = open.result;
                if ([...db.objectStoreNames].find((name) => name === store)) {
                    const transaction = db.transaction(store);
                    const objectStore = transaction.objectStore(store);
                    request = objectStore.getAll();
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result);
                    transaction.oncomplete = () => db.close();
                } else {
                    console.error("store not found")
                    //indexedDB.deleteDatabase(plugin.indexName);
                }
            };
        });
    }
}