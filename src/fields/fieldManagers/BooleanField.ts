import MetadataMenu from "main";
import { Menu, TFile } from "obsidian";
import { postValues } from "src/commands/postValues";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import { FieldOptions } from "src/components/NoteFields"
import BooleanModal from "src/modals/fields/BooleanModal";
import { FieldType, FieldIcon } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { Note } from "src/note/note";

export default class BooleanField extends FieldManager {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Boolean);
        this.showModalOption = false
    }

    public async toggle(file: TFile, indexedPath?: string): Promise<void> {
        const note = new Note(this.plugin, file)
        await note.build()
        const value = note.existingFields.find(eF => eF.indexedPath === indexedPath)?.value || "false"
        await postValues(this.plugin, [{ id: indexedPath || this.field.id, payload: { value: value === "false" ? "true" : "false" } }], file)
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const iconName = FieldIcon[FieldType.Boolean]
        const action = async () => await this.toggle(file, indexedPath)

        if (BooleanField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`<Toggle ${name}>`);
                item.setIcon(iconName);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            })
        } else if (BooleanField.isSuggest(location)) {
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
        note?: Note,
        indexedPath?: string,
        lineNumber?: number,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        const fieldModal = new BooleanModal(this.plugin, file, this.field, note, indexedPath, lineNumber, after, asList, asComment)
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