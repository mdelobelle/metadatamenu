import MetadataMenu from "main";
import { FieldIcon, FieldType } from "src/types/fieldTypes";

import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { TFile, Menu, DropdownComponent } from "obsidian";
import NoteFieldsComponent, { FieldOptions } from "src/components/NoteFields";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { postValues } from "src/commands/postValues";
import { ExistingField, Note } from "src/note/note";
import ObjectListModal from "src/modals/fields/ObjectListModal";


export interface ObjectListItem {
    fields: ExistingField[],
    indexInList: number,
    indexedPath: string | undefined
}

export default class ObjectListField extends FieldManager {
    /*
    this object contains a list of objects.
    */
    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.ObjectList)
    }

    addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string, noteField?: NoteFieldsComponent): void {

        if (noteField) {
            const action = async () => await noteField.moveToObject(`${indexedPath}`);
            if (ObjectListField.isFieldOptions(location)) {
                location.addOption(FieldIcon[FieldType.Object], action, `Go to ${this.field.name}'s fields`);
            }
        } else {
            //TODO: leads to a modal where there's a list of objectList items 
            const name = this.field.name
            const action = () => { }
            if (ObjectListField.isSuggest(location)) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Update <b>${name}</b></span>`,
                    action: action,
                    icon: FieldIcon[FieldType.ObjectList]
                });
            }
        }
    }
    validateOptions(): boolean {
        return true
    }
    createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu, location?: SettingLocation): void {
        /*
        const displaySelector = container.createDiv({ cls: "field-container" });
        displaySelector.createDiv({ text: "Items Display", cls: "label" })
        displaySelector.createDiv({ cls: "spacer" });
        const display = new DropdownComponent(displaySelector);
        display.addOption("compact", "compact")
        display.addOption("indented", "indented")
        display.setValue(this.field.options.display || "indented")

        display.onChange((value: "compact" | "indented") => {
            this.field.options.display = value;
        })
        */
    }
    createDvField(dv: any, p: any, fieldContainer: HTMLElement, attrs?: { cls?: string | undefined; attr?: Record<string, string> | undefined; options?: Record<string, string> | undefined; }): void {
        const fieldValue = dv.el('span', "{...}", attrs);
        fieldContainer.appendChild(fieldValue);
    }
    getOptionsStr(): string {
        return ""
    }
    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, note?: Note, indexedPath?: string,
        lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean): Promise<void> {
        //TODO: create add and delete item options
        const fieldModal = new ObjectListModal(this.plugin, file, this.field, note, indexedPath, lineNumber, after, asList, asComment)
        fieldModal.open();
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        const fields = this.plugin.fieldIndex.filesFields.get(file.path)
        if (Array.isArray(value)) container.setText(`${value.length} items: [${fields?.filter(_f => _f.path === this.field.id).map(_f => _f.name).join(", ")}]`)
    }

}