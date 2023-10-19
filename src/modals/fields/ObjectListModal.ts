import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent, SuggestModal, setIcon } from "obsidian";
import { postValues } from "src/commands/postValues";
import { ExistingField } from "src/fields/existingField";
import Field from "src/fields/Field";
import ObjectListField, { ObjectListItem } from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { cleanActions } from "src/utils/modals";
import ObjectModal from "./ObjectModal";
import * as fieldsValues from 'src/db/stores/fieldsValues'

export default class ObjectListModal extends SuggestModal<ObjectListItem> {
    private addButton: ButtonComponent;
    private toRemove?: ObjectListItem
    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false,
        private objects: ObjectListItem[] = []
    ) {
        super(plugin.app);
    };

    onOpen() {
        super.onOpen()
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        inputContainer.appendChild(this.inputEl)
        this.inputEl.disabled = true
        this.inputEl.value = `${this.field.name} items`
        this.inputEl.addClass("input-as-title")
        this.containerEl.find(".prompt").prepend(inputContainer)

        // addButton
        this.addButton = new ButtonComponent(inputContainer)
        this.addButton.setIcon("plus")
        this.addButton.onClick(async () => {
            const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as ObjectListField
            if (this.eF) {
                await fieldManager.addObjectListItem(this.file, this.eF, this.indexedPath);
                this.close()
            }
        })
        this.addButton.setCta();
        this.addButton.setTooltip("Add a new item")
    };

    getSuggestions(query: string = ""): ObjectListItem[] {
        return this.objects
    }

    renderSuggestion(item: ObjectListItem, el: HTMLElement) {
        const container = el.createDiv({ cls: "value-container" })
        const index = container.createDiv({ cls: "index-container" })
        index.setText(`${item.indexInList}`)
        const valueContainer = container.createDiv({})
        if (item.fields.length) {
            valueContainer.setText(item.fields.map(eF => {
                console.log(eF)
                if (Array.isArray(eF.value)) {
                    return `${eF.value.length} ${eF.field.name}`
                } else if (typeof eF.value === 'object') {
                    return `${eF.field.name}: {...}`
                } else {
                    return `${eF.field.name}: ${eF.value}`
                }
            }).join(" | "))
        } else {
            valueContainer.setText("<--empty-->")
            valueContainer.addClass("empty")
        }
        container.createDiv({ cls: "spacer" })
        const removeContainer = container.createDiv({ cls: "icon-container" })
        setIcon(removeContainer, "trash")
        removeContainer.onclick = () => { this.toRemove = item }
    }

    async onChooseSuggestion(item: ObjectListItem, evt: MouseEvent | KeyboardEvent) {
        if (this.toRemove) {
            const note = new Note(this.plugin, this.file)
            await note.build()
            if (item.indexedPath) note.removeObject(item.indexedPath)
        } else {
            const eF = await fieldsValues.getElementForIndexedPath<ExistingField>(this.file, item.indexedPath)
            const existingFields = (await ExistingField.getExistingFieldsFromIndexForFilePath(this.plugin, this.file))
                .filter(eF => eF.indexedPath && Field.upperPath(eF.indexedPath) === item.indexedPath) || []
            const { id, index } = Field.getIdAndIndex(item.indexedPath?.split("____").last())
            const missingFields = this.plugin.fieldIndex.filesFields
                .get(this.file.path)?.filter(_f => _f.getFirstAncestor()?.id === id)
                .filter(_f => !existingFields.map(eF => { console.log(eF.field); return eF.field.id }).includes(_f.id)) || []
            const objectModal = new ObjectModal(this.plugin, this.file, eF, item.indexedPath,
                undefined, undefined, undefined, undefined, existingFields, missingFields)
            objectModal.open()
        }
    }
};