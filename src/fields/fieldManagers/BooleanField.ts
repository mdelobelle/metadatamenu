import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import valueToggleModal from "src/optionModals/valueToggleModal";
import { App, Menu, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import SelectModal from "src/optionModals/SelectModal";
import MetadataMenu from "main";

export default class BooleanField extends FieldManager {

    constructor(field: Field) {
        super(field, FieldType.Boolean)
    }

    private stringToBoolean(value: string): boolean {
        let toBooleanValue: boolean = false;
        if (isBoolean(value)) {
            toBooleanValue = value;
        } else if (/true/i.test(value)) {
            toBooleanValue = true;
        } else if (/false/i.test(value)) {
            toBooleanValue = false;
        };
        return toBooleanValue;
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const bValue = this.stringToBoolean(value);
        if (BooleanField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`<${name}> ${bValue ? "✅ ▷ ❌" : "❌ ▷ ✅"}`);
                item.setIcon('checkmark');
                item.onClick(() => replaceValues(app, file, name, (!bValue).toString()));
                item.setSection("target-metadata");
            })
        } else if (BooleanField.isSelect(category)) {
            category.addOption(`update_${name}`, `<${name}> ${bValue ? "✅ ▷ ❌" : "❌ ▷ ✅"}`);
            category.modals[`update_${name}`] = () => replaceValues(app, file, name, (!bValue).toString());
        };
    };

    createSettingContainer(parentContainer: HTMLDivElement): void {
        //no need of settings for boolean field
    }

    validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new valueToggleModal(app, file, this.field.name, false, lineNumber, inFrontmatter, top)
        fieldModal.titleEl.setText(`Set value for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): void {
        const checkbox: HTMLInputElement = dv.el("input", "", { ...attrs, "type": "checkbox" })
        checkbox.checked = p[this.field.name]
        fieldContainer.appendChild(checkbox)
        checkbox.onchange = (value) => {
            BooleanField.replaceValues(plugin.app, p["file"]["path"], this.field.name, checkbox.checked.toString());
        }
    }
}