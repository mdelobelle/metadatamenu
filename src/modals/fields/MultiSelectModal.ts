import { TFile, ButtonComponent, SuggestModal, setIcon } from "obsidian";
import Field from "src/fields/Field";
import MetadataMenu from "main";
import { FieldManager } from "src/types/fieldTypes";
import AbstractListBasedField from "src/fields/fieldManagers/AbstractListBasedField";
import * as selectValuesSource from "src/types/selectValuesSourceTypes"
import FileField from "src/fields/fieldManagers/FileField";
import { postValues } from "src/commands/postValues";
import { cleanActions } from "src/utils/modals";
import { getLink } from "src/utils/parser";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";

export default class MultiSuggestModal extends SuggestModal<string> {

    private selectedOptions: Array<string>;
    private addButton: ButtonComponent;
    private reloadButton: ButtonComponent;

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asBlockquote: boolean = false,
        private previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin.app);
        const initialOptions: string | string[] = this.eF?.value || []
        if (initialOptions) {
            if (Array.isArray(initialOptions)) {
                this.selectedOptions = initialOptions.map(item => {
                    const link = getLink(item, this.file)
                    if (link) {
                        return FileField.buildMarkDownLink(this.plugin, this.file, link.path)
                    } else {
                        return item.toString()
                    }
                })

                this.selectedOptions = initialOptions.map(item => item.toString())
            }
            else if (typeof (initialOptions) === "string" && initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                const link = getLink(initialOptions, this.file)
                if (link) {
                    this.selectedOptions = [`[[${link.path.replace(".md", "")}]]`]
                } else if (typeof (initialOptions) === "string") {
                    this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
                }
            }
        } else {
            this.selectedOptions = [];
        }
        this.containerEl.addClass("metadata-menu");
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                await this.replaceValues();
                this.close()
            }
        }


        const updateSettingsInfoContainer = this.containerEl.createDiv({ cls: "value-add-notice" })
        const notice = updateSettingsInfoContainer.createDiv({ cls: "label" });
        updateSettingsInfoContainer.createDiv({ cls: "spacer" });
        updateSettingsInfoContainer.hide();
        this.containerEl.find(".prompt").prepend(updateSettingsInfoContainer);

        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.containerEl.find(".prompt").prepend(inputContainer)
        cleanActions(this.containerEl, ".footer-action")
        const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        buttonContainer.createDiv({ cls: "spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        // addButton
        this.addButton = new ButtonComponent(inputContainer)
        this.addButton.setIcon("plus")
        this.addButton.onClick(async () => {
            await this.addNewValueToSettings();
            notice.setText(`${this.inputEl.value} added to the field settings\nclick on reload`)
            this.addButton.buttonEl.hide();
            updateSettingsInfoContainer.show();
        })
        this.addButton.setCta();
        this.addButton.setTooltip("Add this value to this field settings")
        this.addButton.buttonEl.hide();
        //reload button
        this.reloadButton = new ButtonComponent(updateSettingsInfoContainer)
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
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => { this.close(); })
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("trash")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("danger")
        this.modalEl.appendChild(buttonContainer)
    };

    async onOpen() {
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
            const fileClassAttribute = fileClass?.attributes.find(attr => attr.id === this.field.id)
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
        await this.plugin.fieldIndex.indexFields();
        this.selectedOptions.push(newValue)
    }

    async replaceValues() {
        const options = this.selectedOptions;
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: options.join(", ") } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
        this.close();
    }

    async clearValues() {
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: "" } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
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

    getSuggestions(query: string): string[] {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let dvFile: any;
        if (dvApi) dvFile = dvApi.page(this.file.path)
        const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as AbstractListBasedField
        const values = fieldManager.getOptionsList(dvFile).filter(o => o.toLowerCase().includes(query.toLowerCase()))
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

    onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {

    }

}