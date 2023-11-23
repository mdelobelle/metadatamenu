
import { IndexDatabase } from "../DatabaseManager";
import { StoreManager } from "../StoreManager";

export class UpdatesStore extends StoreManager {
    constructor(public indexDB: IndexDatabase,) {
        super(indexDB, "updates")
    }

    public update = <T>(id: string) => this.executeRequest(
        (store: IDBObjectStore) => new Promise<T>((resolve, reject) => {
            let request!: IDBRequest<T>
            request = store.get(1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const serialized = JSON.parse(JSON.stringify({ id: id, value: Date.now() }));
                const updateRequest = store.put(serialized);
                updateRequest.onsuccess = () => resolve(request.result);
            };
        })
    )
}
