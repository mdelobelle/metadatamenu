import MetadataMenu from "main";
import { Note } from "./note"
import { LineNode } from "./lineNode";
import { getLineFields } from "src/utils/parser";

export class Line {
    public nodes: LineNode[] = []
    public parentLine?: Line

    constructor(
        public plugin: MetadataMenu,
        public note: Note,
        public position: "yaml" | "inline",
        public rawContent: string = "",
        public number: number,
        public indentationLevel: number = 0
    ) {
        this.buildNodes()
        this.insertLineInNote()
    }

    public buildNodes() {
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
                        const field = this.note.getFieldFromName(parsedField.attribute)
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

    public getRootLineWithField(): Line | undefined {
        if (this.indentationLevel > 0) {
            return this.parentLine?.getRootLineWithField()
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

    public insertLineInNote(): void {
        for (const _line of this.note.lines) {
            if (_line.number && _line.number >= this.number) {
                _line.number += 1
            }
        }
        this.note.lines.splice(this.number, 0, this)
    }

    public renderLine(): void {
        this.rawContent = this.nodes.map(node => node.rawContent).join("")
    }
}
