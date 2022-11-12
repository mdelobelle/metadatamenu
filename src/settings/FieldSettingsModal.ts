import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, Modal, Notice, TextComponent, TextAreaComponent, ToggleComponent, setIcon } from "obsidian";
import Field, { FieldCommand } from "src/fields/Field";
import FieldSetting from "src/settings/FieldSetting";
import { FieldManager as F, SettingLocation } from "src/fields/FieldManager";
import { FieldManager, FieldType, FieldTypeLabelMapping, FieldTypeTooltip } from "src/types/fieldTypes";

export default class FieldSettingsModal extends Modal {
    private namePromptComponent: TextComponent;
    private saved: boolean = false;
    private field: Field;
    private initialField: Field;
    private new: boolean = true;
    private fieldOptionsContainer: HTMLDivElement;
    private fieldManager: F;
    private command: FieldCommand;
    private addCommand: boolean;
    private iconName: TextComponent;

    constructor(
        private plugin: MetadataMenu,
        private parentSettingContainer: HTMLElement,
        private parentSetting?: FieldSetting,
        field?: Field
    ) {
        super(plugin.app);
        this.initialField = new Field();
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
        this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field);
        this.addCommand = this.field.command !== undefined;
        this.command = this.field.command || {
            id: this.field ? `insert__${this.field.fileClassName || "presetField"}__${this.field.name}` : "",
            icon: "list-plus",
            label: this.field ? `Insert ${this.field.name} field` : "",
            hotkey: undefined
        }
    };

    async onOpen(): Promise<void> {
        this.containerEl.addClass("metadata-menu")
        if (this.field.name == "") {
            this.titleEl.setText(`Add a field and define options`);
        } else {
            this.titleEl.setText(`Manage settings options for ${this.field.name}`);
        };

        /* Name */
        this.createnameInputContainer();
        this.contentEl.createEl("hr");

        /* Command */
        this.createCommandContainer();

        /* Type */
        const typeSelectContainer = this.contentEl.createDiv({ cls: "field-container" });
        this.contentEl.createEl("hr");

        /* Options */
        this.fieldOptionsContainer = this.contentEl.createDiv();

        /* footer buttons*/
        const footer = this.contentEl.createDiv({ cls: "footer-actions" });
        footer.createDiv({ cls: "spacer" })
        this.createSaveButton(footer);
        this.createCancelButton(footer);

        /* init state */
        this.createTypeSelectorContainer(typeSelectContainer)
        this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, SettingLocation.PluginSettings)
    };

    onClose(): void {
        Object.assign(this.field, this.initialField);
        if (!this.new && this.parentSetting) {
            this.parentSetting.setTextContentWithname()
        } else if (this.saved) {
            new FieldSetting(this.parentSettingContainer, this.field, this.plugin);
        };
    };

    private createnameInputContainer(): void {
        const container = this.contentEl.createDiv({ cls: "field-container" })
        container.createDiv({ cls: "label", text: "Field Name: " });
        const input = new TextComponent(container);
        input.inputEl.addClass("with-label");
        input.inputEl.addClass("full-width");
        const name = this.field.name;
        input.setValue(name);
        input.setPlaceholder("Name of the field");
        input.onChange(value => {
            this.field.name = value;
            this.command.id = `insert__${this.field.fileClassName || "presetField"}__${value}`
            this.command.label = `Insert ${value} field`
            this.titleEl.setText(`Manage predefined options for ${this.field.name}`);
            FieldSettingsModal.removeValidationError(input);
        });
        this.namePromptComponent = input;
    };

    private createTypeSelectorContainer(parentNode: HTMLDivElement): void {
        const typeSelectorContainerLabel = parentNode.createDiv({ cls: "label" });
        typeSelectorContainerLabel.setText(`Field type:`);
        parentNode.createDiv({ cls: "spacer" })
        const select = new DropdownComponent(parentNode);
        Object.keys(FieldTypeLabelMapping).forEach((f: keyof typeof FieldType) => select.addOption(f, FieldTypeTooltip[f]))
        if (this.field.type) {
            select.setValue(this.field.type)
        }
        select.onChange((typeLabel: keyof typeof FieldType) => {
            this.field = new Field();
            Field.copyProperty(this.field, this.initialField);
            this.field.name = this.namePromptComponent.getValue()
            this.field.type = FieldTypeLabelMapping[typeLabel];
            if (this.field.type !== this.initialField.type &&
                ![this.field.type, this.initialField.type].every(fieldType =>
                    [FieldType.Multi, FieldType.Select, FieldType.Cycle].includes(fieldType)
                )
            ) {
                this.field.options = {}
            }
            while (this.fieldOptionsContainer.firstChild) {
                this.fieldOptionsContainer.removeChild(this.fieldOptionsContainer.firstChild);
            }
            this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field)
            this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, SettingLocation.PluginSettings)
        })
    }

    private createCommandContainer(): void {

        const commandContainer = this.contentEl.createDiv({ cls: "field-container" })
        //label
        commandContainer.createDiv({ text: "set a command for this field?", cls: "label" });
        commandContainer.createDiv({ cls: "spacer" });
        //add command
        const addCommandToggler = new ToggleComponent(commandContainer);
        addCommandToggler.setValue(this.addCommand);

        // options
        const iconContainer = this.contentEl.createDiv({ cls: "field-container" })
        this.addCommand ? iconContainer.show() : iconContainer.hide();

        // icon
        iconContainer.createDiv({ text: "Icon name", cls: "label" })
        this.iconName = new TextComponent(iconContainer)
        this.iconName.inputEl.addClass("full-width");
        this.iconName.inputEl.addClass("with-label");
        const iconPreview = iconContainer.createDiv({ cls: "icon-preview" })
        this.iconName.setValue(this.command.icon)
        setIcon(iconPreview, this.command.icon)
        this.iconName.onChange(value => {
            this.command.icon = value;
            setIcon(iconPreview, value)
        })

        addCommandToggler.onChange(value => {
            this.addCommand = value
            this.addCommand ? iconContainer.show() : iconContainer.hide();
        });
    }

    private validateFields(): boolean {
        return this.fieldManager.validateName(
            this.namePromptComponent,
            this.contentEl
        ) &&
            this.fieldManager.validateOptions();
    }

    private createSaveButton(container: HTMLDivElement): void {
        const b = new ButtonComponent(container)
        b.setTooltip("Save");
        b.setIcon("checkmark");
        b.onClick(async () => {
            let error = !this.validateFields();
            if (error) {
                new Notice("Fix errors before saving.");
                return;
            };
            if (this.addCommand) {
                this.field.command = this.command
            } else {
                delete this.field.command
            }
            this.saved = true;
            const currentExistingField = this.plugin.initialProperties.filter(p => p.id == this.field.id)[0];
            if (currentExistingField) {
                Field.copyProperty(currentExistingField, this.field);
            } else {
                this.plugin.initialProperties.push(this.field);
            };
            Field.copyProperty(this.initialField, this.field)
            if (this.parentSetting) Field.copyProperty(this.parentSetting.field, this.field);
            this.parentSetting?.setTextContentWithname()
            this.plugin.saveSettings();
            this.close();
        });
    };

    private createCancelButton(container: HTMLDivElement): void {
        const b = new ButtonComponent(container);
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
    };

    /* utils functions */

    public static setValidationError(textInput: TextComponent, message?: string) {
        textInput.inputEl.addClass("is-invalid");
        const fieldContainer = textInput.inputEl.parentElement;
        const fieldsContainer = fieldContainer?.parentElement;
        if (message && fieldsContainer) {
            let mDiv = fieldsContainer.querySelector(".field-error") as HTMLDivElement;
            if (!mDiv) mDiv = createDiv({ cls: "field-error" });
            mDiv.innerText = message;
            fieldsContainer.insertBefore(mDiv, fieldContainer);
        }
    }
    public static removeValidationError(textInput: TextComponent | TextAreaComponent) {
        if (textInput.inputEl.hasClass("is-invalid")) textInput.inputEl.removeClass("is-invalid");
        const fieldContainer = textInput.inputEl.parentElement;
        const fieldsContainer = fieldContainer?.parentElement;
        const fieldError = fieldsContainer?.querySelector(".field-error")
        if (fieldError) fieldsContainer!.removeChild(fieldError)
    };
};