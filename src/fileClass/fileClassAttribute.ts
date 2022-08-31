import Field from "src/fields/Field";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { capitalize } from "src/utils/textUtils";
import { genericFieldRegex } from "src/utils/parser";

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
        /*
        const completeRegex = new RegExp(`^${genericFieldRegex}::(?<fieldSettings>.+)?`, "u");
        const nameRegex = new RegExp(`^${genericFieldRegex}$`, "u");
        let fieldName: string
        let { attribute, fieldSettings } = raw.match(completeRegex)?.groups || {}
        if (attribute) {
            fieldName = attribute
        } else {
            let { attribute } = raw.match(nameRegex)?.groups || {}
            fieldName = attribute
        }
        if (fieldName) {
            this.name = fieldName.trim();
            if (fieldSettings) {
                const settings = JSON.parse(`${fieldSettings.trim()}`);
                this.type = FieldTypeLabelMapping[capitalize(settings['type']) as keyof typeof FieldType];
                this.options = settings['options'];
            } else {
                this.type = FieldType.Input // default type when no setting is provided
            }
        } else {
            const error = new Error("Improper value");
            throw error;
        }
        */
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