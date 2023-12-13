import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, Modal, Notice, TextComponent, TextAreaComponent, ToggleComponent, setIcon } from "obsidian";
import Field, { FieldCommand } from "src/fields/Field";
import { FieldManager as F, SettingLocation } from "src/fields/FieldManager";
import { FieldManager, FieldType, FieldTypeLabelMapping, FieldTypeTooltip, MultiDisplayType, multiTypes, rootOnlyTypes, frontmatterOnlyTypes } from "src/types/fieldTypes";
import { FieldHTMLTagMap, FieldStyle, FieldStyleKey } from "src/types/dataviewTypes";
import { cleanActions } from "src/utils/modals";
import { addInsertFieldCommand } from "src/commands/paletteCommands";

export abstract class BaseSettingModal extends Modal {
    public iconName: TextComponent;
    public namePromptComponent: TextComponent;
    public field: Field;
    public initialField: Field;
    public fieldOptionsContainer: HTMLDivElement;
    public fieldManager: F;
    public command: FieldCommand;
    public addCommand: boolean;
    public frontmatterListDisplay?: MultiDisplayType;
    public frontmatterListDisplayContainer: HTMLDivElement;
    public frontmatterOnlyTypeInfoContainer: HTMLDivElement;
    public path: string;
    public parentSelectContainer: HTMLDivElement
    public typeSelectContainer: HTMLDivElement
    public location: SettingLocation

    constructor(
        public plugin: MetadataMenu,
    ) {
        super(plugin.app);
        this.initialField = new Field(plugin);
    }

    public abstract initFieldAndLocation(field?: Field): void
    public abstract setFileClassName(): void
    public abstract getFileClassName(): string | undefined
    public abstract onCancel(): void
    public abstract onSave(): void
    public abstract removeField(): void
    public abstract isNew(): boolean

    public initFieldManagerAndCommand() {
        this.path = this.field.path
        this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field);
        this.addCommand = this.field.command !== undefined;
        this.command = this.field.command || {
            id: this.field ? `insert__${this.field.id}` : "",
            icon: "list-plus",
            label: this.field ? `Insert ${this.field.name} field` : "",
            hotkey: undefined
        }
    }

    onOpen(): void {
        this.containerEl.addClass("metadata-menu")
        if (this.field.name == "") {
            this.titleEl.setText(`Add a field and define options`);
        } else {
            this.titleEl.setText(`Manage settings options for ${this.field.name}`);
        };

        /* Name and parent */
        this.createnameInputContainer();

        /* parent select */
        this.parentSelectContainer = this.contentEl.createDiv({ cls: "field-container" })
        this.buildParentSelectContainer();
        this.contentEl.createEl("hr");

        /* Commands and display */
        this.createCommandContainer();
        this.createFrontmatterListDisplayContainer();
        const styleContainer = this.contentEl.createDiv({ cls: "field-container" })

        /* Type */
        this.typeSelectContainer = this.contentEl.createDiv({ cls: "field-container" });
        this.contentEl.createEl("hr");

        /* Options */
        this.fieldOptionsContainer = this.contentEl.createDiv();

        /* footer buttons*/
        cleanActions(this.contentEl, ".footer-actions")
        const footer = this.contentEl.createDiv({ cls: "footer-actions" });
        footer.createDiv({ cls: "spacer" })
        this.createSaveButton(footer);
        if (this.field) this.createRemovalBtn(footer);
        this.createCancelButton(footer);

        /* init state */
        this.createStyleSelectorContainer(styleContainer)
        this.buildTypeSelectContainer()
        this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, this.location)
    }

    private createnameInputContainer(): void {
        const container = this.contentEl.createDiv({ cls: "field-container" })
        container.createDiv({ cls: "label", text: "Field Name: " });
        const input = new TextComponent(container);
        input.inputEl.addClass("with-label");
        input.inputEl.addClass("full-width");
        input.inputEl.focus();
        const name = this.field.name;
        input.setValue(name);
        input.setPlaceholder("Name of the field");
        input.onChange(value => {
            this.field.name = value;
            this.command.id = `insert__${this.field.fileClassName || "presetField"}__${value}`
            this.command.label = `Insert ${value} field`
            this.titleEl.setText(`Manage options for ${this.field.name}`);
            BaseSettingModal.removeValidationError(input);
        });
        this.namePromptComponent = input
    }

    private buildParentSelectContainer(): void {
        this.parentSelectContainer.replaceChildren()
        const compatibleParents = this.field.getCompatibleParents()
        const parentSelectorContainerLabel = this.parentSelectContainer.createDiv({ cls: "label" });
        parentSelectorContainerLabel.setText(`Parent:`);
        this.parentSelectContainer.createDiv({ cls: "spacer" })
        const parentSelect = new DropdownComponent(this.parentSelectContainer);
        parentSelect.addOption("none", "--None--")
        compatibleParents.forEach(parent => {
            const path = parent.path ? parent.path + "____" + parent.id : parent.id
            const display = path.split("____").map(id => Field.getFieldFromId(this.plugin, id, this.getFileClassName())?.name || "").join(" > ")
            parentSelect.addOption(path, display)
        })
        if (this.field.path) {
            parentSelect.setValue(this.field.path || "none")
        } else {
            parentSelect.setValue("none")
        }
        parentSelect.onChange((path: string) => {
            if (path === "none") {
                this.path = ""
                this.field.path = ""
            } else {
                this.path = path
                this.field.path = path
            }
            this.buildTypeSelectContainer()
        })
        if (!compatibleParents.length) this.parentSelectContainer.hide()
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

    private createStyleSelectorContainer(parentNode: HTMLDivElement): void {
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

    private setTypeInfo(): void {
        this.frontmatterOnlyTypeInfoContainer.replaceChildren()
        if (frontmatterOnlyTypes.includes(this.field.type)) {
            const info = new ButtonComponent(this.frontmatterOnlyTypeInfoContainer)
            info.setClass("tooltip-button")
            setIcon(info.buttonEl, "info")
            info.setTooltip(`${this.field.type} field type \nare only available\nin the frontmatter section`)
        }
    }

    private buildTypeSelectContainer(): void {
        this.typeSelectContainer.replaceChildren()
        const typeSelectorContainerLabel = this.typeSelectContainer.createDiv({ cls: "label" });
        typeSelectorContainerLabel.setText(`Field type:`);
        this.typeSelectContainer.createDiv({ cls: "spacer" })
        const infoBtnContainer = this.typeSelectContainer.createDiv({ cls: "tooltip-btn" })
        const info = new ButtonComponent(infoBtnContainer)
        info.setClass("tooltip-button")
        setIcon(info.buttonEl, !(this.field.id && !this.isNew()) ? "shield-alert" : "lock")
        info.setTooltip(`The field type \ncan't be modified once saved`)
        const typeSelect = new DropdownComponent(this.typeSelectContainer);
        this.frontmatterOnlyTypeInfoContainer = this.typeSelectContainer.createDiv({ cls: "tooltip-btn" });
        this.setTypeInfo()
        Object.keys(FieldTypeTooltip).forEach((key: keyof typeof FieldType) => {
            if (!rootOnlyTypes.includes(key as FieldType)) {
                typeSelect.addOption(key, FieldTypeTooltip[key])
            } else {
                if (this.field.isRoot()) typeSelect.addOption(key, FieldTypeTooltip[key])
            }

        })
        if (this.field.type) {
            typeSelect.setValue(this.field.type);
            if (multiTypes.includes(this.field.type)) {
                this.frontmatterListDisplayContainer.show()
            } else {
                this.frontmatterListDisplayContainer.hide()
            }
        }
        if (this.field.id && !this.isNew()) { typeSelect.setDisabled(true); return }
        //if (!this.new) { typeSelect.setDisabled(true); return }
        typeSelect.onChange((typeLabel: keyof typeof FieldType) => {
            this.field = new Field(this.plugin);
            this.setFileClassName()
            Field.copyProperty(this.field, this.initialField);
            this.field.name = this.namePromptComponent.getValue()
            this.field.type = FieldTypeLabelMapping[typeLabel];
            this.field.path = this.path
            if (this.field.type !== this.initialField.type &&
                ![this.field.type, this.initialField.type].every(fieldType =>
                    [FieldType.Multi, FieldType.Select, FieldType.Cycle].includes(fieldType)
                )
            ) {
                this.field.options = {}
            }
            this.buildParentSelectContainer()
            this.setTypeInfo()
            if (multiTypes.includes(this.field.type)) {
                this.frontmatterListDisplayContainer.show()
            } else {
                this.frontmatterListDisplayContainer.hide()
            }
            while (this.fieldOptionsContainer.firstChild) {
                this.fieldOptionsContainer.removeChild(this.fieldOptionsContainer.firstChild);
            }
            this.fieldManager = new FieldManager[this.field.type](this.plugin, this.field)
            this.fieldManager.createSettingContainer(this.fieldOptionsContainer, this.plugin, this.location)
        })
    }

    private validateFields(): boolean {
        return this.fieldManager.validateName(
            this.namePromptComponent,
            this.contentEl
        ) &&
            this.fieldManager.validateOptions();
    }

    private createSaveButton(container: HTMLDivElement): void {
        const saveButton = new ButtonComponent(container)
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
                addInsertFieldCommand(this.plugin, this.command, this.field, this.field.fileClassName)
            } else {
                delete this.field.command
            }
            if (this.frontmatterListDisplay !== undefined) {
                this.field.display = this.frontmatterListDisplay
            } else {
                delete this.field.display
            }
            this.onSave()
            this.close();
        })
    }

    private createRemovalBtn(container: HTMLDivElement): void {
        const removeButton = new ButtonComponent(container);
        removeButton.setIcon("trash");
        removeButton.onClick(() => {
            const confirmModal = new Modal(this.plugin.app);
            confirmModal.containerEl.addClass("metadata-menu");
            confirmModal.titleEl.setText("Please confirm");
            confirmModal.contentEl.createDiv().setText(`Do you really want to remove this field?`);
            const confirmFooter = confirmModal.contentEl.createDiv({ cls: "footer-actions" });
            confirmFooter.createDiv({ cls: "spacer" })
            const confirmButton = new ButtonComponent(confirmFooter);
            confirmButton.setWarning();
            confirmButton.setIcon("checkmark");
            confirmButton.onClick(async () => {
                if (this.field) await this.removeField();
                confirmModal.close();
                this.close();
            })
            const dismissButton = new ButtonComponent(confirmFooter);
            dismissButton.setIcon("cross");
            dismissButton.onClick(() => this.close());
            confirmModal.open();
        })
    }

    private createCancelButton(container: HTMLDivElement): void {
        const cancelButton = new ButtonComponent(container);
        cancelButton.setIcon("cross")
        cancelButton.setTooltip("Cancel")
        cancelButton.onClick(() => this.onCancel());
    }

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
}