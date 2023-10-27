export default function () {
    //console.log("create db")
    const dbName = "metadatamenu_cache"
    const keys = {
        updates: [
            { name: 'id', fields: 'id', unique: true }
        ],
        fieldsValues: [
            { name: 'id', fields: 'id', unique: true },
            { name: 'filePath', fields: 'filePath', unique: false },
            { name: 'fieldType', fields: 'fieldType', unique: false }
        ]
    };

    let db!: IDBDatabase;
    const request = indexedDB.open(dbName, 1);
    request.onerror = (err) => console.error(`IndexedDB error: ${request.error}`, err);
    request.onsuccess = () => (db = request.result);
    request.onupgradeneeded = () => {
        const db = request.result;
        const updateStore = db.createObjectStore('updateStore', { keyPath: keys.updates[0].name });
        keys.updates.forEach((key) => updateStore.createIndex(key.name, key.fields, { unique: key.unique }));
        const fieldsValuesStore = db.createObjectStore('fieldsValuesStore', { keyPath: keys.fieldsValues[0].name });
        keys.fieldsValues.forEach((key) => fieldsValuesStore.createIndex(key.name, key.fields, { unique: key.unique }));
    };
}

