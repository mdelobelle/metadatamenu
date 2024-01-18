import MetadataMenu from "main";
import AbstractDateBasedField from "../abstractFieldManagers/AbstractDateBasedField";
import Field from "../_Field";
import { FieldType } from "src/types/fieldTypes";

export default class DateField extends AbstractDateBasedField {
    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Date)
        this.showModalOption = false;
    }
}