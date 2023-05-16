import MetadataMenu from "main";
import { Menu, setIcon, TextComponent, TFile } from "obsidian";
import FieldCommandSuggestModal from "src/options/FieldCommandSuggestModal";
import NumberModal from "src/modals/fields/NumberModal";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldIcon, FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager } from "../FieldManager";
import { FieldOptions } from "src/components/NoteFields";
import { postValues } from "src/commands/postValues";

export default class NumberField extends FieldManager {

    private numberValidatorField: HTMLDivElement;
    private numberStepValue: TextComponent;
    private numberMinValue: TextComponent;
    private numberMaxValue: TextComponent;

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Number);
    }

    public getOptionsStr(): string {
        const options: string[] = [];
        Object.keys(this.field.options).forEach((k) => { if (this.field.options[k]) options.push(`${k}: ${this.field.options[k]}`) })
        return options.join(" | ")
    }

    public canDecrement(value: string): boolean {
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

    public canIncrement(value: string): boolean {
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

    public validateValue(value: string): boolean {
        const { min, max } = this.field.options;
        const fMin = parseFloat(min);
        const fMax = parseFloat(max);
        const fValue = parseFloat(value);
        return (
            !isNaN(fValue) && (isNaN(fMin) || fValue >= fMin) && (isNaN(fMax) || fValue <= fMax)
        )
    }

    public addFieldOption(name: string, value: string, file: TFile, location: Menu | FieldCommandSuggestModal | FieldOptions): void {
        const modal = new NumberModal(this.plugin, file, this.field, value);
        modal.titleEl.setText(`Change Value for <${name}>`);
        const { min, max, step } = this.field.options;
        const fMin = parseFloat(min)
        const fMax = parseFloat(max)
        const fStep = parseFloat(step)
        const fValue = parseFloat(value)
        const canDecrease = !isNaN(fMin) && fValue - fStep >= fMin;
        const canIncrease = !isNaN(fMax) && fValue + fStep <= fMax;
        const action = () => modal.open()
        const decrease = async () => await postValues(this.plugin, [{ name: name, payload: { value: (fValue - fStep).toString() } }], file)
        const increase = async () => await postValues(this.plugin, [{ name: name, payload: { value: (fValue + fStep).toString() } }], file)
        if (NumberField.isMenu(location)) {
            location.addItem((item) => {
                item.setTitle(`Update <${name}>`);
                item.setIcon(FieldIcon[FieldType.Number]);
                item.onClick(action);
                item.setSection("metadata-menu.fields");
            })

            if (fStep) {
                if (canDecrease)
                    location.addItem((item) => {
                        item.setIcon("minus-square");
                        item.setTitle(`<${name}> ↘️ ${fValue - fStep}`);
                        item.onClick(decrease);
                        item.setSection("metadata-menu.fields");
                    })
                if (canIncrease)
                    location.addItem((item) => {
                        item.setIcon("plus-square");
                        item.setTitle(`<${name}> ↗️ ${fValue + fStep}`);
                        item.onClick(increase);
                        item.setSection("metadata-menu.fields");
                    })
            }
        } else if (NumberField.isSuggest(location)) {
            location.options.push({
                id: `update_${name}`,
                actionLabel: `<span>Update <b>${name}</b></span>`,
                action: action,
                icon: FieldIcon[FieldType.Number]
            });
        } else if (NumberField.isFieldOptions(location)) {
            if (step) {
                if (canDecrease) {
                    location.addOption("minus-square", decrease, `Decrease ${name} by ${step}`);
                }
                if (canIncrease) {
                    location.addOption("plus-square", increase, `Increase ${name} by ${step}`);
                }
            }
            location.addOption(FieldIcon[FieldType.Number], action, `Update ${name}'s value`)
        };
    };

    private createNumberContainer(container: HTMLDivElement): void {
        const numberStepValueContainer = container.createDiv({ cls: "field-container" });
        numberStepValueContainer.createEl("span", { text: "Step (optional)", cls: 'label' })
        numberStepValueContainer.createDiv({ cls: "spacer" });
        this.numberStepValue = new TextComponent(numberStepValueContainer)
        this.numberStepValue.inputEl.addClass("with-label")
        this.numberStepValue.setValue(this.field.options.step || "")

        const numberMinValueContainer = container.createDiv({ cls: "field-container" });
        numberMinValueContainer.createEl("span", { text: "Min value (optional)", cls: 'label' })
        this.numberMinValue = new TextComponent(numberMinValueContainer)
        this.numberMinValue.inputEl.addClass("full-width");
        this.numberMinValue.inputEl.addClass("with-label")
        this.numberMinValue.setValue(this.field.options.min || "")

        const numberMaxValueContainer = container.createDiv({ cls: "field-container" });
        numberMaxValueContainer.createEl("span", { text: "Max value (optional)", cls: 'label' })
        this.numberMaxValue = new TextComponent(numberMaxValueContainer)
        this.numberMaxValue.inputEl.addClass("full-width");
        this.numberMaxValue.inputEl.addClass("with-label")
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

    public createSettingContainer(container: HTMLDivElement, plugin: MetadataMenu): void {

        this.createNumberContainer(container)
    }

    public validateOptions(): boolean {
        let error = false
        if (this.field.options.step && isNaN(parseFloat(this.field.options.step))) {
            FieldSettingsModal.setValidationError(
                this.numberStepValue,
                "Values must be numeric."
            );
            error = true;
        }
        if (this.field.options.min && isNaN(parseFloat(this.field.options.min))) {
            FieldSettingsModal.setValidationError(
                this.numberMinValue,
                "Values must be numeric."
            );
            error = true;
        }
        if (this.field.options.max && isNaN(parseFloat(this.field.options.max))) {
            FieldSettingsModal.setValidationError(
                this.numberMaxValue,
                "Values must be numeric."
            );
            error = true;
        }
        return !error
    }

    public createAndOpenFieldModal(
        file: TFile,
        selectedFieldName: string,
        value?: string,
        lineNumber?: number,
        after?: boolean,
        asList?: boolean,
        asComment?: boolean
    ): void {
        const fieldModal = new NumberModal(this.plugin, file, this.field, value || "", lineNumber, after, asList, asComment);
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

    public createDvField(
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
    ): void {
        attrs.cls = attrs.cls + " value-container"
        const fieldValue = (dv.el('span', p[this.field.name], attrs) as HTMLDivElement);
        fieldContainer.appendChild(fieldValue)
        const inputContainer = fieldContainer.createDiv({});
        const input = inputContainer.createEl("input");
        input.value = p[this.field.name];
        /* end spacer */
        const tripleSpacer = fieldContainer.createDiv({ cls: "spacer-3" });

        /* button to display input */
        const editButton = fieldContainer.createEl("button");
        setIcon(editButton, FieldIcon[FieldType.Number]);

        /* button to display input */
        const decrementButton = fieldContainer.createEl("button");
        setIcon(decrementButton, "left-arrow");

        /* button to display input */
        const incrementButton = fieldContainer.createEl("button");
        setIcon(incrementButton, "right-arrow");

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

        const validateIcon = fieldContainer.createEl("button")
        setIcon(validateIcon, "checkmark")
        validateIcon.onclick = async () => {
            if (this.validateValue(input.value)) {
                const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)
                if (file instanceof TFile && file.extension == "md") {
                    await postValues(this.plugin, [{ name: this.field.name, payload: { value: input.value } }], file)
                    this.toggleDvButtons(decrementButton, incrementButton, input.value)
                }
                fieldContainer.removeChild(inputContainer)
            }
        }
        inputContainer?.appendChild(validateIcon)
        const cancelIcon = fieldContainer.createEl("button")
        setIcon(cancelIcon, "cross");
        cancelIcon.onclick = (e) => {
            fieldContainer.removeChild(inputContainer);
            fieldContainer.appendChild(fieldValue);
            fieldContainer.appendChild(decrementButton);
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
                if (this.validateValue(input.value)) {
                    const file = this.plugin.app.vault.getAbstractFileByPath(p.file.path)
                    if (file instanceof TFile && file.extension == "md") {
                        await postValues(this.plugin, [{ name: this.field.name, payload: { value: input.value } }], file)
                        this.toggleDvButtons(decrementButton, incrementButton, input.value)
                    }
                    fieldContainer.removeChild(inputContainer)
                }
            }
            if (e.key === 'Escape') {
                fieldContainer.removeChild(inputContainer);
                fieldContainer.appendChild(fieldValue);
                fieldContainer.appendChild(decrementButton);
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
                    await postValues(this.plugin, [{ name: this.field.name, payload: { value: newValue } }], file)
                    this.toggleDvButtons(decrementButton, incrementButton, newValue);
                }
            }
        }

        /* increment button on click: increment by step or by 1 */
        incrementButton.onclick = async () => {
            if (this.canIncrement(p[this.field.name])) {
                const { step } = this.field.options;
                const fStep = parseFloat(step)
                const file = this.plugin.app.vault.getAbstractFileByPath(p["file"]["path"])
                if (file instanceof TFile && file.extension == "md") {
                    const newValue = (!!fStep ? p[this.field.name] + fStep : p[this.field.name] + 1).toString();
                    await postValues(this.plugin, [{ name: this.field.name, payload: { value: newValue } }], file)
                    this.toggleDvButtons(decrementButton, incrementButton, newValue);
                }
            }
        }

        /* initial state */
        fieldContainer.removeChild(inputContainer);
        fieldContainer.appendChild(fieldValue);
        fieldContainer.appendChild(decrementButton);
        fieldContainer.appendChild(editButton);
        fieldContainer.appendChild(incrementButton);
        fieldContainer.appendChild(tripleSpacer);
        this.toggleDvButtons(decrementButton, incrementButton, p[this.field.name]);
    }
}