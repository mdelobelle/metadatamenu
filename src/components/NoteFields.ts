import MetadataMenu from "main";
import { ButtonComponent, Component, Modal, TFile } from "obsidian";
import Field from "src/fields/Field";
import { FileClassAttributeModal } from "src/fileClass/FileClassAttributeModal";
import ChooseSectionModal from "src/modals/chooseSectionModal"
import * as FieldType from "src/types/fieldTypes"
import { FieldManager as FM } from "src/types/fieldTypes";
import { FieldManager as F, FieldManager } from "src/fields/FieldManager";
import { insertMissingFields } from "src/commands/insertMissingFields";
import { FileClass } from "src/fileClass/fileClass";
import { FileClassManager } from "./fileClassManager";
import { ExistingField, Note } from "src/note/note";
import ObjectListField from "src/fields/fieldManagers/ObjectListField";

export class FieldOptions {

    constructor(public container: HTMLDivElement) { }

    public addOption(icon: string, onclick: () => {} | void, tooltip?: string, className?: string) {
        const fieldOptionContainer = this.container.createDiv({ cls: "field-item field-option" })
        const fieldOption = new ButtonComponent(fieldOptionContainer)
        fieldOption.setIcon(icon)
        if (className) fieldOption.buttonEl.addClass(className);
        fieldOption.onClick(() => onclick())
        if (tooltip) fieldOption.setTooltip(tooltip);
    }
}

export class FieldsModal extends Modal {

    private fieldContainers: HTMLDivElement[] = [];
    private navigationContainer: HTMLDivElement;
    private existingFields: ExistingField[] = []
    private missingFields: Field[] = [];
    private note: Note;

    constructor(
        public plugin: MetadataMenu,
        private file: TFile,
        public noteFields: NoteFieldsComponent,
        public indexedPath: string | undefined
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("note-fields-modal")
    }

    async onOpen() {
        await this.buildNote();
        this.build();

    };

    public async buildNote(): Promise<void> {
        this.note = new Note(this.plugin, this.file)
        await this.note.build()
        //console.log(this.note)
    }

    public removeObject(indexedPath: string) {
        this.note.removeObject(indexedPath)
    }

    public build(): void {
        this.contentEl.replaceChildren();
        const indexedPath = this.indexedPath || ""
        const { id, index } = Field.getIdAndIndex(indexedPath?.split("____").last())

        if (!id) {
            this.titleEl.setText(`Fields of ${this.file.basename}`)
        } else {
            const baseTitle = `Fields of ${this.file.basename} ${indexedPath?.split("____").length > 1 ? " > ... > " : " > "}`
            if (index) {
                const field = this.note.getExistingFieldForIndexedPath(indexedPath.replace(/\[\w+\]$/, ''))
                this.titleEl.setText(`${baseTitle} ${field?.name} [${index}]`)
            } else {
                const field = this.note.getExistingFieldForIndexedPath(indexedPath)
                this.titleEl.setText(`${baseTitle} ${field?.name}`)
            }

        }
        this.existingFields = this.note.existingFields.filter(_f => {
            if (!this.indexedPath) {
                //this is for root fields
                return _f.isRoot()
            }
            else {
                // for lowerFields they have and indexedPath composed of the upper indexPath + their id
                // so if we split and get the berfore last item, it should be comparable to the indexedId of this field's screen (i.e. this.path)
                const upperIndexedIdsInPath = _f.indexedPath?.split("____")
                upperIndexedIdsInPath?.pop()
                return upperIndexedIdsInPath?.join("____") === this.indexedPath
            }
        })
        this.missingFields = this.note?.fields
            .filter(_f => _f.getFirstAncestor()?.id === id)
            .filter(_f => !this.existingFields.map(eF => eF.field.id).includes(_f.id)) || []
        if (this.indexedPath) {
            this.buildNavigation()
            this.contentEl.createEl('hr', { cls: "navigation-separator" })
        } else {
            this.contentEl.createEl('hr')
        }
        this.buildFieldsContainer();
        this.contentEl.createEl('hr')
        const fileClassManagersContainer = this.contentEl.createDiv({ cls: "fields-container" });
        this.buildFileClassManager(fileClassManagersContainer)
    }

    private buildNavigation(): void {
        const fileName = this.file.name.replace(/(.*).md$/, "$1")
        const upperPath = Field.upperIndexedPathObjectPath(this.indexedPath || "")
        const { id: upperId, index: upperIndex } = Field.getIdAndIndex(upperPath.split("____").last())
        const upperObject = this.note.existingFields.find(eF => eF.field.id === upperId)?.field
        const upperObjectName = upperObject ? upperObject.name : fileName

        const backBtnWrapper = this.contentEl.createDiv({ cls: "back-button-wrapper" })
        const backBtn = new ButtonComponent(backBtnWrapper)
        backBtn.setIcon("chevron-left")
        backBtn.setTooltip(`Go to ${upperObjectName} fields`)
        backBtnWrapper.createSpan({ text: `${upperObjectName}${upperIndex ? " [" + upperIndex + "]" : ""}` })
        backBtnWrapper.onclick = async () => { await this.noteFields.moveToObject(upperPath) }
    }
    //
    private buildFieldContainer(container: HTMLDivElement, field: Field, value?: string | null | undefined, indexedPath?: string): void {
        const fieldManager = new FM[field.type](this.plugin, field)
        const fieldNameWrapper = container.createDiv({ cls: "field-name-wrapper" })
        const fieldNameContainer = fieldNameWrapper.createDiv({ text: `${field.name}`, cls: "field-item field-name" });
        const fieldSettingsWrapper = container.createDiv({ cls: "field-settings-wrapper" });
        fieldSettingsWrapper.createDiv({ cls: "field-settings-spacer" })
        const fileClass = field.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(field.fileClassName) : undefined
        if (fileClass) {
            fieldNameContainer.addClass(`fileClassField__${fileClass.name.replace("/", "___").replaceAll(" ", "_")}`)
        }
        const fieldSettingContainer = fieldSettingsWrapper.createDiv({ cls: "field-item field-setting" });
        const fieldSettingBtn = new ButtonComponent(fieldSettingContainer);
        fieldSettingBtn.setIcon("gear")
        fieldSettingBtn.setTooltip(`${field.fileClassName ? field.fileClassName + " > " : "Preset Field > "} ${field.name} settings`)
        fieldSettingBtn.onClick(() => {
            const _fileClass = field.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(field.fileClassName) : undefined
            const fileClassAttribute = _fileClass?.attributes.find(attr => attr.id === field.id)
            if (fileClassAttribute && _fileClass) {
                const fileClassAttributeModal = new FileClassAttributeModal(this.plugin, _fileClass, fileClassAttribute)
                fileClassAttributeModal.open();
            }
        })
        const fieldTypeContainer = fieldSettingsWrapper.createDiv({ cls: `field-item` });
        fieldTypeContainer.createDiv({ text: field.type, cls: `chip field-type ${FieldType.FieldBackgroundColorClass[field.type]}` })
        const fieldValueWrapper = container.createDiv({ cls: "field-value-wrapper" })
        const fieldValueContainer = fieldValueWrapper.createDiv({
            cls: value !== undefined && value !== null ? "field-item field-value" : "field-item field-value emptyfield"
        })
        if (value === null) {
            fieldValueContainer.setText(field.type === FieldType.FieldType.Lookup ? "---auto---" : "<empty>");
        } else if (value === undefined) {
            fieldValueContainer.setText("<missing>");
        } else {
            fieldManager.displayValue(fieldValueContainer, this.file, value, () => { this.close() })
        }
        const fieldOptionsWrapper = container.createDiv({ cls: "field-options-wrapper" });
        fieldOptionsWrapper.createDiv({ cls: "field-options-spacer" });
        const fieldOptions = new FieldOptions(fieldOptionsWrapper)
        if (this.existingFields.map(_f => _f.field.id).includes(field.id)) {
            if (FieldType.objectTypes.includes(field.type)) {
                fieldManager.addFieldOption(this.file, fieldOptions, indexedPath, this.noteFields, indexedPath);
            } else {
                fieldManager.addFieldOption(this.file, fieldOptions, indexedPath);
            }

        } else {
            //missing field, let's build and indexed path and a button to insert it
            const newIndexedPath = `${this.indexedPath}____${field.id}`
            const fieldBtnContainer = fieldOptionsWrapper.createDiv({ cls: "field-item field-option" })
            const fieldBtn = new ButtonComponent(fieldBtnContainer)
            fieldBtn.setIcon("list-plus")
            fieldBtn.setTooltip("Add field at section")
            fieldBtn.onClick(() => {
                //in case of objectField grand-child, don't ask for chooseSection
                //TODO could be simplified? with path !== ""
                const isObjectGrandChild = FieldType.objectTypes.includes(field.getAncestors(field.id)[0]?.type)
                if (!isObjectGrandChild) {
                    new ChooseSectionModal(
                        this.plugin,
                        this.file,
                        (lineNumber: number, after: boolean, asList: boolean, asComment: boolean
                        ) => FieldManager.createAndOpenModal(
                            this.plugin, this.file, field.name, field, this.note, newIndexedPath, lineNumber, after, asList, asComment)
                    ).open();
                } else {
                    FieldManager.createAndOpenModal(this.plugin, this.file, field.name, field, this.note, newIndexedPath, -1, false, false, false)
                }
            })
        };
    }


    private buildObjectListItemContainer(container: HTMLDivElement, field: Field, item: any, itemIndexedPath: string) {
        const fieldManager = new FM[field.type](this.plugin, field)
        const { id, index } = Field.getIdAndIndex(itemIndexedPath.split("____").last())
        const value = Object.keys(item || {}).map(key => {
            if (Array.isArray(item[key])) {
                return `${item[key].length} ${key}`
            } else if (typeof item[key] === 'object') {
                return `${key}: {...}`
            } else {
                return `${key}: ${item[key]}`
            }
        }).join(" | ")
        const fieldNameWrapper = container.createDiv({ cls: "field-name-wrapper" })
        const fieldNameContainer = fieldNameWrapper.createDiv({ text: `${field.name} [${index}]`, cls: "field-item field-name" });
        const fieldSettingsWrapper = container.createDiv({ cls: "field-settings-wrapper" });
        fieldSettingsWrapper.createDiv({ cls: "field-settings-spacer" })
        const fileClass = field.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(field.fileClassName) : undefined
        if (fileClass) {
            fieldNameContainer.addClass(`fileClassField__${fileClass.name.replace("/", "___").replaceAll(" ", "_")}`)
        }
        const fieldSettingContainer = fieldSettingsWrapper.createDiv({ cls: "field-item field-setting" });
        const fieldSettingBtn = new ButtonComponent(fieldSettingContainer);
        fieldSettingBtn.setIcon("gear")
        fieldSettingBtn.setTooltip(`${field.fileClassName ? field.fileClassName + " > " : "Preset Field > "} ${field.name} settings`)
        fieldSettingBtn.onClick(() => {
            const _fileClass = field.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(field.fileClassName) : undefined
            const fileClassAttribute = _fileClass?.attributes.find(attr => attr.id === field.id)
            if (fileClassAttribute && _fileClass) {
                const fileClassAttributeModal = new FileClassAttributeModal(this.plugin, _fileClass, fileClassAttribute)
                fileClassAttributeModal.open();
            }
        })
        const fieldTypeContainer = fieldSettingsWrapper.createDiv({ cls: `field-item` });
        fieldTypeContainer.createDiv({ text: `${field.type} item`, cls: `chip field-type ${FieldType.FieldBackgroundColorClass[field.type]}` })
        const fieldValueWrapper = container.createDiv({ cls: "field-value-wrapper" })
        const fieldValueContainer = fieldValueWrapper.createDiv({
            cls: value !== undefined && value !== null ? "field-item field-value" : "field-item field-value emptyfield"
        })
        fieldValueContainer.setText(value);
        const fieldOptionsWrapper = container.createDiv({ cls: "field-options-wrapper" });
        fieldOptionsWrapper.createDiv({ cls: "field-options-spacer" });
        const fieldOptions = new FieldOptions(fieldOptionsWrapper)
        fieldManager.addFieldOption(this.file, fieldOptions, itemIndexedPath, this.noteFields);
    }

    private openInsertMissingFieldsForFileClassModal(fileClass: FileClass): void {
        const modal = new ChooseSectionModal(
            this.plugin,
            this.file,
            (lineNumber: number, after: boolean, asList: boolean, asComment: boolean) => insertMissingFields(
                this.plugin, this.file.path, lineNumber, after, asList, asComment, fileClass.name
            )
        );
        modal.open()
    }


    private buildFileClassManager(container: HTMLDivElement): void {
        const fileClasses = this.plugin.fieldIndex.filesFileClasses.get(this.file.path) || [];
        fileClasses.forEach(fileClass => {
            const fileClassManagerContainer = container.createDiv({ cls: "fields-inheritance-manager-container" })
            const _ancestors = this.plugin.fieldIndex.fileClassesAncestors.get(fileClass.name) || [];
            const ancestors = [..._ancestors].reverse();
            ancestors.push(fileClass.name);
            ancestors.forEach(async (fileClassName, i) => {
                const _fileClass = this.plugin.fieldIndex.fileClassesName.get(fileClassName)
                if (_fileClass) {
                    const fileClassOptionsContainer = fileClassManagerContainer.createDiv({ cls: "fileclass-manager-container" })
                    const fileClassNameContainer = fileClassOptionsContainer.createDiv({ cls: "name", text: _fileClass.name })
                    fileClassNameContainer.setAttr("id", `fileClass__${_fileClass.name.replace("/", "___").replace(" ", "_")}`)

                    if (await _fileClass.missingFieldsForFileClass(this.file)) {
                        const fileClassInsertMissingFieldsBtn = new ButtonComponent(fileClassOptionsContainer)
                        fileClassInsertMissingFieldsBtn.setIcon("battery-full")
                        fileClassInsertMissingFieldsBtn.setTooltip(`Insert missing fields for ${_fileClass.name}`)
                        fileClassInsertMissingFieldsBtn.onClick(() => {
                            this.openInsertMissingFieldsForFileClassModal(_fileClass)
                        })
                    }

                    const fileClassAddAttributeBtn = new ButtonComponent(fileClassOptionsContainer)
                    fileClassAddAttributeBtn.setIcon("plus-circle")
                    fileClassAddAttributeBtn.setTooltip(`Add field definition in ${_fileClass.name}`)
                    fileClassAddAttributeBtn.onClick(() => {
                        const fileClassAttributeModal = new FileClassAttributeModal(this.plugin, _fileClass)
                        fileClassAttributeModal.open()
                    })
                    if (i < ancestors.length - 1) {
                        fileClassManagerContainer.createDiv({ text: ">", cls: "separator" })
                    }

                    const fileClassFieldsContainers = this.containerEl.querySelectorAll(`[class*="fileClassField__${fileClassName.replace("/", "___").replace(" ", "_")}"]`)
                    fileClassFieldsContainers.forEach(fieldNameContainer => {
                        (fieldNameContainer as HTMLDivElement).onmouseover = () => {
                            fileClassNameContainer?.addClass("active")
                        }
                        (fieldNameContainer as HTMLDivElement).onmouseout = () => {
                            fileClassNameContainer?.removeClass("active")
                        }
                    })
                    fileClassNameContainer.onmouseover = () => {
                        this.containerEl
                            .querySelectorAll(`.field-item.field-name.fileClassField__${fileClassName.replace("/", "___").replace(" ", "_")}`)
                            .forEach(cont => { cont.addClass("active") })
                    }
                    fileClassNameContainer.onmouseout = () => {
                        this.containerEl
                            .querySelectorAll(`.field-item.field-name.fileClassField__${fileClassName.replace("/", "___").replace(" ", "_")}`)
                            .forEach(cont => { cont.removeClass("active") })
                    }
                    fileClassNameContainer.onclick = () => {
                        const fileClassComponent = new FileClassManager(this.plugin, _fileClass)
                        this.plugin.addChild(fileClassComponent);
                        this.close();
                    }
                }
            })
        })
    }

    private buildInsertMissingFieldsBtn() {
        const insertMissingFieldsContainer = this.contentEl.createDiv({ cls: "insert-all-fields" });
        insertMissingFieldsContainer.createDiv({ text: "Insert missing fields" });
        const insertMissingFieldsBtn = new ButtonComponent(insertMissingFieldsContainer)
        insertMissingFieldsBtn.setIcon("battery-full")

        insertMissingFieldsBtn.onClick(() => {
            new ChooseSectionModal(
                this.plugin,
                this.file,
                (lineNumber: number, after: boolean, asList: boolean, asComment: boolean) => insertMissingFields(
                    this.plugin, this.file.path, lineNumber, after, asList, asComment
                )
            ).open();
        })
    }

    private buildInsertNewItem(field: Field, indexedPath: string) {
        const insertNewItemContainer = this.contentEl.createDiv({ cls: "insert-all-fields" });
        insertNewItemContainer.createDiv({ text: "Add a new item" });
        const insertNewItemBtn = new ButtonComponent(insertNewItemContainer)
        insertNewItemBtn.setIcon("list-plus")

        insertNewItemBtn.onClick(async () => {
            const fieldManager = new FieldType.FieldManager[field.type](this.plugin, field) as ObjectListField
            if (this.note) fieldManager.addObjectListItem(this.note, this.indexedPath)
            this.indexedPath = indexedPath
            this.close()
        })
    }

    private buildFieldsContainer() {
        const fieldsContainer = this.contentEl.createDiv({ cls: "note-fields-container" });
        const { id, index } = Field.getIdAndIndex(this.indexedPath?.split("____").last())
        if (this.indexedPath && this.note.fields.find(_f => _f.id === id)?.type === FieldType.FieldType.ObjectList && index === undefined) {
            const field = this.note.fields.find(_f => _f.id === id)!
            const items = this.note.existingFields.find(eF => eF.indexedPath === this.indexedPath)?.value
            items.forEach((item: any, index: number) => this.buildObjectListItemContainer(fieldsContainer, field, item, `${this.indexedPath}[${index}]`))
            this.buildInsertNewItem(field, this.indexedPath)
        } else {
            this.existingFields.forEach(eF => {
                this.buildFieldContainer(fieldsContainer, eF.field, eF.value, eF.indexedPath)
            })
            this.missingFields.forEach(_f => this.buildFieldContainer(fieldsContainer, _f, undefined))
            if (this.missingFields.length) {
                this.buildInsertMissingFieldsBtn()
            }
        }
    }
}

export default class NoteFieldsComponent extends Component {

    private fieldsModal: FieldsModal;

    constructor(
        public plugin: MetadataMenu,
        public cacheVersion: string,
        public onChange: () => void,
        public file: TFile,
        public indexedPath?: string
    ) {
        super();
        this.fieldsModal = new FieldsModal(this.plugin, this.file, this, this.indexedPath)
        this.fieldsModal.onClose = () => {
            this.plugin.removeChild(this)
            this.unload()
        }
    }

    async moveToObject(indexedPath: string) {
        await this.fieldsModal.buildNote();
        this.fieldsModal.indexedPath = indexedPath
        this.fieldsModal.build();
    }

    async removeObject(indexedPath: string) {
        await this.fieldsModal.buildNote()
        this.fieldsModal.removeObject(indexedPath)
    }

    onload(): void {
        this.plugin.registerEvent(this.plugin.app.metadataCache.on('dataview:metadata-change', async () => {
            await this.fieldsModal.buildNote();
            this.fieldsModal.build();
        }))
        this.fieldsModal.open()

    }
}