
import MetadataMenu from "main";
import { TFile } from "obsidian";
import { resolve } from "path";
import { IndexedExistingField } from "src/components/FieldIndex";
import { FieldType } from "src/types/fieldTypes";

let db: IDBDatabase;
const store = "fieldsValuesStore"

/* 
**  get methods 
*/

export const getElement = <T>(plugin: MetadataMenu, key: string) => {
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
};


export const getElementForIndexedPath = <T>(plugin: MetadataMenu, file: TFile, indexedPath?: string): Promise<T | undefined> => {
    if (indexedPath === undefined) resolve()
    const key = `${file.path}____${indexedPath}`
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
};

export const getElementsBetweenKeys = <T>(plugin: MetadataMenu, keyStart: string, keyEnd: string) => {
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
};

export const getElementsForFilePath = <T>(plugin: MetadataMenu, filePath: string) => {
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
};

export const getElementsForType = <T>(plugin: MetadataMenu, type: keyof typeof FieldType): Promise<T> => {
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
};

/* 
**  put methods
*/


export const editElement = <T>(plugin: MetadataMenu, key: string, payload: object) => {
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
};

export const bulkEditElements = <T>(plugin: MetadataMenu, payload: IndexedExistingField[]) => {
    const open = indexedDB.open(plugin.indexName);
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
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
}

export const updateItemsAfterFileRename = (plugin: MetadataMenu, oldPath: string, filePath: string) => {
    const open = indexedDB.open(plugin.indexName);
    return new Promise<void>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                const filePathIndex = objectStore.index("filePath");
                request = filePathIndex.getAll(oldPath);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    for (const iEF of request.result) {
                        iEF.id = iEF.id.replace(oldPath, filePath)
                        iEF.filePath = filePath
                        const serialized = JSON.parse(JSON.stringify(iEF));
                        const updateRequest = objectStore.put(serialized);
                        updateRequest.onsuccess = () => resolve();
                    }
                }
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
}


/* 
**  delete methods
*/


export const removeElement = (plugin: MetadataMenu, key: string) => {
    const open = indexedDB.open(plugin.indexName);
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
            //indexedDB.deleteDatabase(plugin.indexName);
        }
    };
};

export const bulkRemoveElementsForFile = (plugin: MetadataMenu, filePath: string) => {
    const open = indexedDB.open(plugin.indexName);
    return new Promise<void>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                const filePathIndex = objectStore.index("filePath");
                request = filePathIndex.getAll(filePath);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    for (const iEF of request.result) {
                        const delRequest = objectStore.delete(iEF.id)
                        delRequest.onsuccess = () => resolve()
                    }
                }
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
}


export const bulkRemoveElements = (plugin: MetadataMenu, keys: string[]) => {
    const open = indexedDB.open(plugin.indexName);
    return new Promise<void>((resolve, reject) => {
        open.onsuccess = () => {
            let request: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                if (keys.length) {
                    keys.forEach(key => {
                        request = objectStore.get(key);
                        request.onerror = () => {
                            reject(request.error)
                        };
                        request.onsuccess = () => {
                            const delRequest = objectStore.delete(key);
                            delRequest.onsuccess = () => resolve();
                        };
                    })
                } else {
                    resolve()
                }
                transaction.oncomplete = () => db.close();

            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    })

};

export const cleanUnindexedFiles = (plugin: MetadataMenu) => {
    const open = indexedDB.open(plugin.indexName);
    return new Promise<IndexedExistingField[]>((resolve, reject) => {
        open.onsuccess = () => {
            let request: IDBRequest<IndexedExistingField[]>;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                const indexedFilesPaths = plugin.fieldIndex.indexableFiles()
                    .map(f => f.path)
                request = objectStore.getAll();
                request.onerror = () => {
                    reject(request.error)
                };
                request.onsuccess = () => {
                    const deleted: IndexedExistingField[] = []
                    const toDelete = request.result.filter(iEF => iEF.filePath)
                    for (const iEF of toDelete) {
                        if (!(indexedFilesPaths).includes(iEF.filePath)) {
                            deleted.push(iEF)
                            const delRequest = objectStore.delete(iEF.id);
                            delRequest.onsuccess = () => { };
                        }
                    }
                    resolve(deleted)
                };
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
                //indexedDB.deleteDatabase(plugin.indexName);
            }
        };
    });
}
