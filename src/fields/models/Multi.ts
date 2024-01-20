
import MetadataMenu from "main";
import * as List from "./baseModels/ListBasedField"
import { ISettingsModal } from "../base/BaseSetting";
import { IFieldManager, Target, isSingleTargeted, replaceValues } from "../Field";
import { FieldType, getFieldModal } from "../Fields";
import { ButtonComponent, TFile, setIcon } from "obsidian";
import { getLink } from "src/utils/parser";
import { IFieldBase } from "../base/BaseField";
import { buildMarkDownLink } from "./baseModels/FileBasedField";
import { Constructor } from "src/typings/types";


export class Base implements IFieldBase {
    type = FieldType.Multi
    tagName = "multi"
    icon = "bullet-list"
    tooltip = "Accepts multiple values from a list"
    colorClass = "multi"
}

export interface Options extends List.Options { }

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = List.settingsModal(Base)
    return class SettingsModal extends base { }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<List.IListBasedModal<Target>> {
    const base = List.valueModal(managedField, plugin)
    return class ValueModal extends base {
        private selectedOptions: Array<string>;
        constructor(
            public preSelectedOptions?: Array<string>
        ) {
            super(plugin);
            const initialOptions: string | string[] = isSingleTargeted(this.managedField) ? this.managedField.value || [] : []
            if (initialOptions && isSingleTargeted(this.managedField)) {
                if (Array.isArray(initialOptions)) {
                    this.selectedOptions = initialOptions.map(item => {
                        const file = this.managedField.target as TFile
                        const link = getLink(item, file)
                        if (link) {

                            return buildMarkDownLink(plugin, file, link.path)
                        } else {
                            return item.toString()
                        }
                    })

                    this.selectedOptions = initialOptions.map(item => item.toString())
                }
                else if (typeof (initialOptions) === "string" && initialOptions.toString().startsWith("[[")) {
                    this.selectedOptions = initialOptions.split(",").map(item => item.trim());
                } else {
                    const link = getLink(initialOptions, this.managedField.target as TFile)
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
                    await this.replaceValues();
                    this.close()
                }
            }
        }
        async onAdd(): Promise<void> {
            await this.addNewValueToSettings()
            await plugin.fieldIndex.indexFields();
            this.selectedOptions.push(this.inputEl.value)
            const modal = getFieldModal(this.managedField, plugin)
            modal.open()
            this.close()
        }

        async replaceValues() {
            const options = this.selectedOptions;
            this.managedField.value = options.join(", ")
            this.managedField.save()
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
            if (this.selectedOptions.includes(value.toString())) {
                el.addClass("value-checked")
                const iconContainer = el.createDiv({ cls: "icon-container" })
                setIcon(iconContainer, "check-circle")
            }
            this.inputEl.focus()
        }

        selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
            if (this.selectedOptions.includes(value.toString())) {
                this.selectedOptions.remove(value.toString())
            } else {
                this.selectedOptions.push(value.toString())
            }
            this.renderSelected()
        }

        buildConfirm(footerActionsContainer: HTMLDivElement) {
            const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
            infoContainer.setText("Alt+Enter to save")
            const confirmButton = new ButtonComponent(footerActionsContainer)
            confirmButton.setIcon("checkmark")
            confirmButton.onClick(async () => {
                await this.replaceValues();
                this.close()
            })
        }
    }
}


export function createDvField(
    managedField: IFieldManager<Target>,
    dv: any,
    p: any,
    fieldContainer: HTMLElement,
    attrs: { cls?: string, attr?: Record<string, string>, options?: Record<string, string> } = {}
): void {
    let valueHovered = false;
    let currentValues: string[] = [];
    if (p[managedField.name]) {
        if (Object.keys(p[managedField.name]).includes("path")) {
            currentValues = [`[[${p[managedField.name].path.replace(".md", "")}]]`]
        } else if (Array.isArray(p[managedField.name])) {
            p[managedField.name].forEach((item: any) => {
                if (Object.keys(item).includes("path")) {
                    currentValues.push(`[[${item.path.replace(".md", "")}]]`)
                } else {
                    currentValues.push(item.trim())
                }
            })
        } else {
            const value = p[managedField.name]
            currentValues = value ? `${value}`.split(",").map((v: string) => v.trim()) : [];
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
            replaceValues(managedField.plugin, p.file.path, managedField.id, remainingValues);
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