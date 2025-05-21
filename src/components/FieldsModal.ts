import MetadataMenu from "main";
import { ButtonComponent, Component, Modal, TFile } from "obsidian";
import { insertMissingFields } from "src/commands/insertMissingFields";
import { postValues } from "src/commands/postValues";
import { ExistingField } from "src/fields/ExistingField";
import { Field, IFieldManager, Target, fieldValueManager, getIdAndIndex, stringToBoolean, upperIndexedPathObjectPath } from "src/fields/Field";
import { displayValue, getActions, objectTypes } from "src/fields/Fields";
import ChooseSectionModal from "src/modals/chooseSectionModal";
import { Note } from "src/note/note";
import { FileClassViewManager } from "./FileClassViewManager";
import { Options as ObjectListOptions, addObjectListItem } from "src/fields/models/ObjectList";
import { openSettings } from "src/fields/base/BaseSetting";
import { BaseOptions } from "src/fields/base/BaseField";
import { sortFileFields } from "src/fileClass/fileClass";


export class FieldActions {
    constructor(public container: HTMLDivElement) { }

    private async setIconAndTooltipAsync(fieldOption: ButtonComponent, file: TFile, indexedPath: string, plugin: MetadataMenu): Promise<void> {
        const eF = await Note.getExistingFieldForIndexedPath(plugin, file, indexedPath)
        switch (eF?.field.type) {
            case "Boolean": {
                const value = stringToBoolean(eF?.value)
                fieldOption.setIcon(!value ? "toggle-left" : "toggle-right")
                fieldOption.setTooltip(!value ? `Set ${eF.name} as true` : `Set ${eF.name} as false`);
            }
                break;
            default: {
                fieldOption.setIcon("pencil")
                fieldOption.setTooltip(`Update ${eF?.name || ""}`);
            }
        }
    }

    public addOption(id: string, icon: string, onclick: () => {} | void, tooltip?: string, className?: string, file?: TFile, indexedPath?: string, plugin?: MetadataMenu) {
        const fieldOptionContainer = this.container.createDiv({ cls: "field-item field-option" })
        const fieldOption = new ButtonComponent(fieldOptionContainer);
        fieldOption.buttonEl.setAttr("id", id)
        if (indexedPath && file && plugin) {
            this.setIconAndTooltipAsync(fieldOption, file, indexedPath, plugin)
        } else {
            fieldOption.setIcon(icon)
            if (tooltip) fieldOption.setTooltip(tooltip);
        }
        if (className) fieldOption.buttonEl.addClass(className.replace(/\s/g, "_"));
        fieldOption.onClick(() => onclick())
    }
}

export class FieldOptions extends FieldActions { }

export class FieldsModal extends Modal {

    private existingFields: ExistingField[] = []
    private missingFields: Field[] = [];
    private note: Note;

    constructor(
        public plugin: MetadataMenu,
        readonly file: TFile,
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
        this.note = await Note.buildNote(this.plugin, this.file)
    }

    public build(): void {
        this.contentEl.replaceChildren();
        const indexedPath = this.indexedPath || ""
        const { id, index } = getIdAndIndex(indexedPath?.split("____").last())

        if (!id) {
            this.titleEl.setText(`Fields of ${this.file.basename}`)
        } else {
            const baseTitle = `Fields of ${this.file.basename} ${indexedPath?.split("____").length > 1 ? " > ... > " : " > "}`
            if (index) {
                //this is an object list item
                const objectListIndexedPath = upperIndexedPathObjectPath(this.indexedPath || "")
                const eF = this.note.getExistingFieldForIndexedPath(objectListIndexedPath)!
                const display = `${eF.name}[${index}]`
                this.titleEl.setText(`${baseTitle} ${display}`)
            } else {
                const eF = this.note.getExistingFieldForIndexedPath(indexedPath)
                this.titleEl.setText(`${baseTitle} ${eF?.name}`)
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
            .filter(_f => {
                if (this.indexedPath) return _f.getFirstAncestor()?.id === id
                else return _f.isRoot()
            })
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
        this.plugin.app.workspace.trigger("metadata-menu:fields-modal-built", this)
    }

    private buildNavigation(): void {
        const backBtnWrapper = this.contentEl.createDiv({ cls: "back-button-wrapper" })
        const backBtn = new ButtonComponent(backBtnWrapper)
        backBtn.setIcon("chevron-left")

        const upperPath = upperIndexedPathObjectPath(this.indexedPath || "")
        const { id: upperId, index: upperIndex } = getIdAndIndex(upperPath.split("____").last())
        const upperExistingField = this.note.existingFields.find(eF => eF.field.id === upperId)
        const upperObject = upperExistingField?.field

        if (upperObject) {
            const numIndex = parseInt(upperIndex || "")
            if (!isNaN(numIndex)) {
                const display = `${upperObject.name} [${numIndex}]`
                backBtnWrapper.createSpan({ text: display })
                backBtn.setTooltip(`Go to ${display}`)
            } else {
                backBtnWrapper.createSpan({ text: upperObject.name })
                backBtn.setTooltip(`Go to ${upperObject.name} fields`)
            }

        } else {
            const fileName = this.file.name.replace(/(.*).md$/, "$1")
            backBtnWrapper.createSpan({ text: fileName })
            backBtn.setTooltip(`Go to ${fileName} fields`)
        }
        backBtnWrapper.onclick = async () => { await this.noteFields.moveToObject(upperPath) }
    }

    private buildFieldContainer(container: HTMLDivElement, field: Field, value?: string | null | undefined, indexedPath?: string): void {
        const eF = this.existingFields.find(eF => eF.field.id === field.id)
        const fieldVM = fieldValueManager(this.plugin, field.id, field.fileClassName, this.file, eF, indexedPath)
        const fieldNameWrapper = container.createDiv({ cls: "field-name-wrapper" })
        const fieldNameContainer = fieldNameWrapper.createDiv({ text: `${field.name}`, cls: "field-item field-name" });
        this.buildFieldSetting(container, field, fieldNameContainer)
        this.buildFieldValue(container, field, fieldVM, value)
        this.buildActions(container, field, fieldVM, value)
    }

    private buildFieldSetting(container: HTMLDivElement, field: Field, fieldNameContainer: HTMLDivElement, isObjectListItem: boolean = false) {
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
            if (fileClassAttribute && _fileClass) openSettings(fileClassAttribute.id, _fileClass.name, this.plugin)
        })
        const fieldTypeContainer = fieldSettingsWrapper.createDiv({ cls: `field-item` });
        fieldTypeContainer.createDiv({ text: `${field.type}${isObjectListItem ? " item" : ""}`, cls: `chip field-type ${field.colorClass}` })
    }

    private buildFieldValue(container: HTMLDivElement, field: Field, fieldVM: IFieldManager<Target, BaseOptions> | undefined, value?: string | null | undefined) {
        const fieldValueWrapper = container.createDiv({ cls: "field-value-wrapper" })
        const fieldValueContainer = fieldValueWrapper.createDiv({
            cls: ![undefined, null, ""].includes(value) ? "field-item field-value" : "field-item field-value emptyfield"
        })
        if (value === null || value === "") {
            fieldValueContainer.setText(field.type === "Lookup" ? "---auto---" : "<empty>");
        } else if (value === undefined) {
            fieldValueContainer.setText("<missing>");
        } else {
            if (fieldVM) displayValue(field.type)(fieldVM, fieldValueContainer, () => { this.close() })
            else fieldValueContainer.setText(`${value}`)
        }
    }

    private buildActions(container: HTMLDivElement, field: Field, fieldVM: IFieldManager<Target, BaseOptions> | undefined, value?: string | null | undefined) {
        const fieldOptionsWrapper = container.createDiv({ cls: "field-options-wrapper" });
        fieldOptionsWrapper.createDiv({ cls: "field-options-spacer" });
        const fieldOptions = new FieldOptions(fieldOptionsWrapper)
        if (this.existingFields.map(_f => _f.field.id).includes(field.id) && fieldVM) {
            if (objectTypes.includes(field.type)) {
                getActions(field.type)(this.plugin, field, this.file, fieldOptions, fieldVM.indexedPath, this.noteFields)
            } else {
                getActions(field.type)(this.plugin, field, this.file, fieldOptions, fieldVM.indexedPath)
            }

        } else {
            //missing field, let's build and indexed path and a button to insert it
            const newIndexedPath = `${this.indexedPath ? this.indexedPath + "____" : ""}${field.id}`
            const fieldBtnContainer = fieldOptionsWrapper.createDiv({ cls: "field-item field-option" })
            const fieldBtn = new ButtonComponent(fieldBtnContainer)
            fieldBtn.setIcon("list-plus")
            fieldBtn.setTooltip("Add field at section")
            fieldBtn.onClick(async () => {
                //Object and ObjectList go straight to frontmatter
                if (objectTypes.includes(field.type) && this.note) {
                    await postValues(this.plugin, [{ indexedPath: `${newIndexedPath}`, payload: { value: "" } }], this.file)
                    this.indexedPath = `${newIndexedPath}`
                    //Other fields go straight to frontmatter if their path is not emplty
                } else {
                    if (field.path === "") {
                        new ChooseSectionModal(
                            this.plugin,
                            this.file,
                            (lineNumber: number, asList: boolean, asBlockquote: boolean
                            ) => fieldValueManager(this.plugin, field.id, field.fileClassName, this.file, undefined, newIndexedPath, lineNumber, asList, asBlockquote)?.openModal()
                        ).open();
                    } else {
                        fieldValueManager(this.plugin, field.id, field.fileClassName, this.file, undefined, newIndexedPath, -1, false, false)?.openModal()
                    }
                }
            })
        };
    }

    private buildObjectListItemContainer(container: HTMLDivElement, field: Field, itemIndexedPath: string) {
        const fieldVM = fieldValueManager(this.plugin, field.id, field.fileClassName, this.file)
        const { index } = getIdAndIndex(itemIndexedPath.split("____").last())
        let value: string = ""
        if (this.indexedPath && index) {
            const eF = this.note.getExistingFieldForIndexedPath(this.indexedPath)
            value = eF?.getItemDisplayForIndex(this.plugin, index) || ""
        }
        const fieldNameWrapper = container.createDiv({ cls: "field-name-wrapper" })
        const fieldNameContainer = fieldNameWrapper.createDiv({ text: `${field.name} [${index}]`, cls: "field-item field-name" });
        this.buildFieldSetting(container, field, fieldNameContainer, true)
        const fieldValueWrapper = container.createDiv({ cls: "field-value-wrapper" })
        const fieldValueContainer = fieldValueWrapper.createDiv({
            cls: value !== undefined && value !== null ? "field-item field-value" : "field-item field-value emptyfield"
        })
        fieldValueContainer.setText(value);
        const fieldOptionsWrapper = container.createDiv({ cls: "field-options-wrapper" });
        fieldOptionsWrapper.createDiv({ cls: "field-options-spacer" });
        const fieldOptions = new FieldOptions(fieldOptionsWrapper)
        if (fieldVM) getActions(fieldVM?.type)(this.plugin, field, this.file, fieldOptions, itemIndexedPath, this.noteFields)
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
                    fileClassNameContainer.setAttr("id", `fileClass__${_fileClass.name.replace("/", "___").replace(/\s/g, "_")}`)
                    if (await _fileClass.missingFieldsForFileClass(this.file)) {
                        const fileClassInsertMissingFieldsInFrontmatterBtn = new ButtonComponent(fileClassOptionsContainer)
                        fileClassInsertMissingFieldsInFrontmatterBtn.setIcon("align-vertical-space-around")
                        fileClassInsertMissingFieldsInFrontmatterBtn.setTooltip(`Insert missing fields for ${_fileClass.name}`)
                        fileClassInsertMissingFieldsInFrontmatterBtn.onClick(() => {
                            insertMissingFields(this.plugin, this.file.path, -1, false, false, _fileClass.name)

                        })
                        const fileClassInsertMissingFieldsBtn = new ButtonComponent(fileClassOptionsContainer)
                        fileClassInsertMissingFieldsBtn.setIcon("log-in")
                        fileClassInsertMissingFieldsBtn.setTooltip(`Insert missing fields for ${_fileClass.name}`)
                        fileClassInsertMissingFieldsBtn.onClick(() => {
                            new ChooseSectionModal(
                                this.plugin,
                                this.file,
                                (lineNumber: number, asList: boolean, asBlockquote: boolean) => insertMissingFields(
                                    this.plugin, this.file.path, lineNumber, asList, asBlockquote, _fileClass.name
                                )
                            ).open()
                        })
                    }

                    const fileClassAddAttributeBtn = new ButtonComponent(fileClassOptionsContainer)
                    fileClassAddAttributeBtn.setIcon("plus-circle")
                    fileClassAddAttributeBtn.setTooltip(`Add field definition in ${_fileClass.name}`)
                    fileClassAddAttributeBtn.onClick(() => openSettings("", fileClassName, this.plugin))
                    if (i < ancestors.length - 1) {
                        fileClassOptionsContainer.createDiv({ text: ">", cls: "separator" })
                    }

                    const fileClassFieldsContainers = this.containerEl.querySelectorAll(`[class*="fileClassField__${fileClassName.replace("/", "___").replace(/\s/g, "_")}"]`)
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
                            .querySelectorAll(`.field-item.field-name.fileClassField__${fileClassName.replace("/", "___").replace(/\s/g, "_")}`)
                            .forEach(cont => { cont.addClass("active") })
                    }
                    fileClassNameContainer.onmouseout = () => {
                        this.containerEl
                            .querySelectorAll(`.field-item.field-name.fileClassField__${fileClassName.replace("/", "___").replace(/\s/g, "_")}`)
                            .forEach(cont => { cont.removeClass("active") })
                    }
                    fileClassNameContainer.onclick = () => {
                        const fileClassComponent = new FileClassViewManager(this.plugin, _fileClass)
                        this.plugin.addChild(fileClassComponent);
                        fileClassComponent.build()
                        this.close();
                    }
                }
            })
        })
    }

    private buildInsertMissingFieldsBtn() {
        const insertMissingFieldsContainer = this.contentEl.createDiv({ cls: "insert-all-fields" });
        insertMissingFieldsContainer.createDiv({ text: "Insert missing fields" });

        const insertMissingFieldsInFrontmatterBtn = new ButtonComponent(insertMissingFieldsContainer)
        insertMissingFieldsInFrontmatterBtn.setIcon("align-vertical-space-around")
        insertMissingFieldsInFrontmatterBtn.setTooltip("In Frontmatter")
        insertMissingFieldsInFrontmatterBtn.buttonEl.addClass("in-frontmatter-btn")
        insertMissingFieldsInFrontmatterBtn.onClick(() => {
            if (!this.indexedPath) {
                insertMissingFields(this.plugin, this.file.path, -1)
            } else {
                const field = this.note.getExistingFieldForIndexedPath(this.indexedPath)?.field
                const fileClass = field?.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(field.fileClassName) : undefined
                insertMissingFields(this.plugin, this.file.path, -1, false, false, fileClass?.name, this.indexedPath)
            }
        })
        const insertMissingFieldsBtn = new ButtonComponent(insertMissingFieldsContainer)
        insertMissingFieldsBtn.setIcon("log-in")
        insertMissingFieldsBtn.setTooltip("At line...")
        insertMissingFieldsBtn.buttonEl.addClass("at-line-btn")
        insertMissingFieldsBtn.onClick(() => {
            if (!this.indexedPath) {
                new ChooseSectionModal(
                    this.plugin,
                    this.file,
                    (lineNumber: number, asList: boolean, asBlockquote: boolean) => insertMissingFields(
                        this.plugin, this.file.path, lineNumber, asList, asBlockquote
                    )
                ).open();
            } else {
                const field = this.note.getExistingFieldForIndexedPath(this.indexedPath)?.field
                const fileClass = field?.fileClassName ? this.plugin.fieldIndex.fileClassesName.get(field.fileClassName) : undefined
                insertMissingFields(
                    this.plugin, this.file.path, -1, false, false, fileClass?.name, this.indexedPath
                )
            }
        })
    }

    private buildInsertNewItem(field: Field, indexedPath: string) {
        const insertNewItemContainer = this.contentEl.createDiv({ cls: "insert-all-fields" });
        insertNewItemContainer.createDiv({ text: "Add a new item" });
        const insertNewItemBtn = new ButtonComponent(insertNewItemContainer)
        insertNewItemBtn.setIcon("list-plus")

        insertNewItemBtn.onClick(async () => {
            if (this.note) {
                const fieldVM = fieldValueManager(this.plugin, field.id, field.fileClassName, this.file, undefined, this.indexedPath) as IFieldManager<TFile, ObjectListOptions>
                addObjectListItem(fieldVM)
            }
            this.indexedPath = indexedPath
        })
    }



    private buildFieldsContainer() {
        const fieldsContainer = this.contentEl.createDiv({ cls: "note-fields-container" });
        const { id, index } = getIdAndIndex(this.indexedPath?.split("____").last())
        if (this.indexedPath && this.note.fields.find(_f => _f.id === id)?.type === "ObjectList" && index === undefined) {
            const field = this.note.fields.find(_f => _f.id === id)!
            const items = this.note.existingFields.find(eF => eF.indexedPath === this.indexedPath)?.value || []
            items.forEach((item: any, index: number) => this.buildObjectListItemContainer(fieldsContainer, field, `${this.indexedPath}[${index}]`))
            this.buildInsertNewItem(field, this.indexedPath)
        } else {
            const sortedIds = sortFileFields(this.plugin.fieldIndex, this.file).map(f => f.id)
            const fields: Array<ExistingField | Field> = [
                ...this.existingFields
                    .filter(eF => {
                        if (eF.name === this.plugin.settings.fileClassAlias) return this.plugin.settings.showFileClassSelectInModal
                        else return true
                    }),
                ...this.missingFields.sort((f1, f2) => sortedIds.indexOf(f1.id) < sortedIds.indexOf(f2.id) ? -1 : 1)
            ]
            for (const fieldOrEf of fields) {
                if (fieldOrEf instanceof ExistingField) {
                    this.buildFieldContainer(fieldsContainer, fieldOrEf.field, fieldOrEf.value, fieldOrEf.indexedPath)
                } else {
                    this.buildFieldContainer(fieldsContainer, fieldOrEf, undefined)
                }
            }
            if (this.missingFields.length) this.buildInsertMissingFieldsBtn()
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

    onload(): void {
        this.registerEvent(
            this.plugin.app.metadataCache.on('metadata-menu:indexed', async () => {
                await this.fieldsModal.buildNote();
                this.fieldsModal.build();
            })
        )
        this.fieldsModal.open()
    }
}