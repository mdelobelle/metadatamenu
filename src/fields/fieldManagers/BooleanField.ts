import MetadataMenu from "main";
import { App, Menu, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import FieldCommandSuggestModal from "src/optionModals/FieldCommandSuggestModal";
import BooleanModal from "src/optionModals/fields/BooleanModal";
import FieldSelectModal from "src/optionModals/SelectModal";
import { FieldType, FieldIcon } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";

export default class BooleanField extends FieldManager {

    constructor(field: Field) {
        super(field, FieldType.Boolean)
    }

    addFieldOption(name: string, value: string, app: App, file: TFile, location: Menu | FieldSelectModal | FieldCommandSuggestModal): void {
        const bValue = BooleanField.stringToBoolean(value);
        if (BooleanField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`<${name}> ${bValue ? "✅ ▷ ❌" : "❌ ▷ ✅"}`);
                item.setIcon(FieldIcon[FieldType.Boolean]);
                item.onClick(() => replaceValues(app, file, name, (!bValue).toString()));
                item.setSection("target-metadata");
            })
        } else if (BooleanField.isSelect(location)) {
            location.addOption(`update_${name}`, `<${name}> ${bValue ? "✅ ▷ ❌" : "❌ ▷ ✅"}`);
            location.modals[`update_${name}`] = () => replaceValues(app, file, name, (!bValue).toString());
        } else if (BooleanField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span><b>${name}</b> ${bValue ? "✅ ▷ ❌" : "❌ ▷ ✅"}</span>`,
                action: () => replaceValues(app, file, name, (!bValue).toString()),
                icon: FieldIcon[FieldType.Boolean]
            });
        };
    };
    getOptionsStr(): string {
        return ""
    }

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu): void {
        //no need of settings for boolean field
    }

    async validateValue(value: string): Promise<boolean> {
        try {
            const bValue = BooleanField.stringToBoolean(value)
            return isBoolean(bValue)
        } catch (error) {
            return false
        }
    }

    validateOptions(): boolean {
        //always true since there are no options
        return true
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new BooleanModal(app, file, this.field, false, lineNumber, inFrontmatter, top)
        fieldModal.titleEl.setText(`Set value for ${selectedFieldName}`);
        fieldModal.open();
    }

    async createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
    ): Promise<void> {
        const checkbox: HTMLInputElement = dv.el("input", "", { ...attrs, "type": "checkbox" })
        checkbox.checked = p[this.field.name]
        fieldContainer.appendChild(checkbox)
        checkbox.onchange = (value) => {
            BooleanField.replaceValues(plugin.app, p["file"]["path"], this.field.name, checkbox.checked.toString());
        }
    }
}