import MetadataMenu from "main";
import { TFile, TextComponent } from "obsidian";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import MediaFileModal from "src/modals/fields/MediaFileModal";
import { AbstractMediaField } from "../abstractFieldManagers/AbstractMediaField";


export default class MediaField extends AbstractMediaField {

    public foldersInputComponents: Array<TextComponent> = []

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.Media)
        this.field.options.folders = this.field.options.folders || []
    }

    public modalFactory(
        plugin: MetadataMenu,
        file: TFile,
        field: Field,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber: number = -1,
        asList: boolean = false,
        asBlockquote: boolean = false,
        previousModal?: ObjectModal | ObjectListModal
    ): MediaFileModal {
        return new MediaFileModal(plugin, file, field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
    }
}
