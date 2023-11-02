import MetadataMenu from "main";
import { EditorPosition, Notice, parseYaml, TFile } from "obsidian";
import { FieldPayload, FieldsPayload } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import YAMLField from "src/fields/fieldManagers/YAMLField";
import { FieldManager, FieldType, rawObjectTypes, ReservedMultiAttributes } from "src/types/fieldTypes";
import * as Lookup from "src/types/lookupTypes";
import { Line } from "./line";
import { LineNode } from "./lineNode";

export class Note {
    public lines: Line[] = []
    public fields: Field[] = []
    public existingFields: ExistingField[] = []
    public frontmatter?: Object
    public frontmatterPosition?: {
        end: {
            line: number;
        };
        start: {
            line: number;
        };
    }
    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
    ) {
        this.fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || []
    }

    private getField(id: string): Field | undefined {
        return this.fields.find(field => field.id === id)
    }

    public getFieldFromNameAndPath(name: string, path: string = ""): Field | undefined {
        return this.fields.find(field => field.name === name && field.path === path)
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
                    case FieldType.JSON: return JSON.stringify(JSON.parse(rawValue || "{}"))
                    case FieldType.YAML: {
                        const fm = new FieldManager[FieldType.YAML](this.plugin, field) as YAMLField
                        return fm.dumpValue(rawValue)
                    }
                    default: return rawValue;
                }
        }
    }

    public buildFrontmatter(content: string) {
        //build the frontmatter object to avoid obsidian's metadataCache not being updated soon enough
        const yamlLines: string[] = []
        let inFrontmatter = false
        let inStartingBlankLines = false
        let frontmatterStart: { line: number } | undefined
        let frontmatterEnd: { line: number } | undefined
        let startsWithText = false
        content.split("\n").forEach((rawLine, i) => {
            if (!inFrontmatter) {
                if (rawLine.trim() === "") inStartingBlankLines = true
                else if (!this.frontmatterPosition?.end.line && rawLine !== "---") startsWithText = true
            }
            if (!startsWithText) {
                if (!inFrontmatter && !this.frontmatterPosition?.end.line && rawLine === "---" && (inStartingBlankLines || i === 0)) {
                    inFrontmatter = true
                    inStartingBlankLines = false
                    frontmatterStart = { line: i }
                }
                else if (inFrontmatter) {
                    if (rawLine === "---") {
                        inFrontmatter = false
                        frontmatterEnd = { line: i }
                    } else {
                        yamlLines.push(rawLine)
                    }
                }
            }
        })

        try {
            this.frontmatter = yamlLines.length ? parseYaml(yamlLines.join("\n")) : undefined
            if (frontmatterStart && frontmatterEnd) this.frontmatterPosition = {
                start: frontmatterStart,
                end: frontmatterEnd
            }
        } catch (error) {
            this.frontmatterPosition = undefined
        }
    }

    public async build() {
        const content = await app.vault.read(this.file)
        this.buildFrontmatter(content)
        const frontmatterEnd = this.frontmatterEnd()
        content.split("\n").forEach((rawLine, i) => {
            const position = !!frontmatterEnd && i <= frontmatterEnd ? "yaml" : "inline"
            new Line(this.plugin, this, position, rawLine, i)
        })
    }

    public getExistingFieldForIndexedPath(indexedPath?: string): ExistingField | undefined {
        return this.existingFields.find(eF => eF.indexedPath === indexedPath)
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

    private frontmatterEnd() {
        return this.frontmatterPosition?.end.line
    }

    private createLine = (
        value: string,
        position: "yaml" | "inline",
        lineNumber: number,
        field?: Field,
        asList: boolean = false,
        asBlockquote: boolean = false
    ) => {
        //will create a line at lineNumber
        //the current line at LineNumber and following lines will be shifted one line below
        const newLine = new Line(this.plugin, this, position, "", lineNumber)
        const newNode = new LineNode(this.plugin, newLine)
        if (field) newNode.createFieldNodeContent(field, value, position);
        newLine.renderLine(asList, asBlockquote)
    }


    private insertField(
        indexedPath: string,
        payload: FieldPayload,
        lineNumber?: number,
        asList: boolean = false,
        asBlockquote: boolean = false
    ): void {
        const upperPath = Field.upperIndexedPathObjectPath(indexedPath)

        const { id, index } = Field.getIdAndIndex(indexedPath.split("____").last())
        const { id: upperFieldId, index: upperFieldIndex } = Field.getIdAndIndex(upperPath.split("____").last())
        if (lineNumber === -1 && !this.frontmatter) {
            new Line(this.plugin, this, "yaml", "---", 0)
            new Line(this.plugin, this, "yaml", "---", 0)
            this.frontmatter = {}
            this.frontmatterPosition = { start: { line: 0 }, end: { line: 1 } }
        }
        if (id.startsWith("fileclass-field")) {
            const fR = id.match(/fileclass-field-(?<fileClassAlias>.*)/)
            if (fR?.groups?.fileClassAlias) {
                const content = `${fR.groups.fileClassAlias}: ${payload.value}`
                const newLine = new Line(this.plugin, this, "yaml", content, 1)
                newLine.renderLine(asList, asBlockquote)

            }
        } else if (id.startsWith("new-field-")) {
            const frontmatterEnd = this.frontmatterEnd()
            const position = frontmatterEnd && ((lineNumber || this.lines.length) <= frontmatterEnd) ? "yaml" : "inline"
            const _ = position === "yaml" ? ":" : "::"
            const fR = id.match(/new-field-(?<fieldName>.*)/)
            if (fR?.groups?.fieldName) {
                const content = `${fR.groups.fieldName}${_} ${payload.value}`
                const newLine = new Line(this.plugin, this, position, content, lineNumber || this.lines.length)
                newLine.renderLine(asList, asBlockquote)
            }
        } else {
            if (upperFieldIndex) {
                const i = parseInt(upperFieldIndex)
                //we are in an Item of an ObjectList
                const parentFieldIndexedPath = upperPath.replace(/\[\w+\]$/, '')
                const parentNode = this.getNodeForIndexedPath(parentFieldIndexedPath)
                //if the parent field doesn't exist, lets quit
                if (!parentNode) {
                    new Notice("A parent field is missing, this field can't be added")
                    return
                }
                const field = this.getField(id)
                const lastItemLine = parentNode.line.objectListLines[i].last()
                if (lastItemLine) {
                    //if line is " .... - " it is a place holder for fields, let's replace the content of this line's node
                    if (/-(\s+)?$/.test(parentNode.line.objectListLines[i].last()?.rawContent || "") && field) {
                        const node = lastItemLine.nodes[0]
                        node.createFieldNodeContent(field, payload.value, "yaml");
                        node.line.renderLine(asList, asBlockquote)
                    } else {
                        //lastItemLineNumber+1 doesn't work.... it can be an object of objectList and therefore have multiple sublists
                        const lastChildLine = lastItemLine.getLastChildLine()
                        this.createLine(payload.value, "yaml", lastChildLine ? lastChildLine.number + 1 : 1, field, asList, asBlockquote)
                    }
                }
            } else {
                const field = this.getField(id)
                if (!field) return
                const frontmatterEnd = this.frontmatterEnd()
                let insertLineNumber =
                    (lineNumber ? Math.max(lineNumber, 0) : undefined) ||
                    frontmatterEnd ||
                    this.lines.last()?.number ||
                    0
                const position = frontmatterEnd && (insertLineNumber <= frontmatterEnd) ? "yaml" : "inline"
                if (field.type === FieldType.ObjectList) {
                    //specific case where the field is object but the upperIndex is unknown
                    //it mean that we have to insert a new ObjectListItem
                    const node = this.getNodeForIndexedPath(upperPath)
                    if (node) {
                        const newItemLine = new Line(this.plugin, node.line.note, position, "", node.line.number! + 1)
                        // if field is not in a list, shift of 0, else shift 1
                        const shift = /^(\s+)-(\s+)?(.*)/.test(node.rawContent) ? 1 : 0
                        new LineNode(this.plugin, newItemLine, node.buildIndentedListItem("", shift))
                        newItemLine.renderLine(asList, asBlockquote)
                    } else {
                        const objectListHeaderLine = new Line(this.plugin, this, position, `${field.name}:`, insertLineNumber)
                        objectListHeaderLine.renderLine()
                    }
                } else {
                    const parentField = this.existingFields.find(eF => eF.indexedPath === upperPath)
                    if (parentField?.field.type === FieldType.Object) {
                        const parentLine = this.getNodeForIndexedPath(upperPath)?.line
                        const lastChildLine = parentLine?.getLastChildLine()
                        this.createLine(payload.value, "yaml", lastChildLine ? lastChildLine.number + 1 : 1, field, asList, asBlockquote)
                    } else {
                        this.createLine(payload.value, position, insertLineNumber, field, asList, asBlockquote)
                    }
                }
            }
        }
    }

    public async removeObject(indexedPath: string): Promise<void> {
        const nodes = this.lines.map(_l => _l.nodes.filter(_n => _n.indexedPath?.startsWith(indexedPath))).flat(Infinity) as LineNode[]
        nodes.map(_n => _n.line.removeLineFromNote())
        await this.plugin.app.vault.modify(this.file, this.renderNote())
    }

    public async createOrUpdateFields(
        fields: FieldsPayload,
        lineNumber?: number,
        asList: boolean = false,
        asBlockquote: boolean = false
    ): Promise<void> {
        fields.forEach(field => {
            const node = this.getNodeForIndexedPath(field.id)
            if (node && node.field) {
                node.createFieldNodeContent(node.field, field.payload.value, node.line.position, asList, asBlockquote)
                node.line.renderLine(asList, asBlockquote)
            } else {
                this.insertField(field.id, field.payload, lineNumber, asList, asBlockquote)
            }
        })
        await this.plugin.app.vault.modify(this.file, this.renderNote())
        await ExistingField.indexFieldsValues(this.plugin, [this.file])
    }

    public renderNote(): string {
        return this.lines.map(line => line.rawContent).join("\n")
    }

    static async buildNote(plugin: MetadataMenu, file: TFile): Promise<Note> {
        const note = new Note(plugin, file)
        await note.build()
        return note
    }
}
