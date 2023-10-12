import { DropdownComponent, Modal, TextComponent, ButtonComponent, Notice, ToggleComponent, setIcon } from "obsidian";
import { FileClassAttribute } from "src/fileClass/fileClassAttribute";
import { FieldTypeTooltip, FieldType, FieldTypeLabelMapping, FieldManager, MultiDisplayType, multiTypes } from "src/types/fieldTypes";
import { FileClass } from "src/fileClass/fileClass";
import MetadataMenu from "main";
import Field, { FieldCommand } from "src/fields/Field";
import { FieldManager as F, SettingLocation } from "src/fields/FieldManager";
import FieldSettingsModal from "src/settings/FieldSettingsModal";
import { FieldHTMLTagMap, FieldStyle, FieldStyleKey } from "src/types/dataviewTypes";
import { cleanActions } from "src/utils/modals";

class FileClassAttributeModal extends Modal {

    private nameInput: TextComponent;
    private attrName: HTMLElement;
    private initialField: Field;
    private field: Field;
    private fieldManager: F;
    private fieldOptionsContainer: HTMLDivElement;
    private command: FieldCommand;
    private addCommand: boolean;
    private iconName: TextComponent;
    private frontmatterListDisplay?: MultiDisplayType;
    private frontmatterListDisplayContainer: HTMLDivElement;
    private path: string;
    private parentSelect: DropdownComponent;


    constructor(
        private plugin: MetadataMenu,
        private fileClass: FileClass,
        private attr?: FileClassAttribute
    ) {
        super(plugin.app);
        this.initialField = new Field(plugin);
        if (this.attr) {
            this.field = attr!.getField()
            Field.copyProperty(this.initialField, this.field)
        } else {
            this.field = new Field(plugin);
            this.field.fileClassName = this.fileClass.name
        }
        this.path = this.field.path
        this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field);

        this.addCommand = this.field.command !== undefined;
        this.command = this.field.command || {
            id: this.field ? `insert__${this.field.fileClassName || "presetField"}__${this.field.name}` : "",
            icon: "list-plus",
            label: this.field ? `Insert ${this.field.name} field` : "",
            hotkey: undefined
        }
    }

    onOpen() {
        this.containerEl.addClass("metadata-menu")
        //title
        this.titleEl.setText(this.attr ? `Manage ${this.attr.name}` : `Create a new attribute for ${this.fileClass.name}`);

        /* Name */
        this.buildNameInputContainer();
        this.createParentSelectContainer();
        this.buildHeader();
        this.contentEl.createEl("hr");

        /* Command */
        this.buildCommandContainer();

        /* frontmatter list display*/
        this.createFrontmatterListDisplayContainer();

        /* Style for inline fields */
        const styleContainer = this.contentEl.createDiv({ cls: "field-container" })

        /* Type */
        const typeSelectContainer = this.contentEl.createDiv({ cls: "field-container" });
        this.contentEl.createEl("hr");

        /* Options */
        this.fieldOptionsContainer = this.contentEl.createDiv();

        // footer buttons
        cleanActions(this.contentEl, ".footer-actions")
        const footer = this.contentEl.createDiv({ cls: "footer-actions" });
        footer.createDiv({ cls: "spacer" })
        this.createSaveBtn(footer);
        if (this.attr) this.createRemovelBtn(footer);
        this.createCancelBtn(footer);

        /* init state */
        this.buildStyleSelectorContainer(styleContainer)
        this.buildTypeSelectContainer(typeSelectContainer);
        this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, SettingLocation.FileClassAttributeSettings);

    }

    buildNameInputContainer(): void {
        const container = this.contentEl.createDiv({ cls: "field-container" })
        container.createDiv({ cls: "label", text: "Field Name: " });
        const input = new TextComponent(container);
        input.inputEl.addClass("with-label");
        input.inputEl.addClass("full-width");
        this.attr ? input.setValue(this.field.name) : input.setPlaceholder("Name of the field");
        input.inputEl.focus();
        input.onChange(value => {
            this.field.name = value;
            this.command.id = `insert__${this.field.fileClassName || "presetField"}__${value}`
            this.command.label = `Insert ${value} field`
            this.attrName.setText(`<${value}>`);
            FieldSettingsModal.removeValidationError(input);
        });
        this.nameInput = input
    }

    private createParentSelectContainer(): void {
        const compatibleParents = this.field.getCompatibleParents()
        const container = this.contentEl.createDiv({ cls: "field-container" })
        const parentSelectorContainerLabel = container.createDiv({ cls: "label" });
        parentSelectorContainerLabel.setText(`Parent:`);
        container.createDiv({ cls: "spacer" })
        this.parentSelect = new DropdownComponent(container);
        this.parentSelect.addOption("none", "--None--")
        compatibleParents.forEach(parent => {
            const path = parent.path ? parent.path + "____" + parent.id : parent.id
            const display = path.split("____").map(id => Field.getFieldFromId(this.plugin, id, this.fileClass.name)?.name || "").join(" > ")
            this.parentSelect.addOption(path, display)
        })
        if (this.field.path) {
            this.parentSelect.setValue(this.field.path || "none")
        } else {
            this.parentSelect.setValue("none")
        }
        if (this.field.type === FieldType.Lookup || this.field.type === FieldType.Formula) {
            this.parentSelect.setDisabled(true)
            this.path = ""
        }
        this.parentSelect.onChange((path: string) => {
            if (path === "none") {
                this.path = ""
                this.field.path = ""
            } else {
                this.path = path
                this.field.path = path
            }
        })
    }

    private createFrontmatterListDisplayContainer(): void {
        this.frontmatterListDisplayContainer = this.contentEl.createDiv({ cls: "field-container" })
        //label
        this.frontmatterListDisplayContainer.createDiv({ text: "Frontmatter list display type", cls: "label" });
        this.frontmatterListDisplayContainer.createDiv({ cls: "spacer" });
        //add toggler
        const frontmatterListDisplay = new DropdownComponent(this.frontmatterListDisplayContainer);
        const options: Record<string, string> = {}
        options["asArray"] = "display as array"
        options["asList"] = "display as indented list"
        options["undefined"] = `Plugin Default (${this.plugin.settings.frontmatterListDisplay})`
        frontmatterListDisplay.addOptions(options);
        switch (this.field.display) {
            case MultiDisplayType.asArray: frontmatterListDisplay.setValue("asArray"); break
            case MultiDisplayType.asList: frontmatterListDisplay.setValue("asList"); break
            case undefined: frontmatterListDisplay.setValue("undefined"); break
        }

        frontmatterListDisplay.onChange(value => {
            switch (value) {
                case "asArray": this.frontmatterListDisplay = MultiDisplayType.asArray; break;
                case "asList": this.frontmatterListDisplay = MultiDisplayType.asList; break;
                case "undefined": this.frontmatterListDisplay = undefined; break;
                default: this.frontmatterListDisplay = undefined;
            }
        });
        if (!multiTypes.includes(this.field.type)) this.frontmatterListDisplayContainer.hide()
    }

    buildCommandContainer(): void {
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
        iconContainer.createDiv({ text: "Icon name", cls: "label" });
        this.iconName = new TextComponent(iconContainer);
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

    buildHeader(): void {
        //header for select
        const container = this.contentEl.createDiv({ cls: "field-container" })
        const typeSelectHeader = container.createDiv();
        const attrLine = typeSelectHeader.createEl("div");
        this.attrName = attrLine.createEl("strong");
        this.attrName.setText(`<${this.field.name}>`);
        attrLine.append(` available in files with ${this.plugin.settings.fileClassAlias} = ${this.fileClass.name}`);

    }

    private setLabelStyle(label: HTMLDivElement): void {
        const fieldStyle = this.field.style || {}
        Object.keys(FieldStyle).forEach((style: keyof typeof FieldStyle) => {
            const styleKey = FieldStyleKey[style]
            if (!!fieldStyle[styleKey]) {
                label.addClass(styleKey)
            } else {
                label.removeClass(styleKey)
            }
        })
    }

    buildStyleSelectorContainer(parentNode: HTMLDivElement): void {
        const styleSelectorLabel = parentNode.createDiv({ cls: "label" });
        styleSelectorLabel.setText(`Inline field style`);
        this.setLabelStyle(styleSelectorLabel);
        parentNode.createDiv({ text: "::" })
        parentNode.createDiv({ cls: "spacer" })
        const styleButtonsContainer = parentNode.createDiv({ cls: "style-buttons-container" })
        Object.keys(FieldStyle).forEach((style: keyof typeof FieldStyle) => {
            const styleBtnContainer = styleButtonsContainer.createEl(FieldHTMLTagMap[style], { cls: "style-button-container" })
            styleBtnContainer.createDiv({ cls: "style-btn-label", text: FieldStyleKey[style] })
            const styleBtnToggler = new ToggleComponent(styleBtnContainer)
            const fieldStyle = this.field.style || {}
            styleBtnToggler.setValue(fieldStyle[FieldStyleKey[style]])
            styleBtnToggler.onChange(v => {
                fieldStyle[FieldStyleKey[style]] = v
                this.field.style = fieldStyle
                this.setLabelStyle(styleSelectorLabel);
            })
        })
    }

    buildTypeSelectContainer(container: HTMLDivElement): void {

        //dropdown
        const typeSelectorContainerLabel = container.createDiv({ cls: "label" });
        typeSelectorContainerLabel.setText(`Field type:`);
        container.createDiv({ cls: "spacer" })
        const typeSelect = new DropdownComponent(container);
        Object.keys(FieldTypeTooltip).forEach((key: keyof typeof FieldType) => typeSelect.addOption(key, FieldTypeTooltip[key]))
        if (this.field.type) {
            typeSelect.setValue(this.field.type);
            if (multiTypes.includes(this.field.type)) {
                this.frontmatterListDisplayContainer.show()
            } else {
                this.frontmatterListDisplayContainer.hide()
            }
        }
        typeSelect.onChange((typeLabel: keyof typeof FieldType) => {
            this.field = new Field(this.plugin);
            Field.copyProperty(this.field, this.initialField);
            this.field.name = this.nameInput.getValue()
            this.field.type = FieldTypeLabelMapping[typeLabel];
            this.field.path = this.path
            if (this.field.type !== this.initialField.type &&
                ![this.field.type, this.initialField.type].every(fieldType =>
                    [FieldType.Multi, FieldType.Select, FieldType.Cycle].includes(fieldType)
                )
            ) {
                this.field.options = {}
            }
            if (this.field.type === FieldType.Lookup || this.field.type === FieldType.Formula) {
                this.parentSelect.setDisabled(true)
                this.parentSelect.setValue("none")
                this.path = ""
                this.field.path = ""
            } else {
                this.parentSelect.setDisabled(false)
            }
            if (multiTypes.includes(this.field.type)) {
                this.frontmatterListDisplayContainer.show()
            } else {
                this.frontmatterListDisplayContainer.hide()
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
            this.contentEl
        ) &&
            this.fieldManager.validateOptions();
    }

    private createSaveBtn(container: HTMLDivElement): void {
        const saveButton = new ButtonComponent(container);
        saveButton.setTooltip("Save");
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
            if (this.frontmatterListDisplay) {
                this.field.display = this.frontmatterListDisplay
            } else {
                delete this.field.display
            }
            await this.fileClass.updateAttribute(
                this.field.type,
                this.field.name,
                this.field.options,
                this.attr,
                this.field.command,
                this.field.display,
                this.field.style,
                this.field.path
            );
            this.close();
        })
    }

    private createRemovelBtn(container: HTMLDivElement): void {
        const removeButton = new ButtonComponent(container);
        removeButton.setIcon("trash");
        removeButton.onClick(() => {
            const confirmModal = new Modal(this.plugin.app);
            confirmModal.containerEl.addClass("metadata-menu");
            confirmModal.titleEl.setText("Please confirm");
            confirmModal.contentEl.createDiv().setText(`Do you really want to remove ${this.attr?.name} attribute from ${this.fileClass.name}?`);
            const confirmFooter = confirmModal.contentEl.createDiv({ cls: "footer-actions" });
            confirmFooter.createDiv({ cls: "spacer" })
            const confirmButton = new ButtonComponent(confirmFooter);
            confirmButton.setWarning();
            confirmButton.setIcon("checkmark");
            confirmButton.onClick(() => {
                if (this.attr) this.fileClass.removeAttribute(this.attr);
                confirmModal.close();
                this.close();
            })
            const dismissButton = new ButtonComponent(confirmFooter);
            dismissButton.setIcon("cross");
            dismissButton.onClick(() => this.close());
            confirmModal.open();
        })
    }

    private createCancelBtn(container: HTMLDivElement): void {
        const cancelButton = new ButtonComponent(container);
        cancelButton.setIcon("cross");
        cancelButton.onClick(() => this.close());
    }
}

export { FileClassAttributeModal }