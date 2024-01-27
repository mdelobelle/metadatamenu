import MetadataMenu from "main";
import { ButtonComponent, DropdownComponent, Modal, Notice, TextComponent, TextAreaComponent, ToggleComponent, setIcon, SuggestModal } from "obsidian";
import { FieldManager as F, SettingLocation } from "src/fields/FieldManager";
import { FieldManager, FieldType, FieldTypeLabelMapping, FieldTypeTooltip, MultiDisplayType, FieldIcon, FieldTypeTagClass } from "src/types/fieldTypes";
import { FieldHTMLTagMap, FieldStyle, FieldStyleKey } from "src/types/dataviewTypes";
import { cleanActions } from "src/utils/modals";
import { insertFieldCommand } from "src/commands/paletteCommands";
import { Field, FieldCommand, IField, buildEmptyField, copyProperty } from "src/fields/Field";
import { BaseOptions } from "src/fields/base/BaseField";
import { frontmatterOnlyTypes, multiTypes, rootOnlyTypes } from "src/fields/Fields";

class TypeSelector extends SuggestModal<keyof typeof FieldType> {
    constructor(
        private fieldSetting: BaseSettingModal,
        private labelContainer: HTMLDivElement
    ) {
        super(fieldSetting.plugin.app)
        this.containerEl.addClass("metadata-menu")
    }

    getSuggestions(query: string): Array<keyof typeof FieldType> {
        const fieldTypes: Array<keyof typeof FieldType> = []
        Object.keys(FieldTypeTooltip).forEach((key: keyof typeof FieldType) => {
            if (!rootOnlyTypes.includes(key as FieldType)) {
                fieldTypes.push(key)
            } else {
                if (this.fieldSetting.field.isRoot()) fieldTypes.push(key)
            }
        })
        return fieldTypes.filter(k => k.toLowerCase().includes(query.toLowerCase()))
    }

    renderSuggestion(value: keyof typeof FieldType, el: HTMLElement) {
        el.addClass("value-container");
        const iconContainer = el.createDiv({ cls: "icon-container" })
        setIcon(iconContainer, FieldIcon[value])
        const chipContainer = el.createDiv({ cls: "field-type-container" })
        chipContainer.createDiv({ text: value, cls: `chip ${FieldTypeTagClass[value]}` })
        chipContainer.createDiv({ cls: "spacer" })
        el.createDiv({ cls: "field-type-tooltip", text: FieldTypeTooltip[value] })
    }

    onChooseSuggestion(item: keyof typeof FieldType, evt: MouseEvent | KeyboardEvent) {
        this.fieldSetting.setType(item, this.labelContainer)
    }
}

export class ParentSelector extends SuggestModal<Field> {
    constructor(
        private fieldSetting: BaseSettingModal,
        private compatibleParents: Field[],
    ) {
        super(fieldSetting.plugin.app)
    }

    getSuggestions(query: string): Field[] | Promise<Field[]> {
        const parents = this.compatibleParents.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        return parents
    }

    renderSuggestion(parent: Field, el: HTMLElement) {
        const path = ParentSelector.getParentPath(parent)
        const display = ParentSelector.getHierarchyDisplay(
            this.fieldSetting.plugin,
            path,
            this.fieldSetting.getFileClassName()
        )
        el.setText(display)
    }

    onChooseSuggestion(parent: Field, evt: MouseEvent | KeyboardEvent) {
        this.fieldSetting.setParent(parent)
        //TODO call setting.setParent(item) given that item is the path
    }

    static getHierarchyDisplay(plugin: MetadataMenu, path: string, fileClassName: string | undefined): string {
        const display = path
            .split("____")
            .map(id =>
                getFieldFromId(
                    plugin,
                    id,
                    fileClassName
                )?.name || "")
            .join(" > ")
        return display
    }

    static getParentPath<O extends BaseOptions>(item: Field | IField<O>): string {
        const path = item.path ? item.path + "____" + item.id : item.id
        return path
    }

}

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
        this.initialField = new (buildEmptyField(plugin, undefined));
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

    public setParent(parent: Field | undefined) {
        if (parent === undefined) {
            this.path = ""
            this.field.path = ""
        } else {
            const path = ParentSelector.getParentPath(parent)
            this.path = path
            this.field.path = path
        }
        this.buildParentSelectContainer(parent)
        this.buildTypeSelectContainer()
    }

    private buildParentSelectContainer(_parent?: Field): void {
        const parent = _parent || this.field.getFirstAncestor()
        this.parentSelectContainer.replaceChildren()
        const compatibleParents = this.field.getCompatibleParents()
        const parentName = parent
            ? ParentSelector.getHierarchyDisplay(
                this.plugin,
                ParentSelector.getParentPath(parent),
                this.getFileClassName())
            : "-- No parent field selected --"
        this.parentSelectContainer
            .createDiv({ cls: "label" })
            .setText(`Parent:`);
        this.parentSelectContainer
            .createDiv({ cls: "spacer" })
        this.parentSelectContainer
            .createDiv({ cls: parent ? "parent-label" : "parent-label empty" })
            .setText(parentName)

        new ButtonComponent(this.parentSelectContainer)
            .setButtonText(`${!this.field.path ? "Select a parent field" : "Change parent field"}`)
            .onClick(() => {
                new ParentSelector(this, compatibleParents).open()
            })
        new ButtonComponent(this.parentSelectContainer)
            .setIcon("trash")
            .onClick(() => this.setParent(undefined))

        if (!compatibleParents.length) this.parentSelectContainer.hide()
        else this.parentSelectContainer.show()
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

    public setType(fieldType: keyof typeof FieldType, fieldTypeLabelContainer: HTMLDivElement): void {
        fieldTypeLabelContainer.setText(fieldType)
        fieldTypeLabelContainer.className = `chip ${FieldTypeTagClass[fieldType]}`

        this.field = new (buildEmptyField(this.plugin, undefined));
        this.setFileClassName()
        copyProperty(this.field, this.initialField);
        this.field.name = this.namePromptComponent.getValue()
        this.field.type = FieldTypeLabelMapping[fieldType];
        this.field.path = this.path
        if (this.field.type !== this.initialField.type &&
            ![this.field.type, this.initialField.type].every(fieldType =>
                ["Multi", "Select", "Cycle"].includes(fieldType)
            )
        ) {
            this.field.options = {}
        }
        this.buildParentSelectContainer()
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
        const typeNameContainer = this.typeSelectContainer
            .createDiv({ cls: "field-type-label" })
            .createDiv({ cls: `chip ${FieldTypeTagClass[this.field.type]}` })
        if (!this.field.id || this.isNew()) {
            new ButtonComponent(this.typeSelectContainer)
                .setButtonText("Choose a type")
                .onClick(() => {
                    new TypeSelector(this, typeNameContainer).open()
                })
        }
        this.frontmatterOnlyTypeInfoContainer = this.typeSelectContainer.createDiv({ cls: "tooltip-btn" });
        this.setTypeInfo()
        if (this.field.type) {
            typeNameContainer.setText(this.field.type);
            if (multiTypes.includes(this.field.type)) {
                this.frontmatterListDisplayContainer.show()
            } else {
                this.frontmatterListDisplayContainer.hide()
            }
        }
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
                insertFieldCommand(this.plugin, this.command, this.field, this.field.fileClassName)
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

function getFieldFromId(plugin: MetadataMenu, id: string, fileClassName: string | undefined) {
    let field: Field | undefined = undefined;
    if (fileClassName) {
        const index = plugin.fieldIndex
        field = index.fileClassesFields
            .get(fileClassName)?.find(field => field.id === id)

    } else {
        const _field = plugin.presetFields
            .find(field => field.id === id)
        if (_field) {
            field = new (buildEmptyField(plugin, fileClassName, _field.type))
            Object.assign(field, _field);
        }
    }
    return field
}
