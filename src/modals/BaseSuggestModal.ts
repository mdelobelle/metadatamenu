import MetadataMenu from "main";
import { ButtonComponent, SuggestModal, TFile } from "obsidian";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import { objectTypes } from "src/types/fieldTypes";
import ObjectListModal from "./fields/ObjectListModal";
import ObjectModal from "./fields/ObjectModal";

export default abstract class BaseSuggestModal<T> extends SuggestModal<T>{
    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public eF?: ExistingField,
        public indexedPath?: string,
        public previousModal?: ObjectModal | ObjectListModal,
        public type?: "input" | "navigation"
        //TODO: can be generalized?
    ) {
        super(plugin.app);
        this.type = type || "input"
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        const headerContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        const { id, index } = Field.getIdAndIndex(indexedPath)
        if ((id?.includes("____") || index !== undefined) && type === "navigation") this.buildBackButton(headerContainer)
        if (this.type === "navigation") {
            this.buildTitle(headerContainer)
            this.inputEl.disabled = true
            this.inputEl.addClass("input-as-title")
        }
        this.containerEl.find(".prompt").prepend(headerContainer)
        headerContainer.appendChild(this.inputEl)
        this.buildAddButton(headerContainer)
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter") {
                e.preventDefault()
                if (e.altKey) { await this.onAdd() }
            }
            if (e.key == "Escape") {
                e.preventDefault()
                if (e.altKey) { this.onEscape() }
            }
        }
    }

    buildBackButton(container: HTMLDivElement) {
        const backButton = new ButtonComponent(container)
        backButton.setIcon("left-arrow")
        backButton.onClick(async () => { this.onEscape() })
        backButton.setCta();
        backButton.setTooltip("Go to parent field")
        const infoContainer = container.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Esc to go back")
    }

    public buildAddButton(container: HTMLDivElement) {
        const infoContainer = container.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to Add")
        const addButton = new ButtonComponent(container)
        addButton.setIcon("plus")
        addButton.onClick(async () => { this.onAdd() })
        addButton.setCta();
        addButton.setTooltip("Add a new item")
    }

    public async onAdd() {

    }

    public onEscape() {
        this.previousModal?.open()
        this.close()
    }

    buildTitle(container: HTMLDivElement) {
        let title: string = ""
        if (this.eF) {
            title = this.eF.field.name
        } else if (this.indexedPath) {
            //indexedPath of form aaaaa[n]
            const { id: objectId, index: objectIndex } = Field.getIdAndIndex(this.indexedPath.split("____").last())
            const upperObject = this.plugin.fieldIndex.filesFields.get(this.file.path)?.find(_f => _f.id === objectId)
            title = `${upperObject?.name}${objectIndex ? " [" + objectIndex + "]" : ""}` || "unknown field"
        }
        const titleContainer = container.createDiv({ cls: "suggester-title" })
        titleContainer.innerHTML = `<b>${title}</b> fields`
    }

}