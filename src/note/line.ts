import MetadataMenu from "main";
import { Note } from "./note"
import { LineNode } from "./lineNode";
import { getLineFields } from "src/utils/parser";
import { FieldType, frontmatterOnlyTypes } from "src/types/fieldTypes";

export class Line {
    public nodes: LineNode[] = []
    public parentLine?: Line
    public objectListLines: Line[][] = []
    public isNewListItem: boolean = false

    constructor(
        public plugin: MetadataMenu,
        public note: Note,
        public position: "yaml" | "inline",
        public rawContent: string = "",
        public number: number,
        public indentationLevel: number = 0,
        public shouldParse: boolean = true
    ) {
        this.buildNodes()
        this.insertLineInNote()
    }

    public buildNodes() {
        if (!(this.position === "yaml") && this.plugin.settings.frontmatterOnly) {
            new LineNode(this.plugin, this, this.rawContent)
            return
        }
        if (this.note.codeBlocksLines.includes(this.number)) this.shouldParse = false
        if (!(this.position === "yaml") &&
            !this.note.prefixedLines.includes(this.number) &&
            !this.note.inlineFieldsLines.includes(this.number)
        ) this.shouldParse = false

        if (!this.shouldParse) {
            new LineNode(this.plugin, this, this.rawContent)
            return
        }
        switch (this.position) {
            case "yaml":
                new LineNode(this.plugin, this, this.rawContent)
                break;
            case "inline":
                const fields = getLineFields(this.rawContent)
                const nodesIndexes = [0]
                for (const field of fields) {
                    const fieldIndex = field.index
                    const nextNodeIndex = field.index + field.length
                    if (nodesIndexes.indexOf(fieldIndex) === -1) nodesIndexes.push(fieldIndex)
                    nodesIndexes.push(nextNodeIndex)
                }
                for (const index of nodesIndexes) {
                    const parsedField = fields.find(_field => _field.index === index)
                    if (parsedField) {
                        const start = parsedField.index
                        const end = start + parsedField.length
                        const _field = this.note.getFieldFromNameAndPath(parsedField.attribute)
                        const field = _field && !frontmatterOnlyTypes.includes(_field.type) ? _field : undefined
                        new LineNode(this.plugin, this, this.rawContent.slice(start, end), 0, index, field, parsedField.values, parsedField)
                    } else {
                        //no field, just text
                        const nextIndex = nodesIndexes[nodesIndexes.indexOf(index) + 1] || this.rawContent.length
                        const content = this.rawContent.slice(index, nextIndex)
                        if (content) new LineNode(this.plugin, this, content, 0, index)
                    }
                }
                break
        }
    }

    public getParentLineWithField(): Line | undefined {
        if (this.parentLine) {
            if (!this.parentLine.nodes.some(node => !!node.field)) {
                return this.parentLine.getParentLineWithField()
            } else {
                return this.parentLine
            }
        } else {
            if (this.nodes.some(node => !!node.field)) return this
        }
    }

    public removeLineFromNote() {
        for (const _line of this.note.lines) {
            if (_line.number && _line.number >= this.number) {
                _line.number -= 1
            }
        }
        this.nodes = []
        this.note.lines.remove(this)
    }

    public getLastChildLine(): Line | undefined {
        let lastChildLine: Line = this
        for (const line of this.note.lines.filter(_l => _l.number > this.number)) {
            if (line.indentationLevel === 0) break
            if (line.indentationLevel > this.indentationLevel || (
                line.indentationLevel === this.indentationLevel &&
                line.nodes[0]?.field?.type === FieldType.ObjectList &&
                !line.isNewListItem
            )) {
                lastChildLine = line
            } else {
                break
            }
        }
        return lastChildLine
    }

    public insertLineInNote(): void {
        for (const _line of this.note.lines) {
            if (_line.number && _line.number >= this.number) {
                _line.number += 1
            }
        }
        this.note.lines.splice(this.number, 0, this)
    }

    public renderLine(asList: boolean = false, asBlockquote: boolean = false): void {
        const rawContent = this.nodes.map(node => node.rawContent).join("")
        this.rawContent = `${asBlockquote ? ">" : ""}${asList ? "- " : ""}${rawContent}`
    }
}
