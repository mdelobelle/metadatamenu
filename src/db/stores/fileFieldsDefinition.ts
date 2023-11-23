
import { IndexDatabase } from "../DatabaseManager";
import { StoreManager } from "../StoreManager";

/*

/!\ not usefull 
in order to determine the fileClass associated to a file we hav to go through the whole process of getFilesFields anyway


stores a file fields definition version
filePath : {
    fileClasses: [
        {
            name: " ... " // for settings, the name is `metadata_menu_<appId>_settings`
            version: " ... "
        }
    ]
}

lifecycle:
* when a fileClass/presetField is updated 
-> fieldIndex.indexFields is triggered 
-> this store has to be updated:
- update a file's FCs versions
- remove FC that have been deleted

* when a file has been updated (a tag has been added, a bookmark has been changed, a FC has been set ...) 
-> fieldIndex.indexField is triggered 
-> this store has to be updated

usage/ 
when one of these has changed, ExisitingFields.indexFieldsValues should be triggered for this file

*/

export class FileFieldsDefinitionStore extends StoreManager {
    constructor(public indexDB: IndexDatabase,) {
        super(indexDB, "fileFieldsDefinition")
    }

}