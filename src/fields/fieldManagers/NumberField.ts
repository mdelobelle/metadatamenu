import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import numbertModal from "src/optionModals/numberModal";
import { App, Menu, TFile, TextComponent } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import SelectModal from "src/optionModals/SelectModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import MetadataMenu from "main";

export default class NumberField extends FieldManager {

    private numberValidatorField: HTMLDivElement;
    private numberStepValue: TextComponent;
    private numberMinValue: TextComponent;
    private numberMaxValue: TextComponent;

    constructor(field: Field) {
        super(field, FieldType.Number)
    }

    addMenuOption(name: string, value: string, app: App, file: TFile, category: Menu | SelectModal): void {
        const modal = new numbertModal(app, file, this.field, value);
        modal.titleEl.setText(`Change Value for <${name}>`);
        if (NumberField.isMenu(category)) {
            category.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon('pencil');
                item.onClick(() => modal.open());
                item.setSection("target-metadata");
            })
            const { min, max, step } = this.field.options

            const fMin = parseFloat(min)
            const fMax = parseFloat(max)
            const fStep = parseFloat(step)
            const fValue = parseFloat(value)
            if (fStep) {
                if (isNaN(fMin) || (fMin && fValue - fStep > fMin))
                    category.addItem((item) => {
                        item.setIcon('pencil');
                        item.setTitle(`<${name}> ➡️ ${fValue - fStep}`);
                        item.onClick(() => replaceValues(app, file, name, (fValue - fStep).toString()));
                        item.setSection("target-metadata");
                    })
                if (isNaN(fMax) || (fMax && fValue + fStep < fMax))
                    category.addItem((item) => {
                        item.setIcon('pencil');
                        item.setTitle(`<${name}> ➡️ ${fValue + fStep}`);
                        item.onClick(() => replaceValues(app, file, name, (fValue + fStep).toString()));
                        item.setSection("target-metadata");
                    })
            }
        } else if (NumberField.isSelect(category)) {
            category.addOption(`update_${name}`, `Update <${name}>`);
            category.modals[`update_${name}`] = () => modal.open();
        };
    };

    createNumberContainer(parentContainer: HTMLDivElement): void {
        const numberStepValueContainer = parentContainer.createDiv();
        numberStepValueContainer.createEl("span", { text: "Step (optional)", cls: 'metadata-menu-field-option' })
        this.numberStepValue = new TextComponent(numberStepValueContainer)
        this.numberStepValue.setValue(this.field.options.step || "")

        const numberMinValueContainer = parentContainer.createDiv();
        numberMinValueContainer.createEl("span", { text: "Min value (optional)", cls: 'metadata-menu-field-option' })
        this.numberMinValue = new TextComponent(numberMinValueContainer)
        this.numberMinValue.setValue(this.field.options.min || "")

        const numberMaxValueContainer = parentContainer.createDiv();
        numberMaxValueContainer.createEl("span", { text: "Max value (optional)", cls: 'metadata-menu-field-option' })
        this.numberMaxValue = new TextComponent(numberMaxValueContainer)
        this.numberMaxValue.setValue(this.field.options.max || "")
        this.numberStepValue.onChange(value => {
            this.field.options.step = value;
            FieldSettingsModal.removeValidationError(this.numberStepValue);
        })
        this.numberMinValue.onChange(value => {
            this.field.options.min = value;
            FieldSettingsModal.removeValidationError(this.numberMinValue);
        })
        this.numberMaxValue.onChange(value => {
            this.field.options.max = value;
            FieldSettingsModal.removeValidationError(this.numberMaxValue);
        })
    }

    createSettingContainer(parentContainer: HTMLDivElement): void {
        this.numberValidatorField = parentContainer.createDiv({ cls: "metadata-menu-number-options" })
        this.createNumberContainer(this.numberValidatorField)
        this.numberValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    validateOptions(): boolean {
        let error = false
        if (this.field.options.step && isNaN(parseFloat(this.field.options.step))) {
            FieldSettingsModal.setValidationError(
                this.numberStepValue, this.numberStepValue.inputEl,
                "Values must be numeric."
            );
            error = true;
        }
        if (this.field.options.min && isNaN(parseFloat(this.field.options.min))) {
            FieldSettingsModal.setValidationError(
                this.numberMinValue, this.numberMinValue.inputEl,
                "Values must be numeric."
            );
            error = true;
        }
        if (this.field.options.max && isNaN(parseFloat(this.field.options.max))) {
            FieldSettingsModal.setValidationError(
                this.numberMaxValue, this.numberMaxValue.inputEl,
                "Values must be numeric."
            );
            error = true;
        }
        return !error
    }

    createAndOpenFieldModal(app: App, file: TFile, selectedFieldName: string, lineNumber?: number, inFrontmatter?: boolean, top?: boolean): void {
        const fieldModal = new numbertModal(app, file, this.field, "", lineNumber, inFrontmatter, top);
        fieldModal.titleEl.setText(`Enter value for ${selectedFieldName}`);
        fieldModal.open();
    }

    createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): void {
        fieldContainer.setText(p[this.field.name])
    }
}