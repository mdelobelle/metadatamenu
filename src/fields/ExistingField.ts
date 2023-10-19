import { TFile } from "obsidian"
import Field from "./Field"
import * as fieldsValues from 'src/db/stores/fieldsValues'
import { IndexedExistingField } from "src/components/FieldIndex"
import MetadataMenu from "main"
import { ObjectListItem } from "./fieldManagers/ObjectListField"

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
        const iEFields = await fieldsValues.getElementsForFilePath<IndexedExistingField[]>(file.path)
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
        const existingFields: ExistingField[] = [];
        const iEFields = await fieldsValues.getElementsForFilePath<IndexedExistingField[]>(file.path)
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
}