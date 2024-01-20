import { TFile } from "obsidian"
import Field from "./_Field"
import MetadataMenu from "main"
import ObjectListField, { ObjectListItem } from "./fieldManagers/ObjectListField"
import { Note } from "src/note/note"
import { FieldType } from "src/types/fieldTypes"
import { FieldManager as FM } from "src/types/fieldTypes";
import { Line, LinePosition } from "src/note/line"
import { LineNode } from "src/note/lineNode"

interface IExistingField {
    node: LineNode
    field: Field
    value?: any
    indexedId?: string
    indexedPath?: string
}

export class ExistingField implements IExistingField {
    public name: string
    constructor(
        public node: LineNode,
        public field: Field,
        public value?: any,
        public indexedId?: string,
        public indexedPath?: string,
    ) {
        this.name = this.field.name
        this.indexedId = this.indexedId || this.field.id
        this.indexedPath = this.indexedPath || this.indexedId
    }

    get lineNumber(): number {
        return this.node.line.number
    }

    get position(): LinePosition {
        return this.node.line.position
    }

    get file(): TFile {
        return this.node.line.note.file
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


export function getValueDisplay(field: ExistingField | undefined): string {
    if (field?.value === ("" || null)) {
        return "<--Empty-->"
    } else if (!field) {
        return "<--Missing-->"
    } else {
        return field.value || ""
    }
}