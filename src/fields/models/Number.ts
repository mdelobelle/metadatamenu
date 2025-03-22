import { ButtonComponent, TFile, TextComponent, setIcon } from "obsidian"
import { IFieldBase, BaseOptions } from "../base/BaseField"
import { ISettingsModal as BaseSettingsModal } from "../base/BaseSetting"
import { getIcon } from "../Fields"
import { IFieldManager, Target, baseDisplayValue, fieldValueManager, isSuggest, isFieldActions, ActionLocation, removeValidationError, IField, baseGetValueString } from "../Field"
import MetadataMenu from "main"
import { IBasicModal, basicModal } from "../base/BaseModal"
import { cleanActions } from "src/utils/modals"
import { Constructor } from "src/typings/types"
import { getExistingFieldForIndexedPath } from "../ExistingField"

export class Base implements IFieldBase {
    type = <const>"Number"
    tagName = "number"
    icon = "plus-minus-glyph"
    tooltip = "Accepts a number"
    colorClass = "number"
}

export interface Options extends BaseOptions {
    step?: number
    min?: number
    max?: number
}
export interface DefaultedOptions extends Options { }
export const DefaultOptions: DefaultedOptions = {}

export interface ISettingsModal extends BaseSettingsModal<Options> {
    numberStepValue: TextComponent;
    numberMinValue: TextComponent;
    numberMaxValue: TextComponent;
}

export function settingsModal(Base: Constructor<BaseSettingsModal<DefaultedOptions>>): Constructor<ISettingsModal> {
    return class SettingModal extends Base {
        public numberStepValue: TextComponent;
        public numberMinValue: TextComponent;
        public numberMaxValue: TextComponent;
        createSettingContainer = () => {
            const container = this.optionsContainer
            const numberStepValueContainer = container.createDiv({ cls: "field-container" });
            numberStepValueContainer.createEl("span", { text: "Step (optional)", cls: 'label' })
            numberStepValueContainer.createDiv({ cls: "spacer" });
            this.numberStepValue = new TextComponent(numberStepValueContainer)
            this.numberStepValue.inputEl.addClass("with-label")
            this.numberStepValue.setValue(`${this.field.options.step || ""}`)

            const numberMinValueContainer = container.createDiv({ cls: "field-container" });
            numberMinValueContainer.createEl("span", { text: "Min value (optional)", cls: 'label' })
            this.numberMinValue = new TextComponent(numberMinValueContainer)
            this.numberMinValue.inputEl.addClass("full-width");
            this.numberMinValue.inputEl.addClass("with-label")
            this.numberMinValue.setValue(`${this.field.options.min || ""}`)

            const numberMaxValueContainer = container.createDiv({ cls: "field-container" });
            numberMaxValueContainer.createEl("span", { text: "Max value (optional)", cls: 'label' })
            this.numberMaxValue = new TextComponent(numberMaxValueContainer)
            this.numberMaxValue.inputEl.addClass("full-width");
            this.numberMaxValue.inputEl.addClass("with-label")
            this.numberMaxValue.setValue(`${this.field.options.max || ""}`)
            this.numberStepValue.onChange(value => {
                this.field.options.step = parseFloat(value);
                removeValidationError(this.numberStepValue);
            })
            this.numberMinValue.onChange(value => {
                this.field.options.min = parseFloat(value);
                removeValidationError(this.numberMinValue);
            })
            this.numberMaxValue.onChange(value => {
                this.field.options.max = parseFloat(value);
                removeValidationError(this.numberMaxValue);
            })
        }

        validateOptions(): boolean {
            return true
        }
    }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<IBasicModal<Target>> {
    const base = basicModal(managedField, plugin)
    return class ValueModal extends base {
        private numberInput: TextComponent;
        private errorField: HTMLDivElement;
        private value: string;

        constructor(...rest: any[]) {
            super()
            this.containerEl.addClass("metadata-menu")
            this.value = managedField.value
            this.buildInputEl()
        }

        private decrement(numberInput: TextComponent): void {
            const { step } = this.managedField.options;
            const fStep = parseFloat(step);
            const fValue = parseFloat(numberInput.getValue()) || 0
            if (!isNaN(fStep)) {
                const newValue = (fValue - fStep).toString()
                this.managedField.value = newValue
                numberInput.setValue((fValue - fStep).toString());
            } else {
                const newValue = (fValue - 1).toString()
                this.managedField.value = newValue
                numberInput.setValue((fValue - 1).toString());
            }
        }

        private increment(numberInput: TextComponent): void {
            const { step } = this.managedField.options
            const fStep = parseFloat(step)
            const fValue = parseFloat(numberInput.getValue()) || 0
            if (!isNaN(fStep)) {
                const newValue = (fValue + fStep).toString()
                this.managedField.value = newValue
                numberInput.setValue(newValue);
            } else {
                const newValue = (fValue + 1).toString()
                this.managedField.value = newValue
                numberInput.setValue((fValue + 1).toString());
            }
        }

        private toggleButtonsState(minusBtn: ButtonComponent, plusBtn: ButtonComponent, numberInput: TextComponent): void {
            minusBtn.setDisabled(!canDecrement(this.managedField));
            plusBtn.setDisabled(!canIncrement(this.managedField));
            if (canDecrement(this.managedField)) {
                minusBtn.setCta();
            } else {
                minusBtn.removeCta();
            }
            if (canIncrement(this.managedField)) {
                plusBtn.setCta();
            } else {
                plusBtn.removeCta();
            }
        }

        private buildInputEl(): void {
            const { step } = this.managedField.options as Options
            cleanActions(this.contentEl, ".field-container")
            const fieldContainer = this.contentEl.createEl("div", { cls: "field-container" })

            this.numberInput = new TextComponent(fieldContainer);
            const numberInput = this.numberInput
            numberInput.inputEl.focus();
            numberInput.setValue(`${this.value || ""}`);

            const minusBtn = new ButtonComponent(fieldContainer);
            minusBtn.setButtonText(`- ${!!step ? step : 1}`);
            minusBtn.setDisabled(!canDecrement(this.managedField));

            const plusBtn = new ButtonComponent(fieldContainer);
            plusBtn.setButtonText(`+ ${!!step ? step : 1}`);
            plusBtn.setDisabled(!canIncrement(this.managedField));

            fieldContainer.createDiv({ cls: "spacer" })
            this.buildSaveBtn(fieldContainer)

            cleanActions(this.contentEl, ".field-error")
            this.errorField = this.contentEl.createEl("div", { cls: "field-error" })
            this.errorField.hide()

            this.toggleButtonsState(minusBtn, plusBtn, numberInput);

            //event handlers
            numberInput.onChange((value) => {
                numberInput.inputEl.removeClass("is-invalid")
                this.managedField.value = value
                this.errorField.hide();
                this.errorField.setText("");
                this.toggleButtonsState(minusBtn, plusBtn, numberInput)
            })

            plusBtn.onClick((e) => {
                e.preventDefault();
                this.increment(numberInput);
                this.toggleButtonsState(minusBtn, plusBtn, numberInput);
            })

            minusBtn.onClick((e) => {
                e.preventDefault();
                this.decrement(numberInput);
                this.toggleButtonsState(minusBtn, plusBtn, numberInput);
            })
        };


        public buildSaveBtn(fieldContainer: HTMLDivElement) {
            fieldContainer.createDiv({ cls: "spacer" })
            const infoContainer = fieldContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            const saveBtn = new ButtonComponent(fieldContainer);
            saveBtn.setIcon("checkmark");
            saveBtn.onClick(() => {
                this.save();
            })
        }

        public async save(): Promise<void> {
            if (!validateValue(this.managedField)) {
                const { min, max } = this.managedField.options
                this.errorField.show();
                this.errorField.setText(`value must be numeric${min ? " and >= " + min : ""} ${max ? " and <= " + max : ""}`)
                this.numberInput.inputEl.setAttr("class", "is-invalid")
                return
            }
            this.saved = true
            managedField.save()
            this.close()
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    return baseGetValueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked = () => { }) {
    return baseDisplayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    attrs.cls = "value-container"
    /* button to display input */
    const editBtn = fieldContainer.createEl("button");
    const fieldValue = (dv.el('span', managedField.value ?? "", attrs) as HTMLDivElement);
    fieldContainer.appendChild(fieldValue);

    /* end spacer */
    const spacer = fieldContainer.createDiv({ cls: "spacer-1" });
    if (attrs.options?.alwaysOn) spacer.hide();
    setIcon(editBtn, getIcon("Number"));
    if (!attrs?.options?.alwaysOn) {
        editBtn.hide();
        spacer.show();
        fieldContainer.onmouseover = () => {
            editBtn.show();
            spacer.hide();
        }
        fieldContainer.onmouseout = () => {
            editBtn.hide();
            if (!attrs.options?.alwaysOn) spacer.show();
        }
    }
    /* button on click : remove button and field and display input field*/
    editBtn.onclick = async () => {
        managedField.openModal()
    }

}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath?: string): void {
    const iconName = getIcon(field.type);
    const name = field.name
    const { step } = field.options
    const action = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)?.openModal()
    }
    const increase = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)
        if (fieldVM) await applyStep(fieldVM, "increase")
    }
    const decrease = async () => {
        const eF = await getExistingFieldForIndexedPath(plugin, file, indexedPath)
        const fieldVM = fieldValueManager(plugin, field.id, field.fileClassName, file, eF, indexedPath)
        if (fieldVM) await applyStep(fieldVM, "decrease")
    }
    if (isSuggest(location)) {
        location.options.push({
            id: `update_${name}`,
            actionLabel: `<span>Update <b>${name}</b></span>`,
            action: action,
            icon: iconName
        });
    } else if (isFieldActions(location)) {
        if (step) {
            location.addOption(`field_${field.id}_decrease`, "minus-square", decrease, `Decrease ${name} by ${step}`);
            location.addOption(`field_${field.id}_increase`, "plus-square", increase, `Increase ${name} by ${step}`);
        }
        location.addOption(`field_${field.id}_update`, iconName, action, `Update ${name}'s value`)
    };

}

export function getOptionsStr(field: IField<Options>): string {
    const options: string[] = [];
    Object.keys(field.options).forEach((k) => { if (field.options[k]) options.push(`${k}: ${field.options[k]}`) })
    return options.join(" | ")
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    const { min, max } = managedField.options;
    if (!min || !max) return true
    const fMin = parseFloat(`${min}`);
    const fMax = parseFloat(`${max}`);
    const fValue = parseFloat(`${managedField.value}`);
    return (
        !isNaN(fValue) && (isNaN(fMin) || fValue >= fMin) && (isNaN(fMax) || fValue <= fMax)
    )
}

//#region utils

async function applyStep(managedField: IFieldManager<Target, Options>, direction: "increase" | "decrease"): Promise<void> {
    const { min, max, step } = managedField.options;
    const fMin = parseFloat(`${min}`)
    const fMax = parseFloat(`${max}`)
    const fStep = parseFloat(`${step}`)
    const fValue = parseFloat(managedField.value) || 0
    switch (direction) {
        case "decrease":
            if (!isNaN(fMin) && !isNaN(fStep) && fValue - fStep >= fMin) managedField.save((fValue - fStep).toString())
            break;
        case "increase":
            if (!isNaN(fMax) && !isNaN(fStep) && fValue + fStep <= fMax) managedField.save((fValue + fStep).toString())
        default:
            break;
    }
}

function canDecrement(managedField: IFieldManager<Target, Options>): boolean {
    const { step, min } = managedField.options;
    const fStep = parseFloat(`${step}`);
    const fMin = parseFloat(`${min}`);
    return !(
        //isNaN(parseFloat(value)) ||
        !isNaN(fMin) &&
        (
            !isNaN(fStep) && (
                (parseFloat(`${managedField.value}`) || 0) - fStep < fMin ||
                (parseFloat(`${managedField.value}`) || 0) - 1 < fMin
            )
        )
    )
}

function canIncrement(managedField: IFieldManager<Target, Options>): boolean {
    const { step, max } = managedField.options;
    const fStep = parseFloat(`${step}`);
    const fMax = parseFloat(`${max}`);
    return !(
        //isNaN(parseFloat(value)) ||
        !isNaN(fMax) &&
        (
            !isNaN(fStep) && (
                (parseFloat(`${managedField.value}`) || 0) + fStep > fMax ||
                (parseFloat(`${managedField.value}`) || 0) + 1 > fMax
            )
        )
    )
}

//#endregion
//#region test
export async function enterFieldSetting(settingModal: ISettingsModal, field: IField<Options>, speed = 100) {
    if (field.options.min || field.options.min === 0)
        settingModal.plugin.testRunner.insertInTextComponent(settingModal.numberMinValue, `${field.options.min}`)
    if (field.options.max || field.options.max === 0)
        settingModal.plugin.testRunner.insertInTextComponent(settingModal.numberMaxValue, `${field.options.max}`)
    if (field.options.step || field.options.step === 0)
        settingModal.plugin.testRunner.insertInTextComponent(settingModal.numberStepValue, `${field.options.step}`)
}
//#endregion