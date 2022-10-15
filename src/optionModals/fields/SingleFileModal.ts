import { TFile, FuzzySuggestModal, FuzzyMatch, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import { FieldManager } from "src/types/fieldTypes";
import FileField from "src/fields/fieldManagers/FileField";
import MetadataMenu from "main";

export default class FileFuzzySuggester extends FuzzySuggestModal<TFile> {

    private selectedFile?: TFile

    constructor(
        private plugin: MetadataMenu,
        private file: TFile,
        private field: Field,
        initialValueObject: any,
        private lineNumber: number = -1,
        private inFrontmatter: boolean = false,
        private after: boolean = false
    ) {
        super(plugin.app);
        const dvApi = this.plugin.app.plugins.plugins["dataview"]?.api
        if (dvApi) {
            if (dvApi.value.isLink(initialValueObject)) {
                const file = this.plugin.app.vault.getAbstractFileByPath(initialValueObject.path)
                if (file instanceof TFile) this.selectedFile = file
            }
        }
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
            const suggestionContainer = el.createDiv({ cls: "metadata-menu-suggester-item-with-alias" });
            const label = suggestionContainer.createDiv({ cls: "metadata-menu-suggester-item-with-alias-label" })
            label.setText(new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(value.item.path)))
            const filePath = suggestionContainer.createDiv({ cls: "metadata-menu-suggester-item-with-alias-filepath" })
            filePath.setText(value.item.path)
        } else {
            el.setText(value.item.basename)
        }
        el.addClass("metadata-menu-value-suggester-value-container")
        const spacer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-value-container-spacer" })
        el.appendChild(spacer)
        if (this.selectedFile?.path === value.item.path) {
            el.addClass("metadata-menu-value-selected")
            const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
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
        if (this.lineNumber == -1) {
            await this.plugin.fileTaskManager
                .pushTask(() => {
                    replaceValues(
                        this.plugin,
                        this.file,
                        this.field.name,
                        FileField.buildMarkDownLink(this.plugin, this.file, item.basename, alias)
                    )
                });
        } else {
            await this.plugin.fileTaskManager
                .pushTask(() => {
                    insertValues(
                        this.plugin,
                        this.file,
                        this.field.name,
                        FileField.buildMarkDownLink(this.plugin, this.file, item.basename, alias),
                        this.lineNumber,
                        this.inFrontmatter,
                        this.after
                    )
                });
        };
    }

}