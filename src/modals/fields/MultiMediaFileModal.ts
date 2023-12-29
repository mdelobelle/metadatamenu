import MetadataMenu from "main";
import { ButtonComponent, FuzzyMatch, FuzzySuggestModal, TFile, setIcon } from "obsidian";
import { ExistingField } from "src/fields/ExistingField";
import Field from "src/fields/Field";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";
import { extractLinks, getLink } from "src/utils/parser";
import { MediaType, extensionMediaTypes } from "src/types/fieldTypes";
import { postValues } from "src/commands/postValues";
import { cleanActions } from "src/utils/modals";
import { BaseMediaFileModal } from "../BaseMediaModal";
import MediaField from "src/fields/fieldManagers/MultiMediaField";

export class MultiMediaFileModal extends BaseMediaFileModal {

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public field: Field,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal
    ) {
        super(plugin, file, field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
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

    async replaceValues() {
        const result = this.selectedFiles.map(file => {
            const alias = extensionMediaTypes[file.extension] === MediaType.Image ? this.field.options.thumbnailSize : undefined
            return MediaField.buildLink(this.plugin, this.file, file.path, alias)
        })
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: result.join(", ") } }], this.file, this.lineNumber, this.asList, this.asBlockquote);
    }

    async clearValues() {
        await postValues(this.plugin, [{ id: this.indexedPath || this.field.id, payload: { value: "" } }], this.file)
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
}