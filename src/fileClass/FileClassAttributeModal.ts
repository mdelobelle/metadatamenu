import { DropdownComponent, Modal, TextComponent, ButtonComponent, ExtraButtonComponent, TextAreaComponent } from "obsidian";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FieldTypeTooltip, FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { FileClass } from "src/fileClass/fileClass";
import MetadataMenu from "main";


interface FileClassAttributeModal {
    attr?: FileClassAttribute;
    fileClass: FileClass;
    type: FieldType;
    options: string[];
    name: string;
    plugin: MetadataMenu
}

class FileClassAttributeModal extends Modal {

    constructor(plugin: MetadataMenu, fileClass: FileClass, attr?: FileClassAttribute) {
        super(plugin.app);
        this.plugin = plugin
        this.attr = attr;
        this.fileClass = fileClass;
        if (this.attr) {
            this.type = FieldTypeLabelMapping[this.attr.type];
            this.options = this.attr.options;
            this.name = this.attr.name;
        }
    }

    onOpen() {
        //title
        this.titleEl.setText(this.attr ? `Manage ${this.attr.name}` : `Create a new attribute for ${this.fileClass.name}`);

        //name input
        const nameInputContainer = this.contentEl.createDiv();
        nameInputContainer.setText("name");
        const nameInput = new TextComponent(nameInputContainer);
        this.attr ? nameInput.setValue(this.attr.name) : nameInput.setPlaceholder("Type a name for this attribute");

        //header for select
        const typeSelectHeader = this.contentEl.createDiv();
        const attrLine = typeSelectHeader.createEl("div");
        const attrName = attrLine.createEl("strong");
        attrName.setText(`<${this.name}>`);
        attrLine.append(" fields in files with:");
        String(`---\n${this.plugin.settings.fileClassAlias}: ${this.fileClass.name}\n...\n---`).split('\n').forEach(line => {
            typeSelectHeader.createEl("div", "yaml-metadata-menu-red").setText(line);
        })

        // type select
        const typeSelectContainer = this.contentEl.createDiv({ cls: 'metadata-menu-value-selector-container' });
        const typeSelectLabel = typeSelectContainer.createDiv({ cls: 'metadata-menu-value-selector-inline-label' });
        typeSelectLabel.setText("will: ");
        const typeSelectDropDown = typeSelectContainer.createDiv({ cls: 'metadata-menu-value-selector-toggler' });
        const typeSelect = new DropdownComponent(typeSelectDropDown);
        Object.keys(FieldTypeTooltip).forEach((key: keyof typeof FieldType) => {
            typeSelect.addOption(key, FieldTypeTooltip[key]);
        })
        if (this.attr) {
            typeSelect.setValue(this.type);
        }

        // options input
        const optionsInputContainer = this.contentEl.createDiv({ cls: 'metadata-menu-value-selector-container' });
        const optionsInputLabel = optionsInputContainer.createDiv({ cls: 'metadata-menu-value-selector-inline-label-top' });
        optionsInputLabel.setText("Options");
        const optionsInput = new TextAreaComponent(optionsInputContainer);
        optionsInput.inputEl.rows = 3;
        optionsInput.inputEl.cols = 26;
        this.attr ? optionsInput.setValue(this.type === FieldType.Input || this.type === FieldType.Boolean ? "" : this.options?.join(", ")) : optionsInput.setPlaceholder("insert options, comma separated");
        !this.attr || this.type === FieldType.Input || this.type === FieldType.Boolean ? optionsInputContainer.hide() : optionsInputContainer.show();

        // event handlers
        typeSelect.onChange((type: keyof typeof FieldType) => {
            type === FieldType.Input || type === FieldType.Boolean ? optionsInputContainer.hide() : optionsInputContainer.show();
            this.type = FieldTypeLabelMapping[type];
        })
        optionsInput.onChange(value => this.options = value.split(",").map(item => item.trim()));
        nameInput.onChange(value => { this.name = value; attrName.setText(`<${value}>`) });

        // footer buttons
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        const saveButton = new ButtonComponent(footer);
        saveButton.setIcon("checkmark");
        saveButton.onClick(() => {
            this.fileClass.updateAttribute(this.type, this.options, this.name, this.attr);
            this.close();
        })
        if (this.attr) {
            const removeButton = new ButtonComponent(footer);
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
        const cancelButton = new ExtraButtonComponent(footer);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => this.close());
    }
}

export { FileClassAttributeModal }