import { TFile, setIcon, FuzzySuggestModal, FuzzyMatch } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager, MediaType, extensionMediaTypes } from "src/types/fieldTypes";
import MetadataMenu from "main";
import { postValues } from "src/commands/postValues";
import { getLink } from "src/utils/parser";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";
import MediaField from "src/fields/fieldManagers/MediaField";

const commonMediaTypeIcon = (display: "list" | "card") => `<svg xmlns="http://www.w3.org/2000/svg" ${display === 'card' ? 'width="256" height="256"' : 'width="40" height="40"'} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-question">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <circle cx="10" cy="13" r="2"/><path d="m20 17-1.09-1.09a2 2 0 0 0-2.82 0L10 22"/>
</svg>`

export default class MediaFileModal extends FuzzySuggestModal<TFile> {

    private selectedFile?: TFile

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        private eF?: ExistingField,
        private indexedPath?: string,
        private lineNumber: number = -1,
        private asList: boolean = false,
        private asBlockquote: boolean = false,
        private previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin.app);
        const initialValueObject: string = this.eF?.value || ""
        const link = getLink(initialValueObject, this.file)
        if (link) {
            const file = this.plugin.app.vault.getAbstractFileByPath(link.path)
            if (file instanceof TFile) this.selectedFile = file
        }
        this.containerEl.addClass("metadata-menu")
        this.containerEl
            .querySelector(".prompt")?.addClass(
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
            const fileManager = new FieldManager[this.field.type](this.plugin, this.field) as MediaField;
            return fileManager
                .getFiles()
                .filter(f => this.field.options.folders?.some((folder: string) => f.path.startsWith(folder)))
                .sort(sortingMethod);
        } catch (error) {
            this.close();
            throw (error);
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
        el.addClass("value-container")
        const isImage = extensionMediaTypes[value.item.extension] === MediaType.Image
        if (!isImage && this.field.options.display === "card") {
            el.createDiv({ cls: "spacer" })
        }
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
        if (!isImage && this.field.options.display === "card") el.createDiv({ cls: "spacer" })

        const mediaInfoContainer = suggestionContainer.createDiv({ cls: "media-info-container" })
        mediaInfoContainer.createDiv({ text: value.item.extension, cls: "chip media-type-container" })
        if (this.selectedFile?.path === value.item.path) {
            el.addClass("value-checked")
            const iconContainer = mediaInfoContainer.createDiv({ cls: "icon-container" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
        const fileName = `${value.item.basename.slice(0, 20).padEnd(value.item.basename.length > 20 ? 23 : 0, '.')}.${value.item.extension}`
        suggestionContainer.createDiv({ cls: "file-name", text: fileName })

    }

    async onChooseItem(item: TFile): Promise<void> {
        const alias = extensionMediaTypes[item.extension] === MediaType.Image ? this.field.options.thumbnailSize : undefined
        const value = MediaField.buildLink(this.plugin, this.file, item.path, alias)
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: value } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
        this.previousModal?.open()
    }
}