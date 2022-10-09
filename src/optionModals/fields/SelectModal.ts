import { TFile, SuggestModal, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import MetadataMenu from "main";
import * as selectValuesSource from "src/types/selectValuesSourceTypes"
import { FieldManager } from "src/types/fieldTypes";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";

export default class ValueSuggestModal extends SuggestModal<string>{

    private addButton: ButtonComponent;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private value: string,
        private field: Field,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false
    ) {
        super(plugin.app);
    };

    async onOpen(): Promise<void> {
        super.onOpen()
        const inputContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-input-container" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        const buttonContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-actions" })
        buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-actions-spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-info" })
        infoContainer.setText("Shift+Enter to save")
        // addButton
        this.addButton = new ButtonComponent(inputContainer)
        this.addButton.setIcon("plus")
        this.addButton.onClick(() => this.addNewValueToSettings())
        this.addButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        this.addButton.setCta();
        this.addButton.setTooltip("Add this value to this field settings")
        this.addButton.buttonEl.hide();
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => this.close())
        cancelButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        cancelButton.setTooltip("Cancel")
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("eraser")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        clearButton.buttonEl.addClass("danger")
        clearButton.setTooltip("Clear the field value")
        this.modalEl.appendChild(buttonContainer);
    }

    async addNewValueToSettings(): Promise<void> {
        const newValue = this.inputEl.value;
        const fileClassName = this.plugin.fieldIndex.filesFileClassName.get(this.file.path)
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
                    newOptions[`${Object.keys(fileClassAttribute.options.valuesList).length}`] = newValue
                    await fileClass.updateAttribute(fileClassAttribute.type, fileClassAttribute.name, newOptions, fileClassAttribute);
                } else if (fileClassAttribute.options.sourceType === selectValuesSource.Type.ValuesListNotePath) {
                    const valuesFile = this.plugin.app.vault.getAbstractFileByPath(fileClassAttribute.options.valuesListNotePath);
                    if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                        const result = await this.plugin.app.vault.read(valuesFile)
                        this.plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                    }
                } else {
                    newOptions = fileClassAttribute.options;
                    newOptions[`${Object.keys(fileClassAttribute.options).length}`] = newValue
                    await fileClass.updateAttribute(fileClassAttribute.type, fileClassAttribute.name, newOptions, fileClassAttribute);
                }
            }
        } else {
            const presetField = this.plugin.settings.presetFields.find(field => field.name === this.field.name)
            if (presetField?.options.sourceType === selectValuesSource.Type.ValuesListNotePath) {
                const valuesFile = this.plugin.app.vault.getAbstractFileByPath(presetField.options.valuesListNotePath)
                if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                    const result = await this.plugin.app.vault.read(valuesFile)
                    this.plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                }
            } else if (presetField?.options.sourceType === selectValuesSource.Type.ValuesList) {
                const currentExistingField = this.plugin.initialProperties.find(p => p.id == this.field.id);
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
        if (this.lineNumber == -1) {
            await this.plugin.fileTaskManager
                .pushTask(() => { replaceValues(this.plugin, this.file, this.field.name, "") });
        } else {
            await this.plugin.fileTaskManager
                .pushTask(() => { insertValues(this.plugin, this.file, this.field.name, "", this.lineNumber, this.inFrontmatter, this.after) });
        };
    }

    getSuggestions(query: string): string[] {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let dvFile: any;
        if (dvApi) dvFile = dvApi.page(this.file.path)
        const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as AbstractListBasedField
        const values = fieldManager.getOptionsList(dvFile).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        if (this.addButton) {
            values.some(p => p === query) && this.field.options.sourceType !== selectValuesSource.Type.ValuesFromDVQuery ?
                this.addButton.buttonEl.hide() :
                this.addButton.buttonEl.show();
        };
        return values
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        if (value === this.value) el.addClass("metadata-menu-value-selected")
    }

    private async saveItem(item: string): Promise<void> {
        if (this.lineNumber == -1) {
            await this.plugin.fileTaskManager
                .pushTask(() => { replaceValues(this.plugin, this.file, this.field.name, item.toString()) });
        } else {
            await this.plugin.fileTaskManager
                .pushTask(() => { insertValues(this.plugin, this.file, this.field.name, item.toString(), this.lineNumber, this.inFrontmatter, this.after) });
        };
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        this.saveItem(item)
    }
}