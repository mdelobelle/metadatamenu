import MetadataMenu from "main";
import Field, { FieldCommand } from "src/fields/Field";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { FieldManager, FieldType, MultiDisplayType } from "src/types/fieldTypes";

class FileClassAttribute {

    constructor(
        public plugin: MetadataMenu,
        public origin: string,
        public name: string,
        public id: string,
        public type: FieldType = FieldType.Input,
        public options: string[] | Record<string, any> = [],
        public fileClassName: string,
        public command: FieldCommand,
        public display?: MultiDisplayType,
        public style?: Record<keyof typeof FieldStyleLabel, boolean>,
        public path?: string
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
        return new Field(this.plugin, this.name, options, this.id, this.type, this.fileClassName, this.command, this.display, this.style, this.path);
    }

    public getOptionsString(plugin: MetadataMenu) {
        const field = this.getField()
        const manager = new FieldManager[field.type](plugin, field)
        return manager.getOptionsStr()
    }
}

export { FileClassAttribute };