import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent, SuggestModal } from "obsidian";
import { postValues } from "src/commands/postValues";
import Field from "src/fields/Field";
import ObjectListField, { ObjectListItem } from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import { FieldManager } from "src/types/fieldTypes";
import { cleanActions } from "src/utils/modals";
import ObjectModal from "./ObjectModal";

export default class ObjectListModal extends SuggestModal<ObjectListItem> {
    private addButton: ButtonComponent;
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
        this.containerEl.find(".prompt").prepend(inputContainer)
        // addButton
        this.addButton = new ButtonComponent(inputContainer)
        this.addButton.setIcon("plus")
        this.addButton.onClick(async () => {
            const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as ObjectListField
            if (this.note) fieldManager.addObjectListItem(this.note, this.indexedPath)
        })
        this.addButton.setCta();
        this.addButton.setTooltip("Add this value to this field settings")
    };

    getSuggestions(query: string = ""): ObjectListItem[] {
        const objects = this.note?.getExistingChildrenForIndexedPath(this.indexedPath) || []
        return objects
    }

    renderSuggestion(item: ObjectListItem, el: HTMLElement) {
        el.setText(`${item.indexInList}: ` + item.fields.map(eF => eF.value).join(", ") || "not found")
    }

    async onChooseSuggestion(item: ObjectListItem, evt: MouseEvent | KeyboardEvent) {
        const objectModal = new ObjectModal(this.plugin, this.file, this.note, item.indexedPath)
        objectModal.open()

    }
};