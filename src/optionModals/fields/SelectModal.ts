import { TFile, SuggestModal, ButtonComponent } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import MetadataMenu from "main";
import { off } from "process";

export default class ValueSuggestModal extends SuggestModal<string>{

    private newValue: string | null;
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
        this.newValue = null;
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
                } else {
                    newOptions = fileClassAttribute.options;
                    newOptions[`${Object.keys(fileClassAttribute.options).length}`] = newValue
                }
                await fileClass.updateAttribute(fileClassAttribute.type, fileClassAttribute.name, newOptions, fileClassAttribute);
            }
        } else {
            const presetField = this.plugin.settings.presetFields.find(field => field.name === this.field.name)
            if (presetField?.valuesListNotePath) {
                const valuesFile = this.plugin.app.vault.getAbstractFileByPath(presetField.valuesListNotePath)
                if (valuesFile instanceof TFile && valuesFile.extension == "md") {
                    const result = await this.plugin.app.vault.read(valuesFile)
                    this.plugin.app.vault.modify(valuesFile, `${result}\n${newValue}`);
                }
            } else if (presetField?.options) {
                const currentExistingField = this.plugin.initialProperties.filter(p => p.id == this.field.id)[0];
                currentExistingField.insertNewValue(newValue);
                this.plugin.saveSettings();
            }
        }
        await this.saveItem(newValue);
        this.close();
    }

    async clearValues() {
        if (this.lineNumber == -1) {
            await replaceValues(this.plugin, this.file, this.field.name, "");
        } else {
            await insertValues(this.plugin, this.file, this.field.name, "", this.lineNumber, this.inFrontmatter, this.after);
        };
    }

    getSuggestions(query: string): string[] {
        const listNoteValues = this.plugin.fieldIndex.valuesListNotePathValues.get(this.field.valuesListNotePath)
        let values: string[];
        if (listNoteValues?.length === 0 || !listNoteValues) {
            values = Object.values(this.field.options).filter(o => o.toLowerCase().includes(query.toLowerCase()))
        } else {
            values = listNoteValues!.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        }
        if (this.addButton) {
            values.some(p => p === query) ? this.addButton.buttonEl.hide() : this.addButton.buttonEl.show();
        };
        return values
    }

    renderSuggestion(value: string, el: HTMLElement) {
        el.setText(value)
        if (value === this.value) el.addClass("metadata-menu-value-selected")
    }

    private async saveItem(item: string): Promise<void> {
        if (this.lineNumber == -1) {
            await replaceValues(this.plugin, this.file, this.field.name, item);
        } else {
            await insertValues(this.plugin, this.file, this.field.name, item, this.lineNumber, this.inFrontmatter, this.after);
        };
    }

    async onChooseSuggestion(item: string, evt: MouseEvent | KeyboardEvent) {
        this.saveItem(item)
    }
}