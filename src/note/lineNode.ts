import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FieldType, MultiDisplayType } from "src/types/fieldTypes";
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

export class LineNode {

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
        switch (this.line.position) {
            case "yaml":
                {
                    const frontmatter = this.line.note.cache?.frontmatter!
                    let indentationLevel: number = 0;
                    const indentRegex = new RegExp(/(?<indentation>\s*).*/)
                    const fR = this.rawContent.match(indentRegex);
                    if (fR?.groups && fR.groups.indentation) {
                        indentationLevel = fR.groups.indentation.length / 2
                    }
                    this.line.indentationLevel = indentationLevel
                    if (indentationLevel) {
                        const parentLine = this.line.note.lines.filter(line =>
                            line.number < this.line.number &&
                            line.indentationLevel < this.line.indentationLevel
                        ).last()
                        this.line.parentLine = parentLine
                    }
                    for (const field of this.line.note.fields) {
                        const { attribute: yamlAttr, values: value } = frontMatterLineField(this.rawContent)
                        if (yamlAttr === field.name) {
                            if (field.path) {
                                if (this.line.parentLine?.nodes[0]?.field?.id === field.path.split("____").last()) {
                                    this.field = field
                                    const dottedPath = field.getDottedPath()
                                    this.value = Field.getValueFromPath(frontmatter, dottedPath)
                                    this.line.note.existingFields.push(field)
                                    break;
                                } else {
                                    break;
                                }
                            } else {
                                this.field = field
                                this.value = frontmatter[field.name]
                                this.line.note.existingFields.push(field)
                                break;
                            }
                        }
                        if (yamlAttr === this.plugin.settings.fileClassAlias) {
                            const fileClassField = new Field(this.plugin, yamlAttr)
                            fileClassField.type = FieldType.Input
                            fileClassField.id = `fileclass-field-${this.plugin.settings.fileClassAlias}`
                            this.field = fileClassField
                            this.value = value
                            this.line.note.existingFields.push(fileClassField)
                        }
                    }
                }
            case "inline":
                {
                    if (field) {
                        this.line.note.existingFields.push(field)
                    }
                }
        }
        this.line.nodes.push(this)
    }

    public buildDecoratedFieldName = (): string => {
        if (!this.field) return ""
        const ancestors = this.field.getAncestors();
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

    public buildIndentedListItem = (value: any) => {
        if (!this.field) return ""
        const ancestors = this.field.getAncestors();
        const level = ancestors.length
        return `${"  ".repeat(level + 1)}- ${value}`
    }

    public removeIndentedListItems = () => {
        if (!this.field ||
            !(this.field.getDisplay() === MultiDisplayType.asList ||
                this.field.type === FieldType.JSON ||
                this.field.type === FieldType.YAML ||
                this.field.type === FieldType.Lookup)
        ) return
        const indentLevel = this.field.getAncestors().length
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

    public createFieldNodeContent(field: Field, value: string, location: "yaml" | "inline") {
        const _ = separator[location]
        this.field = field
        let content: string
        if (this.field) {
            const fieldHeader = this.buildDecoratedFieldName()
            const newValue = this.line.note.renderFieldValue(this.field, value, location)
            this.removeIndentedListItems()
            if (Array.isArray(newValue)) {
                if (this.field.getDisplay() === MultiDisplayType.asList ||
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
                        new LineNode(this.plugin, newItemLine, this.buildIndentedListItem(item))
                        newItemLine.renderLine()
                    });
                } else {
                    content = `${fieldHeader}${_} [${newValue.join(", ")}]`;
                }
            } else {
                content = `${fieldHeader}${_} ${newValue}`;
            }
        } else {
            content = `${field.name}${_} ${value}`;
        }
        if (location === "inline") {
            this.rawContent = this.wrapField(content)
        } else {
            this.rawContent = content
        }
    }
}