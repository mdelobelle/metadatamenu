import { App, Modal, Setting, TextComponent, Notice, ButtonComponent, ExtraButtonComponent, DropdownComponent } from "obsidian";
import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import FieldSetting from "src/settings/FieldSetting";

export default class FieldSettingsModal extends Modal {
    private namePromptComponent: TextComponent;
    private valuesPromptComponents: Array<TextComponent> = [];
    private presetValuesFields: HTMLDivElement;
    private numberValidatorField: HTMLDivElement;
    private numberStepValue: TextComponent;
    private numberMinValue: TextComponent;
    private numberMaxValue: TextComponent;
    private saved: boolean = false;
    private field: Field;
    private plugin: MetadataMenu;
    private initialField: Field;
    private parentSetting?: FieldSetting;
    private new: boolean = true;
    private parentSettingContainer: HTMLElement;
    private fieldOptionsContainer: HTMLDivElement;

    constructor(app: App, plugin: MetadataMenu, parentSettingContainer: HTMLElement, parentSetting?: FieldSetting, field?: Field) {
        super(app);
        this.plugin = plugin;
        this.parentSetting = parentSetting;
        this.initialField = new Field();
        this.parentSettingContainer = parentSettingContainer;
        if (field) {
            this.new = false;
            this.field = field;
            Field.copyProperty(this.initialField, this.field)
        } else {
            let newId = 1;
            this.plugin.initialProperties.forEach(prop => {
                if (parseInt(prop.id) && parseInt(prop.id) >= newId) {
                    newId = parseInt(prop.id) + 1;
                };
            });
            this.field = new Field();
            this.field.id = newId.toString();
            this.initialField.id = newId.toString();
        };
    };

    async onOpen(): Promise<void> {
        if (this.field.name == "") {
            this.titleEl.setText(`Add a field and define options`);
        } else {
            this.titleEl.setText(`Manage settings options for ${this.field.name}`);
        };
        await this.createForm();
    };

    onClose(): void {
        Object.assign(this.field, this.initialField);
        if (!this.new && this.parentSetting) {
            this.parentSetting.setTextContentWithname()
        } else if (this.saved) {
            new FieldSetting(this.parentSettingContainer, this.field, this.app, this.plugin);
        };
    };

    private setValueListText(header: HTMLDivElement): void {
        header.setText(`Preset options: ${Object.values(this.field.options).join(', ')}`);
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

    private createnameInputContainer(parentNode: HTMLDivElement): TextComponent {
        const fieldNameContainerLabel = parentNode.createDiv();
        fieldNameContainerLabel.setText(`Field Name:`);
        const input = new TextComponent(parentNode);
        const name = this.field.name;
        input.setValue(name);
        input.setPlaceholder("Name of the field");
        input.onChange(value => {
            this.field.name = value;
            this.titleEl.setText(`Manage predefined options for ${this.field.name}`);
            FieldSettingsModal.removeValidationError(input);
        });
        return input;
    };

    private createTypeSelectorContainer(parentNode: HTMLDivElement): void {
        const typeSelectorContainerLabel = parentNode.createDiv();
        typeSelectorContainerLabel.setText(`Field type:`);
        const select = new DropdownComponent(parentNode);
        Object.keys(FieldTypeLabelMapping).forEach(f => select.addOption(f, f))
        if (this.field.type) {
            select.setValue(this.field.type)
        }
        select.onChange((typeLabel: keyof typeof FieldType) => {
            this.field.type = FieldTypeLabelMapping[typeLabel];
            this.showSection(this.field.type)
        })
    }


    private createNumberContainer(parentNode: HTMLDivElement): void {
        const numberStepValueContainer = parentNode.createDiv();
        numberStepValueContainer.createEl("span", { text: "Step (optional)", cls: 'metadata-menu-field-option' })
        this.numberStepValue = new TextComponent(numberStepValueContainer)
        this.numberStepValue.setValue(this.field.options.step || "")

        const numberMinValueContainer = parentNode.createDiv();
        numberMinValueContainer.createEl("span", { text: "Min value (optional)", cls: 'metadata-menu-field-option' })
        this.numberMinValue = new TextComponent(numberMinValueContainer)
        this.numberMinValue.setValue(this.field.options.min || "")

        const numberMaxValueContainer = parentNode.createDiv();
        numberMaxValueContainer.createEl("span", { text: "Max value (optional)", cls: 'metadata-menu-field-option' })
        this.numberMaxValue = new TextComponent(numberMaxValueContainer)
        this.numberMaxValue.setValue(this.field.options.max || "")
        this.numberStepValue.onChange(value => {
            this.field.options.step = value;
            FieldSettingsModal.removeValidationError(this.numberStepValue);
        })
        this.numberMinValue.onChange(value => {
            this.field.options.min = value;
            FieldSettingsModal.removeValidationError(this.numberMinValue);
        })
        this.numberMaxValue.onChange(value => {
            this.field.options.max = value;
            FieldSettingsModal.removeValidationError(this.numberMaxValue);
        })
    }

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
        input.setValue(presetValue);
        input.onChange(value => {
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
        /* Field Name Section */
        const nameContainer = mainDiv.createDiv();
        this.namePromptComponent = this.createnameInputContainer(nameContainer);

        mainDiv.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* Field type selection */
        const typeSelectContainer = mainDiv.createDiv()
        this.createTypeSelectorContainer(typeSelectContainer)

        /* Field options section*/
        this.fieldOptionsContainer = mainDiv.createDiv()

        /* Number validation */
        this.numberValidatorField = this.fieldOptionsContainer.createDiv({ cls: "metadata-menu-number-options" })
        //this.numberValidatorField.setAttr("style", "background-color: green")
        this.createNumberContainer(this.numberValidatorField)
        this.numberValidatorField.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* preset options for multi & cycle */
        this.presetValuesFields = this.fieldOptionsContainer.createDiv()
        this.presetValuesFields.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* Field's note for list of Options */

        const listNotePathContainer = this.presetValuesFields.createDiv();
        this.createListNoteContainer(listNotePathContainer);
        listNotePathContainer.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");

        /* Field options */
        const valuesList = this.presetValuesFields.createDiv();
        const valuesListHeader = valuesList.createDiv();
        valuesListHeader.createEl("h2");
        valuesListHeader.setText(`Preset options: ${Object.values(this.field.options).join(', ')}`);
        const valuesListBody = valuesList.createDiv();
        Object.keys(this.field.options).forEach(key => {
            this.valuesPromptComponents.push(this.createValueContainer(valuesListBody, valuesListHeader, key));
        });

        /* Add a new Options */
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

        /* footer buttons*/
        const footerEl = this.contentEl.createDiv();
        const footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => this.createSaveButton(b));
        footerButtons.addExtraButton((b) => this.createCancelButton(b));

        /* initial state */
        this.showSection(this.field.type)
    };

    private validateFields(): boolean {
        let error = false;
        if (/^[#>-]/.test(this.field.name)) {
            FieldSettingsModal.setValidationError(
                this.namePromptComponent, this.namePromptComponent.inputEl,
                "Field name cannot start with #, >, -"
            );
            error = true;
        };
        if (this.field.name == "") {
            FieldSettingsModal.setValidationError(
                this.namePromptComponent, this.namePromptComponent.inputEl,
                "Field name can not be Empty"
            );
            error = true;
        };
        if (this.field.type !== FieldType.Number) {
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
        } else {
            if (this.field.options.step && isNaN(parseFloat(this.field.options.step))) {
                FieldSettingsModal.setValidationError(
                    this.numberStepValue, this.numberStepValue.inputEl,
                    "Values must be numeric."
                );
                error = true;
            }
            if (this.field.options.min && isNaN(parseFloat(this.field.options.min))) {
                FieldSettingsModal.setValidationError(
                    this.numberMinValue, this.numberMinValue.inputEl,
                    "Values must be numeric."
                );
                error = true;
            }
            if (this.field.options.max && isNaN(parseFloat(this.field.options.max))) {
                FieldSettingsModal.setValidationError(
                    this.numberMaxValue, this.numberMaxValue.inputEl,
                    "Values must be numeric."
                );
                error = true;
            }
        }
        return error
    }

    private createSaveButton(b: ButtonComponent): ButtonComponent {
        b.setTooltip("Save");
        b.setIcon("checkmark");
        b.onClick(async () => {
            let error = this.validateFields()
            if (error) {
                new Notice("Fix errors before saving.");
                return;
            };
            this.saved = true;
            const currentExistingField = this.plugin.initialProperties.filter(p => p.id == this.field.id)[0];
            if (currentExistingField) {
                Field.copyProperty(currentExistingField, this.field);
            } else {
                this.plugin.initialProperties.push(this.field);
            };
            this.initialField = this.field;
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
                if (this.initialField.name != "") {
                    Object.assign(this.field, this.initialField);
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