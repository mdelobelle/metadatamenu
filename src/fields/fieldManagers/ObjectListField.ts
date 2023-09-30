import MetadataMenu from "main";
import { FieldIcon, FieldType } from "src/types/fieldTypes";

import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { TFile, Menu } from "obsidian";
import NoteFieldsComponent, { FieldOptions } from "src/components/NoteFields";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { postValues } from "src/commands/postValues";
import { Note } from "src/note/note";

export default class ObjectListField extends FieldManager {
    /*
    this object contains a list of objects.
    the challenge is ui and field_id based node finding (since many fields can have the same id from fileClass definition)
    - create a composite field_id (eg kjdhfskh-oiuzeoiez__0, kjdhfskh-oiuzeoiez__1 .... for several instances of the same field )
    - an objectList contains objects even if this object only has 1 field, e.g. we can't have a list of fields directly
    - in terms of ui it will be cumbersome to have all the cascade in the same NoteField or Field Options SuggestModal 
        -> we have to introduce  kind of navigation in nottefield and suggest modal
        -> since we need to list objects instances to provide navigation, it won't be available in context menu that is build synchronously
    - advanced: objects in list can be displayed with their names or without : we may give the choice to the user
        - with name
        `list:
          - itemObject:
            - attr1: some value
            - attr2: some number
          - itemObject:
            - attr1: some other value
            - attr2: some other number`
        
        - without name (compact)
        `list:
          - attr1: some value
            attr2: some number
          - attr1: some othervalue
            attr2: some other number`
    */
    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.ObjectList)
    }

    addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, noteField: NoteFieldsComponent): void {
        const action = async () => await noteField.moveToObject(this.field.id);
        if (ObjectListField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.Object], action, `Go to ${this.field.name}'s fields`);
        }
    }
    validateOptions(): boolean {
        return true
    }
    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {

    }
    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {
        const fieldValue = dv.el('span', "{...}", attrs);
        fieldContainer.appendChild(fieldValue);
    }
    getOptionsStr(): string {
        return ""
    }
    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, note?: Note, lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean): Promise<void> {

    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        const fields = this.plugin.fieldIndex.filesFields.get(file.path)
        if (Array.isArray(value)) container.setText(`${value.length} items: [${fields?.filter(_f => _f.path === this.field.id).map(_f => _f.name).join(", ")}]`)
    }

}