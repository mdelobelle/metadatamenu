import { TFile, FuzzySuggestModal, FuzzyMatch, ButtonComponent, setIcon } from "obsidian";
import Field from "src/fields/Field";
import { FieldManager } from "src/types/fieldTypes";
import { FieldManager as FM } from "src/fields/FieldManager";
import MetadataMenu from "main";
import { postValues } from "src/commands/postValues";
import { cleanActions } from "src/utils/modals";
import { extractLinks, getLink } from "src/utils/parser";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";

export default class MultiFileModal extends FuzzySuggestModal<TFile> {

    private selectedFiles: TFile[] = [];

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
        const initialOptions: string | string[] = this.eF?.value || []
        if (initialOptions) {
            if (Array.isArray(initialOptions)) {
                // in frontmatter it can be a regular array
                initialOptions.map(item => {
                    const link = getLink(item, this.file)
                    if (link) {
                        const file = this.plugin.app.vault.getAbstractFileByPath(link.path)
                        if (file instanceof TFile && !this.selectedFiles.map(_f => _f.path).includes(file.path)) this.selectedFiles.push(file)
                    }
                })
            } else {
                // in inline fields, it can be links comma separated, let's matchAll
                const links = extractLinks(initialOptions)
                links.forEach(_link => {
                    const link = getLink(_link, this.file)
                    if (link) {
                        const file = this.plugin.app.vault.getAbstractFileByPath(link.path)
                        if (file instanceof TFile && !this.selectedFiles.map(_f => _f.path).includes(link.path)) this.selectedFiles.push(file)
                    }
                })
            }
        } else {
            this.selectedFiles = [];
        }
        this.containerEl.addClass("metadata-menu")
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                e.preventDefault();
                await this.replaceValues();
                this.close()
            }
        }
        cleanActions(this.containerEl, ".footer-actions")
        const buttonContainer = this.containerEl.createDiv({ cls: "footer-actions" })
        buttonContainer.createDiv({ cls: "spacer" })
        const infoContainer = buttonContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        //confirm button
        const confirmButton = new ButtonComponent(buttonContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.replaceValues();
            this.close()
        })
        //cancel button
        const cancelButton = new ButtonComponent(buttonContainer)
        cancelButton.setIcon("cross")
        cancelButton.onClick(() => { this.close(); })
        //clear value button
        const clearButton = new ButtonComponent(buttonContainer)
        clearButton.setIcon("trash")
        clearButton.onClick(async () => {
            await this.clearValues();
            this.close();
        })
        clearButton.buttonEl.addClass("danger")

        this.modalEl.appendChild(buttonContainer)
    }

    onOpen() {
        super.onOpen()
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

    async replaceValues() {
        const result = this.selectedFiles.map(file => {
            const dvApi = this.plugin.app.plugins.plugins.dataview?.api
            let alias: string | undefined = undefined;
            if (dvApi && this.field.options.customRendering) {
                alias = new Function("page", `return ${this.field.options.customRendering}`)(dvApi.page(file.path))
            }
            return FM.buildMarkDownLink(this.plugin, this.file, file.basename, undefined, alias)
        })
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: result.join(", ") } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
    }

    async clearValues() {
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: "" } }], this.file)
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

        if (this.selectedFiles.some(file => file.path === value.item.path)) {
            el.addClass("value-checked")
            const iconContainer = el.createDiv({ cls: "icon-container" })
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
                s.addClass("value-checked")
                if (s.querySelectorAll(".icon-container").length == 0) {
                    const iconContainer = s.createDiv({ cls: "icon-container" })
                    setIcon(iconContainer, "check-circle")
                }
            } else {
                s.removeClass("value-checked")
                s.querySelectorAll(".icon-container").forEach(icon => icon.remove())
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

    async onChooseItem(item: TFile): Promise<void> {

    }

}