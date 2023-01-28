import MetadataMenu from "main";
import { TFile } from "obsidian";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractFileBasedField from "./AbstractFileBasedField";
import SingleFileModal from "src/modals/fields/SingleFileModal";

export default class FileField extends AbstractFileBasedField<SingleFileModal> {


    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.File)
    }

    public modalFactory(
        plugin: MetadataMenu,
        file: TFile,
        field: Field,
        initialValueObject: any,
        lineNumber: number = -1,
        after: boolean = false,
        asList: boolean = false,
        asComment: boolean = false
    ): SingleFileModal {
        return new SingleFileModal(plugin, file, field, initialValueObject, lineNumber, after, asList, asComment);
    }

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClicked: () => {}): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            const value = dvApi.page(file.path)[fieldName]
            if (dvApi.value.isLink(value)) {
                const link = container.createEl('a', { text: value.path.split("/").last().replace(/(.*).md/, "$1") });
                link.onclick = () => {
                    this.plugin.app.workspace.openLinkText(value.path, file.path, true)
                    onClicked();
                }
            } else {
                container.createDiv({ text: value });
            }
        }
        container.createDiv();
    }
}