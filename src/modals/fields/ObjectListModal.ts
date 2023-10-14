import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent, SuggestModal, setIcon } from "obsidian";
import { postValues } from "src/commands/postValues";
import Field from "src/fields/Field";
import ObjectListField, { ObjectListItem } from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import { FieldManager, FieldType } from "src/types/fieldTypes";
import { cleanActions } from "src/utils/modals";
import ObjectModal from "./ObjectModal";

export default class ObjectListModal extends SuggestModal<ObjectListItem> {
    private addButton: ButtonComponent;
    private toRemove?: ObjectListItem
    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private note: Note | undefined,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private after: boolean = false,
        private asList: boolean = false,
        private asComment: boolean = false
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
            if (this.note) {
                await fieldManager.addObjectListItem(this.note, this.indexedPath);
                this.close()
            }
        })
        this.addButton.setCta();
        this.addButton.setTooltip("Add a new item")
    };

    getSuggestions(query: string = ""): ObjectListItem[] {
        const objects = this.note?.getExistingChildrenForIndexedPath(this.indexedPath) || []
        return objects
    }

    renderSuggestion(item: ObjectListItem, el: HTMLElement) {
        const container = el.createDiv({ cls: "value-container" })
        const index = container.createDiv({ cls: "index-container" })
        index.setText(`${item.indexInList}`)
        const valueContainer = container.createDiv({})
        if (item.fields.length) {
            valueContainer.setText(item.fields.map(eF => {
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
            const objectModal = new ObjectModal(this.plugin, this.file, this.note, item.indexedPath)
            objectModal.open()
        }
    }
};