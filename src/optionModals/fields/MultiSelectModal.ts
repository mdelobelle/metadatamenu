import { TFile, ButtonComponent, SuggestModal, setIcon, Notice, parseLinktext } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import MetadataMenu from "main";
import { FieldManager } from "src/types/fieldTypes";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";
import * as selectValuesSource from "src/types/selectValuesSourceTypes"
import { relativeTimeRounding } from "moment";
import FileField from "src/fields/fieldManagers/FileField";

export default class MultiSuggestModal extends SuggestModal<string> {

    private selectedOptions: Array<string>;
    private addButton: ButtonComponent;
    private reloadButton: ButtonComponent;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        initialOptions: string,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false
    ) {
        super(plugin.app);
        if (initialOptions) {
            if (Array.isArray(initialOptions)) {
                const dvApi = this.plugin.app.plugins.plugins.dataview?.api
                if (dvApi && initialOptions.some(o => dvApi.value.isLink(o))) {
                    this.selectedOptions = initialOptions.map(item => {
                        if (dvApi.value.isLink(item)) {
                            return FileField.buildMarkDownLink(this.plugin, this.file, item.path)
                        } else {
                            return item.toString()
                        }
                    })
                }
                this.selectedOptions = initialOptions.map(item => item.toString())
            }
            else if (initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
            }
        } else {
            this.selectedOptions = [];
        }
    };

    async onOpen() {
        super.onOpen()
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.shiftKey) {
                await this.replaceValues();
                this.close()
            }
        }


        const updateSettingsInfoContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-notice-container" })
        const notice = updateSettingsInfoContainer.createDiv({ cls: "metadata-menu-value-suggester-notice-label" });
        updateSettingsInfoContainer.createDiv({ cls: "metadata-menu-value-suggester-notice-spacer" });
        updateSettingsInfoContainer.hide();
        this.containerEl.find(".prompt").prepend(updateSettingsInfoContainer);

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
        this.addButton.onClick(async () => {
            await this.addNewValueToSettings();
            notice.setText(`${this.inputEl.value} added to the field settings\nclick on reload`)
            this.addButton.buttonEl.hide();
            updateSettingsInfoContainer.show();
        })
        this.addButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        this.addButton.setCta();
        this.addButton.setTooltip("Add this value to this field settings")
        this.addButton.buttonEl.hide();
        //reload button
        this.reloadButton = new ButtonComponent(updateSettingsInfoContainer)
        this.reloadButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        this.reloadButton.setIcon("refresh-cw")
        this.reloadButton.setCta()
        this.reloadButton.onClick(async () => {
            this.inputEl.value = '';
            //@ts-ignore
            this.updateSuggestions();
            updateSettingsInfoContainer.hide();
            this.addButton.buttonEl.hide();
        })
        //confirm button
        const confirmButton = new ButtonComponent(buttonContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.replaceValues();
            this.close()
        })
        confirmButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => { this.close(); })
        cancelButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("trash")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        clearButton.buttonEl.addClass("danger")
        this.modalEl.appendChild(buttonContainer)
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
        await this.plugin.fieldIndex.fullIndex("valueAdd");
        this.selectedOptions.push(newValue)
    }

    async replaceValues() {
        const options = this.selectedOptions;
        if (this.lineNumber == -1) {
            await replaceValues(this.plugin, this.file, this.field.name, options.join(", "));
        } else {
            const renderedValues = !this.inFrontmatter ? options.join(", ") : options.length > 1 ? `[${options.join(", ")}]` : `${options[0]}`
            await insertValues(this.plugin, this.file, this.field.name, renderedValues, this.lineNumber, this.inFrontmatter, this.after);
        };
        this.close();
    }

    async clearValues() {
        if (this.lineNumber == -1) {
            await replaceValues(this.plugin, this.file, this.field.name, "");
        } else {
            await insertValues(this.plugin, this.file, this.field.name, "", this.lineNumber, this.inFrontmatter, this.after);
        };
    }

    renderSelected() {
        //@ts-ignore
        const chooser = this.chooser
        const suggestions: HTMLDivElement[] = chooser.suggestions
        const values: string[] = chooser.values
        suggestions.forEach((s, i) => {
            if (this.selectedOptions.includes(values[i].toString())) {
                s.addClass("metadata-menu-value-selected")
                if (s.querySelectorAll(".metadata-menu-command-suggest-icon").length == 0) {
                    const iconContainer = s.createDiv({ cls: "metadata-menu-command-suggest-icon" })
                    setIcon(iconContainer, "check-circle")
                }
            } else {
                s.removeClass("metadata-menu-value-selected")
                s.querySelectorAll(".metadata-menu-command-suggest-icon").forEach(icon => icon.remove())
            }
        })
    }

    getSuggestions(query: string): string[] {
        const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as AbstractListBasedField
        const values = fieldManager.getOptionsList().filter(o => o.toLowerCase().includes(query.toLowerCase()))
        if (this.addButton) {
            values.some(p => p === query) ? this.addButton.buttonEl.hide() : this.addButton.buttonEl.show();
        };
        return values
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        el.addClass("metadata-menu-value-suggester-value-container")
        const spacer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-value-container-spacer" })
        el.appendChild(spacer)
        if (this.selectedOptions.includes(value.toString())) {
            el.addClass("metadata-menu-value-selected")
            const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
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

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {

    }

}