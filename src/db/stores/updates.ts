
let db: IDBDatabase;
const dbName = "metadatamenu_cache"
const store = "updateStore"

export const get = <T>() => {
    const open = indexedDB.open(dbName);
    return new Promise<T | undefined>((resolve, reject) => {
        open.onsuccess = () => {
            let request!: IDBRequest;
            db = open.result;
            if ([...db.objectStoreNames].find((name) => name === store)) {
                const transaction = db.transaction(store);
                const objectStore = transaction.objectStore(store);
                request = objectStore.get(1)
                request.onerror = () => reject(request.error)
                request.onsuccess = () => resolve(request.result)
            } else {
                resolve(undefined)
            }
        }
    })
}

export const update = <T>() => {
    const open = indexedDB.open(dbName);
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
                    const serialized = JSON.parse(JSON.stringify({ id: 1, value: Date.now() }));
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