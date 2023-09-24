import MetadataMenu from "main";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { FieldType, MultiDisplayType, multiTypes } from "../types/fieldTypes"

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

    public getDisplay(): MultiDisplayType {
        if (multiTypes.includes(this.type)) {
            return this.display || this.plugin.settings.frontmatterListDisplay
        } else {
            return MultiDisplayType.asArray
        }
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
        if (this.type !== FieldType.Object) {
            return otherObjectFields
        } else {
            return otherObjectFields.filter(_field => {
                const field = Field.getFieldFromId(this.plugin, _field.id, this.fileClassName)
                return !field?.hasIdAsAncestor(this.id)
            })
        }
    }

    public getValueFromFileAttributes(attributes: Record<string, any>) {
        console.log(this)
        if (this.path) {
            const path = `${this.path
                .split("____")
                .map(id => Field.getFieldFromId(this.plugin, id, this.fileClassName)?.name)
                .join(".")
                }${this.path ? "." : ""}${this.name}`
            return Field.getValueFromPath(attributes, path)
        } else {
            return Field.getValueFromPath(attributes, "")
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

    public getOtherObjectFields(): Field[] {
        let objectFields: Field[]
        if (this.fileClassName) {
            const index = this.plugin.fieldIndex
            objectFields = index.fileClassesFields
                .get(this.fileClassName)?.filter(field => field.type === FieldType.Object && field.id !== this.id) || []

        } else {
            objectFields = this.plugin.presetFields
                .filter(field => field.type === FieldType.Object && field.id !== this.id)
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