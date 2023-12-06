
import { IndexDatabase } from "../DatabaseManager";
import { StoreManager } from "../StoreManager";

export class FileClassViewStore extends StoreManager {
    constructor(public indexDB: IndexDatabase,) {
        super(indexDB, "fileClassView")
    }
}