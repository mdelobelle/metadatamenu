import { TFile } from "obsidian"
import Field from "./Field"
import * as fieldsValues from 'src/db/stores/fieldsValues'
import { IndexedExistingField } from "src/components/FieldIndex"
import MetadataMenu from "main"
import { ObjectListItem } from "./fieldManagers/ObjectListField"
import * as updates from "src/db/stores/updates";
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
        const iEFields = await fieldsValues.getElementsForFilePath<IndexedExistingField[]>(plugin, file.path)
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
        const iEFields = await fieldsValues.getElementsForFilePath<IndexedExistingField[]>(plugin, file.path)
        const iEF = iEFields.find(iEF => !indexedPath || iEF.indexedPath === indexedPath)
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

    static async buildPayload(note: Note, indexedEF: IndexedExistingField[], putPayload: IndexedExistingField[], delPayload: string[]): Promise<void> {
        const f = note.file
        note.existingFields.forEach(eF => {
            const id = `${f.path}____${eF.indexedPath}`
            putPayload.push({
                id: id,
                filePath: f.path,
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
        const putPayload: IndexedExistingField[] = []
        const delPayload: string[] = []
        const lastUpdate: number | undefined = (await updates.get(plugin, "fieldsValues") as { id: string, value: number } || undefined)?.value
        const indexedEF: IndexedExistingField[] = await fieldsValues.getElement(plugin, 'all')
        const files = plugin.app.vault.getMarkdownFiles()
            .filter(_f => !plugin.settings.classFilesPath || !_f.path.startsWith(plugin.settings.classFilesPath))
            .filter(_f => {
                const lastChangeInFields = plugin.fieldIndex.filesFieldsLastChange.get(_f.path)
                return !lastChangeInFields || !lastUpdate || lastChangeInFields >= lastUpdate || _f.stat.mtime > lastUpdate
            })
            .filter(_f => !changedFiles.length || changedFiles.map(cF => cF.path).includes(_f.path))
        console.log("indexing", files.length, "files")
        await Promise.all(files.map(async f => {
            const note = await Note.buildNote(plugin, f)
            await ExistingField.buildPayload(note, indexedEF, putPayload, delPayload)
        }))
        await fieldsValues.bulkEditElements(plugin, putPayload)
        fieldsValues.bulkRemoveElements(plugin, delPayload)
        await updates.update(plugin, "fieldsValues")
    }
}