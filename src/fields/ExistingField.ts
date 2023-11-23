import { TFile } from "obsidian"
import Field from "./Field"
import { IndexedExistingField } from "src/index/FieldIndexBuilder"
import MetadataMenu from "main"
import { ObjectListItem } from "./fieldManagers/ObjectListField"
import { Note } from "src/note/note"

export class ExistingField {
    public name: string
    constructor(
        public field: Field,
        public value?: any,
        public indexedId?: string,
        public indexedPath?: string
    ) {
        this.name = this.field.name
        this.indexedId = this.indexedId || this.field.id
        this.indexedPath = this.indexedPath || this.indexedId
    }

    public isRoot() {
        return this.indexedId === this.indexedPath
    }

    static async getExistingFieldsFromIndexForFilePath(plugin: MetadataMenu, file: TFile, indexedPath?: string): Promise<ExistingField[]> {
        const existingFields: ExistingField[] = [];
        const iEFields = await plugin.indexDB.fieldsValues.getElementsForFilePath<IndexedExistingField[]>(file.path) as IndexedExistingField[]
        iEFields.forEach(iEF => {
            const field = Field.getFieldFromId(plugin, iEF.fieldId, iEF.fileClassName)
            const value = iEF.value
            const indexedId = iEF.indexedId
            const indexedPath = iEF.indexedPath
            if (field) existingFields.push(new ExistingField(field, value, indexedId, indexedPath))
        })
        return existingFields
    }

    static async getExistingFieldFromIndexForIndexedPath(plugin: MetadataMenu, file: TFile, indexedPath?: string): Promise<ExistingField | undefined> {
        const iEFields = await plugin.indexDB.fieldsValues.getElementsForFilePath<IndexedExistingField[]>(file.path) as IndexedExistingField[]
        const iEF = iEFields?.find(iEF => !indexedPath || iEF.indexedPath === indexedPath)
        if (iEF) {
            const field = Field.getFieldFromId(plugin, iEF.fieldId, iEF.fileClassName)
            const value = iEF.value
            const indexedId = iEF.indexedId
            const indexedPath = iEF.indexedPath
            if (field) return new ExistingField(field, value, indexedId, indexedPath)
        }
        return
    }

    public async getChildrenFields(plugin: MetadataMenu, file: TFile): Promise<ObjectListItem[]> {
        if (!Array.isArray(this.value)) return []
        const items: ObjectListItem[] = []
        await Promise.all(this.value.map(async (value, index) => {
            //on crée les ObjectListItem
            const upperPath = `${this.indexedPath}[${index}]`
            const eFields = (await ExistingField.getExistingFieldsFromIndexForFilePath(plugin, file))?.filter(eF =>
                eF.indexedPath && Field.upperPath(eF.indexedPath) === upperPath)
            items.push({
                fields: eFields,
                indexInList: index,
                indexedPath: upperPath
            })
        }))
        return items
    }

    static buildPayload(note: Note, indexedEF: IndexedExistingField[], putPayload: IndexedExistingField[], delPayload: string[]): void {
        const f = note.file
        note.existingFields.forEach(eF => {
            const id = `${f.path}____${eF.indexedPath}`
            putPayload.push({
                id: id,
                filePath: f.path,
                fieldName: eF.field.name,
                fieldType: eF.field.type,
                fieldId: eF.field.id,
                fileClassName: eF.field.fileClassName,
                indexedPath: eF.indexedPath || eF.field.id,
                indexedId: eF.indexedId,
                value: eF.value,
                time: f.stat.mtime
            })
        })
        /* remove disappeared fields */
        const noteEF = note.existingFields.map(_eF => _eF.indexedPath)
        const fileIndexedEF = indexedEF.filter(eF => eF.filePath === f.path)
        fileIndexedEF.forEach(eF => {
            if (!noteEF.includes(eF.indexedPath)) {
                delPayload.push(`${f.path}____${eF.indexedPath}`)
            }
        })
    }

    static async indexFieldsValues(plugin: MetadataMenu, changedFiles: TFile[] = []): Promise<void> {
        /*
        updates the fieldsValues store with the current values
        of each indexed fields for each indexable file

        this operation is cost intensive because it eventually 
        - reads a lot of files and 
        - builds a lot of notes objects

        therefore we try to identify which files need to be indexed:
        1. the one that have changed while the vault is closed 
        app.vault.on("modifiy") isn't triggered
        we look at stat.mtime
        if it is after lastUpdate (of fieldsValues) we need to index this file's fields values
        
        
        2. the one that have changed (one of the fields values can have changed) when the vault is opened: 
        triggered by app.vault.on("modify") -> included in changedFiles
        
        3. the ones for which the fields definition have changed:
        nothing has changed in the file but 
        lines that were not identified as containing indexable fields may now contain indexable fields, 
        and fields that were preivously indexable may not be indexable anymore -> they have to be removed from fielsValues
        for that we compare the current version of the file's fields definition by checking filesFieldsLastChange
        if it has changed -> we need to index fields values 

        */
        plugin.indexStatus.setState("indexing")
        const putPayload: IndexedExistingField[] = []
        const delPayload: string[] = []
        const lastUpdate: number | undefined = (await plugin.indexDB.updates.getElement("fieldsValues") as { id: string, value: number } || undefined)?.value
        const indexedEF: IndexedExistingField[] = (await plugin.indexDB.fieldsValues.getElement('all') as IndexedExistingField[] | undefined) || []
        const files = plugin.fieldIndex.indexableFiles()
            .filter(_f => {
                const lastChangeInFields = plugin.fieldIndex.filesFieldsLastChange.get(_f.path)
                return !lastChangeInFields || !lastUpdate || lastChangeInFields >= lastUpdate || _f.stat.mtime > lastUpdate
            })
            .filter(_f => !changedFiles.length || changedFiles.map(cF => cF.path).includes(_f.path))
        let start = Date.now()
        await Promise.all(files.map(async f => {
            const note = await Note.buildNote(plugin, f)
            ExistingField.buildPayload(note, indexedEF, putPayload, delPayload)
        }))
        await plugin.indexDB.fieldsValues.bulkEditElements(putPayload)
        await plugin.indexDB.fieldsValues.bulkRemoveElements(delPayload)
        await plugin.indexDB.updates?.update("fieldsValues")
        DEBUG && console.log("indexed VALUES for ", files.length, "files in ", (Date.now() - start) / 1000, "s")
        plugin.indexStatus.setState("indexed")
    }
}
