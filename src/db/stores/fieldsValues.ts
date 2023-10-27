
import { TFile } from "obsidian";
import { resolve } from "path";
import { IndexedExistingField } from "src/components/FieldIndex";
import { ExistingField } from "src/fields/existingField";
import { FieldType } from "src/types/fieldTypes";

let db: IDBDatabase;
const dbName = "metadatamenu_cache"
const store = "fieldsValuesStore"

/* 
**  get methods 
*/

export const getElement = <T>(key: string) => {
    const open = indexedDB.open(dbName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                if (key === 'all') request = objectStore.getAll();
                else request = objectStore.get(key);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
};


export const getElementForIndexedPath = <T>(file: TFile, indexedPath?: string): Promise<T | undefined> => {
    if (indexedPath === undefined) resolve()
    const key = `${file.path}____${indexedPath}`
    const open = indexedDB.open(dbName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                if (key === 'all') request = objectStore.getAll();
                else request = objectStore.get(key);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
};

export const getElementsBetweenKeys = <T>(keyStart: string, keyEnd: string) => {
    const open = indexedDB.open(dbName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                const range = IDBKeyRange.bound(keyStart, keyEnd)

                request = objectStore.getAll(range);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
};

export const getElementsForFilePath = <T>(filePath: string) => {
    const open = indexedDB.open(dbName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                const filePathIndex = objectStore.index("filePath");
                request = filePathIndex.getAll(filePath);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
};

export const getElementsForType = <T>(type: keyof typeof FieldType): Promise<T> => {
    const open = indexedDB.open(dbName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                const filePathIndex = objectStore.index("fieldType");
                request = filePathIndex.getAll(type);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
};

/* 
**  put methods
*/


export const editElement = <T>(key: string, payload: object) => {
    const open = indexedDB.open(dbName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                if (key === 'all') request = objectStore.getAll();
                else request = objectStore.get(key);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const serialized = JSON.parse(JSON.stringify(payload));
                    const updateRequest = objectStore.put(serialized);
                    updateRequest.onsuccess = () => resolve(request.result);
                };
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
};

export const bulkEditElements = <T>(payload: IndexedExistingField[]) => {
    const open = indexedDB.open(dbName);
    return new Promise<T | void>((resolve, reject) => {
        open.onsuccess = () => {
            let request: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                if (payload.length) {
                    payload.forEach(item => {
                        request = objectStore.get(item.id);
                        request.onerror = () => {
                            reject(request.error)
                        };
                        request.onsuccess = () => {
                            const serialized = JSON.parse(JSON.stringify(item));
                            const updateRequest = objectStore.put(serialized);
                            updateRequest.onsuccess = () => resolve(request.result);
                        };
                    })
                } else {

                    resolve()
                }
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(dbName);
            }
        };
    });
}

/* 
**  delete methods
*/


export const removeElement = (key: string) => {
    const open = indexedDB.open(dbName);
    open.onsuccess = () => {
        let request: IDBRequest;
        db = open.result;
        if ([...db.objectStoreNames].find((name) => name === store)) {
            const transaction = db.transaction(store, 'readwrite');
            const objectStore = transaction.objectStore(store);
            if (key === 'all') request = objectStore.clear();
            else request = objectStore.delete(key);
            request.onerror = () => console.error(request.error);
            transaction.oncomplete = () => db.close();
        } else {
            console.error("store not found")
            //indexedDB.deleteDatabase(dbName);
        }
    };
};

export const bulkRemoveElements = (keys: string[]) => {
    const open = indexedDB.open(dbName);
    open.onsuccess = () => {
        let request: IDBRequest;
        db = open.result;
        if ([...db.objectStoreNames].find((name) => name === store)) {
            const transaction = db.transaction(store, 'readwrite');
            const objectStore = transaction.objectStore(store);
            if (keys.length) {
                keys.forEach(key => {
                    request = objectStore.delete(key);
                    request.onerror = () => console.error(request.error);
                })
            }
            transaction.oncomplete = () => db.close();

        } else {
            console.error("store not found")
            //indexedDB.deleteDatabase(dbName);
        }
    };
};
