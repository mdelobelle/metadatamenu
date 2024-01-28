import MetadataMenu from "main";
import { ButtonComponent, Modal, TFile } from "obsidian";
import { FieldSet, btnIcons } from "./tableViewFieldSet";
import { cleanActions } from "src/utils/modals";
import { RowSorterComponent } from "./RowSorterComponent";
import { Field, IField } from "src/fields/Field";
import { getFiles } from "src/fields/models/abstractModels/AbstractFile"
import { getOptionsList } from "src/fields/models/abstractModels/AbstractList";
import { Options as SelectOptions } from "src/fields/models/Select";


export class OptionsPriorityModal extends Modal {
    private optionsContainer: HTMLDivElement
    private orderedOptions: string[]
    private confirmButton: ButtonComponent
    private initialOrder: string[]

    constructor(
        public plugin: MetadataMenu,
        public fileClassFile: TFile,
        public field: Field | "file",
        public parentFieldSet: FieldSet,
        public rowSorterComponent: RowSorterComponent
    ) {
        super(plugin.app)
        this.titleEl.setText("Set a custom order by moving the values")
        this.containerEl.addClass("metadata-menu")
        this.initialOrder = this.rowSorterComponent.customOrder?.length ? this.rowSorterComponent.customOrder : this.getOptions()
        this.orderedOptions = [...this.initialOrder]
        this.optionsContainer = this.contentEl.createDiv({})
        cleanActions(this.containerEl, ".footer-actions")
        const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        this.buildFooterActions(footerActionsContainer)
    }

    onOpen(): void {
        this.buildOrderedOptions()
    }

    public getOptions(): string[] {
        if (this.field === "file") {
            return []
        } else {
            const field = this.field as Field
            switch (field.type) {
                case "Boolean": {
                    return ["true", "false"]
                }
                case "Multi":
                case "Select":
                    return getOptionsList(field as IField<SelectOptions>)
                case "MultiFile":
                case "File": {
                    const sortingMethod = (new Function("a", "b", `return ${field.options.customSorting}`) as (a: TFile, b: TFile) => number) ||
                        function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }
                    try {
                        return getFiles(field)
                            .sort(sortingMethod)
                            .map(item => item.basename.trim().replace(/\[\[|\]\]/g, ""))
                    } catch (error) {
                        return []
                    }
                }
                case "Lookup": {
                    const _values = [...this.plugin.fieldIndex.fileLookupFieldLastValue.entries()].filter(([fieldId, lookupFiles]) => {
                        return fieldId.endsWith(`__related__${this.parentFieldSet.fileClass.name}___${(field as Field).name}`) && lookupFiles !== ""
                    }).map(([fieldId, lookupFiles]) => lookupFiles).join(",")
                    return [...new Set(_values.split(",")
                        .map(item => item.trim().replace(/\[\[|\]\]/g, ""))
                    )]
                }
                default:
                    return [];
            }
        }
    }

    private renderOption(option: string, index: number): void {
        const optionContainer = this.optionsContainer.createDiv({ cls: "suggestion-item value-container" })
        const swapElements = (array: string[], index1: number, index2: number) => {
            array[index1] = array.splice(index2, 1, array[index1])[0];
        };
        const buildPrioBtn = (direction: 'asc' | 'desc'): ButtonComponent => {
            const btn = new ButtonComponent(optionContainer)
            btn.setIcon(btnIcons[direction])
            btn.setClass("small")
            btn.setDisabled(
                index === 0 && direction === "asc" ||
                index === this.orderedOptions.length && direction === "desc"
            )
            btn.onClick(() => {
                if (direction === "asc") {
                    swapElements(this.orderedOptions, index - 1, index)
                } else {
                    swapElements(this.orderedOptions, index, index + 1)
                }
                this.buildOrderedOptions()
            })
            return btn
        }
        buildPrioBtn("asc")
        buildPrioBtn("desc")
        const labelContainer = optionContainer.createDiv({ cls: "label" })
        labelContainer.setText(option)
    }

    private buildOrderedOptions() {
        this.optionsContainer.replaceChildren()
        this.orderedOptions.forEach((option, index) => this.renderOption(option, index))
    }

    private updateCustomOrder(newOrder: string[]) {
        this.rowSorterComponent.customOrder = newOrder
        this.rowSorterComponent.toggleRowSorterButtonsState('asc')
        this.parentFieldSet.tableView.update()
        this.parentFieldSet.tableView.saveViewBtn.setCta()
    }

    private buildConfirm(footerActionsContainer: HTMLDivElement) {
        const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        this.confirmButton = new ButtonComponent(footerActionsContainer)
        this.confirmButton.setIcon("checkmark")
        this.confirmButton.onClick(() => {
            this.updateCustomOrder(this.orderedOptions)
            this.close()
        })
    }

    private buildFooterActions(footerActionsContainer: HTMLDivElement) {
        footerActionsContainer.createDiv({ cls: "spacer" })
        //confirm button
        this.buildConfirm(footerActionsContainer)
        //cancel button
        const cancelButton = new ButtonComponent(footerActionsContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.setTooltip("Cancel")
        //clear value button
        const refreshButton = new ButtonComponent(footerActionsContainer)
        refreshButton.setIcon("refresh-ccw")
        refreshButton.setTooltip("Cancel changes")
        refreshButton.onClick(async () => {
            this.orderedOptions = this.rowSorterComponent.customOrder || this.getOptions()
            this.buildOrderedOptions()
            this.confirmButton.removeCta()
        })
        //reset value button
        const resetButton = new ButtonComponent(footerActionsContainer)
        resetButton.setIcon("eraser")
        resetButton.setTooltip("Reset initial ordering")
        resetButton.onClick(async () => {
            this.orderedOptions = this.getOptions()
            this.rowSorterComponent.toggleRowSorterButtonsState(undefined)
            this.buildOrderedOptions()
            this.confirmButton.setCta()
        })
        this.modalEl.appendChild(footerActionsContainer)
    }
}