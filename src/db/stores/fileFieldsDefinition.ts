
import { IndexDatabase } from "../DatabaseManager";
import { StoreManager } from "../StoreManager";

export class FieldsValuesStore extends StoreManager {
    constructor(public indexDB: IndexDatabase,) {
        super(indexDB, "fileFieldsDefinition")
    }

}