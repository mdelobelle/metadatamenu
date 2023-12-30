import { TFile, FuzzySuggestModal, FuzzyMatch, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager } from "src/types/fieldTypes";
import FileField from "src/fields/fieldManagers/FileField";
import MetadataMenu from "main";
import { postValues } from "src/commands/postValues";
import { getLink } from "src/utils/parser";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";

export default class FileFuzzySuggester extends FuzzySuggestModal<TFile> {

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
        this.containerEl.addClass("metadata-menu");
    }

    onClose(): void {
        this.previousModal?.open()
    }

    getItems(): TFile[] {
        const sortingMethod = new Function("a", "b", `return ${this.field.options.customSorting}`) || function (a: TFile, b: TFile) { return a.basename < b.basename ? -1 : 1 }
        try {
            const fileManager = new FieldManager[this.field.type](this.plugin, this.field);
            return fileManager.getFiles(this.file).sort(sortingMethod);
        } catch (error) {
            this.close();
            throw (error);
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        if (dvApi && this.field.options.customRendering) {
            const suggestionContainer = el.createDiv({ cls: "item-with-add-on" });
            suggestionContainer.createDiv({
                text: new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(value.item.path))
            })
            const filePath = suggestionContainer.createDiv({ cls: "add-on" })
            filePath.setText(value.item.path)
        } else {
            el.setText(value.item.basename)
        }
        el.addClass("value-container")
        const spacer = this.containerEl.createDiv({ cls: "spacer" })
        el.appendChild(spacer)
        if (this.selectedFile?.path === value.item.path) {
            el.addClass("value-checked")
            const iconContainer = el.createDiv({ cls: "icon-container" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
    }

    async onChooseItem(item: TFile): Promise<void> {
        const dvApi = this.plugin.app.plugins.plugins.dataview?.api
        let alias: string | undefined = undefined;
        if (dvApi && this.field.options.customRendering) {
            alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(item.path))
        }
        const value = FileField.buildMarkDownLink(this.plugin, this.file, item.basename, undefined, alias)
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: value } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
        this.previousModal?.open()
    }
}