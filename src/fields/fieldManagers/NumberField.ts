import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import { replaceValues } from "src/commands/replaceValues";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import NumbertModal from "src/optionModals/fields/NumberModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";

export default class NumberField extends FieldManager {

    private numberValidatorField: HTMLDivElement;
    private numberStepValue: TextComponent;
    private numberMinValue: TextComponent;
    private numberMaxValue: TextComponent;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Number)
    }

    getOptionsStr(): string {
        const options: string[] = [];
        Object.keys(this.field.options).forEach((k) => { if (this.field.options[k]) options.push(`${k}: ${this.field.options[k]}`) })
        return options.join(" | ")
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

    addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal): void {
        const modal = new NumbertModal(this.plugin, file, this.field, value);
        modal.titleEl.setText(`Change Value for <${name}>`);
        if (NumberField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon[FieldType.Number]);
                item.onClick(() => modal.open());
                item.setSection("metadata-menu.fields");
            })
            const { min, max, step } = this.field.options

            const fMin = parseFloat(min)
            const fMax = parseFloat(max)
            const fStep = parseFloat(step)
            const fValue = parseFloat(value)
            if (fStep) {
                if (!isNaN(fMin) && fValue - fStep > fMin)
                    location.addItem((item) => {
                        item.setIcon(FieldIcon[FieldType.Number]);
                        item.setTitle(`<${name}> ↘️ ${fValue - fStep}`);
                        item.onClick(() => replaceValues(this.plugin, file, name, (fValue - fStep).toString()));
                        item.setSection("metadata-menu.fields");
                    })
                if (!isNaN(fMax) && fValue + fStep < fMax)
                    location.addItem((item) => {
                        item.setIcon(FieldIcon[FieldType.Number]);
                        item.setTitle(`<${name}> ↗️ ${fValue + fStep}`);
                        item.onClick(() => replaceValues(this.plugin, file, name, (fValue + fStep).toString()));
                        item.setSection("metadata-menu.fields");
                    })
            }
        } else if (NumberField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: () => modal.open(),
                icon: FieldIcon[FieldType.Number]
            });
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

    createSettingContainer(parentContainer: HTMLDivElement, plugin: MetadataMenu): void {
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

    createAndOpenFieldModal(file: TFile, selectedFieldName: string, value?: string, lineNumber?: number, inFrontmatter?: boolean, after?: boolean): void {
        const fieldModal = new NumbertModal(this.plugin, file, this.field, value || "", lineNumber, inFrontmatter, after);
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
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> }
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
        setIcon(editButton, FieldIcon[FieldType.Number]);
        editButton.setAttr('class', "metadata-menu-dv-field-button");


        /* button to display input */
        const decrementButton = document.createElement("button");
        setIcon(decrementButton, "left-arrow");
        decrementButton.setAttr('class', "metadata-menu-dv-field-button");


        /* button to display input */
        const incrementButton = document.createElement("button");
        setIcon(incrementButton, "right-arrow")
        incrementButton.setAttr('class', "metadata-menu-dv-field-button");

        if (!attrs?.options?.alwaysOn) {
            editButton.hide();
            decrementButton.hide();
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
        }

        const validateIcon = document.createElement("a")
        setIcon(validateIcon, "checkmark")
        validateIcon.setAttr("class", "metadata-menu-dv-field-button")
        validateIcon.onclick = async () => {
            if (await this.validateValue(input.value)) {
                const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile && file.extension == "md") {
                    await replaceValues(this.plugin, file, this.field.name, input.value)
                    this.toggleDvButtons(decrementButton, incrementButton, input.value)
                }
                fieldContainer.removeChild(inputContainer)
            }
        }
        inputContainer?.appendChild(validateIcon)
        const cancelIcon = document.createElement("a")
        cancelIcon.setAttr("class", "metadata-menu-dv-field-button")
        setIcon(cancelIcon, "cross");
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
                    const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)
                    if (file instanceof TFile && file.extension == "md") {
                        await replaceValues(this.plugin, file, this.field.name, input.value);
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
                const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension == "md") {
                    const newValue = (!!fStep ? p[this.field.name] - fStep : p[this.field.name] - 1).toString();
                    await replaceValues(this.plugin, file, this.field.name, newValue);
                    this.toggleDvButtons(decrementButton, incrementButton, newValue);
                }
            }
        }

        /* increment button on click: increment by step or by 1 */
        incrementButton.onclick = () => {
            if (this.canIncrement(p[this.field.name])) {
                const { step } = this.field.options;
                const fStep = parseFloat(step)
                const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension == "md") {
                    const newValue = (!!fStep ? p[this.field.name] + fStep : p[this.field.name] + 1).toString();
                    replaceValues(this.plugin, file, this.field.name, newValue);
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