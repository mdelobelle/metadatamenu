import MetadataMenu from "main";
import { FieldIcon, FieldType, FieldManager as F } from "src/types/fieldTypes";

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
        const name = this.field.name
        if (noteField) {
            const moveToObject = async () => await noteField.moveToObject(`${indexedPath}`);
            const removeObject = async () => await noteField.removeObject(`${indexedPath}`)
            if (ObjectListField.isFieldOptions(location)) {
                //location.addOption(FieldIcon[FieldType.ObjectList], action, `Go to ${this.field.name}'s fields`);
                location.addOption(FieldIcon[FieldType.ObjectList], moveToObject, `Go to this ${name} item`);
                location.addOption("trash", removeObject, `Remove this ${name} item`)
            }
        } else {

            const moveToObject = async () => {
                const note = new Note(this.plugin, file)
                await note.build()
                const eF = note.existingFields.find(eF => eF.indexedPath === indexedPath)
                if (eF) this.createAndOpenFieldModal(file, eF.field.name, note, eF.indexedPath)
            }
            const removeObject = async () => {
                const note = new Note(this.plugin, file)
                await note.build()
                if (indexedPath) note.removeObject(indexedPath)
            }
            if (ObjectListField.isSuggest(location)) {
                location.options.push({
                    id: `update_${name}`,
                    actionLabel: `<span>Update <b>${name}</b></span>`,
                    action: moveToObject,
                    icon: FieldIcon[FieldType.ObjectList]
                });
                location.options.push({
                    id: `remove_${name}`,
                    actionLabel: `<span>Remove this <b>${name}</b> item</span>`,
                    action: removeObject,
                    icon: "trash"
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

    public async addObjectListItem(note: Note, indexedPath?: string) {
        //search for object's value in note
        const value = note.getExistingFieldForIndexedPath(indexedPath)?.value
        const indexForNew = !value || value.length === 0 ? 0 : value.length
        if (indexedPath) await postValues(this.plugin, [{ id: `${indexedPath}[${indexForNew}]`, payload: { value: "" } }], note.file, -1)
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, note?: Note, indexedPath?: string,
        lineNumber?: number, after?: boolean, asList?: boolean, asComment?: boolean): Promise<void> {
        //TODO: create add and delete item options
        const fieldModal = new ObjectListModal(this.plugin, file, this.field, note, indexedPath, lineNumber, after, asList, asComment)
        fieldModal.open();
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        console.log(value)
        const fields = this.plugin.fieldIndex.filesFields.get(file.path)
        if (Array.isArray(value)) {
            const items = fields?.filter(_f => Field.upperPath(_f.path) === this.field.path && _f.path !== "").map(_f => _f.name) || []
            console.log(fields)
            container.setText(`${value.length} item${value.length !== 1 ? "(s)" : ""}: [${items.join(" | ")}]`)
        }
    }

}