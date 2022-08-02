import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { App, Menu, TFile } from "obsidian";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";
import valueSelectModal from "src/optionModals/valueSelectModal";

export default class SelectField extends FieldManager {

    constructor(field: Field) {
        super(field, FieldType.Select)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new valueSelectModal(app, file, this.field.name, value, this.field);
        modal.titleEl.setText("Select value");
        if (SelectField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update ${name}`);
                item.setIcon('right-triangle');
                item.onClick((evt: MouseEvent) => modal.open());
                item.setSection("target-metadata");
            });
        } else if (SelectField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    };

    createSettingContainer(): void {
        //no need of settings for standard input field
    }

    validate(): boolean {
        return true
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueSelectModal(app, file, this.field.name, "", this.field, lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Select option for ${selectedFieldName}`);
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