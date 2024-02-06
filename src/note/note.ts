import MetadataMenu from "main";
import { EditorPosition, Notice, parseYaml, TFile } from "obsidian";
import { FieldPayload, IndexedFieldsPayload } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import * as Lookup from "src/types/lookupTypes";
import { Line, LinePosition } from "./line";
import { LineNode } from "./lineNode";
import { dumpValue } from "src/fields/models/YAML";
import { getIdAndIndex, Field, upperIndexedPathObjectPath } from "src/fields/Field";
import { FieldType, frontmatterOnlyTypes, rawObjectTypes, ReservedMultiAttributes } from "src/fields/Fields";

export class Note {
    public lines: Line[] = []
    public fields: Field[] = []
    public existingFields: ExistingField[] = []
    public frontmatter?: Object
    public frontmatterPosition?: {
        end: {
            line: number;
        },
        start: {
            line: number;
        }
    }
    public codeBlocksLines: number[] = []
    public inlineFieldsLines: number[] = []
    public prefixedLines: number[] = []
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
            if (_rawValue.startsWith("[[") || _rawValue.startsWith("![[")) {
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

    public renderMultiFilesFields = (rawValue: string, itemRendering: (itemValue: string) => any) => {
        const values = ((rawValue.match(/\!?\[(?:\[??[^\[]*?\]\])/g) || []) as string[])
            .map(value => itemRendering(value));
        return values?.length ? values : ""
    }

    public renderFieldValue(
        field: Field,
        rawValue: string,
        location: LinePosition
    ): any {
        const type = field?.type
        const indentationLevel = field?.path ? field.path.split("____").length : 0
        switch (location) {
            case "yaml":
                switch (type) {
                    case "Lookup": return this.renderMultiFilesFields(rawValue, (item) => this.renderValueString(item, type, indentationLevel));
                    case "Multi": return this.renderMultiFields(rawValue, (item) => this.renderValueString(item, type, indentationLevel));
                    case "MultiFile": return this.renderMultiFilesFields(rawValue, (item) => `"${item}"`);;
                    case "MultiMedia": return this.renderMultiFilesFields(rawValue, (item) => `"${item}"`);
                    case "Canvas": return this.renderMultiFilesFields(rawValue, (item) => item ? `"${item}"` : "");
                    case "CanvasGroup": return this.renderMultiFields(rawValue, (item) => this.renderValueString(item, type, indentationLevel));
                    case "CanvasGroupLink": return this.renderMultiFilesFields(rawValue, (item) => item ? `"${item}"` : "");
                    case undefined: if ([...ReservedMultiAttributes, this.plugin.settings.fileClassAlias].includes(field.name)) {
                        return this.renderMultiFields(rawValue, (item) => `${item}`)
                    } else {
                        return this.renderValueString(rawValue, type, indentationLevel);
                    };
                    default: return this.renderValueString(rawValue, type, indentationLevel);
                }
            case "inline":
                switch (type) {
                    case "Lookup": {
                        if (field &&
                            Lookup.bulletListLookupTypes.includes(field.options.outputType as Lookup.Type)
                        ) {
                            return this.renderMultiFields(rawValue, (item) => item);
                        } else {
                            return rawValue;
                        }
                    }
                    case "JSON": return JSON.stringify(JSON.parse(rawValue || "{}"))
                    case "YAML": {
                        return dumpValue(rawValue)
                    }
                    default: return rawValue;
                }
        }
    }

    private buildSections(content: string) {
        //build the frontmatter object to avoid obsidian's metadataCache not being updated soon enough
        const yamlLines: string[] = []
        let inFrontmatter = false
        let inStartingBlankLines = false
        let frontmatterStart: { line: number } | undefined
        let frontmatterEnd: { line: number } | undefined
        let startsWithText = false
        let previousLineIsCode: boolean = false
        for (const [i, rawLine] of content.split("\n").entries()) {
            if (frontmatterEnd === undefined) {
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
            }
            if (!inFrontmatter) {
                if (this.plugin.settings.frontmatterOnly) break;
                if (rawLine.startsWith("```")) {
                    this.codeBlocksLines.push(i)
                    previousLineIsCode = !previousLineIsCode
                } else if (previousLineIsCode) {
                    this.codeBlocksLines.push(i)
                } else {
                    if (rawLine.includes("::")) this.inlineFieldsLines.push(i)
                    if ([" ", "-", ">", "*", "~", "_", "`"].some(prefix => rawLine.startsWith(prefix))) this.prefixedLines.push(i)
                }
            }
        }
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
        const content = await this.plugin.app.vault.read(this.file)
        const lines = content.split("\n")

        this.buildSections(content)
        const frontmatterEnd = this.frontmatterEnd()
        for (const [i, rawLine] of lines.entries()) {
            const position = !!frontmatterEnd && i <= frontmatterEnd ? "yaml" : "inline"
            new Line(this.plugin, this, position, rawLine, i)
        }
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
        position: LinePosition,
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

    private initFrontmatter() {
        new Line(this.plugin, this, "yaml", "---", 0)
        new Line(this.plugin, this, "yaml", "---", 0)
        this.frontmatter = {}
        this.frontmatterPosition = { start: { line: 0 }, end: { line: 1 } }
    }

    private insertField(
        indexedPath: string,
        payload: FieldPayload,
        lineNumber?: number,
        asList: boolean = false,
        asBlockquote: boolean = false
    ): void {
        const upperPath = upperIndexedPathObjectPath(indexedPath)
        const { id, index } = getIdAndIndex(indexedPath.split("____").last())
        const { id: upperFieldId, index: upperFieldIndex } = getIdAndIndex(upperPath.split("____").last())
        if (lineNumber === -1 && !this.frontmatter) this.initFrontmatter()
        if (id.startsWith("fileclass-field")) {
            const fR = id.match(/fileclass-field-(?<fileClassAlias>.*)/)
            if (fR?.groups?.fileClassAlias) {
                const content = `${fR.groups.fileClassAlias}: ${payload.value}`
                const newLine = new Line(this.plugin, this, "yaml", content, 1)
                newLine.renderLine(asList, asBlockquote)

            }
            return
        }

        if (!upperFieldIndex) {
            //MDM_DEBUG && console.log("Not an item of objectlist")
            const field = this.getField(id)
            if (!field) return
            // initialize frontmatter and get insertion line and position
            if (frontmatterOnlyTypes.includes(field.type) && !this.frontmatter) this.initFrontmatter()
            const frontmatterEnd = this.frontmatterEnd()
            let insertLineNumber = lineNumber === 0
                ? 0
                : ((lineNumber !== undefined ? Math.max(lineNumber, 0) : undefined) ||
                    frontmatterEnd ||
                    this.lines.last()?.number ||
                    0)
            if (frontmatterOnlyTypes.includes(field.type)) insertLineNumber = frontmatterEnd!
            const position = frontmatterEnd && (insertLineNumber <= frontmatterEnd) ? "yaml" : "inline"

            if (field.type !== "ObjectList") {
                //MDM_DEBUG && console.log("Not an ObjectList")
                const parentField = this.existingFields.find(eF => eF.indexedPath === upperPath)
                if (parentField?.field.type === "Object") {
                    //MDM_DEBUG && console.log("child of an object")
                    const parentLine = this.getNodeForIndexedPath(upperPath)?.line
                    const lastChildLine = parentLine?.getLastChildLine()
                    this.createLine(payload.value, "yaml", lastChildLine ? lastChildLine.number + 1 : 1, field, asList, asBlockquote)
                } else {
                    //MDM_DEBUG && console.log("No parent field or parent not an object")
                    this.createLine(payload.value, position, insertLineNumber, field, asList, asBlockquote)
                }
            } else {

                //MDM_DEBUG && console.log("An ObjectList")
                //specific case where the field is object but the upperIndex is unknown
                //it mean that we have to insert a new ObjectList Header
                const upperNode = this.getNodeForIndexedPath(upperPath)
                if (!upperNode) {

                    //MDM_DEBUG && console.log("no upper node (shouldnt exist)")
                    const objectListHeaderLine = new Line(this.plugin, this, position, `${field.name}:`, insertLineNumber)
                    objectListHeaderLine.renderLine()
                } else {
                    if (upperNode.field?.id !== field.id) {
                        //MDM_DEBUG && console.log("upper node indexed path !==  this indexed path we are adding the header and a first item")
                        const objectListHeaderLine = new Line(this.plugin, this, position, "", upperNode.line.number! + 1)
                        const node = new LineNode(this.plugin, objectListHeaderLine, "")
                        node.createFieldNodeContent(field, "", "yaml")
                        node.line.renderLine()
                    } else {
                        //MDM_DEBUG && console.log("the object list doesn't have a first item, let's create it")
                        const newItemLine = new Line(this.plugin, upperNode.line.note, position, "", upperNode.line.number! + 1)
                        // if field is not in a list, shift of 0, else shift 1
                        const shift = /^(\s+)-(\s+)?(.*)/.test(upperNode.rawContent) ? 1 : 0
                        new LineNode(this.plugin, newItemLine, upperNode.buildIndentedListItem("", shift))
                        newItemLine.renderLine()
                    }
                }
            }
        } else {
            //MDM_DEBUG && console.log("in an existing item of an object list")
            const i = parseInt(upperFieldIndex)
            const parentFieldIndexedPath = upperPath.replace(/\[\w+\]$/, '')
            const parentNode = this.getNodeForIndexedPath(parentFieldIndexedPath)
            if (!parentNode) {
                new Notice("A parent field is missing, this field can't be added")
                return
            }
            const field = this.getField(id)
            const lastItemLine = parentNode.line.objectListLines[i].last()
            if (lastItemLine) {
                //MDM_DEBUG && console.log("we have a last object for item")
                if (/-(\s+)?$/.test(parentNode.line.objectListLines[i].last()?.rawContent || "") && field) {
                    //MDM_DEBUG && console.log("replace the placeholder")
                    const node = lastItemLine.nodes[0]
                    node.createFieldNodeContent(field, payload.value, "yaml");
                    node.line.renderLine(asList, asBlockquote)
                } else {
                    //MDM_DEBUG && console.log("add the field at the end")
                    const lastChildLine = lastItemLine.getLastChildLine()
                    this.createLine(payload.value, "yaml", lastChildLine ? lastChildLine.number + 1 : 1, field, asList, asBlockquote)
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
        fields: IndexedFieldsPayload,
        lineNumber?: number,
        asList: boolean = false,
        asBlockquote: boolean = false
    ): Promise<void> {
        fields.forEach(field => {
            const node = this.getNodeForIndexedPath(field.indexedPath)
            if (node && node.field) {
                node.createFieldNodeContent(node.field, field.payload.value, node.line.position, asList, asBlockquote)
                node.line.renderLine(asList, asBlockquote)
            } else {
                this.insertField(field.indexedPath, field.payload, lineNumber, asList, asBlockquote)
            }
        })
        await this.plugin.app.vault.modify(this.file, this.renderNote())
    }

    public renderNote(): string {
        return this.lines.map(line => line.rawContent).join("\n")
    }

    static async buildNote(plugin: MetadataMenu, file: TFile): Promise<Note> {
        const note = new Note(plugin, file)
        await note.build()
        return note
    }

    static async getExistingFields(plugin: MetadataMenu, file: TFile): Promise<ExistingField[]> {
        const note = await Note.buildNote(plugin, file)
        return note.existingFields
    }

    static async getExistingFieldForIndexedPath(plugin: MetadataMenu, file: TFile, indexedPath: string | undefined): Promise<ExistingField | undefined> {
        const eFs = await Note.getExistingFields(plugin, file)
        return eFs.find(eF => eF.indexedPath === indexedPath)
    }
}