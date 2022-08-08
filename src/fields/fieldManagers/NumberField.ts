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

    canDecrement(value: string): boolean {
        const { step, min } = this.field.options;
        const fStep = parseFloat(step);
        const fMin = parseFloat(min);
        return !(
            isNaN(parseFloat(value)) ||
            !isNaN(fMin) &&
            (
                !isNaN(fStep) && (
                    parseFloat(value) - fStep < fMin ||
                    parseFloat(value) - 1 < fMin
                )
            )
        )
    }

    canIncrement(value: string): boolean {
        const { step, max } = this.field.options;
        const fStep = parseFloat(step);
        const fMax = parseFloat(max);
        return !(
            isNaN(parseFloat(value)) ||
            !isNaN(fMax) &&
            (
                !isNaN(fStep) && (
                    parseFloat(value) + fStep > fMax ||
                    parseFloat(value) + 1 > fMax
                )
            )
        )
    }

    async validateValue(value: string): Promise<boolean> {
        const { min, max } = this.field.options;
        const fMin = parseFloat(min);
        const fMax = parseFloat(max);
        const fValue = parseFloat(value);
        return (
            !isNaN(fValue) && (isNaN(fMin) || fValue >= fMin) && (isNaN(fMax) || fValue <= fMax)
        )
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

    private toggleDvButtons(decrementBtn: HTMLButtonElement, incrementBtn: HTMLButtonElement, value: string) {
        if (this.canDecrement(value)) {
            decrementBtn.removeClass('disabled');
        } else {
            decrementBtn.addClass('disabled');
        }
        if (this.canIncrement(value)) {
            incrementBtn.removeClass('disabled');
        } else {
            incrementBtn.addClass('disabled');;
        }
    }

    async createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): Promise<void> {

        const fieldValue = dv.el('span', p[this.field.name], attrs)
        const inputContainer = document.createElement("div");
        const input = document.createElement("input");
        input.setAttr("class", "metadata-menu-dv-input");
        inputContainer.appendChild(input);
        input.value = p[this.field.name];
        /* end spacer */
        const tripleSpacer = document.createElement("div");
        tripleSpacer.setAttr("class", "metadata-menu-dv-field-triple-spacer");

        /* button to display input */
        const editButton = document.createElement("button");
        editButton.setText("🖍");
        editButton.setAttr('class', "metadata-menu-dv-field-button");
        editButton.hide();

        /* button to display input */
        const decrementButton = document.createElement("button");
        decrementButton.setText("◀️");
        decrementButton.setAttr('class', "metadata-menu-dv-field-button");
        decrementButton.hide();

        /* button to display input */
        const incrementButton = document.createElement("button");
        incrementButton.setText("▶️");
        incrementButton.setAttr('class', "metadata-menu-dv-field-button");
        incrementButton.hide();

        tripleSpacer.show();

        fieldContainer.onmouseover = () => {
            editButton.show();
            decrementButton.show();
            incrementButton.show();
            tripleSpacer.hide();
        }
        fieldContainer.onmouseout = () => {
            editButton.hide();
            decrementButton.hide();
            incrementButton.hide();
            tripleSpacer.show();
        }

        const validateIcon = document.createElement("a")
        validateIcon.textContent = "✅"
        validateIcon.setAttr("class", "metadata-menu-dv-field-button")
        validateIcon.onclick = async () => {
            if (await this.validateValue(input.value)) {
                const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension == "md") {
                    await replaceValues(plugin.app, file, this.field.name, input.value)
                    this.toggleDvButtons(decrementButton, incrementButton, input.value)
                }
                fieldContainer.removeChild(inputContainer)
            }
        }
        inputContainer?.appendChild(validateIcon)
        const cancelIcon = document.createElement("a")
        cancelIcon.setAttr("class", "metadata-menu-dv-field-button")
        cancelIcon.textContent = "❌"
        cancelIcon.onclick = (e) => {
            fieldContainer.removeChild(inputContainer);
            fieldContainer.appendChild(decrementButton);
            fieldContainer.appendChild(fieldValue);
            fieldContainer.appendChild(editButton);
            fieldContainer.appendChild(incrementButton);
            fieldContainer.appendChild(tripleSpacer);
        }
        inputContainer.appendChild(cancelIcon);
        input.focus();

        input.onkeyup = (e) => {
            if (!this.validateValue(input.value)) {
                input.addClass('is-invalid');
                validateIcon.addClass('disabled');
            } else {
                input.removeClass('is-invalid');
                validateIcon.removeClass('disabled');
            }
        }

        input.onkeydown = async (e) => {
            if (e.key === "Enter") {
                if (await this.validateValue(input.value)) {
                    const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                    if (file instanceof TFile && file.extension == "md") {
                        await replaceValues(plugin.app, file, this.field.name, input.value);
                        this.toggleDvButtons(decrementButton, incrementButton, input.value)
                    }
                    fieldContainer.removeChild(inputContainer)
                }
            }
            if (e.key === 'Escape') {
                fieldContainer.removeChild(inputContainer);
                fieldContainer.appendChild(decrementButton);
                fieldContainer.appendChild(fieldValue);
                fieldContainer.appendChild(editButton);
                fieldContainer.appendChild(incrementButton);
                fieldContainer.appendChild(tripleSpacer);
            }
        }
        /* editButton on click : remove button and field and display input field*/
        editButton.onclick = () => {
            fieldContainer.removeChild(fieldValue);
            fieldContainer.removeChild(editButton);
            fieldContainer.removeChild(decrementButton);
            fieldContainer.removeChild(incrementButton);
            fieldContainer.removeChild(tripleSpacer);
            fieldContainer.appendChild(inputContainer);
            input.focus()
        }

        /* decrement button on click: decrement by step or by 1 */
        decrementButton.onclick = async () => {
            if (this.canDecrement(p[this.field.name])) {
                const { step } = this.field.options;
                const fStep = parseFloat(step)
                const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension == "md") {
                    const newValue = (!!fStep ? p[this.field.name] - fStep : p[this.field.name] - 1).toString();
                    await replaceValues(plugin.app, file, this.field.name, newValue);
                    this.toggleDvButtons(decrementButton, incrementButton, newValue);
                }
            }
        }

        /* increment button on click: increment by step or by 1 */
        incrementButton.onclick = () => {
            if (this.canIncrement(p[this.field.name])) {
                const { step } = this.field.options;
                const fStep = parseFloat(step)
                const file = plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension == "md") {
                    const newValue = (!!fStep ? p[this.field.name] + fStep : p[this.field.name] + 1).toString();
                    replaceValues(plugin.app, file, this.field.name, newValue);
                    this.toggleDvButtons(decrementButton, incrementButton, newValue);
                }
            }
        }

        /* initial state */
        fieldContainer.appendChild(decrementButton);
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(editButton);
        fieldContainer.appendChild(incrementButton);
        fieldContainer.appendChild(tripleSpacer);
        this.toggleDvButtons(decrementButton, incrementButton, p[this.field.name]);
    }
}