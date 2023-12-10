import MetadataMenu from "main";
import { ButtonComponent, Modal, TextAreaComponent, TextComponent } from "obsidian";
import { FilterComponent } from "./FilterComponent";
import { cleanActions } from "src/utils/modals";
import { FieldSet } from "./tableViewFieldSet";

export class CustomFilterModal extends Modal {
    private filterFunctionInput: TextAreaComponent
    private confirmButton: ButtonComponent
    constructor(
        public plugin: MetadataMenu,
        public parentFieldSet: FieldSet,
        public filterComponent: FilterComponent
    ) {
        super(plugin.app)
        this.containerEl.addClass("metadata-menu")
        this.titleEl.setText("Enter a custom filtering function")
        this.buildInput()
        cleanActions(this.containerEl, ".footer-actions")
        const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        this.buildFooterActions(footerActionsContainer)
    }

    private buildInput() {
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `(value: string, current: Object): boolean => {` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `/*` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `value is the value of the file's ${this.filterComponent.name} field` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `current is the current page (dv.page) if this view is embedded in a codeblock` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `returns a boolean, ` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `example:` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `return value < current.priority;` })
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: `*/` })
        const subContent = this.contentEl.createDiv({ cls: "field-container" })
        this.filterFunctionInput = new TextAreaComponent(subContent)
            .setValue(this.filterComponent.customFilter || "")
            .onChange(() => {
                this.confirmButton.setCta()
            })
        this.filterFunctionInput.inputEl.rows = 6
        this.filterFunctionInput.inputEl.addClass("full-width")
        this.contentEl.createDiv({ cls: "info-code" }).createEl("code", { text: "};" })
    }

    private updateCustomFilter() {
        this.filterComponent.customFilter = this.filterFunctionInput.getValue()
        this.filterComponent.toggleCustomFilterState()
        this.parentFieldSet.tableView.update()
        this.parentFieldSet.tableView.saveViewBtn.setCta()
    }

    private buildConfirm(footerActionsContainer: HTMLDivElement) {
        const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        this.confirmButton = new ButtonComponent(footerActionsContainer)
        this.confirmButton.setIcon("checkmark")
        this.confirmButton.onClick(() => {
            if (true) this.updateCustomFilter()
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
            this.filterFunctionInput.setValue(this.filterComponent.customFilter)
            this.confirmButton.removeCta()
        })
        //reset value button
        const resetButton = new ButtonComponent(footerActionsContainer)
        resetButton.setIcon("eraser")
        resetButton.setTooltip("Reset initial ordering")
        resetButton.onClick(async () => {
            this.filterFunctionInput.setValue("")
            this.filterComponent.toggleCustomFilterState()
            this.confirmButton.setCta()
        })
        this.modalEl.appendChild(footerActionsContainer)
    }
}