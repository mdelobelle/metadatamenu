import { DropdownComponent, Modal, TextComponent, ButtonComponent, ExtraButtonComponent, Notice } from "obsidian";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FieldTypeTooltip, FieldType, FieldTypeLabelMapping, FieldManager } from "src/types/fieldTypes";
import { FileClass } from "src/fileClass/fileClass";
import MetadataMenu from "main";
import Field from "src/fields/Field";
import { FieldManager as F, SettingLocation } from "src/fields/FieldManager";

class FileClassAttributeModal extends Modal {

    private attr?: FileClassAttribute;
    private fileClass: FileClass;
    private plugin: MetadataMenu
    private nameInputContainer: HTMLDivElement;
    private nameInput: TextComponent;
    private attrName: HTMLElement;
    private typeSelectContainer: HTMLDivElement;
    private initialField: Field;
    private field: Field;
    private fieldManager: F;
    private fieldOptionsContainer: HTMLDivElement;


    constructor(plugin: MetadataMenu, fileClass: FileClass, attr?: FileClassAttribute) {
        super(plugin.app);
        this.plugin = plugin
        this.attr = attr;
        this.fileClass = fileClass;
        this.initialField = new Field();
        if (this.attr) {
            this.field = attr!.getField()
            Field.copyProperty(this.initialField, this.field)
        } else {
            this.field = new Field();
        }
        this.fieldManager = new FieldManager[this.field.type](this.field);
        this.nameInputContainer = this.contentEl.createDiv();
        this.typeSelectContainer = this.contentEl.createDiv({ cls: 'metadata-menu-value-selector-container' });
        this.fieldOptionsContainer = this.contentEl.createDiv()
    }

    buildNameInputContainer(): void {
        this.nameInputContainer.setText("Name: ");
        this.nameInput = new TextComponent(this.nameInputContainer);
        this.attr ? this.nameInput.setValue(this.field.name) : this.nameInput.setPlaceholder("Type a name for this attribute");
        this.nameInput.onChange(value => { this.field.name = value; this.attrName.setText(`<${value}>`) });
        this.typeSelectContainer.createDiv({ cls: 'metadata-menu-separator' }).createEl("hr");
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
            this.fieldManager = new FieldManager[this.field.type](this.field)
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
        saveButton.onClick(() => {
            let error = !this.validateFields();
            if (error) {
                new Notice("Fix errors before saving.");
                return;
            };
            this.fileClass.updateAttribute(this.field.type, this.field.name, this.field.options, this.attr);
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

        this.buildNameInputContainer()
        this.buildTypeSelectContainer()
        this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, SettingLocation.FileClassAttributeSettings)

        // footer buttons
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        this.createSaveBtn(footer);
        if (this.attr) this.createRemovelBtn(footer);
        this.createCancelBtn(footer);
    }
}

export { FileClassAttributeModal }