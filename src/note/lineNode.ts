import MetadataMenu from "main";
import Field from "src/fields/_Field";
import { FieldType, frontmatterOnlyTypes, MultiDisplayType, objectTypes } from "src/types/fieldTypes";
import { Line } from "./line";
import { frontMatterLineField, parsedField } from "src/utils/parser";
import { buildEndStyle, buildStartStyle } from "src/types/dataviewTypes";
import * as Lookup from "src/types/lookupTypes";
import { ExistingField } from "src/fields/ExistingField"


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

    public indexedId: string
    public indexedPath: string

    constructor(
        public plugin: MetadataMenu,
        public line: Line,
        public rawContent: string = "",
        public indentationLevel: number = 0,
        public index: number = 0,
        public field?: Field,
        public value?: string,
        public parsedField?: parsedField,
        public blockquote: string = "",
    ) {
        if (this.line.shouldParse) {
            const nodeRegex = new RegExp(/(?<blockquote>\>*)(?<indentation>\s*)(?<list>-\s)?(?<value>.*)/)
            const parsedContent = this.rawContent.match(nodeRegex);
            this.defineLinePrefixAttributes(parsedContent)
            this.defineExistingFieldsAndValues(parsedContent)
        }
        this.line.nodes.push(this)
    }


    private defineLinePrefixAttributes(parsedContent: RegExpMatchArray | null) {
        if (parsedContent?.groups) {
            if (parsedContent.groups.indentation) {
                this.indentationLevel = parsedContent.groups.indentation.length / 2
                if (parsedContent.groups.list) {
                    this.indentationLevel += 1;
                }
            }
            this.line.isNewListItem = !!parsedContent.groups.list
            this.blockquote = parsedContent.groups.blockquote || ""
        }
        this.line.indentationLevel = this.indentationLevel
        if (this.indentationLevel) {
            const parentLine = this.line.note.lines.filter(line =>
                line.number < this.line.number &&
                line.indentationLevel < this.line.indentationLevel
            ).last()
            this.line.parentLine = parentLine
        }
    }

    private defineExistingFieldsAndValues(parsedContent: RegExpMatchArray | null) {
        const frontmatter: any = this.line.note.frontmatter || {}
        const field = this.field
        switch (this.line.position) {
            case "yaml":
                {
                    const { attribute: yamlAttr, values: value } = frontMatterLineField(this.rawContent)
                    if (!yamlAttr && this.line.isNewListItem) {
                        const parentLine = this.line.parentLine
                        const parentNode = parentLine?.nodes[0]
                        const parentField = parentNode?.field
                        if (parentField?.type === FieldType.ObjectList ||
                            (parentField?.type === FieldType.Lookup &&
                                Lookup.bulletListLookupTypes.includes(parentField.options.outputType as Lookup.Type))) {
                            const objectListLines = parentLine!.objectListLines
                            objectListLines.push([this.line])
                            const index = objectListLines.length - 1
                            this.indexedId = ""
                            this.indexedPath = `${parentNode?.indexedPath}[${index}]`
                            this.value = ""
                        }
                    }
                    for (const field of this.line.note.fields) {
                        if (yamlAttr === field.name) {
                            let indexedId = field.id
                            if (this.line.parentLine) {
                                const parentNode = this.line.parentLine.nodes[0]
                                const parentField = parentNode.field
                                if (parentField) {
                                    const parentIndexedId = this.line.note.existingFields.find(eF => eF.field.id === parentField.id)?.indexedId
                                    indexedId = `${parentIndexedId}____${field.id}` || field.id
                                } else {
                                    indexedId = field.id
                                }
                            } else {
                                indexedId = field.id
                            }

                            if (field.path && indexedId !== `${field.path}____${field.id}`) continue
                            this.indexedId = indexedId
                            const existingField = new ExistingField(field, this.value, this.indexedId)
                            if (field.path) {
                                const parentLine = this.line.parentLine
                                const parentNode = parentLine?.nodes[0]
                                const parentField = parentNode?.field
                                if (parentField?.id === field.path.split("____").last()) {
                                    this.field = field
                                    if (this.field && parentField?.type === FieldType.ObjectList) {
                                        const objectListLines = parentLine!.objectListLines
                                        if (this.line.isNewListItem) {
                                            objectListLines.push([this.line])
                                        } else {
                                            const lastObject = objectListLines.last()
                                            lastObject?.push(this.line)
                                        }
                                        const index = objectListLines.length - 1
                                        this.indexedPath = `${parentNode?.indexedPath}[${index}]____${this.field.id}`
                                    } else {
                                        this.indexedPath = `${parentNode?.indexedPath}____${this.field.id}`
                                    }
                                    this.value = Field.getValueFromIndexedPath(this.field, this.line.note.frontmatter!, this.indexedPath)
                                    existingField.value = this.value
                                    existingField.indexedId = this.indexedId
                                    existingField.indexedPath = this.indexedPath
                                    this.line.note.existingFields.push(existingField)

                                    break;
                                } else if (!parentField) {
                                    this.field = field
                                    this.indexedPath = this.field.getIndexedPath(this)
                                } else {
                                    //la ligne "père" a un field dont l'id n'est pas l'id du parent_field de ce field -> pb on s'arrête
                                    break;
                                }

                            } else if (field.id === indexedId) {
                                this.field = field
                                this.indexedPath = this.field.getIndexedPath(this)
                                this.value = frontmatter[field.name]
                                existingField.value = this.value
                                this.line.note.existingFields.push(existingField)
                                break;
                            }
                        }
                    }
                    if (yamlAttr === this.plugin.settings.fileClassAlias) {
                        const fileClasses = [...this.plugin.fieldIndex.fileClassesName.keys()].sort()
                        const fileClassField = new Field(this.plugin, yamlAttr, fileClasses)
                        fileClassField.type = FieldType.Select
                        fileClassField.id = `fileclass-field-${this.plugin.settings.fileClassAlias}`
                        this.field = fileClassField
                        this.indexedPath = fileClassField.id
                        this.value = value
                        const existingField = new ExistingField(fileClassField, value, this.field.id)
                        this.line.note.existingFields.push(existingField)
                    }
                }
                break;
            case "inline":
                {
                    if (field && !frontmatterOnlyTypes.includes(field.type)) {
                        const existingField = new ExistingField(field, this.value, field.id)
                        this.indexedId = field.id
                        this.indexedPath = field.getIndexedPath(this)
                        this.line.note.existingFields.push(existingField)
                    } else if (this.line.isNewListItem) {
                        const parentLine = this.line.parentLine
                        const parentNode = parentLine?.nodes[0]
                        const parentField = parentNode?.field
                        if (parentField && parentField?.type === FieldType.Lookup &&
                            Lookup.bulletListLookupTypes.includes(parentField.options.outputType as Lookup.Type)) {
                            const objectListLines = parentLine!.objectListLines
                            objectListLines.push([this.line])
                            this.indexedId = ""
                            this.value = ""
                            const eF = parentLine!.note.getExistingFieldForIndexedPath(parentField.id)
                            if (eF) {
                                if (parsedContent?.groups && parsedContent.groups.value) {
                                    eF.value = [...(eF.value || []), parsedContent.groups.value]
                                }
                            }
                        }
                    }
                }
                break;
        }
    }

    private buildDecoratedFieldName = (): string => {
        if (!this.field) return ""
        let level = this.field.getIndentationLevel(this)
        switch (this.line.position) {
            case "yaml":
                const _ = this.field.isFirstItemOfObjectList(this) ? "- " : ""
                return `${"  ".repeat(level)}${_}${this.field.name}`;
            case "inline":
                {
                    const targetStartStyle = buildStartStyle(this.field.style || {})
                    const targetEndStyle = buildEndStyle(this.field.style || {})
                    return `${this.blockquote}${"  ".repeat(this.indentationLevel)}${this.line.isNewListItem ? "- " : ""}${targetStartStyle}${this.field.name}${targetEndStyle}`
                }
        }

    }

    public buildIndentedListItem = (value: any, shift: number = 0) => {
        if (!this.field) return ""
        const ancestors = this.field.getAncestors();
        const level = ancestors.map(a => a.type === FieldType.ObjectList ? 2 : 1).reduce((p, c) => p + c, 0)
        return `${"  ".repeat(level + 1 + shift)}- ${value}`
    }

    private removeIndentedListItems = () => {
        if (!this.field ||
            !(
                this.field.type === FieldType.JSON
                || this.field.type === FieldType.YAML
                || this.field.type === FieldType.Lookup
                || this.field.type === FieldType.Multi
                || this.field.type === FieldType.MultiFile
                || this.field.type === FieldType.Canvas
                || this.field.type === FieldType.CanvasGroup
                || this.field.type === FieldType.CanvasGroupLink
            )
        ) return
        //limit inline indented line removal for lookup fields. it could be done for other multi types
        if (this.line.position === "inline" && this.field.type !== FieldType.Lookup) return
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

    public createFieldNodeContent(
        field: Field,
        value: string,
        location: "yaml" | "inline",
        asList: boolean = false,
        asBlockquote: boolean = false
    ) {
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
                        newItemLine.renderLine(asList, asBlockquote)
                    });
                } else {
                    content = `${fieldHeader}${_} [${newValue.join(", ")}]`;
                }
            } else {
                content = `${fieldHeader}${_} ${newValue}`;
                if (this.field.type === FieldType.ObjectList) {
                    const newItemLine = new Line(this.plugin, this.line.note, location, "", this.line.number! + 1)
                    new LineNode(this.plugin, newItemLine, this.buildIndentedListItem("", 1))
                    newItemLine.renderLine(asList, asBlockquote)
                }
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
