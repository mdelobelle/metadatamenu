import MetadataMenu from "main";
import { Modal, TFile, ButtonComponent, SuggestModal } from "obsidian";
import { postValues } from "src/commands/postValues";
import Field from "src/fields/Field";
import ObjectListField, { ObjectListItem } from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import ObjectModal from "./ObjectModal";

export default class ObjectListModal extends SuggestModal<ObjectListItem> {

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
        //TODO: create an Add Button
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