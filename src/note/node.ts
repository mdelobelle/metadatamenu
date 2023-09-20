import MetadataMenu from "main";
import { FieldPayload } from "src/commands/postValues";
import Field from "src/fields/Field";
import { FieldType, MultiDisplayType } from "src/types/fieldTypes";
import { Note } from "./note";
import { Line } from "./line";
import { frontMatterLineField, parsedField } from "src/utils/parser";
import { buildEndStyle, buildStartStyle } from "src/types/dataviewTypes";
import * as Lookup from "src/types/lookupTypes";

export const separator: Record<"yaml" | "inline", ":" | "::"> = {
    "yaml": ":",
    "inline": "::"
}

export const enclosure: Record<"brackets" | "parenthesis", { start: "(" | "[", end: ")" | "]" }> = {
    "brackets": {
        start: "[",
        end: "]"
    },
    "parenthesis": {
        start: "(",
        end: ")"
    }
}

export class Node {

    constructor(
        public plugin: MetadataMenu,
        public line: Line,
        public rawContent: string = "",
        public level: number = 0,
        public index: number = 0,
        public field?: Field,
        public value?: string,
        public parsedField?: parsedField
    ) {
        //try to get field from content if not provided
        if (this.line.position === "yaml") {
            for (const field of this.line.note.fields) {
                const yamlAttr = frontMatterLineField(this.rawContent)
                if (yamlAttr === field.name) {
                    this.field = field
                    break;
                }
            }
        }
        this.line.nodes.push(this)
    }

    public buildDecoratedFieldName = (): string => {
        if (!this.field) return ""
        const ancestors = this.field.getAncestors(this.plugin);
        const level = ancestors.length
        switch (this.line.position) {
            case "yaml":
                return `${"  ".repeat(level)}${this.field.name}`;
            case "inline":
                {
                    const targetStartStyle = buildStartStyle(this.field.style || {})
                    const targetEndStyle = buildEndStyle(this.field.style || {})
                    return `${targetStartStyle}${this.field.name}${targetEndStyle}`
                }
        }

    }

    public buildIndentedListItem = (plugin: MetadataMenu, value: any) => {
        if (!this.field) return ""
        const ancestors = this.field.getAncestors(plugin);
        const level = ancestors.length
        return `${"  ".repeat(level + 1)}- ${value}`
    }

    public removeIndentedListItems = () => {
        if (!this.field ||
            !(this.field.getDisplay(this.plugin) === MultiDisplayType.asList ||
                this.field.type === FieldType.JSON ||
                this.field.type === FieldType.YAML ||
                this.field.type === FieldType.Lookup)
        ) return
        const indentLevel = this.field.getAncestors(this.plugin).length
        const nextLines = this.line.note.lines.filter(_line => _line.number > this.line.number)
        for (const line of nextLines) {
            if (line.rawContent.startsWith("  ".repeat(indentLevel + 1))) {
                line.removeLineFromNote()
            } else {
                break
            }
        }
    }

    public wrapField(content: string): string {
        if (this.parsedField) {
            const enclosureType = this.parsedField.enclosureType
            if (enclosureType) {
                const start = enclosure[enclosureType].start
                const end = enclosure[enclosureType].end
                return `${start}${content}${end}`
            }
        }
        return content
    }

    public createFieldNodeContent(fieldName: string, value: string, location: "yaml" | "inline") {
        const _ = separator[location]
        this.field = this.line.note.getField(fieldName)
        let content: string
        if (this.field) {
            const fieldHeader = this.buildDecoratedFieldName()
            const newValue = this.line.note.renderFieldValue(fieldName, value, location)
            this.removeIndentedListItems()
            if (Array.isArray(newValue)) {
                if (this.field.getDisplay(this.plugin) === MultiDisplayType.asList ||
                    (
                        this.field.type === FieldType.Lookup &&
                        Lookup.bulletListLookupTypes.includes(this.field.options.outputType as Lookup.Type)
                    )
                ) {
                    //clean following items before creating new
                    content = `${fieldHeader}${_}`
                    //create new nodes, insert new lines for each item
                    newValue.filter(v => !!v).reverse().forEach((item, i) => {
                        const newItemLine = new Line(this.plugin, this.line.note, location, "", this.line.number! + 1)
                        new Node(this.plugin, newItemLine, this.buildIndentedListItem(this.plugin, item))
                        newItemLine.renderLine()
                    });
                } else {
                    content = `${fieldHeader}${_} [${newValue.join(", ")}]`;
                }
            } else {
                content = `${fieldHeader}${_} ${newValue}`;
            }
        } else {
            content = `${fieldName}${_} ${value}`;
        }
        if (location === "inline") {
            this.rawContent = this.wrapField(content)
        } else {
            this.rawContent = content
        }
    }
}