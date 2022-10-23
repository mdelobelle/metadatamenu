import MetadataMenu from "main";
import { ButtonComponent, Component, Modal, setIcon, TFile } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager } from "src/fields/FieldManager";
import { FileClass } from "src/fileClass/fileClass";
import ChooseSectionModal from "src/modals/chooseSectionModal"
import * as FieldType from "src/types/fieldTypes"
import { FieldManager as FM } from "src/types/fieldTypes";

export class FieldOptions {
    constructor(public container: HTMLDivElement) {

    }

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
    private fileClass?: FileClass
    constructor(
        public plugin: MetadataMenu,
        private file: TFile
    ) {
        super(plugin.app);
        this.dvApi = plugin.app.plugins.plugins.dataview?.api;
        this.getFields();
        this.fileClass = this.plugin.fieldIndex.filesFileClass.get(this.file.path);
        this.containerEl.addClass("metadata-menu-note-fields-modal")
    }
    onOpen() {
        this.titleEl.setText(`Fields of ${this.file.basename}.${this.file.extension}`)
        this.buildFieldsList();
    };

    getFields(): void {
        this.fields = this.plugin.fieldIndex.filesFields.get(this.file.path) || [];
    }

    buildFieldContainer(parentContainer: HTMLDivElement, field: Field, value?: string | null | undefined): HTMLDivElement {
        const fieldManager = new FM[field.type](this.plugin, field)
        const fieldContainer = parentContainer.createDiv({ cls: "metadata-menu-note-field-container" })
        fieldContainer.createDiv({ text: `${field.name}`, cls: "metadata-menu-note-field-item field-name" });
        const fieldTypeContainer = fieldContainer.createDiv({ cls: `metadata-menu-note-field-item` });
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
                    (new ChooseSectionModal(this.plugin, this.file, this.fileClass, field.name)).open();
                } else {
                    FieldManager.createAndOpenModal(this.plugin, this.file, field.name, field, value || "")
                }
            })
        };
        return fieldContainer
    }

    buildFieldsList(): void {
        this.contentEl.replaceChildren();
        const fieldsContainer = this.contentEl.createDiv({ cls: "metadata-menu-note-fields-container" });
        this.fields.forEach(field => {
            const value = this.dvApi ? this.dvApi.page(this.file.path)[field.name] : undefined
            this.fieldContainers.push(this.buildFieldContainer(fieldsContainer, field, value))
        })
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
            this.allFieldsModal.buildFieldsList();
        }))
        this.allFieldsModal.open()
    }
}