import { TFile } from "obsidian"
import Field from "./Field"
import MetadataMenu from "main"
import ObjectListField, { ObjectListItem } from "./fieldManagers/ObjectListField"
import { Note } from "src/note/note"
import { FieldType } from "src/types/fieldTypes"
import { FieldManager as FM } from "src/types/fieldTypes";

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
        return this.field.path === ""
        //return this.indexedId === this.indexedPath
    }

    public async getChildrenFields(plugin: MetadataMenu, file: TFile): Promise<ObjectListItem[]> {
        if (!Array.isArray(this.value)) return []
        const items: ObjectListItem[] = []
        await Promise.all(this.value.map(async (value, index) => {
            //on crée les ObjectListItem
            const upperPath = `${this.indexedPath}[${index}]`
            const eFields = (await Note.getExistingFields(plugin, file)).filter(eF =>
                eF.indexedPath && Field.upperPath(eF.indexedPath) === upperPath)
            items.push({
                fields: eFields,
                indexInList: index,
                indexedPath: upperPath
            })
        }))
        return items
    }

    public getItemDisplayForIndex(plugin: MetadataMenu, index: string | number) {
        if (this.field.type !== FieldType.ObjectList) return ""
        let numIndex: number
        if (typeof index === "string") {
            numIndex = parseInt(index)
        } else {
            numIndex = index
        }
        if (!isNaN(numIndex) && this.field) {
            const item = (this.value)[numIndex]
            const fieldManager = new FM[this.field.type](plugin, this.field) as ObjectListField
            return fieldManager.displayItem(item, numIndex)
        } else {
            return `${this.name}[${index}]`
        }
    }
}
