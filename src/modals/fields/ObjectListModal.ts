import MetadataMenu from "main";
import { TFile, ButtonComponent, SuggestModal, setIcon } from "obsidian";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import ObjectListField, { ObjectListItem } from "src/fields/fieldManagers/ObjectListField";
import { Note } from "src/note/note";
import { FieldManager } from "src/types/fieldTypes";
import ObjectModal from "./ObjectModal";
import { postValues } from "src/commands/postValues";
//FIXME can't add a new item for an empty list
export default class ObjectListModal extends SuggestModal<ObjectListItem> {
    private addButton: ButtonComponent;
    private toRemove?: ObjectListItem;
    private objects: ObjectListItem[] = []

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public field: Field,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal,
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        const inputContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        if (!this.field.isRoot()) this.buildBackButton(inputContainer)
        inputContainer.appendChild(this.inputEl)
        this.inputEl.disabled = true
        this.inputEl.value = `${this.field.name} items`
        this.inputEl.addClass("input-as-title")
        this.containerEl.find(".prompt").prepend(inputContainer)
        this.buildAddButton(inputContainer)
    };

    private buildBackButton(container: HTMLDivElement) {
        const backButton = new ButtonComponent(container)
        backButton.setIcon("left-arrow")
        backButton.onClick(async () => console.log("GO BACK"))
        backButton.setCta();
        backButton.setTooltip("Add a new item")
        const infoContainer = container.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Esc to go back")
    }
    private buildAddButton(container: HTMLDivElement) {
        const infoContainer = container.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to Add")
        const addButton = new ButtonComponent(container)
        addButton.setIcon("plus")
        addButton.onClick(async () => this.addNew())
        addButton.setCta();
        addButton.setTooltip("Add a new item")
    }


    private async addNew() {
        const fieldManager = new FieldManager[this.field.type](this.plugin, this.field) as ObjectListField
        if (this.eF) {
            await fieldManager.addObjectListItem(this.file, this.eF, this.indexedPath);
            this.close()
            this.open()
        } else if (this.indexedPath) {
            //first insert the empty object list
            await postValues(this.plugin, [{ id: this.indexedPath, payload: { value: "" } }], this.file)
            this.close()
            this.open()
        }
    }

    async onOpen() {
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter") {
                e.preventDefault()
                if (e.altKey) {
                    await this.addNew()
                }
            }
            if (e.key == "Escape") {
                e.preventDefault()
                if (e.altKey) {
                    this.previousModal?.open()
                    this.close()
                }
            }
        }
        const _eF = await ExistingField.getExistingFieldFromIndexForIndexedPath(this.plugin, this.file, this.indexedPath)
        this.objects = await _eF?.getChildrenFields(this.plugin, this.file) || []
        super.onOpen()
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
        this.previousModal?.close() // it is triggered at close by enter
        const reOpen = async () => {

            // because vault.on("modify") is not triggered fast enough
            await ExistingField.indexFieldsValues(this.plugin)
            const eF = await ExistingField.getExistingFieldFromIndexForIndexedPath(this.plugin, this.file, this.indexedPath)
            if (eF) {
                const thisFieldManager = new FieldManager[eF.field.type](this.plugin, eF.field)
                thisFieldManager.createAndOpenFieldModal(this.file, eF.field.name, eF, eF.indexedPath, undefined, undefined, undefined, this.previousModal)
            }
        }
        if (this.toRemove) {
            const note = await Note.buildNote(this.plugin, this.file)
            if (item.indexedPath) {
                await note.removeObject(item.indexedPath)
                await reOpen()
            }
        } else {
            const objectModal = new ObjectModal(this.plugin, this.file, undefined, item.indexedPath,
                undefined, undefined, undefined, this)
            objectModal.open()
        }
    }
};