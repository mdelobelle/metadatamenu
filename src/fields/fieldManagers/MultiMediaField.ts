import MetadataMenu from "main";
import { TFile, TextComponent } from "obsidian";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import { ExistingField } from "../ExistingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";
import { MultiMediaFileModal } from "src/modals/fields/MultiMediaFileModal";
import BaseMediaField from "./BaseMediaField";

export default class MultiMediaField extends BaseMediaField {

    public foldersInputComponents: Array<TextComponent> = []

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.MultiMedia)
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
    ): MultiMediaFileModal {
        return new MultiMediaFileModal(plugin, file, field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
    }
}
