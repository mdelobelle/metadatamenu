import MetadataMenu from "main";
import { BaseOptions, FieldParam, isFieldOptions } from "src/fields/base/BaseField";
import { buildField, FieldCommand, getField, IField } from "src/fields/Field";
import { FieldType, getOptionStr, MultiDisplayType } from "src/fields/Fields";
import { FieldStyleLabel } from "src/types/dataviewTypes";

class FileClassAttribute {

    constructor(
        public plugin: MetadataMenu,
        public origin: string,
        public name: string,
        public id: string,
        public type: FieldType = "Input",
        public options: string[] | Record<string, any> = [],
        public fileClassName: string,
        public command: FieldCommand,
        public display?: MultiDisplayType,
        public style?: Record<keyof typeof FieldStyleLabel, boolean>,
        public path?: string
    ) { }

    public getLevel(): number {
        if (!this.path) return 0
        return this.path.split("____").length
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
        return getField(this.id, this.fileClassName, this.plugin)! //It sure exists
        //return new Field(this.plugin, this.name, options, this.id, this.type, this.fileClassName, this.command, this.display, this.style, this.path);
    }

    public getIField<O extends BaseOptions>(): IField<O> | undefined {
        let options: Record<string, string> = {};
        if (Array.isArray(this.options)) {
            this.options?.forEach((option, index) => {
                options[index] = option;
            })
        } else {
            options = this.options
        }
        if (isFieldOptions([this.type, options])) {
            const iField = buildField<O>(this.plugin, this.name, this.id, this.path || "", this.fileClassName, this.command, this.display, this.style, ...[this.type, options] as FieldParam)
            return new iField();
        } else {
            console.error(`${this.fileClassName}'s attribute [${this.name}] is not properly set. Check the fileclass settings or delete and recreate it`)
        }
    }

    public getOptionsString(plugin: MetadataMenu) {
        const field = getField(this.id, this.fileClassName, this.plugin)
        if (field) return getOptionStr(field.type)(field)
    }
}

export { FileClassAttribute };