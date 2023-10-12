import MetadataMenu from "main";
import { TFile } from "obsidian";
import MultiFileModal from "src/modals/fields/MultiFileModal";
import { Note } from "src/note/note";
import { FieldType } from "src/types/fieldTypes";
import { displayLinksOrText } from "src/utils/linksUtils";
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

        displayLinksOrText(value, file, container, this.plugin, () => onClick)
    }
}
