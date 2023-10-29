import MetadataMenu from "main";
import { TFile } from "obsidian";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractFileBasedField from "./AbstractFileBasedField";
import SingleFileModal from "src/modals/fields/SingleFileModal";
import { getLink } from "src/utils/parser";
import { ExistingField } from "../existingField";
import ObjectModal from "src/modals/fields/ObjectModal";
import ObjectListModal from "src/modals/fields/ObjectListModal";

export default class FileField extends AbstractFileBasedField<SingleFileModal> {


    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.File)
    }

    public modalFactory(
        plugin: MetadataMenu,
        file: TFile,
        field: Field,
        eF?: ExistingField,
        indexedPath?: string,
        lineNumber: number = -1,
        asList: boolean = false,
        asComment: boolean = false,
        previousModal?: ObjectModal | ObjectListModal
    ): SingleFileModal {
        return new SingleFileModal(plugin, file, field, eF, indexedPath, lineNumber, asList, asComment, previousModal);
    }

    public displayValue(container: HTMLDivElement, file: TFile, value: any, onClicked: () => {}): void {
        const link = getLink(value, file)
        if (link?.path) {
            const linkText = link.path.split("/").last() || ""
            const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
            linkEl.onclick = () => {
                this.plugin.app.workspace.openLinkText(link.path, file.path, true)
                onClicked();
            }
        } else {
            container.createDiv({ text: value });
        }
        container.createDiv();
    }
}
