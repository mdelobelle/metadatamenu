import MetadataMenu from "main";
import { CachedMetadata, EditorPosition, parseYaml, TFile } from "obsidian";
import { FieldPayload, FieldsPayload } from "src/commands/postValues";
import Field from "src/fields/Field";
import { rawObjectTypes, FieldType, ReservedMultiAttributes, FieldManager } from "src/types/fieldTypes";
import { getFrontmatterPosition } from "src/utils/fileUtils";
import { Line } from "./line";
import { LineNode } from "./lineNode";
import * as Lookup from "src/types/lookupTypes";
import YAMLField from "src/fields/fieldManagers/YAMLField";
import { ObjectListItem } from "src/fields/fieldManagers/ObjectListField";


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
}

export class Note {
    public lines: Line[] = []
    public fields: Field[] = []
    public existingFields: ExistingField[] = []
    public cache: CachedMetadata | null

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
    ) {
        this.fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || []
        this.cache = this.plugin.app.metadataCache.getFileCache(file)
    }

    private getField(id: string): Field | undefined {
        return this.fields.find(field => field.id === id)
    }

    public getFieldFromName(name: string): Field | undefined {
        return this.fields.find(field => field.name === name)
    }

    public renderValueString(_rawValue: string, fieldType?: FieldType, indentationLevel: number = 0): string {
        if (_rawValue) {
            if (_rawValue.startsWith("[[")) {
                return `"${_rawValue}"`
            } else if (_rawValue.startsWith("#")) {
                return `${_rawValue}`;
            } else if (fieldType && rawObjectTypes.includes(fieldType)) {
                const indentation = `\n${"  ".repeat(indentationLevel + 1)}`
                return `${indentation}${_rawValue.split("\n").join(indentation)}`;
            } else {
                return parseYaml(_rawValue);
            };
        } else {
            return ""
        }
    }

    public renderMultiFields = (rawValue: string, itemRendering: (itemValue: string) => any) => {
        const values = rawValue
            .replace(/(\,\s+)/g, ',')
            .split(',')
            .filter(v => !!v)
            .map(value => itemRendering(value));
        return values.length ? values : ""
    }

    public renderFieldValue(
        field: Field,
        rawValue: string,
        location: "yaml" | "inline"
    ): any {
        const type = field?.type
        const indentationLevel = field?.path ? field.path.split("____").length : 0
        switch (location) {
            case "yaml":
                switch (type) {
                    case FieldType.Lookup: return this.renderMultiFields(rawValue, (item) => this.renderValueString(item, type, indentationLevel));
                    case FieldType.Multi: return this.renderMultiFields(rawValue, (item) => this.renderValueString(item, type, indentationLevel));
                    case FieldType.MultiFile: return this.renderMultiFields(rawValue, (item) => `"${item}"`);
                    case FieldType.Canvas: return this.renderMultiFields(rawValue, (item) => item ? `${item}` : "");
                    case undefined: if ([...ReservedMultiAttributes, this.plugin.settings.fileClassAlias].includes(field.name)) {
                        return this.renderMultiFields(rawValue, (item) => `${item}`)
                    } else {
                        return this.renderValueString(rawValue, type, indentationLevel);
                    };
                    default: return this.renderValueString(rawValue, type, indentationLevel);
                }
            case "inline":
                switch (type) {
                    case FieldType.Lookup: {
                        if (field &&
                            Lookup.bulletListLookupTypes.includes(field.options.outputType as Lookup.Type)
                        ) {
                            return this.renderMultiFields(rawValue, (item) => item);
                        } else {
                            return rawValue;
                        }
                    }
                    case FieldType.JSON: return JSON.stringify(JSON.parse(rawValue))
                    case FieldType.YAML: {
                        const fm = new FieldManager[FieldType.YAML](this.plugin, field) as YAMLField
                        return fm.dumpValue(rawValue)
                    }
                    default: return rawValue;
                }
        }
    }

    public async build() {
        const content = await app.vault.read(this.file)
        const { end: frontMatterEnd } = getFrontmatterPosition(this.plugin, this.file)
        content.split("\n").forEach((rawLine, i) => {
            const position = !!frontMatterEnd?.line && i <= frontMatterEnd?.line ? "yaml" : "inline"
            new Line(this.plugin, this, position, rawLine, i)
        })
        //console.log(this)
    }

    public getNodeForFieldName(fieldName: string): LineNode | undefined {
        for (const line of this.lines) {
            const node = line.nodes.find(_node => _node.field?.name === fieldName)
            if (node) return node
        }
        return undefined
    }

    //TODO: il faut appeler getNodeForIndexedPath à la place, c'est plus générique
    // la présence d'objectList rend cette méthode fausse, 
    // elle ne renverrait que le premier des fields d'un objectList pour un type donnée
    public getNodeForFieldId(fieldId: string): LineNode | undefined {
        for (const line of this.lines) {
            const node = line.nodes.find(_node => _node.field?.id === fieldId)
            if (node) return node
        }
        return undefined
    }

    public getExistingFieldForIndexedPath(indexedPath?: string): ExistingField | undefined {
        return this.existingFields.find(eF => eF.indexedPath === indexedPath)
    }

    public getExistingChildrenForIndexedPath(indexedPath?: string): ObjectListItem[] {
        const parentField = this.getExistingFieldForIndexedPath(indexedPath)
        if (!indexedPath || !parentField || !Array.isArray(parentField.value)) return []
        const items: ObjectListItem[] = []
        parentField.value.forEach((value, index) => {
            //on crée les ObjectListItem
            const upperPath = `${indexedPath}[${index}]`
            const eFields = this.existingFields.filter(eF => eF.indexedPath && Field.upperPath(eF.indexedPath) === upperPath)
            items.push({
                fields: eFields,
                indexInList: index,
                indexedPath: upperPath
            })
        })
        return items
    }

    public getNodeForIndexedPath(indexedPath: string) {
        for (const line of this.lines) {
            const node = line.nodes.find(_node => _node.indexedPath === indexedPath)
            if (node) return node
        }
        return undefined
    }

    public getNodeAtPosition(position: EditorPosition): LineNode | undefined {
        const { ch: cursor, line: lineNumber } = position
        const nodes = this.lines.find(line => line.number === lineNumber)?.nodes || []
        nodes.sort((a, b) => a.index - b.index)
        for (const node of nodes) {
            if (node.index <= cursor && cursor <= (node.rawContent.length + node.index)) return node
        }
        return
    }

    private createLine = (value: string, position: "yaml" | "inline", lineNumber: number, field?: Field) => {
        //will create a line at lineNumber
        //the current line at LineNumber and following lines will be shifted one line below
        const newLine = new Line(this.plugin, this, position, "", lineNumber)
        const newNode = new LineNode(this.plugin, newLine)
        if (field) newNode.createFieldNodeContent(field, value, position);
        newLine.renderLine()
    }
    //TODO: remove field, in case of objectList items, it will be funny

    private insertField(id: string, payload: FieldPayload, indexedPath?: string, lineNumber?: number): void {
        //TODO: manage insertion of pbjectlist item

        //TODO: changer postValues il faut utiliser le indexedPath à la place de l'id
        const frontMatterEnd = getFrontmatterPosition(this.plugin, this.file)?.end?.line
        if (lineNumber === -1 && !frontMatterEnd) {
            for (let i of [0, 1]) new Line(this.plugin, this, "yaml", "---", 0)
        }
        if (id.startsWith("fileclass-field")) {
            const fR = id.match(/fileclass-field-(?<fileClassAlias>.*)/)
            if (fR?.groups?.fileClassAlias) {
                const content = `${fR.groups.fileClassAlias}: ${payload.value}`
                const newLine = new Line(this.plugin, this, "yaml", content, 1)
                newLine.renderLine()

            }
        } else if (id.startsWith("new-field-")) {
            const position = frontMatterEnd && ((lineNumber || this.lines.length) <= frontMatterEnd) ? "yaml" : "inline"
            const _ = position === "yaml" ? ":" : "::"
            const fR = id.match(/new-field-(?<fieldName>.*)/)
            if (fR?.groups?.fieldName) {
                const content = `${fR.groups.fieldName}${_} ${payload.value}`
                const newLine = new Line(this.plugin, this, position, content, lineNumber || this.lines.length)
                newLine.renderLine()
            }
        } else {
            if (indexedPath) {
                const upperPath = Field.upperPath(indexedPath)
                const { id: _id, index } = Field.getIdAndIndex(upperPath.split("___").last())
                if (index) {
                    const i = parseInt(index)
                    //we are in an Item of an ObjectList
                    //if the parent field doesn't exist, lets quit
                    const parentFieldIndexedPath = upperPath.replace(/\[\w+\]$/, '')
                    const parentNode = this.getNodeForIndexedPath(parentFieldIndexedPath)
                    const field = this.getField(_id)
                    if (!parentNode) return
                    const lastItemLineNumber = parentNode.line.objectListLines[i].last()?.number
                    if (lastItemLineNumber) {
                        this.createLine(payload.value, "yaml", lastItemLineNumber, field)
                        console.log("note after line: ", this)
                    } else {
                        // get the last item of objectListLines or under parentNote.line
                    }
                } else {
                    //not in an ObjectList paste the code below?
                }
            } else {
                const field = this.getField(id)
                if (!field) return
                let insertLineNumber =
                    (lineNumber ? Math.max(lineNumber, 0) : undefined) ||
                    frontMatterEnd ||
                    this.lines.last()?.number ||
                    0

                const position = frontMatterEnd && (insertLineNumber <= frontMatterEnd) ? "yaml" : "inline"

                //look for ancestors and create their lines
                //FIXME this is useless, we shouldn't accept to create a chiled field if parentfield is not created
                const ancestors = field.getAncestors()
                ancestors.forEach((ancestor, level) => {
                    const node = this.getNodeForFieldId(ancestor.id)
                    if (node) {
                        insertLineNumber = node.line.number! + 1
                    } else {
                        const ancestorField = this.fields.find(field => field.id === ancestor.id)!
                        this.createLine("", position, insertLineNumber, ancestorField)
                        insertLineNumber += 1
                    }
                })
                this.createLine(payload.value, position, insertLineNumber, field)
            }
        }
    }


    public createOrUpdateFields(fields: FieldsPayload, lineNumber?: number): void {
        fields.forEach(field => {
            const node = this.getNodeForIndexedPath(field.id)
            if (node && node.field) {
                //update : on déconstruit et reconstruit le node
                node.createFieldNodeContent(node.field, field.payload.value, node.line.position)
                node.line.renderLine()
            } else {
                //insert
                this.insertField(field.id, field.payload, field.id, lineNumber)
            }
        })
        this.plugin.fileTaskManager.pushTask(async () => { await this.plugin.app.vault.modify(this.file, this.renderNote()) })
    }

    public renderNote(): string {
        return this.lines.map(line => line.rawContent).join("\n")
    }
}