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
import { BaseMediaFileModal } from "../BaseMediaModal";

export default class MediaFileModal extends BaseMediaFileModal {

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
        super(plugin, file, field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        const initialValueObject: string = this.eF?.value || ""
        const link = getLink(initialValueObject, this.file)
        if (link) {
            const file = this.plugin.app.vault.getAbstractFileByPath(link.path)
            if (file instanceof TFile) this.selectedFiles = [file]
        }
        this.containerEl.addClass("metadata-menu")
        this.containerEl
            .querySelector(".prompt")?.addClass(
                this.field.options.display === "card"
                    ? "media-as-cards"
                    : "media-as-list"
            )
    }

    async onChooseItem(item: TFile): Promise<void> {
        const alias = extensionMediaTypes[item.extension] === MediaType.Image ? this.field.options.thumbnailSize : undefined
        const value = MediaField.buildLink(this.plugin, this.file, item.path, alias)
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: value } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
        this.previousModal?.open()
    }
}