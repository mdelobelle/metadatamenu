import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/modals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { FieldOptions } from "src/components/NoteFields";
import { ExistingField } from "../existingField";
import * as fieldsValues from 'src/db/stores/fieldsValues'

export default class SelectField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Select)
    }

    public async buildAndOpenModal(file: TFile, indexedPath?: string): Promise<void> {
        const eF = await fieldsValues.getElementForIndexedPath<ExistingField>(file, indexedPath)
        const modal = new SelectModal(this.plugin, file, this.field, eF, indexedPath);
        modal.titleEl.setText("Select value");
        modal.open()
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
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        const fieldModal = new SelectModal(this.plugin, file, this.field, eF, indexedPath, lineNumber, after, asList, asComment);
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