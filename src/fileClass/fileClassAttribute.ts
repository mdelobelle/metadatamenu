import Field from "src/Field";
import { genericFieldRegex } from "src/utils/parser";

interface FileClassAttribute {
    name: string;
    type: string;
    options: string[];
    isMulti: boolean;
    isCycle: boolean;
}

const types: Record<string, string> = {
    "input": "Accepts any value",
    "select": "Accepts a single value from a list",
    "multi": "Accepts multiple values from a list",
    "cycle": "Cycle through values from a list"
}

class FileClassAttribute {

    constructor(raw: string) {
        const completeRegex = new RegExp(`^${genericFieldRegex}::(.+)?`, "u");
        const nameRegex = new RegExp(`^${genericFieldRegex}$`, "u");
        const detailedFieldRaw = raw.match(completeRegex);
        const simpleFieldRaw = raw.match(nameRegex);
        if (detailedFieldRaw) {
            this.name = detailedFieldRaw[1].trim();
            const settings = JSON.parse(`${detailedFieldRaw[2].trim()}`);
            this.type = settings['type'];
            switch (this.type) {
                case "multi":
                    this.isMulti = true;
                    break;
                case "cycle":
                    this.isCycle = true;
                    break;
                default:
                    break;
            }
            this.options = settings['options'];
        } else if (simpleFieldRaw) {
            this.name = simpleFieldRaw[0].trim();
        } else {
            const error = new Error("Improper value");
            throw error;
        }
    }

    getField() {
        let values: Record<string, string> = {};
        this.options.forEach((option, index) => {
            values[index] = option;
        })
        return new Field(this.name, values, this.name, this.isMulti, this.isCycle);
    }
}

export { FileClassAttribute, types };