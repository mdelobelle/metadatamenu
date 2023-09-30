import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FieldType, MultiDisplayType, objectTypes } from "src/types/fieldTypes";
import { Line } from "./line";
import { frontMatterLineField, parsedField } from "src/utils/parser";
import { buildEndStyle, buildStartStyle } from "src/types/dataviewTypes";
import * as Lookup from "src/types/lookupTypes";
import { ExistingField } from "./note";


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
                    //console.log("=========== NEXT LINE ============")
                    //console.log(this.rawContent)
                    const frontmatter = this.line.note.cache?.frontmatter!
                    let indentationLevel: number = 0;
                    const indentRegex = new RegExp(/(?<indentation>\s*)(?<list>-\s)?.*/)
                    const fR = this.rawContent.match(indentRegex);
                    let listItem: boolean = false
                    if (fR?.groups && fR.groups.indentation) {
                        indentationLevel = fR.groups.indentation.length / 2
                        if (fR.groups.list) {
                            // list nous sert à déterminer que cette ligne correspond à l'item d'une liste
                            // ça va servir dans le cas des objectList fields plus bas
                            indentationLevel += 1;
                            listItem = true
                        }
                    }
                    this.line.indentationLevel = indentationLevel
                    if (indentationLevel) {
                        const parentLine = this.line.note.lines.filter(line =>
                            line.number < this.line.number &&
                            line.indentationLevel < this.line.indentationLevel
                        ).last()
                        this.line.parentLine = parentLine
                    }
                    const { attribute: yamlAttr, values: value } = frontMatterLineField(this.rawContent)
                    for (const field of this.line.note.fields) {
                        if (yamlAttr === field.name) {
                            this.indexedId = field.id
                            const existingField = new ExistingField(field, this.value, this.indexedId)
                            //on cherche les fields qui ont le même nom
                            if (field.path) {
                                //dans le cas de "object fields" plusieurs champs peuvent avoir le même nom: 
                                //on regarde leur "path" pour déterminer le père
                                const parentLine = this.line.parentLine
                                const parentNode = parentLine?.nodes[0]
                                const parentField = parentNode?.field
                                if (parentField?.id === field.path.split("____").last()) {
                                    //la ligne "père" a un field dont l'id est bien l'id du parent_field de ce field -> on continue
                                    this.field = field
                                    // on crée l'indexedPath de ce champ pour pouvoir chercher sa valeur dans le "frontmatter"
                                    this.indexedPath = this.field.getIndexedPath(this)
                                    if (this.field && parentField?.type === FieldType.ObjectList) {
                                        // dans le cas d'un père de type "objectlist" on va chercher la position de ce field dans la liste du père
                                        const objectListLines = parentLine!.objectListLines
                                        if (listItem) {
                                            // c'est un débute d'item: on crée une nouvelle liste de lignes (object item)
                                            // et on l'ajoute à l'ensemble des listes de lignes de l'objectList
                                            objectListLines.push([this.line])
                                        } else {
                                            // c'est un autre field qui appartient à un object item de la liste, 
                                            // on l'ajoute au dernier object item de la liste de lignes
                                            const lastObject = objectListLines.last()
                                            lastObject?.push(this.line)
                                        }
                                        // on crée un indexedID en rajoutant le rang de l'object item dans la liste d'objectList auquel il appartient
                                        // ça servira à créer l'indexedPath dans la fonction Field.getValueFromIndexedPath
                                        const index = objectListLines.length - 1
                                        this.indexedId = `${this.field.id.replace(/(.*)\[(\w+)\]/, "$1")}[${index}]`
                                        this.indexedPath = `${this.indexedPath}[${index}]`
                                    }
                                    // on récupère la valeur
                                    this.value = Field.getValueFromIndexedPath(this.field, this.line.note.cache!.frontmatter!, this.indexedPath)
                                    existingField.value = this.value
                                    existingField.indexedId = this.indexedId
                                    existingField.indexedPath = this.indexedPath
                                    this.line.note.existingFields.push(existingField)

                                    break;
                                } else {
                                    //la ligne "père" a un field dont l'id n'est pas l'id du parent_field de ce field -> pb on s'arrête
                                    break;
                                }

                            } else {
                                this.field = field
                                this.value = frontmatter[field.name]
                                existingField.value = this.value
                                this.line.note.existingFields.push(existingField)
                                break;
                            }
                        }
                    }
                    if (yamlAttr === this.plugin.settings.fileClassAlias) {
                        const fileClassField = new Field(this.plugin, yamlAttr)
                        fileClassField.type = FieldType.Input
                        fileClassField.id = `fileclass-field-${this.plugin.settings.fileClassAlias}`
                        this.field = fileClassField
                        this.value = value
                        const existingField = new ExistingField(fileClassField, value, this.field.id)
                        this.line.note.existingFields.push(existingField)
                    }
                }
            case "inline":
                {
                    if (field) {
                        const existingField = new ExistingField(field, this.value, field.id)
                        this.line.note.existingFields.push(existingField)
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

    private removeIndentedListItems = () => {
        if (!this.field ||
            !(this.field.getDisplay() === MultiDisplayType.asList ||
                this.field.type === FieldType.JSON ||
                this.field.type === FieldType.YAML ||
                this.field.type === FieldType.Lookup ||
                objectTypes.includes(this.field.type))
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