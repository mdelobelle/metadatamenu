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
        try {
            const fileManager = new FieldManager[this.field.type](this.plugin, this.field);
            return fileManager.getFiles();
        } catch (error) {
            this.close();
            throw (error);
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
        el.setText(value.item.basename)
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
        if (this.lineNumber == -1) {
            await replaceValues(
                this.plugin,
                this.file,
                this.field.name,
                FileField.buildMarkDownLink(this.plugin, this.file, item.basename)
            );
        } else {
            await insertValues(
                this.plugin,
                this.file,
                this.field.name,
                FileField.buildMarkDownLink(this.plugin, this.file, item.basename),
                this.lineNumber,
                this.inFrontmatter,
                this.after
            );
        };
    }

}