import { FieldType } from "./types/fieldTypes"

interface Field {
    id: string;
    name: string;
    options: Record<string, string>;
    valuesListNotePath: string;
    type: FieldType
}

class Field {

    constructor(name: string = "",
        options: Record<string, string> = {},
        id: string = "",
        valuesListNotePath: string = "",
        type: FieldType = FieldType.Input
    ) {
        this.name = name;
        this.options = options;
        this.id = id;
        this.valuesListNotePath = valuesListNotePath;
        this.type = type
        this.insertNewValue.bind(this);
    };

    public async insertNewValue(value: string): Promise<string> {
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
};

export default Field;