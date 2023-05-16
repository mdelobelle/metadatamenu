import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import SelectModal from "src/modals/fields/SelectModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { FieldOptions } from "src/components/NoteFields";

export default class SelectField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Select)
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const modal = new SelectModal(this.plugin, file, value, this.field);
        modal.titleEl.setText("Select value");
        const action = () => modal.open()
        if (SelectField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon(FieldIcon[FieldType.Select]);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            });
        } else if (SelectField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon[FieldType.Select]
            });
        } else if (SelectField.isFieldOptions(location)) {
            location.addOption(FieldIcon[FieldType.Multi], action, `Update ${name}'s value`);
        };
    };



    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        value?: string,
        lineNumber?: number,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        const fieldModal = new SelectModal(this.plugin, file, value || "", this.field, lineNumber, after, asList, asComment);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
        fieldModal.open();
    }

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = attrs.cls + " value-container"
        fieldContainer.appendChild(dv.el('span', p[this.field.name] || "", attrs))
        /* end spacer */
        const spacer = fieldContainer.createEl("div", { cls: "spacer-1" })
        /* button to display modal */
        const dropDownButton = fieldContainer.createEl("button");
        setIcon(dropDownButton, "down-chevron-glyph");
        const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
        let fieldModal: SelectModal;
        if (file instanceof TFile && file.extension == "md") {
            fieldModal = new SelectModal(this.plugin, file, p[this.field.name], this.field)
        } else {
            throw Error("path doesn't correspond to a proper file");
        }

        dropDownButton.onclick = () => fieldModal.open()
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