import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { FieldManager, SettingLocation } from "../FieldManager";
import { TextComponent, ButtonComponent } from "obsidian";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import MetadataMenu from "main";

export default abstract class AbstractListBasedField extends FieldManager {

    abstract valuesPromptComponents: Array<TextComponent>;
    abstract presetValuesFields: HTMLDivElement;

    constructor(field: Field, type: FieldType) {
        super(field, type)
    }

    //Settings
    private setValueListText(header: HTMLDivElement): void {
        header.setText(`Preset options: ${Object.values(this.field.options).join(', ')}`);
    };

    private createListNoteContainer(parentNode: HTMLDivElement): TextComponent {

        const listNoteContainerLabel = parentNode.createDiv({ cls: "metadata-menu-input" });
        listNoteContainerLabel.setText(`Path of the note containing the values:`);

        const input = new TextComponent(listNoteContainerLabel);
        const listNotePath = this.field.valuesListNotePath;
        input.setValue(listNotePath);
        input.setPlaceholder("Path/of/the/note.md");
        input.onChange(value => this.field.valuesListNotePath = value);
        return input;
    };

    private removePresetValue(key: string): void {
        let newValues: Record<string, string> = {};
        for (let _key in this.field.options) {
            if (key !== _key) {
                newValues[_key] = this.field.options[_key];
            };
        };
        this.field.options = newValues;
    };

    private createValueContainer(parentNode: HTMLDivElement, header: HTMLDivElement, key: string): TextComponent {
        const options = this.field.options;
        const presetValue = options[key];
        const valueContainer = parentNode.createDiv({
            cls: 'metadata-menu-prompt-container',
        });
        const input = new TextComponent(valueContainer);
        this.valuesPromptComponents.push(input)
        input.setValue(presetValue);
        input.onChange(value => {
            console.log(key)
            this.field.options[key] = value;
            this.setValueListText(header);
            FieldSettingsModal.removeValidationError(input);
        });
        const valueRemoveButton = new ButtonComponent(valueContainer);
        valueRemoveButton.setIcon("trash")
            .onClick((evt: MouseEvent) => {
                evt.preventDefault;
                this.removePresetValue(key);
                this.setValueListText(header);
                parentNode.removeChild(valueContainer);
                this.valuesPromptComponents.remove(input);
            });
        if (key != Object.keys(this.field.options)[0]) {
            const valueUpgradeButton = new ButtonComponent(valueContainer);
            valueUpgradeButton.setButtonText("▲");
            valueUpgradeButton.onClick((evt: MouseEvent) => {
                const thisValue = options[key];
                const inputIndex = this.valuesPromptComponents.indexOf(input)
                console.log(inputIndex, this.valuesPromptComponents)
                const upperComponent = inputIndex !== -1 ? this.valuesPromptComponents[inputIndex - 1] : this.valuesPromptComponents.last();
                if (upperComponent) {
                    const upperValue = upperComponent.inputEl.value;
                    const upperKey = Object.keys(options).filter(k => options[k] == upperValue)[0];
                    console.log(upperKey);
                    if (upperKey) {
                        upperComponent.setValue(thisValue);
                        options[upperKey] = thisValue;
                        input.setValue(upperValue);
                        options[key] = upperValue;
                    };
                };
            });
        };
        return input;
    };

    validateOptions(): boolean {
        let error = false;
        this.valuesPromptComponents.forEach(input => {
            if (/^[#>-]/.test(input.inputEl.value) && input.inputEl.parentElement?.lastElementChild) {
                FieldSettingsModal.setValidationError(
                    input, input.inputEl.parentElement.lastElementChild,
                    "Values cannot cannot start with #, >, -"
                );
                error = true;
            };
            if (/[,]/gu.test(input.inputEl.value) && input.inputEl.parentElement?.lastElementChild) {
                FieldSettingsModal.setValidationError(
                    input, input.inputEl.parentElement.lastElementChild,
                    "Values cannot contain a comma"
                );
                error = true;
            };
            if (input.inputEl.value == "" && input.inputEl.parentElement?.lastElementChild) {
                FieldSettingsModal.setValidationError(
                    input, input.inputEl.parentElement.lastElementChild,
                    "Values can't be null."
                );
                error = true;
            };
        });
        return !error
    }

    createAddButton(valuesList: HTMLDivElement, valuesListBody: HTMLDivElement, valuesListHeader: HTMLDivElement): void {
        const valuesListFooter = valuesList.createDiv();
        const addValue = valuesListFooter.createEl('button');
        addValue.type = 'button';
        addValue.textContent = 'Add';
        addValue.onClickEvent(async (evt: MouseEvent) => {
            evt.preventDefault;
            const newKey = await this.field.insertNewValue("")
            this.createValueContainer(valuesListBody, valuesListHeader, newKey)
        });
        valuesList.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    createSettingContainer(parentContainer: HTMLDivElement, location?: SettingLocation): void {
        if (location === SettingLocation.PluginSettings) this.createListNoteContainer(parentContainer);
        this.presetValuesFields = parentContainer.createDiv()
        this.presetValuesFields.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
        const valuesList = this.presetValuesFields.createDiv();
        const valuesListHeader = valuesList.createDiv();
        valuesListHeader.createEl("h2");
        valuesListHeader.setText(`Preset options: ${Object.values(this.field.options).join(', ')}`);
        const valuesListBody = valuesList.createDiv();
        Object.keys(this.field.options).forEach(key => {
            this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, valuesListHeader, key));
        });
        this.createAddButton(valuesList, valuesListBody, valuesListHeader)
    }

    createDvField(
        plugin: MetadataMenu,
        dv: any,
        p: any,
        fieldContainer: HTMLElement,
        attrs?: { cls: string, attr: Record<string, string> }
    ): void {
        const fieldValue = dv.el("span", p[this.field.name]);
        fieldContainer.appendChild(fieldValue);
    }
}