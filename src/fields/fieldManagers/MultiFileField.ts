import MetadataMenu from "main";
import { TFile } from "obsidian";
import MultiFileModal from "src/modals/fields/MultiFileModal";
import { FieldType } from "src/types/fieldTypes";
import Field from "../Field";
import AbstractFileBasedField from "./AbstractFileBasedField";

export default class MultiFileField extends AbstractFileBasedField<MultiFileModal> {

    constructor(plugin: MetadataMenu, field: Field) {
        super(plugin, field, FieldType.MultiFile)
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
    ): MultiFileModal {
        return new MultiFileModal(plugin, file, field, initialValueObject, lineNumber, after, asList, asComment);
    }

    static buildMarkDownLink(plugin: MetadataMenu, file: TFile, path: string): string {
        const destFile = plugin.app.metadataCache.getFirstLinkpathDest(path, file.path)
        if (destFile) {
            return plugin.app.fileManager.generateMarkdownLink(
                destFile,
                file.path,
                undefined,
                destFile.basename
            )
        }
        return ""
    }

    public validateValue(value: string | { path: string } | { path: string }[]): boolean {
        //todo : manage both raw links and dv Link objects
        return true
    }

    public displayValue(container: HTMLDivElement, file: TFile, fieldName: string, onClick: () => {}): void {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi) {
            const dvValue = dvApi.page(file.path)[fieldName]
            const values = Array.isArray(dvValue) ? dvValue : [dvValue]
            values.forEach((value, i) => {
                if (dvApi.value.isLink(value)) {
                    const link = container.createEl('a', { text: value.path.split("/").last().replace(/(.*).md/, "$1") });
                    link.onclick = () => {
                        this.plugin.app.workspace.openLinkText(value.path, file.path, true)
                        onClick()
                    }
                } else {
                    container.createDiv({ text: value });
                }
                if (i < values.length - 1) {
                    container.createEl('span', { text: " | " })
                }
            })
        }
        container.createDiv()
    }
}