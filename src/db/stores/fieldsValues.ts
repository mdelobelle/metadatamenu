import MetadataMenu from "main";
import { TFile } from "obsidian";
import { resolve } from "path";
import { IndexedExistingField } from "src/index/FieldIndexBuilder";
import { FieldType } from "src/types/fieldTypes";
import { IndexDatabase } from "../DatabaseManager";
import { StoreManager } from "../StoreManager";

export class FieldsValuesStore extends StoreManager {
    constructor(public indexDB: IndexDatabase,) {
        super(indexDB, "fieldsValues")
    }

    public getElementsForFilePath = <IndexedExistingField>(filePath: string) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<IndexedExistingField[]>((resolve, reject) => {
            let request!: IDBRequest<IndexedExistingField[]>
            const filePathIndex = store.index("filePath");
            request = filePathIndex.getAll(filePath);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        })
    )


    public getElementsForType = <T>(type: keyof typeof FieldType) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<T[] | undefined>((resolve, reject) => {
            let request!: IDBRequest<T[]>
            const filePathIndex = store.index("fieldType");
            request = filePathIndex.getAll(type);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        })
    )

    public getElementForIndexedPath = <T>(file: TFile, indexedPath?: string): Promise<T | undefined> => {
        if (indexedPath === undefined) resolve()
        const key = `${file.path}____${indexedPath}`
        return this.getElement<T>(key) as Promise<T | undefined>
    };

    public updateItemsAfterFileRename = (oldPath: string, filePath: string) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<void>((resolve, reject) => {
            let request!: IDBRequest
            const filePathIndex = store.index("filePath");
            request = filePathIndex.getAll(oldPath);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                for (const iEF of request.result) {
                    iEF.id = iEF.id.replace(oldPath, filePath)
                    iEF.filePath = filePath
                    const serialized = JSON.parse(JSON.stringify(iEF));
                    const updateRequest = store.put(serialized);
                    updateRequest.onsuccess = () => resolve();
                }
            }
        })
    )

    public bulkRemoveElementsForFile = (filePath: string) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<void>((resolve, reject) => {
            let request!: IDBRequest
            const filePathIndex = store.index("filePath");
            request = filePathIndex.getAll(filePath);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                for (const iEF of request.result) {
                    const delRequest = store.delete(iEF.id)
                    delRequest.onsuccess = () => resolve()
                }
            }
        })
    )

    public cleanUnindexedFiles = (plugin: MetadataMenu) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<IndexedExistingField[]>((resolve, reject) => {
            let request!: IDBRequest<IndexedExistingField[]>
            const indexedFilesPaths = plugin.fieldIndex.indexableFiles()
                .map(f => f.path)
            request = store.getAll();
            request.onerror = () => {
                reject(request.error)
            };
            request.onsuccess = () => {
                const deleted: IndexedExistingField[] = []
                const toDelete = request.result.filter(iEF => iEF.filePath)
                for (const iEF of toDelete) {
                    if (!(indexedFilesPaths).includes(iEF.filePath)) {
                        deleted.push(iEF)
                        const delRequest = store.delete(iEF.id);
                        delRequest.onsuccess = () => { };
                    }
                }
                resolve(deleted)
            };
        })
    )
}