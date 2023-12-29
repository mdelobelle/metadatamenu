import { TFile, SuggestModal, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import MetadataMenu from "main";
import * as selectValuesSource from "src/types/selectValuesSourceTypes"
import { FieldManager } from "src/types/fieldTypes";
import AbstractListBasedField from "src/fields/abstractFieldManagers/AbstractListBasedField";
import { postValues } from "src/commands/postValues";
import { cleanActions } from "src/utils/modals";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "../fields/ObjectModal";
import ObjectListModal from "../fields/ObjectListModal";

export default class BaseSelecttModal extends SuggestModal<string> {

    public addButton: ButtonComponent;

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public field: Field,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal

    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu");
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        cleanActions(this.containerEl, ".footer-actions")
        const footerActionsContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        this.buildAddButton(inputContainer)
        this.buildFooterActions(footerActionsContainer)
    };

    buildAddButton(container: HTMLDivElement) {
        // addButton
        this.addButton = new ButtonComponent(container)
        this.addButton.setIcon("plus")
        this.addButton.onClick(async () => await this.onAdd())
        this.addButton.setCta();
        this.addButton.setTooltip("Add this value to this field settings")
        this.addButton.buttonEl.hide();
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
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("danger")
        this.modalEl.appendChild(footerActionsContainer)
    }

    buildConfirm(footerActionsContainer: HTMLDivElement) { }

    close(openPreviousModal: boolean = true): void {
        if (openPreviousModal) this.previousModal?.open()
        super.close()
    }

    async onAdd(): Promise<void> {
        throw Error("This class has to implement an onAdd method")
    }

    async addNewValueToSettings(): Promise<void> {
        const newValue = this.inputEl.value;
        const fileClassName = this.plugin.fieldIndex.filesFields.get(this.file.path)?.find(field => field.id === this.field.id)?.fileClassName
        if (fileClassName) {
            const fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
            const fileClassAttribute = fileClass?.attributes.find(attr => attr.id === this.field.id)
            if (fileClass && fileClassAttribute) {
                let newOptions: string[] | Record<string, string>;
                if (Array.isArray(fileClassAttribute.options)) {
                    newOptions = [...fileClassAttribute.options, newValue]
                    await fileClass.updateAttribute(fileClassAttribute.type, fileClassAttribute.name, newOptions, fileClassAttribute);
                } else if (fileClassAttribute.options.sourceType === selectValuesSource.Type.ValuesList) {
                    newOptions = fileClassAttribute.options.valuesList as Record<string, string>;
                    newOptions[`${Object.keys(fileClassAttribute.options.valuesList).length + 1}`] = newValue
                    await fileClass.updateAttribute(fileClassAttribute.type, fileClassAttribute.name, newOptions, fileClassAttribute);
                } else if (fileClassAttribute.options.sourceType === selectValuesSource.Type.ValuesListNotePath) {
                    const valuesFile = this.plugin.app.vault.getAbstractFileByPath(fileClassAttribute.options.valuesListNotePath);
                    if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                        const result = await this.plugin.app.vault.read(valuesFile)
                        this.plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                    }
                } else {
                    newOptions = fileClassAttribute.options;
                    newOptions[`${Object.keys(fileClassAttribute.options).length + 1}`] = newValue
                    await fileClass.updateAttribute(fileClassAttribute.type, fileClassAttribute.name, newOptions, fileClassAttribute);
                }
            }
        } else {
            const presetField = this.plugin.presetFields.find(field => field.name === this.field.name)
            if (presetField?.options.sourceType === selectValuesSource.Type.ValuesListNotePath) {
                const valuesFile = this.plugin.app.vault.getAbstractFileByPath(presetField.options.valuesListNotePath)
                if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                    const result = await this.plugin.app.vault.read(valuesFile)
                    this.plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                }
            } else if (presetField?.options.sourceType === selectValuesSource.Type.ValuesList) {
                const currentExistingField = this.plugin.presetFields.find(p => p.id == this.field.id);
                if (currentExistingField) {
                    const valuesList = currentExistingField.options.valuesList
                    valuesList[`${Object.keys(valuesList).length + 1}`] = newValue
                }
                this.plugin.saveSettings();
            }
        }
    }

    async clearValues() {
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: "" } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
    }

    getSuggestions(query: string): string[] {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let dvFile: any;
        if (dvApi) dvFile = dvApi.page(this.file.path)
        const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as AbstractListBasedField
        const values = fieldManager.getOptionsList(dvFile).filter(o => String(o).toLowerCase().includes(query.toLowerCase()))
        if (this.addButton) {
            (values.some(p => p === query) || this.field.options.sourceType == selectValuesSource.Type.ValuesFromDVQuery || !query) ?
                this.addButton.buttonEl.hide() :
                this.addButton.buttonEl.show();
        };
        return values
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        el.addClass("value-container")
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) { }
}