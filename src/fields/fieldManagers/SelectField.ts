import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/modals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../_Field";
import AbstractListBasedField from "../abstractFieldManagers/AbstractListBasedField";
import { FieldOptions } from "src/components/NoteFields";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { Note } from "src/note/note";
import { fieldValueManager } from "../Field";

export default class SelectField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Select)
    }

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await Note.getExistingFieldForIndexedPath(this.plugin, file, indexedPath)
        fieldValueManager(this.plugin, this.field.id, this.field.fileClassName, file, eF, indexedPath)
    }

    public addFieldOption(file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions, indexedPath?: string): void {
        const name = this.field.name
        const action = async () => await this.buildAndOpenModal(file, indexedPath)
        if (SelectField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon[FieldType.Select]
            });
        } else if (SelectField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.Select], action, `Update ${name}'s value`);
        };
    };



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
        const fieldModal = new SelectModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = "value-container"
        fieldContainer.appendChild(dv.el('span', p[this.field.name] || "", attrs))
        /* end spacer */
        const spacer = fieldContainer.createEl("div", { cls: "spacer-1" })
        /* button to display modal */
        const dropDownButton = fieldContainer.createEl("button");
        setIcon(dropDownButton, "down-chevron-glyph");
        const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        if (file instanceof TFile && file.extension == "md") {
            dropDownButton.onclick = async () => await this.buildAndOpenModal(file)
        } else {
            dropDownButton.onclick = () => { }
        }
        if (!attrs?.options?.alwaysOn) {
            dropDownButton.hide();
            spacer.show();
            fieldContainer.onmouseover = () => {
                dropDownButton.show();
                spacer.hide();
            }
            fieldContainer.onmouseout = () => {
                dropDownButton.hide();
                spacer.show();
            }
        }
    }
}