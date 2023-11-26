import MetadataMenu from "main";
import { Menu, TFile } from "obsidian";
import { postValues } from "src/commands/postValues";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { FieldOptions } from "src/components/NoteFields"
import BooleanModal from "src/modals/fields/BooleanModal";
import { FieldType, FieldIcon } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { ExistingField } from "../existingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { Note } from "src/note/note";
export default class BooleanField extends FieldManager {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Boolean);
        this.showModalOption = false
    }

    public async toggle(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        const value = BooleanField.stringToBoolean(eF?.value)
        const postValue = !value ? "true" : "false"
        await postValues(this.plugin, [{ id: indexedPath || this.field.id, payload: { value: postValue } }], file)
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const iconName = FieldIcon[FieldType.Boolean]
        const action = async () => await this.toggle(file, indexedPath)

        if (BooleanField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `Toggle <span><b>${name}</b></span>`,
                action: action,
                icon: iconName
            });
        } else if (BooleanField.isFieldOptions(location)) {
            location.addOption(
                "check-square",
                action,
                "✅");
        };
    };
    public getOptionsStr(): string {
        return ""
    }

    public createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu): void {
        //no need of settings for boolean field
    }

    public validateValue(value: string): boolean {
        try {
            const bValue = BooleanField.stringToBoolean(value)
            return isBoolean(bValue)
        } catch (error) {
            return false
        }
    }

    public validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber?: number,
        asList?: boolean,
        asBlockquote?: boolean,
        previousModal?: ObjectModal | ObjectListModal
    ): void {
        const fieldModal = new BooleanModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal)
        fieldModal.titleEl.setText(`Set value for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): void {
        const checkbox: HTMLInputElement = dv.el("input", "", { ...attrs, "type": "checkbox" })
        checkbox.checked = p[this.field.name]
        fieldContainer.appendChild(checkbox)
        checkbox.onchange = (value) => {
            BooleanField.replaceValues(this.plugin, p.file.path, this.field.id, checkbox.checked.toString());
        }
    }
}