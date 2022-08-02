import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractListBasedField from "./AbstractListBasedField";
import { App, Menu, TFile, TextComponent } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import valueMultiSelectModal from "src/optionModals/valueMultiSelectModal";

export default class MultiField extends AbstractListBasedField {

    valuesPromptComponents: Array<TextComponent> = [];
    presetValuesFields: HTMLDivElement;

    constructor(field: Field) {
        super(field, FieldType.Multi)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new valueMultiSelectModal(app, file, name, value, this.field);
        modal.titleEl.setText("Select values");
        if (MultiField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon('bullet-list');
                item.onClick((evt: MouseEvent) => {
                    modal.open();
                });
                item.setSection("target-metadata");
            });
        } else if (MultiField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    };

    validate(): boolean {
        return true
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueMultiSelectModal(app, file, this.field.name, "", this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Select options for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): void {
    }
}