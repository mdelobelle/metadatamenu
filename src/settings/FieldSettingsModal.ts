import { App, Modal, Setting, TextComponent, Notice, ButtonComponent, ExtraButtonComponent, DropdownComponent } from "obsidian";
import MetadataMenu from "main";
import Field from "src/Field";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import FieldSetting from "src/settings/FieldSetting";

export default class FieldSettingsModal extends Modal {
    private namePromptComponent: TextComponent;
    private valuesPromptComponents: Array<TextComponent> = [];
    private presetValuesFields: HTMLDivElement;
    private numberValidatorField: HTMLDivElement;
    private saved: boolean = false;
    private property: Field;
    private plugin: MetadataMenu;
    private initialProperty: Field;
    private parentSetting?: FieldSetting;
    private new: boolean = true;
    private parentSettingContainer: HTMLElement;

    constructor(app: App, plugin: MetadataMenu, parentSettingContainer: HTMLElement, parentSetting?: FieldSetting, property?: Field) {
        super(app);
        this.plugin = plugin;
        this.parentSetting = parentSetting;
        this.initialProperty = new Field();
        this.parentSettingContainer = parentSettingContainer;
        if (property) {
            this.new = false;
            this.property = property;
            Field.copyProperty(this.initialProperty, this.property)
        } else {
            let newId = 1;
            this.plugin.initialProperties.forEach(prop => {
                if (parseInt(prop.id) && parseInt(prop.id) >= newId) {
                    newId = parseInt(prop.id) + 1;
                };
            });
            this.property = new Field();
            this.property.id = newId.toString();
            this.initialProperty.id = newId.toString();
        };
    };

    async onOpen(): Promise<void> {
        if (this.property.name == "") {
            this.titleEl.setText(`Add a property and set predefined`);
        } else {
            this.titleEl.setText(`Manage settings options for ${this.property.name}`);
        };
        await this.createForm();
    };

    onClose(): void {
        Object.assign(this.property, this.initialProperty);
        if (!this.new && this.parentSetting) {
            this.parentSetting.setTextContentWithname()
        } else if (this.saved) {
            new FieldSetting(this.parentSettingContainer, this.property, this.app, this.plugin);
        };
    };

    private setValueListText(header: HTMLDivElement): void {
        header.setText(`Preset options: ${Object.values(this.property.options).join(', ')}`);
    };

    private showSection(fieldType: FieldType): void {
        switch (fieldType) {
            case FieldType.Multi:
            //fall-through
            case FieldType.Cycle:
            //fall-through
            case FieldType.Select:
                this.presetValuesFields.show()
                this.numberValidatorField.hide()
                break;
            case FieldType.Number:
                this.presetValuesFields.hide()
                this.numberValidatorField.show()
                break;
            case FieldType.Boolean:
            //fall-through
            case FieldType.Input:
                this.presetValuesFields.hide()
                this.numberValidatorField.hide()
                break;
            default:
                this.presetValuesFields.hide()
                this.numberValidatorField.hide()
                break;
        }
    }

    private createTypeSelectorContainer(parentNode: HTMLDivElement): void {
        const typeSelectorContainerLabel = parentNode.createDiv();
        typeSelectorContainerLabel.setText(`Property type:`);
        const select = new DropdownComponent(parentNode);
        Object.keys(FieldTypeLabelMapping).forEach(f => select.addOption(f, f))
        if (this.property.type) {
            select.setValue(this.property.type)
        }
        select.onChange((typeLabel: keyof typeof FieldType) => {
            this.property.type = FieldTypeLabelMapping[typeLabel];
            this.showSection(this.property.type)
        })
    }

    private createnameInputContainer(parentNode: HTMLDivElement): TextComponent {
        const propertyNameContainerLabel = parentNode.createDiv();
        propertyNameContainerLabel.setText(`Property Name:`);
        const input = new TextComponent(parentNode);
        const name = this.property.name;
        input.setValue(name);
        input.setPlaceholder("Name of the property");
        input.onChange(value => {
            this.property.name = value;
            this.titleEl.setText(`Manage predefined options for ${this.property.name}`);
            FieldSettingsModal.removeValidationError(input);
        });
        return input;
    };


    private createNumberContainer(parentNode: HTMLDivElement): void {
        parentNode.createEl("span", { text: "Step (optional)", cls: 'metadata-menu-field-option' })
        const stepValue = new TextComponent(parentNode)
        stepValue.setValue(this.property.options.step || "")
        parentNode.createEl("span", { text: "Min value (optional)", cls: 'metadata-menu-field-option' })
        const minValue = new TextComponent(parentNode)
        minValue.setValue(this.property.options.min || "")
        parentNode.createEl("span", { text: "Max value (optional)", cls: 'metadata-menu-field-option' })
        const maxValue = new TextComponent(parentNode)
        maxValue.setValue(this.property.options.max || "")
        stepValue.onChange(value => {
            this.property.options.step = value
        })
        minValue.onChange(value => {
            this.property.options.min = value
        })
        maxValue.onChange(value => {
            this.property.options.max = value
        })
    }

    private createListNoteContainer(parentNode: HTMLDivElement): TextComponent {
        const listNoteContainerLabel = parentNode.createDiv({ cls: "metadata-menu-input" });
        listNoteContainerLabel.setText(`Path of the note containing the values:`);

        const input = new TextComponent(listNoteContainerLabel);
        const listNotePath = this.property.valuesListNotePath;
        input.setValue(listNotePath);
        input.setPlaceholder("Path/of/the/note.md");
        input.onChange(value => this.property.valuesListNotePath = value);
        return input;
    };

    private removePresetValue(key: string): void {
        let newValues: Record<string, string> = {};
        for (let _key in this.property.options) {
            if (key !== _key) {
                newValues[_key] = this.property.options[_key];
            };
        };
        this.property.options = newValues;
    };

    private createValueContainer(parentNode: HTMLDivElement, header: HTMLDivElement, key: string): TextComponent {
        const options = this.property.options;
        const presetValue = options[key];
        const valueContainer = parentNode.createDiv({
            cls: 'metadata-menu-prompt-container',
        });
        const input = new TextComponent(valueContainer);
        input.setValue(presetValue);
        input.onChange(value => {
            this.property.options[key] = value;
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
        if (key != Object.keys(this.property.options)[0]) {
            const valueUpgradeButton = new ButtonComponent(valueContainer);
            valueUpgradeButton.setButtonText("▲");
            valueUpgradeButton.onClick((evt: MouseEvent) => {
                const thisValue = options[key];
                const inputIndex = this.valuesPromptComponents.indexOf(input)
                const upperComponent = inputIndex !== -1 ? this.valuesPromptComponents[inputIndex - 1] : this.valuesPromptComponents.last();
                if (upperComponent) {
                    const upperValue = upperComponent.inputEl.value;
                    const upperKey = Object.keys(options).filter(k => options[k] == upperValue)[0];
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

    private async createForm(): Promise<void> {
        const div = this.contentEl.createDiv({
            cls: "metadata-menu-prompt-div"
        });
        const mainDiv = div.createDiv({
            cls: "metadata-menu-prompt-form"
        });
        /* Property Name Section */
        const nameContainer = mainDiv.createDiv();
        this.namePromptComponent = this.createnameInputContainer(nameContainer);

        mainDiv.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* Property type selection */
        const typeSelectContainer = mainDiv.createDiv()
        this.createTypeSelectorContainer(typeSelectContainer)

        /* Number validation */
        this.numberValidatorField = mainDiv.createDiv({ cls: "metadata-menu-number-options" })
        this.createNumberContainer(this.numberValidatorField)
        this.numberValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* preset options for multi & cycle */
        this.presetValuesFields = mainDiv.createDiv()
        this.presetValuesFields.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* Property's note for list of Options */

        const listNotePathContainer = this.presetValuesFields.createDiv();
        this.createListNoteContainer(listNotePathContainer);

        this.presetValuesFields.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* Property options */
        const valuesList = this.presetValuesFields.createDiv();
        const valuesListHeader = valuesList.createDiv();
        valuesListHeader.createEl("h2");
        valuesListHeader.setText(`Preset options: ${Object.values(this.property.options).join(', ')}`);
        const valuesListBody = valuesList.createDiv();
        Object.keys(this.property.options).forEach(key => {
            this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, valuesListHeader, key));
        });

        /* Add a new Options */
        const valuesListFooter = valuesList.createDiv();
        const addValue = valuesListFooter.createEl('button');
        addValue.type = 'button';
        addValue.textContent = 'Add';
        addValue.onClickEvent(async (evt: MouseEvent) => {
            evt.preventDefault;
            const newKey = await this.property.insertNewValue("")
            this.createValueContainer(valuesListBody, valuesListHeader, newKey)
        });

        mainDiv.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* footer buttons*/
        const footerEl = this.contentEl.createDiv();
        const footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => this.createSaveButton(b));
        footerButtons.addExtraButton((b) => this.createCancelButton(b));

        /* initial state */
        this.showSection(this.property.type)
    };

    private createSaveButton(b: ButtonComponent): ButtonComponent {
        b.setTooltip("Save");
        b.setIcon("checkmark");
        b.onClick(async () => {
            let error = false;
            if (/^[#>-]/.test(this.property.name)) {
                FieldSettingsModal.setValidationError(
                    this.namePromptComponent, this.namePromptComponent.inputEl,
                    "Property name cannot start with #, >, -"
                );
                error = true;
            };
            if (this.property.name == "") {
                FieldSettingsModal.setValidationError(
                    this.namePromptComponent, this.namePromptComponent.inputEl,
                    "Property name can not be Empty"
                );
                error = true;
            };
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
            if (error) {
                new Notice("Fix errors before saving.");
                return;
            };
            this.saved = true;
            const currentExistingProperty = this.plugin.initialProperties.filter(p => p.id == this.property.id)[0];
            if (currentExistingProperty) {
                Field.copyProperty(currentExistingProperty, this.property);
            } else {
                this.plugin.initialProperties.push(this.property);
            };
            this.initialProperty = this.property;
            this.parentSetting?.setTextContentWithname()
            this.plugin.saveSettings();
            this.close();
        });
        return b;
    };

    private createCancelButton(b: ExtraButtonComponent): ExtraButtonComponent {
        b.setIcon("cross")
            .setTooltip("Cancel")
            .onClick(() => {
                this.saved = false;
                /* reset options from settings */
                if (this.initialProperty.name != "") {
                    Object.assign(this.property, this.initialProperty);
                };
                this.close();
            });
        return b;
    };

    /* utils functions */

    private static setValidationError(textInput: TextComponent, insertAfter: Element, message?: string) {
        textInput.inputEl.addClass("is-invalid");
        if (message && textInput.inputEl.parentElement?.lastElementChild) {

            let mDiv = textInput.inputEl.parentElement.querySelector(
                ".invalid-feedback"
            ) as HTMLDivElement;

            if (!mDiv) {
                mDiv = createDiv({ cls: "invalid-feedback" });
            }
            mDiv.innerText = message;
            mDiv.insertAfter(insertAfter);
        }
    }
    private static removeValidationError(textInput: TextComponent) {
        if (textInput.inputEl.hasClass("is-invalid") && textInput.inputEl.parentElement?.lastElementChild) {
            textInput.inputEl.removeClass("is-invalid")
            textInput.inputEl.parentElement.removeChild(
                textInput.inputEl.parentElement.lastElementChild
            );
        };
    };
};