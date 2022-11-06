import Field, { FieldCommand } from "src/fields/Field";
import { FieldType } from "src/types/fieldTypes";

class FileClassAttribute {

    constructor(
        public origin: string,
        public name: string,
        public type: FieldType = FieldType.Input,
        public options: string[] | Record<string, any> = [],
        public fileClassName: string,
        public command: FieldCommand
    ) { }

    public getField() {
        let options: Record<string, string> = {};
        if (Array.isArray(this.options)) {
            this.options?.forEach((option, index) => {
                options[index] = option;
            })
        } else {
            options = this.options
        }
        return new Field(this.name, options, this.name, this.type, this.fileClassName, this.command);
    }
}

export { FileClassAttribute };