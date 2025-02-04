
import MetadataMenu from "main";
import * as AbstractList from "./abstractModels/AbstractList"
import { ISettingsModal as IBaseSettingsModal } from "../base/BaseSetting";
import { ActionLocation, IField, IFieldManager, Target, fieldValueManager, isSingleTargeted } from "../Field";
import { getFieldModal } from "../Fields";
import { ButtonComponent, TFile, setIcon } from "obsidian";
import { getLink } from "src/utils/parser";
import { IFieldBase } from "../base/BaseField";
import { buildMarkDownLink } from "./abstractModels/AbstractFile";
import { Constructor } from "src/typings/types";
import { setTimeout } from "timers/promises";


export class Base implements IFieldBase {
    type = <const>"Multi"
    tagName = "multi"
    icon = "bullet-list"
    tooltip = "Accepts multiple values from a list"
    colorClass = "multi"
}

export interface Options extends AbstractList.Options { }

export interface DefaultedOptions extends AbstractList.DefaultedOptions { }

export const DefaultOptions: AbstractList.DefaultedOptions = AbstractList.DefaultOptions

export interface ISettingsModal extends AbstractList.IListBaseSettingModal { }

export function settingsModal(Base: Constructor<IBaseSettingsModal<AbstractList.DefaultedOptions>>): Constructor<ISettingsModal> {
    const base = AbstractList.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target, Options>, plugin: MetadataMenu): Constructor<AbstractList.Modal<Target>> {
    const base = AbstractList.valueModal(managedField, plugin)
    return class ValueModal extends base {
        private selectedOptions: Array<string>;
        constructor(
            public preSelectedOptions?: Array<string>
        ) {
            super(plugin);
            const initialOptions: string | string[] = isSingleTargeted(managedField) ? managedField.value || [] : []
            if (initialOptions && isSingleTargeted(managedField)) {
                if (Array.isArray(initialOptions)) {
                    this.selectedOptions = initialOptions.filter(i => !!i).map(item => {
                        const file = managedField.target as TFile
                        const link = getLink(item, file)
                        if (link) {
                            return buildMarkDownLink(plugin, file, link.path)
                        } else {
                            return item.toString()
                        }
                    })

                    this.selectedOptions = initialOptions.filter(i => !!i).map(item => item.toString())
                }
                else if (typeof (initialOptions) === "string" && initialOptions.toString().startsWith("[[")) {
                    this.selectedOptions = initialOptions.split(",").map(item => item.trim());
                } else {
                    const link = getLink(initialOptions, managedField.target as TFile)
                    if (link) {
                        this.selectedOptions = [`[[${link.path.replace(".md", "")}]]`]
                    } else if (typeof (initialOptions) === "string") {
                        this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
                    }
                }
            } else {
                this.selectedOptions = [];
            }
            this.preSelectedOptions?.forEach(item => { if (!this.selectedOptions.includes(item)) { this.selectedOptions.push(item) } })
            this.containerEl.onkeydown = async (e) => {
                if (e.key == "Enter" && e.altKey) {
                    await this.save();
                }
            }
        }
        async onAdd(): Promise<void> {
            await this.addNewValueToSettings()
            await plugin.fieldIndex.indexFields()
            this.selectedOptions.push(this.inputEl.value)
            managedField.value = this.selectedOptions
            const modal = getFieldModal(managedField, plugin)
            modal?.open()
            this.close()
        }

        async save() {
            this.saved = true
            const options = this.selectedOptions;
            managedField.save(options.join(", "))
            this.close();
        }

        renderSelected() {
            //@ts-ignore
            const chooser = this.chooser
            const suggestions: HTMLDivElement[] = chooser.suggestions
            const values: string[] = chooser.values
            suggestions.forEach((s, i) => {
                if (this.selectedOptions.includes(values[i].toString())) {
                    s.addClass("value-checked")
                    if (s.querySelectorAll(".icon-container").length == 0) {
                        const iconContainer = s.createDiv({ cls: "icon-container" })
                        setIcon(iconContainer, "check-circle")
                    }
                } else {
                    s.removeClass("value-checked")
                    s.querySelectorAll(".icon-container").forEach(icon => icon.remove())
                }
            })
        }

        renderSuggestion(value: string, el: HTMLElement) {
            el.setText(value)
            el.addClass("value-container")
            const spacer = this.containerEl.createDiv({ cls: "spacer" })
            el.appendChild(spacer)
            if (this.selectedOptions !== undefined) {
                let hasValue = false;
                const linkRegex = /^\[\[.+\]\]$/;
                if (linkRegex.test(value)) {
                    const valueLink = getLink(value);
                    if (valueLink !== undefined) {
                        for (const selectedOption of this.selectedOptions) {
                            if (linkRegex.test(selectedOption)) {
                                const selectedOptionLink = getLink(selectedOption);
                                if (selectedOptionLink == valueLink) {
                                    hasValue = true;
                                    break;
                                }
                            }
                        }
                    } else {
                        hasValue = this.selectedOptions.includes(value.toString());
                    }
                } else {
                    hasValue = this.selectedOptions.includes(value.toString());
                }

                if (hasValue) {
                    el.addClass("value-checked")
                    const iconContainer = el.createDiv({ cls: "icon-container" })
                    setIcon(iconContainer, "check-circle")
                }
            }
            this.inputEl.focus()
        }

        selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
            if (this.selectedOptions !== undefined && this.selectedOptions.includes(value.toString())) {
                this.selectedOptions.remove(value.toString())
            } else {
                try {
                    this.selectedOptions.push(value.toString())
                }
                catch {
                    // this.selectedOptions might be undefined, thus the exception.
                    // The user might have assigned a single value instead of an array (Multi is an array).
                    this.selectedOptions = [value.toString()];
                }
            }
            this.renderSelected()
        }

        buildConfirm(footerActionsContainer: HTMLDivElement) {
            const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            const confirmButton = new ButtonComponent(footerActionsContainer)
            confirmButton.setIcon("checkmark")
            confirmButton.onClick(async () => {
                await this.save();
                this.close()
            })
        }
    }
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    return AbstractList.valueString(managedField)
}

export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    return AbstractList.displayValue(managedField, container, onClicked)
}

export function createDvField(
    managedField: IFieldManager<Target, Options>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    let valueHovered = false;
    let currentValues: any[] = [];
    if (managedField.value) {
        if (Object.keys(managedField.value).includes("path")) {
            currentValues = [managedField.value] //`[[${managedField.value.path.replace(".md", "")}]]`]
        } else if (Array.isArray(managedField.value)) {
            managedField.value.forEach((item: any) => {
                if (Object.keys(item).includes("path")) {
                    currentValues.push(dv.el('span', item, attrs) as HTMLDivElement)  // `[[${item.path.replace(".md", "")}]]`)
                } else {
                    currentValues.push(item.trim())
                }
            })
        } else {
            const value = managedField.value
            currentValues = value ? `${value}`.split(",").map((v: any) => {
                if (Object.keys(v).includes("path")) {
                    return dv.el('span', v, attrs) as HTMLDivElement;
                } else {
                    return v.trim()
                }
            }) : [];
        }
    }

    /* current values container */
    const valuesContainer = fieldContainer.createDiv({ cls: "values-container" })

    /* current values */
    currentValues.forEach(v => {
        const valueContainer = valuesContainer.createDiv({ cls: "item-container" });
        const valueRemoveBtn = valueContainer.createEl("button");
        const valueLabel = valueContainer.createDiv({ cls: "label", text: v })
        setIcon(valueRemoveBtn, "cross")
        valueRemoveBtn.hide();
        valueRemoveBtn.onclick = async () => {
            const remainingValues = currentValues.filter(cV => cV !== v).join(", ")
            managedField.save(remainingValues)
        }

        valueContainer.onmouseover = () => {
            valueHovered = true;
            doubleSpacer.hide();
            singleSpacer.hide();
            valueRemoveBtn.show();
            valueLabel.addClass("hovered");
        }
        valueContainer.onmouseout = () => {
            valueHovered = false;
            valueRemoveBtn.hide();
            singleSpacer.show();
            doubleSpacer.hide();
            valueLabel.removeClass("hovered");
        }

    })

    /* button to display input */
    const addBtn = valuesContainer.createEl("button");
    setIcon(addBtn, "list-plus");
    addBtn.onclick = () => managedField.openModal()

    /* end spacer */
    const singleSpacer = valuesContainer.createDiv({ cls: "spacer-1" });
    const doubleSpacer = valuesContainer.createDiv({ cls: "spacer-2" });

    if (!attrs?.options?.alwaysOn) {
        addBtn.hide();
        fieldContainer.onmouseover = () => {
            addBtn.show();
            doubleSpacer.hide();
            if (!valueHovered) singleSpacer.show();
        }
        fieldContainer.onmouseout = () => {
            addBtn.hide();
            singleSpacer.hide();
            doubleSpacer.show();
        }
    }

    /* initial state */
    if (!attrs?.options?.alwaysOn) {
        singleSpacer.hide();
        doubleSpacer.show();
        addBtn.hide();
    } else {
        singleSpacer.show();
        doubleSpacer.hide();
        addBtn.show();
    }

}

export function actions(plugin: MetadataMenu, field: IField<Options>, file: TFile, location: ActionLocation, indexedPath: string | undefined): void {
    return AbstractList.actions(plugin, field, file, location, indexedPath)
}

export function getOptionsStr(field: IField<Options>): string {
    return AbstractList.getOptionsStr(field)
}

export function validateValue(managedField: IFieldManager<Target, Options>): boolean {
    if (Array.isArray(managedField.value)) {
        return managedField.value.every(v => AbstractList.getOptionsList(managedField).includes(v))
    } else {
        return AbstractList.getOptionsList(managedField).includes(managedField.value)
    }
}

//#region test
export async function enterFieldSetting(settingModal: ISettingsModal, field: IField<Options>, speed = 100) {
    return AbstractList.enterFieldSetting(settingModal, field, speed)
}

//#endregion