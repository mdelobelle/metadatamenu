import MetadataMenu from "main";
import { FuzzyMatch, FuzzySuggestModal, TFile, setIcon } from "obsidian";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import ObjectModal from "../fields/ObjectModal";
import ObjectListModal from "../fields/ObjectListModal";
import { FieldManager, MediaType, extensionMediaTypes } from "src/types/fieldTypes";
import { postValues } from "src/commands/postValues";
import MultiMediaField from "src/fields/fieldManagers/MultiMediaField";
import MediaField from "src/fields/fieldManagers/MediaField";

export const commonMediaTypeIcon = (display: "list" | "card") => `<svg xmlns="http://www.w3.org/2000/svg" ${display === 'card' ? 'width="164" height="164"' : 'width="40" height="40"'} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-question">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"/>
</svg>`


export class BaseMediaFileModal extends FuzzySuggestModal<TFile> {
    public selectedFiles: TFile[] = []

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public field: Field,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin.app);
        this.containerEl.addClass("metadata-menu")
        this.containerEl.querySelector(".prompt")?.addClass(
            this.field.options.display === "card"
                ? "media-as-cards"
                : "media-as-list"
        )
    }


    onClose(): void {
        this.previousModal?.open()
    }

    getItems(): TFile[] {
        const sortingMethod = (new Function("a", "b", `return ${this.field.options.customSorting}`) || function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }) as ((a: TFile, b: TFile) => number)
        try {
            const fileManager = new FieldManager[this.field.type](this.plugin, this.field) as MultiMediaField | MediaField;
            return fileManager
                .getFiles()
                .sort(sortingMethod);
        } catch (error) {
            this.close();
            throw (error);
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    async replaceValues() {
        const result = this.selectedFiles.map(file => {
            const alias = extensionMediaTypes[file.extension] === MediaType.Image ? this.field.options.thumbnailSize : undefined
            return MediaField.buildLink(this.plugin, this.file, file.path, alias)
        })
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: result.join(", ") } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
    }

    async clearValues() {
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: "" } }], this.file)
    }

    renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
        el.addClass("value-container")
        const isImage = extensionMediaTypes[value.item.extension] === MediaType.Image
        const suggestionContainer = el.createDiv({ cls: "media-item" });
        const thumbnailContainer = suggestionContainer.createDiv({ cls: "thumbnail-container" })
        if (isImage) {

            const image = thumbnailContainer.createEl("img", { cls: "thumbnail" })
            const src = this.plugin.app.vault.adapter.getResourcePath(value.item.path)
            if (this.field.options.display === "list") {
                thumbnailContainer.style.width = "40px"
            }
            image.src = src
        } else {
            thumbnailContainer.innerHTML = commonMediaTypeIcon(this.field.options.display)
        }

        const mediaInfoContainer = suggestionContainer.createDiv({ cls: "media-info-container" })
        mediaInfoContainer.createDiv({ text: value.item.extension, cls: "chip media-type-container" })
        if (this.selectedFiles.some(f => f.path === value.item.path)) {
            el.addClass("value-checked")
            const iconContainer = mediaInfoContainer.createDiv({ cls: "icon-container" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
        const fileName = `${value.item.basename.slice(0, 20).padEnd(value.item.basename.length > 20 ? 23 : 0, '.')}.${value.item.extension}`
        suggestionContainer.createDiv({ cls: "file-name", text: fileName })
    }

    async onChooseItem(item: TFile): Promise<void> {

    }
}