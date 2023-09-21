import MetadataMenu from "main";
import { Notice } from "obsidian";
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
        public name: string = "",
        public options: Record<string, any> = {},
        public id: string = "",
        public type: FieldType = FieldType.Input,
        public fileClassName?: string,
        public command?: FieldCommand,
        public display?: MultiDisplayType,
        public style?: Record<keyof typeof FieldStyleLabel, boolean>,
        public parent?: string
    ) { };

    public getDisplay(plugin: MetadataMenu): MultiDisplayType {
        if (multiTypes.includes(this.type)) {
            return this.display || plugin.settings.frontmatterListDisplay
        } else {
            return MultiDisplayType.asArray
        }
    }

    static getFieldFromId(plugin: MetadataMenu, id: string, fileClassName?: string): Field | undefined {
        let field: Field | undefined = undefined;
        if (fileClassName) {
            const index = plugin.fieldIndex
            field = index.fileClassesFields
                .get(fileClassName)?.find(field => field.id === id)

        } else {
            const _field = plugin.settings.presetFields
                .find(field => field.id === id)
            if (_field) {
                field = new Field();
                Object.assign(field, _field);
            }
        }
        return field
    }

    public hasIdAsAncestor(plugin: MetadataMenu, childId: string): boolean {
        if (!this.parent) {
            return false
        } else {
            if (this.parent === childId) {
                return true;
            } else {
                const field = Field.getFieldFromId(plugin, this.parent, this.fileClassName)
                return field?.hasIdAsAncestor(plugin, childId) || false
            }
        }
    }

    public getCompatibleParentFields(plugin: MetadataMenu): { id: string, path: string }[] {
        const otherObjectFields = this.getOtherObjectFields(plugin)
        if (this.type !== FieldType.Object) {
            return otherObjectFields
        } else {
            return otherObjectFields.filter(_field => {
                const field = Field.getFieldFromId(plugin, _field.id, this.fileClassName)
                return !field?.hasIdAsAncestor(plugin, this.id)
            })
        }
    }

    static getValue(obj: any, path: string): string {
        if (!path) return obj;
        const properties: string[] = path.split('.');
        try {
            const subValue = Field.getValue(obj[properties.shift()!], properties.join('.'))
            return subValue
        } catch (e) {
            return ""
        }
    }

    static findPath(obj: any, name: string, currentPath: string = ""): string | undefined {
        let matchingPath: string | undefined;

        if (!obj || typeof obj !== 'object') return
        for (const key of Object.keys(obj)) {
            if (key === name) {
                matchingPath = currentPath
            } else if (key === "file") {
                continue;
            } else {
                matchingPath = Field.findPath(obj[key], name, `${currentPath ? currentPath + "." : ""}${key}`)
            }
            if (matchingPath) break
        }
        return matchingPath
    }

    public getValueFromFileAttributes(plugin: MetadataMenu, attributes: Record<string, any>) {
        const ancestorsIds = this.getAncestors(plugin)
        const ancestors = ancestorsIds.map(id => Field.getFieldFromId(plugin, id, this.fileClassName)?.name)
        const path = `${ancestors.join(".")}${ancestors.length ? "." : ""}${this.name}`
        return Field.getValue(attributes, path)
    }

    public getAncestors(plugin: MetadataMenu, fieldId: string = this.id, ancestors: string[] = []): string[] {
        const field = Field.getFieldFromId(plugin, fieldId, this.fileClassName)
        if (!field) return ancestors
        if (!field.parent) {
            return ancestors
        } else {
            const parent = Field.getFieldFromId(plugin, field.parent, this.fileClassName)
            if (!parent) return ancestors
            ancestors.unshift(parent.id)
            return parent.getAncestors(plugin, parent.id, ancestors)
        }
    }

    public getOtherObjectFields(plugin: MetadataMenu): { id: string, path: string }[] {
        let objectFields: Field[]
        if (this.fileClassName) {
            const index = plugin.fieldIndex
            objectFields = index.fileClassesFields
                .get(this.fileClassName)?.filter(field => field.type === FieldType.Object && field.id !== this.id) || []

        } else {
            objectFields = plugin.settings.presetFields
                .filter(field => field.type === FieldType.Object && field.id !== this.id)
        }
        return objectFields.map(_field => {
            const field = Field.getFieldFromId(plugin, _field.id, this.fileClassName) as Field //sure exists!
            return {
                id: field.id,
                path: field
                    .getAncestors(plugin, field.id, [field.id])
                    .map(id => Field.getFieldFromId(plugin, id, this.fileClassName)!.name)
                    .join(" > ")
            }
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
        target.parent = source.parent
    };

    public static createDefault(name: string): Field {
        const field = new Field();
        field.type = FieldType.Input;
        field.name = name;
        return field;
    }
};

export default Field;