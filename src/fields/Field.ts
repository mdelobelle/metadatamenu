import MetadataMenu from "main";
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
        public display?: MultiDisplayType
    ) { };

    public getDisplay(plugin: MetadataMenu): MultiDisplayType {
        if (multiTypes.includes(this.type)) {
            return this.display || plugin.settings.frontmatterListDisplay
        } else {
            return MultiDisplayType.asArray
        }
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
    };

    public static createDefault(name: string): Field {
        const field = new Field();
        field.type = FieldType.Input;
        field.name = name;
        return field;
    }
};

export default Field;