import { Component } from "obsidian"
import { IndexDatabase, Stores } from "./DatabaseManager"

export interface Payload {
    id: string;
}

export abstract class StoreManager extends Component {

    constructor(
        public indexDB: IndexDatabase,
        public storeName: keyof typeof Stores
    ) {
        super()
    }

    public executeRequest = <T>(func: (store: IDBObjectStore) => Promise<T | T[] | undefined | void>): Promise<T | T[] | undefined | void> => {
        const open = indexedDB.open(this.indexDB.name);
        return new Promise<T | T[] | undefined | void>(async (resolve, reject) => {
            open.onsuccess = () => {
                const db = open.result
                if ([...db.objectStoreNames].find((name) => name === this.storeName)) {
                    const transaction = db.transaction(this.storeName, 'readwrite');
                    const store = transaction.objectStore(this.storeName);
                    resolve(func(store))
                } else {
                    MDM_DEBUG && console.error("store not found")
                    reject()
                }
            }
            open.onerror = () => {
                MDM_DEBUG && console.error("unable to open db")
                reject()
            }
        })
    }

    public getElement = <T>(key: string) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<T | T[] | undefined>((resolve, reject) => {
            let request!: IDBRequest<T | T[]>
            if (key === 'all') request = store.getAll();
            else request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        })
    )

    public editElement = <T extends Payload>(key: string, payload: object) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<T | T[] | undefined>((resolve, reject) => {
            let request!: IDBRequest<T | T[]>
            if (key === 'all') request = store.getAll();
            else request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const serialized = JSON.parse(JSON.stringify(payload));
                const updateRequest = store.put(serialized);
                updateRequest.onsuccess = () => resolve(request.result);
            }
        })
    )

    public bulkEditElements = <T extends Payload>(payload: Array<T>) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<T | void>((resolve, reject) => {
            let request!: IDBRequest<T>
            if (payload.length) {
                payload.forEach(item => {
                    request = store.get(item.id);
                    request.onerror = () => {
                        MDM_DEBUG && console.log("error on getting ", item.id)
                        reject(request.error)
                    }
                    request.onsuccess = () => {
                        const serialized = JSON.parse(JSON.stringify(item));
                        const updateRequest = store.put(serialized);
                        updateRequest.onsuccess = () => resolve(request.result);
                    };
                })
            } else { resolve() }
        })
    );

    public removeElement = (key: string) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<void>((resolve, reject) => {
            let request!: IDBRequest
            if (key === 'all') request = store.clear();
            else request = store.delete(key);
            request.onerror = () => reject(request.error)
            request.onsuccess = () => resolve()
        })
    )

    public bulkRemoveElements = (keys: string[]) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<void>((resolve, reject) => {
            let request!: IDBRequest
            if (keys.length) {
                keys.forEach(key => {
                    request = store.get(key);
                    request.onerror = () => reject(request.error)
                    request.onsuccess = () => {
                        const delRequest = store.delete(key);
                        delRequest.onsuccess = () => resolve();
                    };
                })
            } else { resolve() }
        })
    )
}