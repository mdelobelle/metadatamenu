import { DropdownComponent, Modal, TextComponent, ButtonComponent, ExtraButtonComponent, Notice, ToggleComponent, setIcon } from "obsidian";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FieldTypeTooltip, FieldType, FieldTypeLabelMapping, FieldManager } from "src/types/fieldTypes";
import { FileClass } from "src/fileClass/fileClass";
import MetadataMenu from "main";
import Field, { FieldCommand } from "src/fields/Field";
import { FieldManager as F, SettingLocation } from "src/fields/FieldManager";

class FileClassAttributeModal extends Modal {

    private nameInputContainer: HTMLDivElement;
    private nameInput: TextComponent;
    private attrName: HTMLElement;
    private typeSelectContainer: HTMLDivElement;
    private commandContainer: HTMLDivElement;
    private initialField: Field;
    private field: Field;
    private fieldManager: F;
    private fieldOptionsContainer: HTMLDivElement;
    private command: FieldCommand;
    private addCommand: boolean;
    private iconName: TextComponent;


    constructor(private plugin: MetadataMenu, private fileClass: FileClass, private attr?: FileClassAttribute) {
        super(plugin.app);
        this.initialField = new Field();
        if (this.attr) {
            this.field = attr!.getField()
            Field.copyProperty(this.initialField, this.field)
        } else {
            this.field = new Field();
        }
        this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field);
        this.nameInputContainer = this.contentEl.createDiv();
        this.commandContainer = this.contentEl.createDiv();
        this.typeSelectContainer = this.contentEl.createDiv({ cls: 'metadata-menu-value-selector-container' });
        this.fieldOptionsContainer = this.contentEl.createDiv();
        this.addCommand = this.field.command !== undefined;
        this.command = this.field.command || {
            id: this.field ? `insert__${this.field.fileClassName || "presetField"}__${this.field.name}` : "",
            icon: "list-plus",
            label: this.field ? `Insert ${this.field.name} field` : "",
            hotkey: undefined
        }
    }

    buildNameInputContainer(): void {
        this.nameInputContainer.setText("Name: ");
        this.nameInput = new TextComponent(this.nameInputContainer);
        this.attr ? this.nameInput.setValue(this.field.name) : this.nameInput.setPlaceholder("Type a name for this attribute");
        this.nameInput.inputEl.focus();
        this.nameInput.onChange(value => { this.field.name = value; this.attrName.setText(`<${value}>`) });
        this.typeSelectContainer.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
    }

    buildCommandContainer(): void {
        const commandContainer = this.commandContainer.createDiv();
        //label
        commandContainer.createDiv({ text: "set a command for this field?", cls: "metadata-menu-field-option" });

        //add command
        const addCommandToggler = new ToggleComponent(this.commandContainer);
        addCommandToggler.setValue(this.addCommand);

        // options
        const fieldOptionsContainer = this.commandContainer.createDiv({})
        this.addCommand ? fieldOptionsContainer.show() : fieldOptionsContainer.hide();

        // icon
        fieldOptionsContainer.createDiv({ text: "Icon name (for mobile toolbar) : from lucide.dev" })
        const iconContainer = fieldOptionsContainer.createDiv({ cls: "metadata-menu-field-option" })
        this.iconName = new TextComponent(iconContainer)
        const iconPreview = iconContainer.createDiv({})
        this.iconName.setValue(this.command?.icon || "list-plus")
        setIcon(iconPreview, this.iconName.getValue())
        this.iconName.onChange(value => {
            this.command.icon = value;
            setIcon(iconPreview, value)
        })

        addCommandToggler.onChange(value => {
            this.addCommand = value
            this.addCommand ? fieldOptionsContainer.show() : fieldOptionsContainer.hide();
        });
    }

    buildTypeSelectContainer(): void {

        //header for select
        const typeSelectHeader = this.typeSelectContainer.createDiv();
        const attrLine = typeSelectHeader.createEl("div");
        this.attrName = attrLine.createEl("strong");
        this.attrName.setText(`<${this.field.name}>`);
        attrLine.append(" fields in files with:");
        String(`---\n${this.plugin.settings.fileClassAlias}: ${this.fileClass.name}\n...\n---`).split('\n').forEach(line => {
            typeSelectHeader.createEl("div", "yaml-metadata-menu-red").setText(line);
        })
        //dropdown
        const typeSelectLabel = this.typeSelectContainer.createDiv({ cls: 'metadata-menu-value-selector-inline-label' });
        typeSelectLabel.setText("will: ");
        const typeSelectDropDown = this.typeSelectContainer.createDiv({ cls: 'metadata-menu-value-selector-toggler' });

        const typeSelect = new DropdownComponent(typeSelectDropDown);

        Object.keys(FieldTypeTooltip).forEach((key: keyof typeof FieldType) => typeSelect.addOption(key, FieldTypeTooltip[key]))
        typeSelect.setValue(this.field.type)
        typeSelect.onChange((typeLabel: keyof typeof FieldType) => {

            this.field = new Field();
            Field.copyProperty(this.field, this.initialField);
            this.field.name = this.nameInput.getValue()
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
            this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, SettingLocation.FileClassAttributeSettings)
        })
    }

    private validateFields(): boolean {
        return this.fieldManager.validateName(
            this.nameInput,
            this.nameInput.inputEl
        ) &&
            this.fieldManager.validateOptions();
    }

    private createSaveBtn(container: HTMLDivElement): void {
        const saveButton = new ButtonComponent(container);
        saveButton.setIcon("checkmark");
        saveButton.onClick(async () => {
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
            await this.fileClass.updateAttribute(this.field.type, this.field.name, this.field.options, this.attr, this.command);
            this.close();
        })
    }

    private createRemovelBtn(container: HTMLDivElement): void {
        const removeButton = new ButtonComponent(container);
        removeButton.setIcon("trash");
        removeButton.onClick(() => {
            const confirmModal = new Modal(this.plugin.app);
            confirmModal.titleEl.setText("Please confirm");
            confirmModal.contentEl.createDiv().setText(`Do you really want to remove ${this.attr?.name} attribute from ${this.fileClass.name}?`);
            const confirmFooter = confirmModal.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
            const confirmButton = new ButtonComponent(confirmFooter);
            confirmButton.setIcon("checkmark");
            confirmButton.onClick(() => {
                if (this.attr) this.fileClass.removeAttribute(this.attr);
                confirmModal.close();
                this.close();
            })
            const dismissButton = new ExtraButtonComponent(confirmFooter);
            dismissButton.setIcon("cross");
            dismissButton.onClick(() => this.close());
            confirmModal.open();
        })
    }

    private createCancelBtn(container: HTMLDivElement): void {
        const cancelButton = new ExtraButtonComponent(container);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => this.close());
    }

    onOpen() {
        //title
        this.titleEl.setText(this.attr ? `Manage ${this.attr.name}` : `Create a new attribute for ${this.fileClass.name}`);

        this.buildNameInputContainer();
        this.buildCommandContainer();
        this.buildTypeSelectContainer();
        this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, SettingLocation.FileClassAttributeSettings);

        // footer buttons
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        this.createSaveBtn(footer);
        if (this.attr) this.createRemovelBtn(footer);
        this.createCancelBtn(footer);
    }
}

export { FileClassAttributeModal }