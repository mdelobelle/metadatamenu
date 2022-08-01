import { DropdownComponent, Modal, TextComponent, ButtonComponent, ExtraButtonComponent, TextAreaComponent } from "obsidian";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FieldTypeTooltip, FieldType, FieldTypeLabelMapping } from "src/types/fieldTypes";
import { FileClass } from "src/fileClass/fileClass";
import MetadataMenu from "main";
import Field from "src/fields/Field";

interface FileClassAttributeModal {
    attr?: FileClassAttribute;
    fileClass: FileClass;
    type: FieldType;
    name: string;
    plugin: MetadataMenu
}

class FileClassAttributeModal extends Modal {

    private nameInputContainer: HTMLDivElement;
    private nameInput: TextComponent;
    private typeSelectContainer: HTMLDivElement;
    private typeSelect: DropdownComponent;
    private multiValuesContainer: HTMLDivElement;
    private multiValuesInput: TextAreaComponent;
    private numberOptionsContainer: HTMLDivElement;
    private numberStepInput: TextComponent;
    private numberMinInput: TextComponent;
    private numberMaxInput: TextComponent;
    private errorMessageContainer: HTMLDivElement;

    constructor(plugin: MetadataMenu, fileClass: FileClass, attr?: FileClassAttribute) {
        super(plugin.app);
        this.plugin = plugin
        this.attr = attr;
        this.fileClass = fileClass;
        if (this.attr) {
            this.type = FieldTypeLabelMapping[this.attr.type];
            this.name = this.attr.name;
        }
        this.nameInputContainer = this.contentEl.createDiv();
        this.typeSelectContainer = this.contentEl.createDiv({ cls: 'metadata-menu-value-selector-container' });
        this.errorMessageContainer = this.contentEl.createDiv()
        this.errorMessageContainer.hide()
        this.multiValuesContainer = this.contentEl.createDiv({ cls: 'metadata-menu-value-selector-container' });
        this.numberOptionsContainer = this.contentEl.createDiv({ cls: "metadata-menu-number-options" });
    }

    buildNameInputContainer(): void {
        this.nameInputContainer.setText("name");
        this.nameInput = new TextComponent(this.nameInputContainer);
        this.attr ? this.nameInput.setValue(this.attr.name) : this.nameInput.setPlaceholder("Type a name for this attribute");
    }

    buildTypeSelectContainer(): void {
        const typeSelectLabel = this.typeSelectContainer.createDiv({ cls: 'metadata-menu-value-selector-inline-label' });
        typeSelectLabel.setText("will: ");
        const typeSelectDropDown = this.typeSelectContainer.createDiv({ cls: 'metadata-menu-value-selector-toggler' });
        this.typeSelect = new DropdownComponent(typeSelectDropDown);
        Object.keys(FieldTypeTooltip).forEach((key: keyof typeof FieldType) => {
            this.typeSelect.addOption(key, FieldTypeTooltip[key]);
        })
        if (this.attr) {
            this.typeSelect.setValue(this.type);
        }
    }

    buildValuesArrayInputContainer(): void {
        const container = this.multiValuesContainer
        const multiValuesInputLabel = container.createDiv({ cls: 'metadata-menu-value-selector-inline-label-top' });
        multiValuesInputLabel.setText("Options");
        this.multiValuesInput = new TextAreaComponent(container);
        const input = this.multiValuesInput
        input.inputEl.rows = 3;
        input.inputEl.cols = 26;
        this.attr && Array.isArray(this.attr?.options) ? input.setValue(this.attr.options.join(", ")) : input.setPlaceholder("insert options, comma separated");
    }

    buildNumberOptionsContainer(): void {
        const { step, max, min } = this.attr?.options as Record<string, string> || {}
        //number step
        this.numberOptionsContainer.createEl("span", { text: "Step (optional)", cls: 'metadata-menu-field-option' })
        this.numberStepInput = new TextComponent(this.numberOptionsContainer)
        this.numberStepInput.setValue(step || "")
        //number min
        this.numberOptionsContainer.createEl("span", { text: "Min value (optional)", cls: 'metadata-menu-field-option' })
        this.numberMinInput = new TextComponent(this.numberOptionsContainer)
        this.numberMinInput.setValue(min || "")
        //number max
        this.numberOptionsContainer.createEl("span", { text: "Max value (optional)", cls: 'metadata-menu-field-option' })
        this.numberMaxInput = new TextComponent(this.numberOptionsContainer)
        this.numberMaxInput.setValue(max || "")
    }

    displaySection(): void {
        switch (this.type) {
            case FieldType.Input:
            //fall-through
            case FieldType.Boolean:
                this.multiValuesContainer.hide();
                this.numberOptionsContainer.hide();
                break;
            case FieldType.Multi:
            //fall-through
            case FieldType.Cycle:
            //fall-through
            case FieldType.Select:
                this.multiValuesContainer.show();
                this.numberOptionsContainer.hide();
                break;
            case FieldType.Number:
                this.multiValuesContainer.hide();
                this.numberOptionsContainer.show();
                break;
            default:
                break;
        }
    }

    cleanOptions(): Record<string, string> | string[] | undefined {
        switch (this.type) {
            case FieldType.Boolean:
            //fall-through
            case FieldType.Input:
                return undefined
            case FieldType.Select:
            //fall-through
            case FieldType.Multi:
            //fall-through:
            case FieldType.Cycle:
                try {
                    return this.multiValuesInput.getValue().split(",").map(item => item.trim())
                } catch (error) {
                    throw Error("Wrong format for this type of field: please use string values, comma separated")
                }
            case FieldType.Number:
                try {
                    const step = this.numberStepInput.getValue().trim();
                    const min = this.numberMinInput.getValue().trim();
                    const max = this.numberMaxInput.getValue().trim();
                    if (!step && !min && !max) {
                        return undefined
                    } else {
                        return {
                            "step": this.numberStepInput.getValue().trim(),
                            "min": this.numberMinInput.getValue().trim(),
                            "max": this.numberMaxInput.getValue().trim(),
                        }
                    }
                } catch (error) {
                    throw Error("Wrong format for this type of field: please use string values, comma separated")
                }
            default:
                break;
        }
    }

    onOpen() {
        //title
        this.titleEl.setText(this.attr ? `Manage ${this.attr.name}` : `Create a new attribute for ${this.fileClass.name}`);

        //name input
        this.buildNameInputContainer()

        //header for select
        const typeSelectHeader = this.contentEl.createDiv();
        const attrLine = typeSelectHeader.createEl("div");
        const attrName = attrLine.createEl("strong");
        attrName.setText(`<${this.name}>`);
        attrLine.append(" fields in files with:");
        String(`---\n${this.plugin.settings.fileClassAlias}: ${this.fileClass.name}\n...\n---`).split('\n').forEach(line => {
            typeSelectHeader.createEl("div", "yaml-metadata-menu-red").setText(line);
        })

        this.buildTypeSelectContainer()
        this.buildValuesArrayInputContainer()
        this.buildNumberOptionsContainer()
        this.displaySection()

        // event handlers
        this.nameInput.onChange(value => { this.name = value; attrName.setText(`<${value}>`) });
        this.typeSelect.onChange((type: keyof typeof FieldType) => {
            this.type = FieldTypeLabelMapping[type];
            this.displaySection()
        })
        // footer buttons
        const footer = this.contentEl.createDiv({ cls: "metadata-menu-value-grid-footer" });
        const saveButton = new ButtonComponent(footer);
        saveButton.setIcon("checkmark");
        saveButton.onClick(() => {
            try {
                this.fileClass.updateAttribute(this.type, this.name, this.cleanOptions(), this.attr);
                this.close();
            } catch (error) {
                this.errorMessageContainer.setText(error)
            }

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