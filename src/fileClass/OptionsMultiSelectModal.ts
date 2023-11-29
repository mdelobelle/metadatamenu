import Field from "../fields/Field";
import { FieldManager as FM, FieldManager, FieldType } from "src/types/fieldTypes";
import { TextComponent, ButtonComponent, setIcon, TFile, SuggestModal } from "obsidian";
import MetadataMenu from "main";
import { FieldSet } from "src/fileClass/tableViewFieldSet";
import { getLink } from "src/utils/parser";
import FileField from "../fields/fieldManagers/FileField";
import { cleanActions } from "src/utils/modals";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";
import MultiFileField from "src/fields/fieldManagers/MultiFileField";

export enum fieldStates {
    __empty__ = "__empty__",
    __notEmpty__ = "__notEmpty__",
    __notFound__ = "__notFound__",
    __existing__ = "__existing__"
}

export const displayValue: Record<keyof typeof fieldStates, string> = {
    __empty__: "Empty Fields",
    __notEmpty__: "Not Empty Fields",
    __notFound__: "Not Found Fields",
    __existing__: "Existing Fields"
}
export const displayIcon: Record<keyof typeof fieldStates, string> = {
    __empty__: "box-select",
    __notEmpty__: "plus-square",
    __notFound__: "x-circle",
    __existing__: "circle-dot"
}

export class OptionsMultiSelectModal extends SuggestModal<string>{
    private selectedOptions: Array<string>;
    private input: TextComponent;

    constructor(
        public plugin: MetadataMenu,
        public fileClassFile: TFile,
        public field: Field | "file",
        public parentFieldSet: FieldSet
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu");
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        cleanActions(this.containerEl, ".footer-actions")
        const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        this.buildFooterActions(footerActionsContainer)
        const id = this.field === "file" ? "file" : this.field.name
        this.input = this.parentFieldSet.filters[id] as TextComponent
        const initialOptions = this.input.getValue()
        if (initialOptions) {
            if (Array.isArray(initialOptions)) {
                this.selectedOptions = initialOptions.map(item => {
                    const link = getLink(item, fileClassFile)
                    if (link) {
                        return FileField.buildMarkDownLink(this.plugin, fileClassFile, link.path)
                    } else {
                        return item.toString()
                    }
                })
                this.selectedOptions = initialOptions.map(item => item.toString())
            }
            else if (typeof (initialOptions) === "string" && initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                const link = getLink(initialOptions, fileClassFile)
                if (link) {
                    this.selectedOptions = [`[[${link.path.replace(".md", "")}]]`]
                } else if (typeof (initialOptions) === "string") {
                    this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
                }
            }
        } else {
            this.selectedOptions = [];
        }
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                await this.replaceValues();
                this.close()
            }
        }
    };

    getSuggestions(query: string): string[] {
        if (this.field === "file") {
            return []
        } else {

            const field = this.field as Field
            switch (field.type) {
                case FieldType.Boolean: {
                    return ["__empty__", "true", "false"]
                }
                case FieldType.Multi:
                case FieldType.Select: {
                    const fieldManager = new FM[field.type](this.plugin, this.field) as AbstractListBasedField
                    const values = fieldManager.getOptionsList().filter(o => String(o).toLowerCase().includes(query.toLowerCase()))
                    return [...Object.keys(fieldStates), ...values]
                }
                case FieldType.MultiFile:
                case FieldType.File: {
                    const sortingMethod = new Function("a", "b", `return ${field.options.customSorting}`) as (a: TFile, b: TFile) => number ||
                        function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }
                    try {
                        const fileManager = new FieldManager[field.type](this.plugin, this.field) as FileField | MultiFileField;
                        const values = fileManager.getFiles()
                            .sort(sortingMethod)
                            .map(item => item.basename.trim().replace(/\[\[|\]\]/g, ""))
                            .filter(o => String(o).toLowerCase().includes(query.toLowerCase()));
                        return ["__empty__", "__notEmpty__", ...values]
                    } catch (error) {
                        return []
                    }
                }
                case FieldType.Lookup: {
                    const _values = [...this.plugin.fieldIndex.fileLookupFieldLastValue.entries()].filter(([fieldId, lookupFiles]) => {
                        return fieldId.endsWith(`__related__${this.fileClassFile.basename}___${(this.field as Field).name}`) && lookupFiles !== ""
                    }).map(([fieldId, lookupFiles]) => lookupFiles).join(",")
                    const values = [...new Set(_values.split(",")
                        .map(item => item.trim().replace(/\[\[|\]\]/g, ""))
                        .filter(o => String(o).toLowerCase().includes(query.toLowerCase()))
                    )]
                    return [...Object.keys(fieldStates), ...values]
                }
                default:
                    return [...Object.keys(fieldStates)];
            }
        }

    }

    buildFooterActions(footerActionsContainer: HTMLDivElement) {
        footerActionsContainer.createDiv({ cls: "spacer" })
        //confirm button
        this.buildConfirm(footerActionsContainer)
        //cancel button
        const cancelButton = new ButtonComponent(footerActionsContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.setTooltip("Cancel")
        //clear value button
        const clearButton = new ButtonComponent(footerActionsContainer)
        clearButton.setIcon("eraser")
        clearButton.setTooltip("Clear field's value(s)")
        clearButton.onClick(async () => {
            this.input.setValue("")
            this.parentFieldSet.tableView.udpate()
            this.close();
        })
        clearButton.buttonEl.addClass("danger")
        this.modalEl.appendChild(footerActionsContainer)
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

    async replaceValues() {
        const options = this.selectedOptions;
        this.input.inputEl.value = options.join(", ");
        this.parentFieldSet.tableView.udpate()
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
        const labelContainer = el.createDiv({ cls: "label-with-icon-container" })
        const icon = labelContainer.createDiv({ cls: "icon" })
        if (Object.keys(fieldStates).includes(value)) {
            setIcon(icon, displayIcon[(value as keyof typeof fieldStates)])
        }
        const label = labelContainer.createDiv({ cls: "label" })
        let labelText = ""
        if (Object.keys(fieldStates).includes(value)) {
            labelText = displayValue[(value as keyof typeof fieldStates)]
        } else {
            labelText = `${value.slice(0, 50)}${value.length > 50 ? "..." : ""}`
        }
        label.setText(labelText)
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
            if (Object.keys(fieldStates).includes(value)) {
                this.selectedOptions = [value]
            } else {
                this.selectedOptions = [...this.selectedOptions.filter(o => !Object.keys(fieldStates).includes(o))]
                this.selectedOptions.push(value.toString())
            }
        }
        this.renderSelected()
    }
    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) { }
}