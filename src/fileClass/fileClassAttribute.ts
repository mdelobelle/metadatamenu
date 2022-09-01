import Field from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";

interface FileClassAttribute {
    name: string;
    type: FieldType;
    options: string[] | Record<string, string>;
    origin: string;
}

class FileClassAttribute {

    constructor(origin: string, name: string, type: FieldType = FieldType.Input, options: string[] | Record<string, string> = []) {
        this.origin = origin
        this.name = name
        this.type = type
        this.options = options
    }

    public getField() {
        let options: Record<string, string> = {};
        if (Array.isArray(this.options)) {
            this.options?.forEach((option, index) => {
                options[index] = option;
            })
        } else {
            options = this.options
        }
        return new Field(this.name, options, this.name, undefined, this.type);
    }
}

export { FileClassAttribute };