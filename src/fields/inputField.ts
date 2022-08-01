import Field from "./Field";
import { FieldType } from "src/types/fieldTypes";

export default class inputField {
    public field: Field

    constructor(field: Field) {
        if (this.field.type !== FieldType.Input) throw Error("this is not an input Field")
    }
}