import { FieldType } from "../types/fieldTypes"

class Field {

    constructor(
        public name: string = "",
        public options: Record<string, string> = {},
        public id: string = "",
        public valuesListNotePath: string = "",
        public type: FieldType = FieldType.Input
    ) { };

    public insertNewValue(value: string): string {
        let newKey = 1;
        Object.keys(this.options).forEach(key => {
            if (parseInt(key) && parseInt(key) >= newKey) {
                newKey = parseInt(key) + 1;
            };
        });
        this.options[newKey.toString()] = value;
        return newKey.toString();
    };

    static copyProperty(target: Field, source: Field) {
        target.id = source.id;
        target.name = source.name;
        target.valuesListNotePath = source.valuesListNotePath;
        target.type = source.type
        Object.keys(source.options).forEach(k => {
            target.options[k] = source.options[k];
        });
        Object.keys(target.options).forEach(k => {
            if (!Object.keys(source.options).includes(k)) {
                delete target.options[k];
            };
        });
    };

    public static createDefault(name: string): Field {
        const field = new Field();
        field.type = FieldType.Input;
        field.name = name;
        return field;
    }
};

export default Field;