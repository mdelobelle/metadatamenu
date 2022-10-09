import { TFile, FuzzySuggestModal, FuzzyMatch, ButtonComponent, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { replaceValues } from "src/commands/replaceValues";
import { insertValues } from "src/commands/insertValues";
import { FieldManager } from "src/types/fieldTypes";
import { FieldManager as FM } from "src/fields/FieldManager";
import MetadataMenu from "main";

export default class MultiFileFuzzySuggester extends FuzzySuggestModal<TFile> {

    private selectedFiles: TFile[] = [];

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
        super.onOpen()
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                await this.replaceValues();
                this.close()
            }
        }
        const buttonContainer = this.containerEl.createDiv({ cls: "metadata-menu-value-suggester-actions" })
        buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-actions-spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "metadata-menu-value-suggester-info" })
        infoContainer.setText("Alt+Enter to save")
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

        this.modalEl.appendChild(buttonContainer)
    }

    getItems(): TFile[] {
        try {
            const fileManager = new FieldManager[this.field.type](this.plugin, this.field);
            return fileManager.getFiles(this.file);
        } catch (error) {
            this.close();
            throw (error);
        }
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    async replaceValues() {
        const result = this.selectedFiles.map(file => {
            const dvApi = this.plugin.app.plugins.plugins.dataview?.api
            let alias: string | undefined = undefined;
            if (dvApi && this.field.options.customRendering) {
                alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(file.path))
            }
            return FM.buildMarkDownLink(this.plugin, this.file, file.basename, alias)
        })
        if (this.lineNumber == -1) {
            await this.plugin.fileTaskManager
                .pushTask(() => {
                    replaceValues(
                        this.plugin,
                        this.file,
                        this.field.name,
                        result.join(", ")
                    )
                });
        } else {
            await this.plugin.fileTaskManager
                .pushTask(() => {
                    insertValues(
                        this.plugin,
                        this.file,
                        this.field.name,
                        result.join(", "),
                        this.lineNumber,
                        this.inFrontmatter,
                        this.after
                    )
                });
        };
    }

    async clearValues() {
        await this.plugin.fileTaskManager
            .pushTask(() => {
                replaceValues(
                    this.plugin,
                    this.file,
                    this.field.name,
                    ""
                )
            });
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

        if (this.selectedFiles.some(file => file.path === value.item.path)) {
            el.addClass("metadata-menu-value-selected")
            const iconContainer = el.createDiv({ cls: "metadata-menu-command-suggest-icon" })
            setIcon(iconContainer, "check-circle")
        }
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