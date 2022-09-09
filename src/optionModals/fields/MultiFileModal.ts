import { TFile, FuzzySuggestModal, FuzzyMatch, ButtonComponent, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import { FieldManager } from "src/types/fieldTypes";
import { FieldManager as FM } from "src/fields/FieldManager";
import MetadataMenu from "main";

export default class MultiFileFuzzySuggester extends FuzzySuggestModal<TFile> {
    private plugin: MetadataMenu;
    private file: TFile;
    private field: Field;
    private lineNumber: number;
    private inFrontmatter: boolean;
    private after: boolean;
    private selectedFiles: TFile[] = [];

    constructor(plugin: MetadataMenu, file: TFile, field: Field, initialValueObject: any, lineNumber: number = -1, inFrontMatter: boolean = false, after: boolean = false) {
        super(plugin.app);
        this.plugin = plugin;
        this.file = file;
        this.field = field;
        this.lineNumber = lineNumber;
        this.inFrontmatter = inFrontMatter;
        this.after = after;
        const dvApi = this.plugin.app.plugins.plugins["dataview"]?.api
        if (dvApi) {
            const selectedValues: Array<any> = Array.isArray(initialValueObject) ? initialValueObject : [initialValueObject]
            selectedValues.forEach(value => {
                if (dvApi.value.isLink(value)) {
                    const file = this.plugin.app.vault.getAbstractFileByPath(value.path)
                    if (file instanceof TFile) this.selectedFiles.push(file)
                }
            })
        }
    }

    onOpen() {
        const buttonContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-actions" })
        buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-actions-spacer" })
        //confirm button
        const confirmButton = new ButtonComponent(buttonContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.replaceValues();
            this.close()
        })
        confirmButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => { this.close(); })
        cancelButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("trash")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("metadata-menu-value-suggester-button")
        clearButton.buttonEl.addClass("danger")

        this.modalEl.insertBefore(buttonContainer, this.modalEl.childNodes[0])
        super.onOpen()
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

    async replaceValues() {
        const result = this.selectedFiles.map(file => FM.buildMarkDownLink(this.plugin, this.file, file.basename))
        if (this.lineNumber == -1) {
            await replaceValues(
                this.plugin,
                this.file,
                this.field.name,
                result.join(", ")
            );
        } else {
            await insertValues(
                this.plugin,
                this.file,
                this.field.name,
                result.join(", "),
                this.lineNumber,
                this.inFrontmatter,
                this.after
            );
        };
    }

    async clearValues() {
        await replaceValues(
            this.plugin,
            this.file,
            this.field.name,
            ""
        );
    }

    renderSuggestion(value: FuzzyMatch<TFile>, el: HTMLElement) {
        el.setText(value.item.basename)
        el.addClass("metadata-menu-value-suggester-value-container")
        const spacer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-value-container-spacer" })
        el.appendChild(spacer)

        if (this.selectedFiles.some(file => file.path === value.item.path)) {
            el.addClass("metadata-menu-value-selected")
            const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
    }

    renderSelected() {
        //@ts-ignore
        const chooser = this.chooser
        const suggestions: HTMLDivElement[] = chooser.suggestions
        const values: FuzzyMatch<TFile>[] = chooser.values

        suggestions.forEach((s, i) => {
            if (this.selectedFiles.some(file => file.path === values[i].item.path)) {
                s.addClass("metadata-menu-value-selected")
                if (s.querySelectorAll(".metadata-menu-command-suggest-icon").length == 0) {
                    const iconContainer = s.createDiv({ cls: "metadata-menu-command-suggest-icon" })
                    setIcon(iconContainer, "check-circle")
                }
            } else {
                s.removeClass("metadata-menu-value-selected")
                s.querySelectorAll(".metadata-menu-command-suggest-icon").forEach(icon => icon.remove())
            }
        })

    }

    selectSuggestion(value: FuzzyMatch<TFile>, evt: MouseEvent | KeyboardEvent): void {
        if (this.selectedFiles.includes(value.item)) {
            this.selectedFiles.remove(value.item)
        } else {
            this.selectedFiles.push(value.item)
        }
        this.renderSelected()
    }

    async onChooseItem(item: TFile): Promise<void> { }

}