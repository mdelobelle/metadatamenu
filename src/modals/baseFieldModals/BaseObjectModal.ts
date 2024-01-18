import MetadataMenu from "main";
import { ButtonComponent, SuggestModal, TFile } from "obsidian";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/_Field";
import ObjectListModal from "../fields/ObjectListModal";
import ObjectModal from "../fields/ObjectModal";
import { FieldManager as FM } from "src/types/fieldTypes";
import ObjectField from "src/fields/fieldManagers/ObjectField";
import ObjectListField from "src/fields/fieldManagers/ObjectListField";

export default abstract class BaseObjectModal<T> extends SuggestModal<T> {
    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public eF?: ExistingField,
        public indexedPath?: string,
        public previousModal?: ObjectModal | ObjectListModal,
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("narrow")
        const headerContainer = this.containerEl.createDiv({ cls: "suggester-input" })
        const { id, index } = Field.getIdAndIndex(indexedPath)
        if (id?.includes("____") || index !== undefined) this.buildBackButton(headerContainer)
        this.buildTitle(headerContainer)
        this.inputEl.disabled = true
        this.inputEl.addClass("input-as-title")
        this.containerEl.find(".prompt").prepend(headerContainer)
        headerContainer.appendChild(this.inputEl)
        this.buildAddButton(headerContainer)
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault()
                await this.onAdd()
            }
            if (e.key == "Escape" && e.altKey) {
                e.preventDefault()
                this.onEscape()
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

    public buildAddButton(container: HTMLDivElement) { }

    public async onAdd() { }

    public onEscape() {
        this.previousModal?.open()
        this.close()
    }

    buildTitle(container: HTMLDivElement) {
        const titleContainer = container.createDiv({ cls: "suggester-title" })
        const indexedPath = this.indexedPath || ""
        const { id, index } = Field.getIdAndIndex(indexedPath?.split("____").last())

        if (!this.eF) {
            const upperPath = Field.upperIndexedPathObjectPath(this.indexedPath || "")
            const { id: upperId, index: upperIndex } = Field.getIdAndIndex(upperPath.split("____").last())
            const field = this.plugin.fieldIndex.filesFields.get(this.file.path)?.find(f => f.id === upperId)
            titleContainer.setText(`${field?.name || "unknown"}${index ? " [" + index + "]" : ""}`)
        } else {
            if (index) {
                titleContainer.setText(`${this.eF.name}[${index}]`)
            } else {
                titleContainer.setText(`${this.eF?.name}`)
            }
        }
    }

}