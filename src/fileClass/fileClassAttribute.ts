import MetadataMenu from "main";
import Field, { FieldCommand } from "src/fields/_Field";
import { FieldParam, isFieldOptions } from "src/fields/base/BaseField";
import { buildField, IField } from "src/fields/Field";
import { FieldStyleLabel } from "src/types/dataviewTypes";
import { FieldManager, FieldType, MultiDisplayType, FieldTypeLabelMapping } from "src/types/fieldTypes";

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
        return new Field(this.plugin, this.name, options, this.id, this.type, this.fileClassName, this.command, this.display, this.style, this.path);
    }

    public getIField(): IField | undefined {
        let options: Record<string, string> = {};
        if (Array.isArray(this.options)) {
            this.options?.forEach((option, index) => {
                options[index] = option;
            })
        } else {
            options = this.options
        }
        if (isFieldOptions([this.type, options])) {
            const iField = buildField(this.plugin, this.name, this.id, this.path || "", this.fileClassName, this.command, this.display, this.style, ...[this.type, options] as FieldParam)
            return new iField();
        }

    }

    public getOptionsString(plugin: MetadataMenu) {
        const field = this.getField()
        const manager = new FieldManager[field.type](plugin, field)
        return manager.getOptionsStr()
    }
}

export { FileClassAttribute };