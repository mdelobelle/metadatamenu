import Field from "src/Field";
import { genericFieldRegex } from "src/utils/parser";

interface FileClassAttribute {
    name: string;
    type: string;
    options: string[];
    isMulti: boolean;
    isCycle: boolean;
    isBoolean: boolean;
}

const types: Record<string, string> = {
    "input": "Accept any value",
    "select": "Accept a single value from a list",
    "multi": "Accept multiple values from a list",
    "cycle": "Cycle through values from a list",
    "boolean": "Accept true of false"
}

class FileClassAttribute {

    constructor(raw: string) {
        const completeRegex = new RegExp(`^${genericFieldRegex}::(?<fieldSettings>[^\\]\\)\\n]+)?`, "u");

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
                this.type = settings['type'];
                switch (this.type) {
                    case "multi":
                        this.isMulti = true;
                        break;
                    case "cycle":
                        this.isCycle = true;
                        break;
                    case "boolean":
                        this.isBoolean = true
                    default:
                        break;
                }
                this.options = settings['options'];
            }
        } else {
            const error = new Error("Improper value");
            throw error;
        }
    }

    public getField() {
        let values: Record<string, string> = {};
        this.options?.forEach((option, index) => {
            values[index] = option;
        })
        return new Field(this.name, values, this.name, this.isMulti, this.isCycle, this.isBoolean);
    }
}

export { FileClassAttribute, types };