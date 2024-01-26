import { TFile, ButtonComponent, setIcon } from "obsidian";
import Field from "src/fields/_Field";
import MetadataMenu from "main";
import { FieldManager } from "src/types/fieldTypes";
import { postValues } from "src/commands/postValues";
import { getLink } from "src/utils/parser";
import { ExistingField } from "src/fields/ExistingField";
import ObjectModal from "./ObjectModal";
import ObjectListModal from "./ObjectListModal";
import MultiField from "src/fields/fieldManagers/MultiField";
import BaseSelecttModal from "../baseFieldModals/BaseSelectModal";
import { buildMarkDownLink } from "src/fields/models/abstractModels/AbstractFile";

export default class MultiSuggestModal extends BaseSelecttModal {

    private selectedOptions: Array<string>;

    constructor(
        public plugin: MetadataMenu,
        public file: TFile,
        public field: Field,
        public eF?: ExistingField,
        public indexedPath?: string,
        public lineNumber: number = -1,
        public asList: boolean = false,
        public asBlockquote: boolean = false,
        public previousModal?: ObjectModal | ObjectListModal,
        public preSelectedOptions?: Array<string>
    ) {
        super(plugin, file, field, eF, indexedPath, lineNumber, asList, asBlockquote, previousModal);
        const initialOptions: string | string[] = this.eF?.value || []
        if (initialOptions) {
            if (Array.isArray(initialOptions)) {
                this.selectedOptions = initialOptions.map(item => {
                    const link = getLink(item, this.file)
                    if (link) {
                        return buildMarkDownLink(this.plugin, this.file, link.path)
                    } else {
                        return item.toString()
                    }
                })

                this.selectedOptions = initialOptions.map(item => item.toString())
            }
            else if (typeof (initialOptions) === "string" && initialOptions.toString().startsWith("[[")) {
                this.selectedOptions = initialOptions.split(",").map(item => item.trim());
            } else {
                const link = getLink(initialOptions, this.file)
                if (link) {
                    this.selectedOptions = [`[[${link.path.replace(".md", "")}]]`]
                } else if (typeof (initialOptions) === "string") {
                    this.selectedOptions = initialOptions.toString().replace(/^\[(.*)\]$/, "$1").split(",").map(item => item.trim());
                }
            }
        } else {
            this.selectedOptions = [];
        }
        this.preSelectedOptions?.forEach(item => { if (!this.selectedOptions.includes(item)) { this.selectedOptions.push(item) } })
        this.containerEl.onkeydown = async (e) => {
            if (e.key == "Enter" && e.altKey) {
                await this.save();
                this.close()
            }
        }
    };

    buildConfirm(footerActionsContainer: HTMLDivElement) {
        const infoContainer = footerActionsContainer.createDiv({ cls: "info" })
        infoContainer.setText("Alt+Enter to save")
        const confirmButton = new ButtonComponent(footerActionsContainer)
        confirmButton.setIcon("checkmark")
        confirmButton.onClick(async () => {
            await this.save();
            this.close()
        })
    }

    async onAdd(): Promise<void> {
        await this.addNewValueToSettings()
        await this.plugin.fieldIndex.indexFields();
        this.selectedOptions.push(this.inputEl.value)
        const fM = new FieldManager[this.field.type](this.plugin, this.field) as MultiField
        fM.createAndOpenFieldModal(this.file, this.field.name, this.eF, this.indexedPath, this.lineNumber, this.asList, this.asBlockquote, this.previousModal, this.selectedOptions)
        this.close(false)
    }

    async save() {
        const options = this.selectedOptions;
        await postValues(this.plugin, [{ indexedPath: this.indexedPath || this.field.id, payload: { value: options.join(", ") } }], this.file, this.lineNumber, this.asList, this.asBlockquote)
        this.close();
    }

    renderSelected() {
        //@ts-ignore
        const chooser = this.chooser
        const suggestions: HTMLDivElement[] = chooser.suggestions
        const values: string[] = chooser.values
        suggestions.forEach((s, i) => {
            if (this.selectedOptions.includes(values[i].toString())) {
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

    renderSuggestion(value: string, el: HTMLElement) {
        super.renderSuggestion(value, el)
        const spacer = this.containerEl.createDiv({ cls: "spacer" })
        el.appendChild(spacer)
        if (this.selectedOptions.includes(value.toString())) {
            el.addClass("value-checked")
            const iconContainer = el.createDiv({ cls: "icon-container" })
            setIcon(iconContainer, "check-circle")
        }
        this.inputEl.focus()
    }

    selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
        if (this.selectedOptions.includes(value.toString())) {
            this.selectedOptions.remove(value.toString())
        } else {
            this.selectedOptions.push(value.toString())
        }
        this.renderSelected()
    }

}