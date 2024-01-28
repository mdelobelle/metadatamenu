import { TFile } from "obsidian"
import MetadataMenu from "main"
import { ObjectListItem } from "./fieldManagers/ObjectListField"
import { Note } from "src/note/note"
import { LinePosition } from "src/note/line"
import { LineNode } from "src/note/lineNode"
import { Field, fieldValueManager, upperPath as getUpperPath } from "./Field"
import { displayItem } from "./models/ObjectList"

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
                eF.indexedPath && getUpperPath(eF.indexedPath) === upperPath)
            items.push({
                fields: eFields,
                indexInList: index,
                indexedPath: upperPath
            })
        }))
        return items
    }

    public getItemDisplayForIndex(plugin: MetadataMenu, index: string | number) {
        if (this.field.type !== "ObjectList") return ""
        let numIndex: number
        if (typeof index === "string") {
            numIndex = parseInt(index)
        } else {
            numIndex = index
        }
        if (!isNaN(numIndex) && this.field) {
            const item = (this.value)[numIndex]
            const fieldVM = fieldValueManager(plugin, this.field.id, this.field.fileClassName, this.file, this, this.indexedPath)
            if (fieldVM) return displayItem(fieldVM, item, numIndex)
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


export async function getExistingFieldForIndexedPath(plugin: MetadataMenu, file: TFile, indexedPath: string | undefined): Promise<ExistingField | undefined> {
    const eFs = await Note.getExistingFields(plugin, file)
    return eFs.find(eF => eF.indexedPath === indexedPath)
}