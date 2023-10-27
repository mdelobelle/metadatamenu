import MetadataMenu from "main";

let db: IDBDatabase;
const store = "updateStore"

export const get = <T>(plugin: MetadataMenu, id: string) => {
    const open = indexedDB.open(plugin.indexName);
    return new Promise<T | undefined>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                request = objectStore.get(id)
                request.onerror = () => reject(request.error)
                request.onsuccess = () => resolve(request.result)
            } else {
                resolve(undefined)
            }
        }
    })
}

export const update = <T>(plugin: MetadataMenu, id: string) => {
    const open = indexedDB.open(plugin.indexName);
    return new Promise<T>((resolve, reject) => {
        open.onsuccess = () => {
            let request: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store, 'readwrite');
                const objectStore = transaction.objectStore(store);
                request = objectStore.get(1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const serialized = JSON.parse(JSON.stringify({ id: id, value: Date.now() }));
                    const updateRequest = objectStore.put(serialized);
                    updateRequest.onsuccess = () => resolve(request.result);
                };
                transaction.oncomplete = () => db.close();
            } else {
                console.error("store not found")
            }
        };
    });
};


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