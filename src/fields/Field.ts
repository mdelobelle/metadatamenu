import MetadataMenu from "main";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { FieldType, MultiDisplayType, multiTypes } from "../types/fieldTypes"
import NestedField from "./fieldManagers/NestedField";

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


    public getCompatibleParentFields(plugin: MetadataMenu): { id: string, name: string }[] {
        let nestedFields: Field[]
        if (this.fileClassName) {
            const index = plugin.fieldIndex
            nestedFields = index.fileClassesFields
                .get(this.fileClassName)?.filter(field => field.type === FieldType.Nested) || []

        } else {
            nestedFields = plugin.settings.presetFields
                .filter(field => field.type === FieldType.Nested)
        }
        return nestedFields.map(field => {
            return {
                id: field.id,
                name: field.name
            }
        })
    }

    // il ne faut pas proposer des "compatibleParent" si le field en question figure parmis les ancetres
    // il faut mettre l'id en tant que parent

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