import MetadataMenu from "main";
import { TFile } from "obsidian";
import MultiFileModal from "src/modals/fields/MultiFileModal";
import { Note } from "src/note/note";
import { FieldType } from "src/types/fieldTypes";
import { getLink } from "src/utils/parser";
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
        note: Note,
        indexedPath: string | undefined,
        lineNumber: number = -1,
        after: boolean = false,
        asList: boolean = false,
        asComment: boolean = false
    ): MultiFileModal {
        //return new MultiFileModal(plugin, file, field, initialValueObject, lineNumber, after, asList, asComment);
        return new MultiFileModal(plugin, file, field, note, indexedPath, lineNumber, after, asList, asComment);
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

    public displayValue(container: HTMLDivElement, file: TFile, value: string, onClick: () => {}): void {

        const values = Array.isArray(value) ? value : [value]
        values.forEach((value, i) => {
            const link = getLink(value, file)
            if (link?.path) {
                const linkText = link.path.split("/").last() || ""
                const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
                linkEl.onclick = () => {
                    this.plugin.app.workspace.openLinkText(link.path, file.path, true)
                    onClick()
                }
            } else {
                container.createDiv({ text: value });
            }
            if (i < values.length - 1) {
                container.createEl('span', { text: " | " })
            }
        })

        container.createDiv()
    }
}
