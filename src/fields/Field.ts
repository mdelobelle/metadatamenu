import MetadataMenu from "main";
import { LineNode } from "src/note/lineNode";
import { Note } from "src/note/note";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { FieldType, MultiDisplayType, multiTypes, objectTypes } from "../types/fieldTypes"

export interface FieldCommand {
    id: string,
    label: string,
    icon: string,
    hotkey?: string
}

class Field {
    constructor(
        public plugin: MetadataMenu,
        public name: string = "",
        public options: Record<string, any> = {},
        public id: string = "",
        public type: FieldType = FieldType.Input,
        public fileClassName?: string,
        public command?: FieldCommand,
        public display?: MultiDisplayType,
        public style?: Record<keyof typeof FieldStyleLabel, boolean>,
        public path: string = ""
    ) {
    };

    public isRoot(): boolean {
        return this.path === ""
    }

    public getDisplay(): MultiDisplayType {
        if (multiTypes.includes(this.type)) {
            return this.display || this.plugin.settings.frontmatterListDisplay
        } else {
            return MultiDisplayType.asArray
        }
    }

    public getIndexedPath(node: LineNode): string {
        if (this.path === "") return node.indexedId
        const parentNode = node.line.parentLine?.nodes[0]
        const parentField = parentNode?.field
        if (parentField) {
            const parentIndexedPath = parentField.getIndexedPath(parentNode)
            return `${parentIndexedPath}${parentIndexedPath ? "____" : ""}${node.indexedId}`
        } else {
            return ""
        }

    }

    public getFirstAncestor(): Field | undefined {
        const ancestors = this.getAncestors()
        return ancestors.last()
    }

    public getDottedPath(): string {
        if (!this.path) return this.name
        const upperDottedPath = this.path.split("____").map(id => Field.getFieldFromId(this.plugin, id, this.fileClassName)?.name).join(".")
        return `${upperDottedPath}.${this.name}`
    }

    public hasIdAsAncestor(childId: string): boolean {
        if (!this.path) {
            return false
        } else {
            const parentId = this.path.split("____").last()!
            if (parentId === childId) {
                return true;
            } else {
                const field = Field.getFieldFromId(this.plugin, parentId, this.fileClassName)
                return field?.hasIdAsAncestor(childId) || false
            }
        }
    }


    public getCompatibleParents(): Field[] {
        const otherObjectFields = this.getOtherObjectFields()
        if (objectTypes.includes(this.type)) {
            return otherObjectFields
        } else {
            return otherObjectFields.filter(_field => {
                const field = Field.getFieldFromId(this.plugin, _field.id, this.fileClassName)
                return !field?.hasIdAsAncestor(this.id)
            })
        }
    }

    public getAncestors(fieldId: string = this.id): Field[] {
        const field = Field.getFieldFromId(this.plugin, fieldId, this.fileClassName)
        const ancestors: Field[] = []
        if (!field || !field.path) return ancestors

        const ancestorsIds = field.path.split("____")
        for (const id of ancestorsIds) {
            const ancestor = Field.getFieldFromId(this.plugin, id, this.fileClassName)
            if (ancestor) ancestors.push(ancestor)
        }
        return ancestors
    }

    public getIndentationLevel(node: LineNode) {
        const ancestors = this.getAncestors();
        let level: number = 0
        ancestors.forEach(ancestor => {
            level = ancestor.type === FieldType.ObjectList ? level + 2 : level + 1
        })
        if (this.isFirstItemOfObjectList(node)) level = level - 1
        return level
    }

    public isFirstItemOfObjectList(node: LineNode) {
        const ancestors = this.getAncestors(this.id)
        if (ancestors.last()?.type === FieldType.ObjectList) {
            const indentRegex = new RegExp(/(?<indentation>\s*)(?<list>-\s)?.*/)
            const fR = node.rawContent.match(indentRegex);
            if (fR?.groups?.list) {
                return true
            }
        }
        return false
    }

    public getOtherObjectFields(): Field[] {
        let objectFields: Field[]
        if (this.fileClassName) {
            const index = this.plugin.fieldIndex
            objectFields = index.fileClassesFields
                .get(this.fileClassName)?.filter(field => objectTypes.includes(field.type) && field.id !== this.id) || []

        } else {
            objectFields = this.plugin.presetFields
                .filter(field => objectTypes.includes(field.type) && field.id !== this.id)
        }
        return objectFields.map(_field => {
            return Field.getFieldFromId(this.plugin, _field.id, this.fileClassName) as Field //sure exists!
        })
    }

    static copyProperty(target: Field, source: Field) {
        target.id = source.id;
        target.name = source.name;
        target.type = source.type
        Object.keys(source.options).forEach(k => {
            target.options[k] = source.options[k];
        });
        Object.keys(target.options).forEach(k => {
            if (!Object.keys(source.options).includes(k)) {
                delete target.options[k];
            };
        });
        target.command = source.command
        target.display = source.display
        target.style = source.style
        target.path = source.path
    };

    static createDefault(plugin: MetadataMenu, name: string): Field {
        const field = new Field(plugin);
        field.type = FieldType.Input;
        field.name = name;
        return field;
    }

    static existingFields(plugin: MetadataMenu, filePath: string, obj: any, depth: number = 0, path: string = ""): Field[] {
        const reservedKeys = ["file", "aliases", "tags"]
        const fields = plugin.fieldIndex.filesFields.get(filePath)
        const fieldsNames = fields?.map(field => field.name) || []
        let _obj: any
        if (depth === 0) {
            const dvApi = plugin.app.plugins.plugins.dataview?.api
            if (dvApi) {
                _obj = dvApi.page(filePath)
            } else {
                return []
            }
        } else {
            _obj = obj
        }
        const _existingFields: Field[] = []
        if (typeof obj === 'object') {
            for (const key of obj) {
                if (depth === 0 && reservedKeys.includes(key)) continue;
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    _existingFields.push(...Field.existingFields(plugin, filePath, obj[key], depth + 1, `${path ? path + "." : ""}${key}`).filter(k => !_existingFields.includes(k)))
                } else if (!_existingFields.map(k => k.name.toLowerCase().replace(/\s/g, "-")).includes(key.toLowerCase().replace(/\s/g, "-"))) {
                    _existingFields.push(key)
                } else {
                    if (key !== key.toLowerCase().replace(/\s/g, "-")) {
                        _existingFields[_existingFields.indexOf(key.toLowerCase().replace(/\s/g, "-"))] = key
                    }
                }
            }
        }
        return _existingFields
    }

    static getFieldFromId(plugin: MetadataMenu, id: string, fileClassName?: string): Field | undefined {
        let field: Field | undefined = undefined;
        if (fileClassName) {
            const index = plugin.fieldIndex
            field = index.fileClassesFields
                .get(fileClassName)?.find(field => field.id === id)

        } else {
            const _field = plugin.presetFields
                .find(field => field.id === id)
            if (_field) {
                field = new Field(plugin);
                Object.assign(field, _field);
            }
        }
        return field
    }

    static getIdAndIndex(indexedId?: string) {
        const { id, index } = indexedId?.match(/(?<id>[^\[]*)(?:\[(?<index>.*)\])?/)?.groups || { id: "", index: undefined }
        return { id, index }
    }

    static upperPath(indexedPath: string): string {
        const upperIndexedIds = indexedPath?.split("____")
        upperIndexedIds?.pop()
        return upperIndexedIds?.join("____") || ""
    }

    static upperIndexedPathObjectPath(indexedPath: string) {
        const endingIndex = indexedPath.match(/\[\w+\]$/)
        if (endingIndex) {
            return indexedPath.replace(/\[\w+\]$/, '')
        } else {
            return Field.upperPath(indexedPath)
        }
    }

    static getValueFromIndexedPath(carriageField: Field, obj: any, indexedPath: string): any {
        //fonction récursive qui part du frontmatter et qui cherche la valeur correspondant à l'indexedPath
        //l'argument field sert à récupérer la fileclass et à récupérer l'attribute plugin

        if (!indexedPath) return obj;
        const plugin = carriageField.plugin
        const fileClassName = carriageField.fileClassName
        const indexedProps: string[] = indexedPath.split('____');

        try {
            const indexedProp = indexedProps.shift()!
            // on récupère l'id et l'éventuel index
            const { id, index } = Field.getIdAndIndex(indexedProp)
            // on récupère la définition du field selon son id et sa fileClass
            const field = Field.getFieldFromId(plugin, id, fileClassName)
            if (!field) return "" // s'il n'existe pas, on renvoie vide
            let value: any
            if (index !== undefined) {
                value = obj[field.name][index]
            } else {
                value = obj[field.name]
            }
            if (typeof value === 'object') {
                // value est un object, on continue à inspecter
                const subValue = Field.getValueFromIndexedPath(field, value, indexedProps.join("____"))
                return subValue
            } else if (Array.isArray(value)) {
                if (index && !isNaN(parseInt(index))) {
                    // on récupère l'élément à l'index voulu.
                    // par construction c'est un obj...
                    const subObject = value[parseInt(index)]
                    const subValue = Field.getValueFromIndexedPath(field, subObject, indexedProps.join("____"))
                    return subValue
                } else {
                    // c'est "juste" un tableau
                    // par construction il ne peut pas y avoir sur subProps
                    // on le renvoie telquel
                    return value
                }
            } else {
                // ni dans le cas d'un sous-objet, ni dans le cas d'une liste de sous objets, on renvoie la value
                return value
            }
        } catch (e) {
            return ""
        }
    }

    static getValueFromPath(obj: any, path: string): string {
        if (!path) return obj;
        const properties: string[] = path.split('.');
        try {
            const subValue = Field.getValueFromPath(obj[properties.shift()!], properties.join('.'))
            return subValue
        } catch (e) {
            return ""
        }
    }
};

export default Field;