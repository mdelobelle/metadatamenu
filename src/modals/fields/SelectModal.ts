import { TFile, SuggestModal, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import MetadataMenu from "main";
import * as selectValuesSource from "src/types/selectValuesSourceTypes"
import { FieldManager } from "src/types/fieldTypes";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";
import { postValues } from "src/commands/postValues";
import { cleanActions } from "src/utils/modals";
import { ExistingField } from "src/fields/existingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";

export default class ValueSuggestModal extends SuggestModal<string>{

    private addButton: ButtonComponent;
    private value: string

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false,
        private previousModal?: ObjectModal | ObjectListModal

    ) {
        super(plugin.app);
        this.value = this.eF?.value || ""
        this.containerEl.addClass("metadata-menu");
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        cleanActions(this.containerEl, ".footer-actions")
        const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        buttonContainer.createDiv({ cls: "spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "info" })
        infoContainer.setText("Shift+Enter to save")
        // addButton
        this.addButton = new ButtonComponent(inputContainer)
        this.addButton.setIcon("plus")
        this.addButton.onClick(() => this.addNewValueToSettings())
        this.addButton.setCta();
        this.addButton.setTooltip("Add this value to this field settings")
        this.addButton.buttonEl.hide();
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.setTooltip("Cancel")
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("eraser")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("danger")
        clearButton.setTooltip("Clear the field value")
        this.modalEl.appendChild(buttonContainer);
    };

    async onOpen(): Promise<void> {
        super.onOpen()
    }

    onClose(): void {
        this.previousModal?.open()
    }

    async addNewValueToSettings(): Promise<void> {
        const newValue = this.inputEl.value;
        const fileClassName = this.plugin.fieldIndex.filesFields.get(this.file.path)?.find(field => field.name === this.field.name)?.fileClassName
        if (fileClassName) {
            const fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
            const fileClassAttribute = fileClass?.attributes.find(attr => attr.name === this.field.name)
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
        await this.saveItem(newValue);
        this.close();
    }

    async clearValues() {
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: "" } }], this.file, this.lineNumber, this.after, this.asList, this.asComment)

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
        el.addClass("value-container");
        if (value === this.value) el.addClass("value-checked")
    }

    private async saveItem(item: string): Promise<void> {
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: item.toString() } }], this.file, this.lineNumber, this.after, this.asList, this.asComment)
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        this.saveItem(item)
    }
}