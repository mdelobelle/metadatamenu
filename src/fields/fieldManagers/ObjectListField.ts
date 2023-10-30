import MetadataMenu from "main";
import { FieldIcon, FieldType, FieldManager as F } from "src/types/fieldTypes";
import { FieldManager, SettingLocation } from "../FieldManager";
import Field from "../Field";
import { TFile, Menu, DropdownComponent } from "obsidian";
import NoteFieldsComponent, { FieldOptions } from "src/components/NoteFields";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { postValues } from "src/commands/postValues";
import { Note } from "src/note/note";
import { ExistingField } from "../ExistingField";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import ObjectModal from "src/modals/fields/ObjectModal";


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
            const removeObject = async () => {
                if (indexedPath) {
                    const note = await Note.buildNote(this.plugin, file)
                    await note.removeObject(indexedPath)
                }
            }
            if (ObjectListField.isFieldOptions(location)) {
                //location.addOption(FieldIcon[FieldType.ObjectList], action, `Go to ${this.field.name}'s fields`);
                location.addOption(FieldIcon[FieldType.ObjectList], moveToObject, `Go to this ${name} item`);
                location.addOption("trash", removeObject, `Remove this ${name} item`)
            }
        } else {

            const moveToObject = async () => {
                const _eF = await ExistingField.getExistingFieldFromIndexForIndexedPath(this.plugin, file, indexedPath)
                //FIXME on devrait pas mettre un previousLodal là?
                if (_eF) this.createAndOpenFieldModal(file, _eF.field.name, _eF, _eF.indexedPath, undefined, undefined, undefined, undefined)
            }
            const removeObject = async () => {
                if (indexedPath) {
                    const note = await Note.buildNote(this.plugin, file)
                    await note.removeObject(indexedPath)
                }
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

    public async addObjectListItem(file: TFile, eF?: ExistingField, indexedPath?: string) {
        //search for object's value in note
        const value = eF?.value
        const indexForNew = !value || value.length === 0 ? 0 : value.length
        if (indexedPath) await postValues(this.plugin, [{ id: `${indexedPath}[${indexForNew}]`, payload: { value: "" } }], file, -1)
    }

    async createAndOpenFieldModal(file: TFile, selectedFieldName: string, eF?: ExistingField, indexedPath?: string,
        lineNumber?: number, asList?: boolean, asBlockquote?: boolean, previousModal?: ObjectModal | ObjectListModal): Promise<void> {
        const objects = await eF?.getChildrenFields(this.plugin, file) || []
        const fieldModal = new ObjectListModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal, objects)
        fieldModal.open();
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked?: () => void): void {
        const fields = this.plugin.fieldIndex.filesFields.get(file.path)
        if (Array.isArray(value)) {
            const items = fields?.filter(_f => Field.upperPath(_f.path) === this.field.path && _f.path !== "").map(_f => _f.name) || []
            container.setText(`${value.length} item${value.length !== 1 ? "(s)" : ""}: [${items.join(" | ")}]`)
        }
    }
}