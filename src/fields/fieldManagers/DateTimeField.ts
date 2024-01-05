import MetadataMenu from "main";
import AbstractDateBasedField from "../abstractFieldManagers/AbstractDateBasedField";
import Field from "../Field";
import { FieldType } from "src/types/fieldTypes";

export default class DateTimeField extends AbstractDateBasedField {
    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.DateTime)
        this.showModalOption = false;
    }
}