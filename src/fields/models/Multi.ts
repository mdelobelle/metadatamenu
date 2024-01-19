
import MetadataMenu from "main";
import * as List from "./baseModels/ListBasedField"
import { ISettingsModal } from "../base/BaseSetting";
import { IFieldManager, Target, isSingleTargeted } from "../Field";
import { FieldType, getFieldModal } from "../Fields";
import { ButtonComponent, TFile, setIcon } from "obsidian";
import { getLink } from "src/utils/parser";
import { IFieldBase } from "../base/BaseField";
import { buildMarkDownLink } from "./baseModels/FileBasedField";

type Constructor<T> = new (...args: any[]) => T;

export interface Options extends List.Options { }

export function settingsModal(Base: Constructor<ISettingsModal>): Constructor<ISettingsModal> {
    const base = List.settingsModal(Base)
    return class SelectSettingsModal extends base {

    }
}

export function valueModal(managedField: IFieldManager<Target>, plugin: MetadataMenu): Constructor<List.IListBasedModal<Target>> {
    const base = List.valueModal(managedField, plugin)
    return class ValueModal extends base {
        private selectedOptions: Array<string>;
        constructor(
            public preSelectedOptions?: Array<string>
        ) {
            super(plugin);
            const initialOptions: string | string[] = isSingleTargeted(this.managedField) ? this.managedField.eF?.value || [] : []
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
                    this.close(true)
                }
            }
        }
        async onAdd(): Promise<void> {
            await this.addNewValueToSettings()
            await plugin.fieldIndex.indexFields();
            this.selectedOptions.push(this.inputEl.value)
            const modal = getFieldModal(this.managedField, plugin)
            modal.open()
            this.close(false)
        }

        async replaceValues() {
            const options = this.selectedOptions;
            this.managedField.value = options.join(", ")
            this.managedField.save()
            this.close(true);
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
                this.close(true)
            })
        }
    }
}

export class Base implements IFieldBase {
    type = FieldType.Multi
    tagName = "multi"
    icon = "list"
}