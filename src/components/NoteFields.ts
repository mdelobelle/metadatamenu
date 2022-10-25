import MetadataMenu from "main";
import { ButtonComponent, Component, Modal, setIcon, TFile } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import ChooseSectionModal from "src/modals/chooseSectionModal"
import * as FieldType from "src/types/fieldTypes"
import { FieldManager as FM } from "src/types/fieldTypes";

export class FieldOptions {
    constructor(public container: HTMLDivElement) { }

    public addOption(icon: string, onclick: () => {} | void, tooltip?: string) {
        const fieldOptionContainer = this.container.createDiv({ cls: "metadata-menu-note-field-item" })
        const fieldOption = new ButtonComponent(fieldOptionContainer)
        fieldOption.setIcon(icon)
        fieldOption.onClick(() => onclick())
        if (tooltip) fieldOption.setTooltip(tooltip);
    }
}

export class FieldsModal extends Modal {

    private dvApi?: any
    public fields: Field[]
    public fieldContainers: HTMLDivElement[] = [];
    constructor(
        public plugin: MetadataMenu,
        private file: TFile
    ) {
        super(plugin.app);
        this.dvApi = plugin.app.plugins.plugins.dataview?.api;
        this.getFields();
        this.containerEl.addClass("metadata-menu-note-fields-modal")
    }

    //ok
    onOpen() {
        this.titleEl.setText(`Fields of ${this.file.basename}.${this.file.extension}`)
        this.buildFieldsContainer();
    };

    //ok
    getFields(): void {
        this.fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || [];
    }

    //
    buildFieldContainer(parentContainer: HTMLDivElement, field: Field, value?: string | null | undefined): HTMLDivElement {
        const fieldManager = new FM[field.type](this.plugin, field)
        const fieldContainer = parentContainer.createDiv({ cls: "metadata-menu-note-field-container" })
        const fieldNameContainer = fieldContainer.createDiv({ text: `${field.name}`, cls: "metadata-menu-note-field-item field-name" });
        const fileClass = field.fileClass
        if (fileClass) {
            fieldNameContainer.addClass(`fileClassField__${fileClass.name}`)
        }
        const fieldSettingContainer = fieldContainer.createDiv({ cls: "metadata-menu-note-field-item field-setting" });
        const fieldSettingBtn = new ButtonComponent(fieldSettingContainer);
        fieldSettingBtn.setIcon("gear")
        fieldSettingBtn.setTooltip("manage")
        fieldSettingBtn.onClick(() => {
            const fileClassAttribute = field.fileClass?.attributes.find(attr => attr.name === field.name)
            if (fileClassAttribute && field.fileClass) {
                const fileClassAttributeModal = new FileClassAttributeModal(this.plugin, field.fileClass, fileClassAttribute)
                fileClassAttributeModal.open();
            }
        })
        const fieldTypeContainer = fieldContainer.createDiv({ cls: `metadata-menu-note-field-item field-type-container` });
        fieldTypeContainer.createDiv({ text: field.type, cls: `field-type ${FieldType.FieldBackgroundColorClass[field.type]}` })
        const fieldValueContainer = fieldContainer.createDiv({
            cls: value !== undefined && value !== null ? "metadata-menu-note-field-item field-value" : "metadata-menu-note-field-item field-value emptyfield"
        })
        if (value === null) {
            fieldValueContainer.setText("<empty>");
        } else if (value === undefined) {
            fieldValueContainer.setText("<missing>");
        } else {
            fieldManager.displayValue(fieldValueContainer, this.file, field.name, () => { this.close() })
        }
        const fieldOptions = new FieldOptions(fieldContainer)
        if (value !== undefined) fieldManager.addFieldOption(field.name, value, this.file, fieldOptions);

        if (fieldManager.showModalOption || value === undefined || value === null) {
            const fieldBtnContainer = fieldContainer.createDiv({ cls: "metadata-menu-note-field-item" })
            const fieldBtn = new ButtonComponent(fieldBtnContainer)
            fieldBtn.setIcon(value !== undefined ? "edit" : "list-plus")
            fieldBtn.onClick(() => {
                if (value === undefined) {
                    (new ChooseSectionModal(this.plugin, this.file, field.name)).open();
                } else {
                    FieldManager.createAndOpenModal(this.plugin, this.file, field.name, field, value || "")
                }
            })
        };
        return fieldContainer
    }

    buildFileClassManager(container: HTMLDivElement): void {
        const fileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path) || [];
        fileClasses.forEach(fileClass => {
            const fileClassManagerContainer = container.createDiv({ cls: "metadata-menu-note-fields-inheritance-manager-container" })
            const ancestors = this.plugin.fieldIndex.fileClassesAncestors.get(fileClass.name) || [];
            ancestors.reverse().push(fileClass.name);
            ancestors.forEach((fileClassName, i) => {
                const _fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
                if (_fileClass) {
                    const fileClassOptionsContainer = fileClassManagerContainer.createDiv({ cls: "metadata-menu-note-fields-fileClass-manager-container" })
                    const fileClassNameContainer = fileClassOptionsContainer.createDiv({ cls: "metadata-menu-note-fields-fileClass-manager-name", text: _fileClass.name })
                    fileClassNameContainer.setAttr("id", `fileClass__${_fileClass.name}`)
                    const fileClassAddAttributeBtn = new ButtonComponent(fileClassOptionsContainer)
                    fileClassAddAttributeBtn.setIcon("plus-circle")
                    fileClassAddAttributeBtn.setTooltip(`Add field definition in ${_fileClass.name}`)
                    fileClassAddAttributeBtn.onClick(() => {
                        const fileClassAttributeModal = new FileClassAttributeModal(this.plugin, _fileClass)
                        fileClassAttributeModal.open()
                    })
                    if (i < ancestors.length - 1) {
                        fileClassManagerContainer.createDiv({ text: ">", cls: "metadata-menu-note-fields-fileClass-manager-separator" })
                    }

                    const fileClassFielsContainers = this.containerEl.querySelectorAll(`[class*="fileClassField__${fileClassName}"]`)
                    fileClassFielsContainers.forEach(fieldNameContainer => {
                        (fieldNameContainer as HTMLDivElement).onmouseover = () => {
                            fileClassNameContainer?.addClass("active")
                        }
                        (fieldNameContainer as HTMLDivElement).onmouseout = () => {
                            fileClassNameContainer?.removeClass("active")
                        }
                    })
                    fileClassNameContainer.onmouseover = () => {
                        this.containerEl
                            .querySelectorAll(`.metadata-menu-note-field-item.field-name.fileClassField__${fileClassName}`)
                            .forEach(cont => { cont.addClass("active") })
                    }
                    fileClassNameContainer.onmouseout = () => {
                        this.containerEl
                            .querySelectorAll(`.metadata-menu-note-field-item.field-name.fileClassField__${fileClassName}`)
                            .forEach(cont => { cont.removeClass("active") })
                    }
                }
            })
        })
    }

    buildFieldsContainer(): void {
        this.contentEl.replaceChildren();
        this.contentEl.createEl('hr')
        const fieldsContainer = this.contentEl.createDiv({ cls: "metadata-menu-note-fields-container" });
        this.fields.forEach(field => {
            const value = this.dvApi ? this.dvApi.page(this.file.path)[field.name] : undefined
            this.fieldContainers.push(this.buildFieldContainer(fieldsContainer, field, value))
        })
        this.contentEl.createEl('hr')
        const fileClassManagersContainer = this.contentEl.createDiv({ cls: "metadata-menu-note-fields-container" })
        this.buildFileClassManager(fileClassManagersContainer)
    }
}

export default class NoteFieldsComponent extends Component {

    private allFieldsModal: FieldsModal;

    constructor(
        public plugin: MetadataMenu,
        public cacheVersion: string,
        public onChange: () => void,
        public file: TFile
    ) {
        super();
        this.allFieldsModal = new FieldsModal(this.plugin, file)
        this.allFieldsModal.onClose = () => {
            this.plugin.removeChild(this)
            this.unload()
        }
    }

    onload(): void {
        this.plugin.registerEvent(this.plugin.app.metadataCache.on('dataview:metadata-change', () => {
            this.allFieldsModal.getFields();
            this.allFieldsModal.buildFieldsContainer();
        }))
        this.allFieldsModal.open()
    }
}